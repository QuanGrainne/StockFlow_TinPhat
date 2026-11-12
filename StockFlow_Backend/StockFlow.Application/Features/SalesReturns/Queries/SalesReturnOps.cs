using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.SalesReturns.DTOs;

namespace StockFlow.Application.Features.SalesReturns.Queries;

public static class SalesReturnOps
{
    public const string Completed = "COMPLETED";
    public const string Cancelled = "CANCELLED";
    public const string ReferenceType = "SALES_RETURN";
    public const string StockInType = "RETURN_SALE";
    public const string StockCancelType = "RETURN_SALE_CANCEL";
    /// <summary>Giao dịch trả tiền cho khách khi khách trả hàng (làm tăng lại công nợ khách)</summary>
    public const string RefundTxType = "CUSTOMER_REFUND";

    /// <summary>SL đã trả theo từng dòng hóa đơn (phiếu trả chưa hủy), trừ phiếu excludeReturnId</summary>
    public static async Task<Dictionary<int, decimal>> ReturnedByOrderItemAsync(
        IStockFlowDbContext context, int invoiceId, int? excludeReturnId, CancellationToken ct)
    {
        var rows = await context.DtlReturnRequestItems.AsNoTracking()
            .Where(i => i.ReturnRequest.SalesOrderId == invoiceId && i.ReturnRequest.Status != Cancelled
                        && i.OrderItemId.HasValue
                        && (!excludeReturnId.HasValue || i.ReturnRequestId != excludeReturnId.Value))
            .GroupBy(i => i.OrderItemId!.Value)
            .Select(g => new { g.Key, Qty = g.Sum(x => x.Quantity ?? 0) })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => r.Qty);
    }
}
