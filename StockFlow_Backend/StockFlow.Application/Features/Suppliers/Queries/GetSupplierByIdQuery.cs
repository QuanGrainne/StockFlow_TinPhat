using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Application.Features.Suppliers.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Suppliers.Queries;

/// <summary>
/// Truy vấn chi tiết một Nhà cung cấp kèm lịch sử các chứng từ nhập kho gần đây.
/// </summary>
public record GetSupplierByIdQuery(int PartnerId) : IRequest<Result<SupplierDetailDto>>;

public class GetSupplierByIdQueryHandler : IRequestHandler<GetSupplierByIdQuery, Result<SupplierDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetSupplierByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<SupplierDetailDto>> Handle(GetSupplierByIdQuery request, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PartnerId == request.PartnerId, cancellationToken);

        if (partner == null)
        {
            return Result.Failure<SupplierDetailDto>("Không tìm thấy thông tin nhà cung cấp.");
        }

        // 1. Toàn bộ phiếu nhập của NCC (kể cả phiếu tạm / đã hủy để hiển thị lịch sử)
        var receipts = await _context.TrxGoodsReceipts
            .Include(r => r.Warehouse)
            .Include(r => r.ReceivedByNavigation)
            .Include(r => r.DtlGoodsReceiptItems)
            .Where(r => r.PartnerId == request.PartnerId)
            .OrderByDescending(r => r.ReceivedDate ?? DateTime.MinValue)
            .ThenByDescending(r => r.GrId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // 2. Các khoản đã thanh toán cho NCC
        var payments = await _context.TrxFinancialTransactions
            .Where(t => t.PartnerId == request.PartnerId && t.TxType == SupplierDebtCalculator.PaymentTxType)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var activePayments = payments.Where(SupplierDebtCalculator.IsActivePayment).ToList();
        var paidByReceipt = SupplierDebtCalculator.PaidByReceipt(activePayments);

        // Chỉ phiếu COMPLETED mới tính tiền hàng / công nợ
        var completed = receipts.Where(SupplierDebtCalculator.IsCompleted).ToList();
        int totalCount = completed.Count;
        decimal totalAmount = completed.Sum(SupplierDebtCalculator.ReceiptTotal);

        // Phiếu trả hàng nhập của NCC (mọi trạng thái, để hiện lịch sử nhập/trả hàng)
        var allReturns = await _context.TrxPurchaseReturns
            .AsNoTracking()
            .Include(r => r.Warehouse)
            .Include(r => r.CreatedByNavigation)
            .Where(r => r.PartnerId == request.PartnerId)
            .ToListAsync(cancellationToken);

        // Lịch sử nhập/trả hàng: gộp phiếu nhập (PN) và phiếu trả hàng nhập (THN), mới nhất trước
        var recentReceiptDtos = receipts.Select(r => new SupplierRecentReceiptDto(
                ReceiptId: r.GrId,
                ReceiptNumber: r.GrCode ?? r.ExternalPoNumber ?? $"PNK-{r.GrId:D6}",
                ReceiptDate: r.ReceivedDate,
                WarehouseId: r.WarehouseId,
                WarehouseName: r.Warehouse?.WarehouseName ?? $"Kho #{r.WarehouseId}",
                TotalAmount: SupplierDebtCalculator.ReceiptTotal(r),
                Status: r.Status ?? "COMPLETED",
                CreatedByName: r.ReceivedByNavigation?.FullName ?? r.ReceivedByNavigation?.Username))
            .Concat(allReturns.Select(r => new SupplierRecentReceiptDto(
                ReceiptId: r.PurchaseReturnId,
                ReceiptNumber: r.ReturnCode ?? $"THN{r.PurchaseReturnId:D6}",
                ReceiptDate: r.ReturnDate,
                WarehouseId: r.WarehouseId,
                WarehouseName: r.Warehouse?.WarehouseName ?? $"Kho #{r.WarehouseId}",
                TotalAmount: r.TotalAmount ?? 0,
                Status: r.Status ?? "DRAFT",
                CreatedByName: r.CreatedByNavigation?.FullName ?? r.CreatedByNavigation?.Username,
                Type: "PURCHASE_RETURN")))
            .OrderByDescending(r => r.ReceiptDate ?? DateTime.MinValue)
            .Take(30)
            .ToList();

        // Trả hàng nhập (phần tính vào công nợ) trừ vào số còn nợ của phiếu nhập gốc
        var returnOffsets = await ReturnOffsetCalculator.ComputeAsync(
            _context,
            completed.ToDictionary(r => r.GrId, r => SupplierDebtCalculator.ReceiptDebt(r, paidByReceipt)),
            cancellationToken);
        decimal ReceiptOpen(StockFlow.Domain.Entities.TrxGoodsReceipt r) =>
            Math.Max(0, SupplierDebtCalculator.ReceiptDebt(r, paidByReceipt) - returnOffsets.OffsetByReceipt.GetValueOrDefault(r.GrId));

        // 3. Công nợ theo kho = Σ (tiền hàng − đã trả − trả hàng trừ nợ) của các phiếu COMPLETED tại kho đó.
        //    (Trước đây khi tổng nợ = 0 lại lấy luôn tổng tiền mua làm nợ → hiển thị sai.)
        var warehouseBreakdown = completed
            .GroupBy(r => new { r.WarehouseId, Code = r.Warehouse?.WarehouseCode, Name = r.Warehouse?.WarehouseName })
            .Select(g => new WarehouseDebtBreakdownDto(
                WarehouseId: g.Key.WarehouseId,
                WarehouseCode: g.Key.Code ?? $"K{g.Key.WarehouseId:D3}",
                WarehouseName: g.Key.Name ?? $"Kho #{g.Key.WarehouseId}",
                TotalPurchasedAmount: g.Sum(SupplierDebtCalculator.ReceiptTotal),
                BranchPayableAmount: g.Sum(ReceiptOpen),
                ReceiptsCount: g.Count()))
            .OrderByDescending(b => b.TotalPurchasedAmount)
            .ToList();

        // 4. Sổ "Nợ cần trả nhà cung cấp" theo kiểu KiotViet: chỉ hiện dòng phiếu nhập (PN...).
        //    Khoản trả ngay khi nhập hàng được trừ thẳng vào dòng PN đó → Giá trị = tiền hàng − đã trả = nợ phát sinh.
        //    Chỉ thanh toán KHÔNG gắn với phiếu nhập hoàn thành nào (thanh toán công nợ riêng) mới thành dòng riêng.
        //    Nợ đầu kỳ = Nợ hiện tại − Σ giá trị các dòng — gồm nợ khai báo ban đầu / điều chỉnh tay.
        //    Phiếu chi thanh toán nợ (có TxCode, VD PC000001) luôn là 1 dòng "Thanh toán" riêng, gộp các phần phân bổ.
        var currentPayable = partner.CurrentPayable ?? 0m;
        var completedIds = completed.Select(r => r.GrId).ToHashSet();
        bool IsPaidWithReceipt(TrxFinancialTransaction t) =>
            string.IsNullOrEmpty(t.TxCode)
            && string.Equals(t.ReferenceType, SupplierDebtCalculator.GoodsReceiptRef, StringComparison.OrdinalIgnoreCase)
            && t.ReferenceId.HasValue && completedIds.Contains(t.ReferenceId.Value);

        // Khoản trả ngay lúc hoàn thành phiếu nhập (không có mã phiếu chi) → trừ thẳng vào dòng PN
        var paidAtReceipt = SupplierDebtCalculator.PaidByReceipt(activePayments.Where(IsPaidWithReceipt));

        var voucherRows = activePayments
            .Where(t => !string.IsNullOrEmpty(t.TxCode))
            .GroupBy(t => t.TxCode!)
            .Select(g => (Code: g.Key, Date: g.Min(t => t.TransactionDate), Type: "PAYMENT",
                          Label: "Thanh toán", Ref: (int?)null, Amount: -g.Sum(t => t.Amount ?? 0), Order: 1));

        var otherPayments = activePayments
            .Where(t => string.IsNullOrEmpty(t.TxCode) && !IsPaidWithReceipt(t))
            .Select(t => (Code: $"TT{t.TxId:D6}", Date: t.TransactionDate, Type: "PAYMENT",
                          Label: "Thanh toán", Ref: t.ReferenceId, Amount: -(t.Amount ?? 0), Order: 1));

        // Phiếu trả hàng nhập đã hoàn thành: giảm nợ = NCC cần trả − tiền NCC trả ngay lúc trả hàng.
        // Tiền NCC trả sau (phiếu thu PT...) là dòng "Nhà cung cấp trả tiền" riêng, làm tăng lại nợ phải trả.
        var completedReturns = allReturns.Where(r => r.Status == "COMPLETED").ToList();
        var refunds = await _context.TrxFinancialTransactions
            .AsNoTracking()
            .Where(t => t.PartnerId == request.PartnerId
                        && t.TxType == PurchaseReturnLogic.RefundTxType
                        && t.Status != "CANCELLED")
            .ToListAsync(cancellationToken);
        var refundAtReturn = refunds
            .Where(t => string.IsNullOrEmpty(t.TxCode) && t.ReferenceId.HasValue)
            .GroupBy(t => t.ReferenceId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount ?? 0));
        var returnRows = completedReturns
            .Select(r => (Code: r.ReturnCode ?? $"THN{r.PurchaseReturnId:D6}", Date: r.ReturnDate, Type: "SUPPLIER_RETURN",
                          Label: "Trả hàng nhà cung cấp", Ref: (int?)r.PurchaseReturnId,
                          Amount: -((r.TotalAmount ?? 0) - refundAtReturn.GetValueOrDefault(r.PurchaseReturnId)),
                          Order: 0));
        var refundRows = refunds
            .Where(t => !string.IsNullOrEmpty(t.TxCode))
            .Select(t => (Code: t.TxCode!, Date: t.TransactionDate, Type: "SUPPLIER_REFUND",
                          Label: "Nhà cung cấp trả tiền", Ref: t.ReferenceId,
                          Amount: t.Amount ?? 0,
                          Order: 1));

        var movements = completed
            .Select(r => (Code: r.GrCode ?? $"PN{r.GrId:D6}", Date: r.ReceivedDate, Type: "GOODS_RECEIPT",
                          Label: "Nhập hàng", Ref: (int?)r.GrId,
                          Amount: SupplierDebtCalculator.ReceiptTotal(r) - paidAtReceipt.GetValueOrDefault(r.GrId),
                          Order: 0))
            .Concat(returnRows)
            .Concat(refundRows)
            .Concat(voucherRows)
            .Concat(otherPayments)
            .OrderBy(m => m.Date ?? DateTime.MinValue)
            .ThenBy(m => m.Order)
            .ToList();

        // Phiếu nhập còn nợ (cũ nhất trước) — để phân bổ khi tạo phiếu chi
        var openReceipts = completed
            .Select(r =>
            {
                var total = SupplierDebtCalculator.ReceiptTotal(r);
                var paid = paidByReceipt.GetValueOrDefault(r.GrId);
                return new SupplierOpenReceiptDto(
                    ReceiptId: r.GrId,
                    ReceiptNumber: r.GrCode ?? $"PN{r.GrId:D6}",
                    ReceiptDate: r.ReceivedDate,
                    TotalAmount: total,
                    PaidAmount: paid,
                    RemainingAmount: Math.Max(0, total - paid));
            })
            .Where(r => r.RemainingAmount > 0)
            .OrderBy(r => r.ReceiptDate ?? DateTime.MinValue)
            .ThenBy(r => r.ReceiptId)
            .ToList();

        var openingBalance = currentPayable - movements.Sum(m => m.Amount);
        var ledger = new List<SupplierDebtLedgerEntryDto>();
        var running = openingBalance;
        if (openingBalance != 0)
        {
            ledger.Add(new SupplierDebtLedgerEntryDto("—", null, "OPENING", "Nợ đầu kỳ", null, openingBalance, openingBalance));
        }
        foreach (var m in movements)
        {
            running += m.Amount;
            ledger.Add(new SupplierDebtLedgerEntryDto(m.Code, m.Date, m.Type, m.Label, m.Ref, m.Amount, running));
        }
        ledger.Reverse(); // mới nhất lên đầu giống KiotViet

        // 5. Người tạo nhà cung cấp (tên tài khoản đã tạo)
        string? createdByName = null;
        if (partner.CreatedBy.HasValue)
        {
            createdByName = await _context.SecUsers
                .Where(u => u.UserId == partner.CreatedBy.Value)
                .Select(u => u.FullName ?? u.Username)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var detailDto = new SupplierDetailDto(
            Id: partner.PartnerId.ToString(),
            PartnerId: partner.PartnerId,
            Code: partner.PartnerCode ?? $"NCC{partner.PartnerId:D6}",
            Name: partner.PartnerName ?? "",
            Type: partner.PartnerType ?? "SUPPLIER",
            Phone: partner.Phone,
            Email: partner.Email,
            Address: partner.Address,
            CreditLimit: partner.CreditLimit ?? 0m,
            CurrentPayable: partner.CurrentPayable ?? 0m,
            CurrentDebt: partner.CurrentDebt ?? 0m,
            Status: partner.IsActive != false ? "ACTIVE" : "INACTIVE",
            TotalReceiptsCount: totalCount,
            TotalPurchasedAmount: totalAmount,
            RecentReceipts: recentReceiptDtos,
            WarehouseBreakdown: warehouseBreakdown,
            DebtLedger: ledger,
            CreatedAt: partner.CreatedAt,
            CreatedByName: createdByName,
            OpenReceipts: openReceipts
        );

        return Result.Success(detailDto);
    }
}
