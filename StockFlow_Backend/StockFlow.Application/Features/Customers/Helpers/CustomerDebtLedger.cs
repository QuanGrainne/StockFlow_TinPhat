using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.SalesReturns.Queries;

namespace StockFlow.Application.Features.Customers.Helpers;

/// <summary>
/// Sổ "Nợ cần thu từ khách" (tách nguyên văn từ GetCustomerByIdQuery để dùng chung với báo cáo công nợ UC-86):
/// - Bán hàng (+): đơn hoàn thành (hóa đơn và đơn đặt có trạng thái COMPLETED), giá trị = tổng tiền đơn.
/// - Thanh toán (−): phiếu thu RECEIPT chưa hủy.
/// - Điều chỉnh (±): phiếu điều chỉnh công nợ DEBT_ADJUST chưa hủy.
/// - Trả hàng (−): phiếu trả hàng COMPLETED, giá trị = cần trả khách.
/// - Trả tiền khách (+): CUSTOMER_REFUND chưa hủy (theo phiếu trả hàng hoặc phiếu chi độc lập).
/// Trùng thời gian: hóa đơn → phiếu thu / điều chỉnh (theo TxId) → trả hàng → trả tiền khách.
/// </summary>
public static class CustomerDebtLedger
{
    /// <param name="partnerIds">null = mọi đối tác</param>
    public static async Task<List<DebtMovement>> LoadMovementsAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int>? partnerIds, CancellationToken ct)
    {
        var ids = partnerIds?.ToList();
        var orderQuery = context.TrxOrders.AsNoTracking();
        var txQuery = context.TrxFinancialTransactions.AsNoTracking();
        var returnQuery = context.TrxReturnRequests.AsNoTracking();
        if (ids != null)
        {
            orderQuery = orderQuery.Where(o => ids.Contains(o.PartnerId));
            txQuery = txQuery.Where(t => ids.Contains(t.PartnerId));
            returnQuery = returnQuery.Where(r => ids.Contains(r.PartnerId));
        }

        var orders = await orderQuery
            .Select(o => new { o.OrderId, o.PartnerId, o.OrderCode, o.OrderDate, Total = o.TotalAmount ?? 0, o.Status })
            .ToListAsync(ct);
        var orderInfo = orders.ToDictionary(o => o.OrderId, o => (o.PartnerId, Code: o.OrderCode ?? $"HD{o.OrderId:D6}"));

        var receipts = await txQuery
            .Where(t => t.TxType == "RECEIPT" && (t.Status == null || t.Status != "CANCELLED"))
            .Select(t => new { t.TxId, t.PartnerId, t.TxCode, t.ReferenceType, t.ReferenceId, t.TransactionDate, Amount = t.Amount ?? 0 })
            .ToListAsync(ct);
        var returnRows = await returnQuery
            .Where(r => r.Status == "COMPLETED")
            .Select(r => new { r.ReturnRequestId, r.PartnerId, r.ReturnCode, r.RequestDate, r.TotalAmount })
            .ToListAsync(ct);
        var refundRows = await txQuery
            .Where(t => t.TxType == "CUSTOMER_REFUND" && t.Status != "CANCELLED")
            .Select(t => new { t.TxId, t.PartnerId, t.TxCode, t.ReferenceType, t.ReferenceId, t.TransactionDate, Amount = t.Amount ?? 0 })
            .ToListAsync(ct);
        var adjustRows = await txQuery
            .Where(t => t.TxType == AdjustCustomerDebtCommandHandler.TxType && t.Status != "CANCELLED")
            .Select(t => new { t.TxId, t.PartnerId, t.TxCode, t.TransactionDate, Amount = t.Amount ?? 0 })
            .ToListAsync(ct);

        var movements = orders
            .Where(o => string.Equals(o.Status, CustomerProfileHelper.CompletedStatus, StringComparison.OrdinalIgnoreCase))
            .Select(o => new DebtMovement(o.PartnerId, orderInfo[o.OrderId].Code, o.OrderDate, "SALE", "Bán hàng",
                                          o.OrderId, o.Total, 0, o.OrderId))
            .Concat(receipts.Select(t =>
            {
                var forOrder = t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue
                               && orderInfo.TryGetValue(t.ReferenceId.Value, out var info) && info.PartnerId == t.PartnerId;
                var code = t.TxCode ?? (forOrder ? $"TT{orderInfo[t.ReferenceId!.Value].Code}" : $"PT{t.TxId:D6}");
                return new DebtMovement(t.PartnerId, code, t.TransactionDate, "PAYMENT", "Thanh toán",
                                        forOrder ? t.ReferenceId : null, -t.Amount, 1, t.TxId);
            }))
            .Concat(adjustRows.Select(t => new DebtMovement(t.PartnerId, t.TxCode ?? $"{DebtAdjustCodes.Prefix}{t.TxId:D6}",
                                                            t.TransactionDate, "ADJUST", "Điều chỉnh", null, t.Amount, 1, t.TxId)))
            .Concat(returnRows.Select(r => new DebtMovement(r.PartnerId, r.ReturnCode ?? $"TH{r.ReturnRequestId:D6}", r.RequestDate,
                                                            "RETURN", "Trả hàng", r.ReturnRequestId, -r.TotalAmount, 2, r.ReturnRequestId)))
            // Trả tiền khách theo phiếu trả hàng (REFUND, mở phiếu trả) / phiếu chi trả khách độc lập PC... (DEBT_REFUND)
            .Concat(refundRows.Select(t => new DebtMovement(t.PartnerId, t.TxCode ?? $"PC{t.TxId:D6}", t.TransactionDate,
                                                            t.ReferenceType == SalesReturnOps.ReferenceType ? "REFUND" : "DEBT_REFUND",
                                                            "Trả tiền khách", t.ReferenceId, t.Amount, 3, t.TxId)));

        return DebtMovement.Sort(movements);
    }
}
