using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Helpers;

/// <summary>
/// Ghi phiếu thu trả nợ cũ của khách theo cùng quy ước với màn Thu nợ (CreateCustomerPaymentCommand):
/// - Trừ lần lượt vào các hóa đơn còn nợ cũ nhất trước: mỗi hóa đơn 1 phiếu TT + mã hóa đơn (TTHD000085, lần sau TTHD000085-1...),
///   cập nhật Đã trả / Còn nợ / trạng thái thanh toán của hóa đơn.
/// - Phần nợ không gắn hóa đơn (VD nợ do điều chỉnh công nợ): phiếu thu chung PT000001...
/// Không đổi CurrentDebt của khách — nơi gọi tự trừ (để gộp với các biến động nợ khác trong cùng giao dịch).
/// Dùng cho "Tính vào công nợ" khi khách trả thừa ở màn Bán hàng.
/// </summary>
public static class CustomerDebtPaymentOps
{
    private const string VoucherSequence = "stockflow.seq_customer_receipt";
    private const string VoucherPrefix = "PT";
    private const string ReceiptTxType = "RECEIPT";
    private const string SalesOrderRef = "SALES_ORDER";

    /// <param name="description">Ghi chú của các phiếu thu (VD "Tiền thừa từ HD00063")</param>
    /// <returns>Mã các phiếu thu đã tạo</returns>
    public static async Task<List<string>> ApplyAsync(
        IStockFlowDbContext context,
        int partnerId,
        decimal amount,
        int? excludeOrderId,
        string paymentMethod,
        DateTime paymentDate,
        int userId,
        CancellationToken ct,
        string? description = null)
    {
        var codes = new List<string>();
        if (amount <= 0) return codes;

        var openOrders = await context.TrxOrders
            .Where(o => o.PartnerId == partnerId && o.Status != null && o.Status.ToUpper() == "COMPLETED"
                        && (o.OutstandingAmount ?? 0) > 0
                        && (!excludeOrderId.HasValue || o.OrderId != excludeOrderId.Value))
            .OrderBy(o => o.OrderDate).ThenBy(o => o.OrderId)
            .ToListAsync(ct);

        var openIds = openOrders.Select(o => o.OrderId).ToList();
        var existingCodes = openIds.Count == 0
            ? new List<(int OrderId, string? Code)>()
            : (await context.TrxFinancialTransactions.AsNoTracking()
                .Where(t => t.TxType == ReceiptTxType && t.ReferenceType == SalesOrderRef &&
                            t.ReferenceId != null && openIds.Contains(t.ReferenceId.Value))
                .Select(t => new { OrderId = t.ReferenceId!.Value, t.TxCode })
                .ToListAsync(ct))
                .Select(t => (OrderId: t.OrderId, Code: (string?)t.TxCode))
                .ToList();

        TrxFinancialTransaction NewTx(string code, decimal txAmount, string? refType, int? refId) => new()
        {
            PartnerId = partnerId,
            TxType = ReceiptTxType,
            TxCode = code,
            Amount = txAmount,
            PaymentMethod = paymentMethod,
            ReferenceType = refType,
            ReferenceId = refId,
            TransactionDate = paymentDate,
            CreatedBy = userId,
            Status = "COMPLETED",
            Description = description,
        };

        var leftover = amount;
        foreach (var order in openOrders)
        {
            if (leftover <= 0) break;
            var take = Math.Min(order.OutstandingAmount ?? 0, leftover);
            if (take <= 0) continue;

            var baseCode = $"TT{order.OrderCode}";
            var usedForOrder = existingCodes.Where(e => e.OrderId == order.OrderId).ToList();
            var used = new HashSet<string>(usedForOrder.Select(e => e.Code ?? baseCode), StringComparer.OrdinalIgnoreCase);
            var n = usedForOrder.Count;
            var code = n == 0 ? baseCode : $"{baseCode}-{n}";
            while (used.Contains(code)) code = $"{baseCode}-{++n}";

            context.TrxFinancialTransactions.Add(NewTx(code, take, SalesOrderRef, order.OrderId));
            codes.Add(code);

            order.PaidAmount = (order.PaidAmount ?? 0) + take;
            order.OutstandingAmount = Math.Max(0, (order.OutstandingAmount ?? 0) - take);
            order.PaymentStatus = order.OutstandingAmount > 0 ? "PARTIAL" : "PAID";
            order.UpdatedAt = VietnamTime.Now;
            order.UpdatedBy = userId;
            leftover -= take;
        }

        if (leftover > 0)
        {
            var seq = await context.GetNextSequenceValueAsync(VoucherSequence, ct);
            var ptCode = $"{VoucherPrefix}{seq:D6}";
            context.TrxFinancialTransactions.Add(NewTx(ptCode, leftover, null, null));
            codes.Add(ptCode);
        }

        return codes;
    }
}
