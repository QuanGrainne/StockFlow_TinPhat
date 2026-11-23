using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Application.Features.Suppliers.Commands;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Suppliers.Helpers;

/// <summary>
/// Sổ "Nợ cần trả nhà cung cấp" theo kiểu KiotViet (tách nguyên văn từ GetSupplierByIdQuery để dùng chung với báo cáo công nợ UC-86):
/// - Phiếu nhập COMPLETED (+): tiền hàng − khoản trả ngay lúc nhập (thanh toán không mã phiếu chi, gắn phiếu nhập hoàn thành).
/// - Phiếu chi có mã (PC...) (−): gộp các phần phân bổ thành 1 dòng. Thanh toán không mã khác (−) thành dòng riêng.
/// - Trả hàng nhập COMPLETED (−): NCC cần trả − tiền NCC trả ngay lúc trả hàng.
/// - NCC trả tiền sau (phiếu thu có mã) (+); điều chỉnh công nợ NCC (±).
/// Nợ đầu kỳ của sổ = nợ phải trả hiện tại − Σ các dòng (gồm nợ khai báo ban đầu) – do nơi gọi tính.
/// </summary>
public static class SupplierDebtLedger
{
    /// <param name="partnerIds">null = mọi đối tác</param>
    public static async Task<List<DebtMovement>> LoadMovementsAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int>? partnerIds, CancellationToken ct)
    {
        var ids = partnerIds?.ToList();
        var receiptQuery = context.TrxGoodsReceipts.AsNoTracking();
        var txQuery = context.TrxFinancialTransactions.AsNoTracking();
        var returnQuery = context.TrxPurchaseReturns.AsNoTracking();
        if (ids != null)
        {
            receiptQuery = receiptQuery.Where(r => ids.Contains(r.PartnerId));
            txQuery = txQuery.Where(t => ids.Contains(t.PartnerId));
            returnQuery = returnQuery.Where(r => ids.Contains(r.PartnerId));
        }

        // Tiền hàng từng phiếu cộng ở DB, làm tròn như SupplierDebtCalculator.ReceiptTotal
        var completed = (await receiptQuery
                .Select(r => new
                {
                    r.GrId,
                    r.PartnerId,
                    r.GrCode,
                    r.ReceivedDate,
                    r.Status,
                    RawTotal = r.DtlGoodsReceiptItems.Sum(i => (i.AcceptedQty ?? i.ReceivedQty ?? i.OrderedQty ?? 0) * (i.UnitLandedCost ?? 0)),
                })
                .ToListAsync(ct))
            .Where(r => string.Equals(r.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var activePayments = (await txQuery.Where(t => t.TxType == SupplierDebtCalculator.PaymentTxType).ToListAsync(ct))
            .Where(SupplierDebtCalculator.IsActivePayment)
            .ToList();

        var completedIds = completed.Select(r => r.GrId).ToHashSet();
        bool IsPaidWithReceipt(TrxFinancialTransaction t) =>
            string.IsNullOrEmpty(t.TxCode)
            && string.Equals(t.ReferenceType, SupplierDebtCalculator.GoodsReceiptRef, StringComparison.OrdinalIgnoreCase)
            && t.ReferenceId.HasValue && completedIds.Contains(t.ReferenceId.Value);

        // Khoản trả ngay lúc hoàn thành phiếu nhập (không có mã phiếu chi) → trừ thẳng vào dòng PN
        var paidAtReceipt = SupplierDebtCalculator.PaidByReceipt(activePayments.Where(IsPaidWithReceipt));

        var voucherRows = activePayments
            .Where(t => !string.IsNullOrEmpty(t.TxCode))
            .GroupBy(t => (t.PartnerId, Code: t.TxCode!))
            .Select(g => new DebtMovement(g.Key.PartnerId, g.Key.Code, g.Min(t => t.TransactionDate), "PAYMENT", "Thanh toán",
                                          null, -g.Sum(t => t.Amount ?? 0), 1, g.Min(t => t.TxId)));

        var otherPayments = activePayments
            .Where(t => string.IsNullOrEmpty(t.TxCode) && !IsPaidWithReceipt(t))
            .Select(t => new DebtMovement(t.PartnerId, $"TT{t.TxId:D6}", t.TransactionDate, "PAYMENT", "Thanh toán",
                                          t.ReferenceId, -(t.Amount ?? 0), 1, t.TxId));

        // Trả hàng nhập hoàn thành: giảm nợ = NCC cần trả − tiền NCC trả ngay lúc trả hàng.
        // Tiền NCC trả sau (phiếu thu PT...) là dòng "Nhà cung cấp trả tiền" riêng, làm tăng lại nợ phải trả.
        var completedReturns = (await returnQuery
                .Select(r => new { r.PurchaseReturnId, r.PartnerId, r.ReturnCode, r.ReturnDate, r.Status, r.TotalAmount })
                .ToListAsync(ct))
            .Where(r => r.Status == "COMPLETED")
            .ToList();
        var refunds = await txQuery
            .Where(t => t.TxType == PurchaseReturnLogic.RefundTxType && t.Status != "CANCELLED")
            .ToListAsync(ct);
        var refundAtReturn = refunds
            .Where(t => string.IsNullOrEmpty(t.TxCode) && t.ReferenceId.HasValue)
            .GroupBy(t => t.ReferenceId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount ?? 0));
        var returnRows = completedReturns
            .Select(r => new DebtMovement(r.PartnerId, r.ReturnCode ?? $"THN{r.PurchaseReturnId:D6}", r.ReturnDate, "SUPPLIER_RETURN",
                                          "Trả hàng nhà cung cấp", r.PurchaseReturnId,
                                          -((r.TotalAmount ?? 0) - refundAtReturn.GetValueOrDefault(r.PurchaseReturnId)),
                                          0, r.PurchaseReturnId));
        var refundRows = refunds
            .Where(t => !string.IsNullOrEmpty(t.TxCode))
            .Select(t => new DebtMovement(t.PartnerId, t.TxCode!, t.TransactionDate, "SUPPLIER_REFUND", "Nhà cung cấp trả tiền",
                                          t.ReferenceId, t.Amount ?? 0, 1, t.TxId));

        // Phiếu điều chỉnh công nợ NCC (DC...): amount = nợ sau − nợ trước
        var adjustRows = (await txQuery
                .Where(t => t.TxType == AdjustSupplierDebtCommandHandler.TxType && t.Status != "CANCELLED")
                .ToListAsync(ct))
            .Select(t => new DebtMovement(t.PartnerId, t.TxCode ?? $"{DebtAdjustCodes.Prefix}{t.TxId:D6}", t.TransactionDate, "ADJUST",
                                          "Điều chỉnh", null, t.Amount ?? 0, 1, t.TxId));

        var movements = completed
            .Select(r => new DebtMovement(r.PartnerId, r.GrCode ?? $"PN{r.GrId:D6}", r.ReceivedDate, "GOODS_RECEIPT", "Nhập hàng", r.GrId,
                                          SupplierDebtCalculator.RoundReceiptTotal(r.RawTotal) - paidAtReceipt.GetValueOrDefault(r.GrId),
                                          0, r.GrId))
            .Concat(returnRows)
            .Concat(refundRows)
            .Concat(voucherRows)
            .Concat(otherPayments)
            .Concat(adjustRows);

        // Trùng thời gian (form chọn giờ chỉ đến phút): xếp theo thứ tự tạo thực tế
        return DebtMovement.Sort(movements);
    }
}
