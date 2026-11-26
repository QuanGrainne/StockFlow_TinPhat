using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.SalesReturns.DTOs;
using StockFlow.Domain.Entities;

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

    /// <summary>
    /// Giảm giá hóa đơn phân bổ cho hàng trả: giảm giá tổng hóa đơn × (giá trị hàng trả theo giá bán gốc
    /// ÷ tổng tiền hàng của hóa đơn), làm tròn tới đồng. Hàng trả chỉ được hoàn đúng số khách đã thực trả cho hàng đó.
    /// </summary>
    /// <param name="invoiceSubTotal">Tổng tiền hàng của hóa đơn (sau giảm giá từng dòng, trước giảm giá hóa đơn)</param>
    /// <param name="invoiceDiscount">Giảm giá tổng hóa đơn</param>
    /// <param name="returnGoodsAtSalePrice">Giá trị hàng trả theo giá bán trên hóa đơn (SL trả × giá bán)</param>
    public static decimal AllocateInvoiceDiscount(decimal invoiceSubTotal, decimal invoiceDiscount, decimal returnGoodsAtSalePrice)
    {
        if (invoiceSubTotal <= 0 || invoiceDiscount <= 0 || returnGoodsAtSalePrice <= 0) return 0;
        var allocated = Math.Round(invoiceDiscount * returnGoodsAtSalePrice / invoiceSubTotal, 0, MidpointRounding.AwayFromZero);
        return Math.Min(invoiceDiscount, allocated);
    }

    /// <summary>Tổng tiền hàng của hóa đơn: SubTotal đã lưu, hóa đơn cũ chưa có thì cộng lại từ các dòng</summary>
    public static decimal InvoiceSubTotal(TrxOrder order) =>
        order.SubTotal > 0
            ? order.SubTotal
            : order.DtlOrderItems.Sum(i => i.LineTotal > 0 ? i.LineTotal : Math.Round((i.Quantity ?? 0) * (i.UnitPrice ?? 0), 2));

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
