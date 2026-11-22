using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.SalesReturns.Queries;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Reports.Helpers;

/// <summary>
/// Nguồn số liệu bán hàng dùng chung cho các báo cáo (tiền chưa VAT – BR-55), đã lọc theo kỳ và kho:
/// - Doanh thu: hóa đơn (order_type INVOICE, status COMPLETED) theo order_date.
/// - Hàng trả: phiếu trả hàng bán COMPLETED theo request_date, giá trị = tiền hàng trả − giảm giá phiếu trả.
/// - Giá vốn hàng bán: thẻ kho các loại bán / hủy bán / trả hàng / hủy phiếu trả, giá trị = −quantity × unit_cost
///   (bán ghi quantity âm nên cộng giá vốn; hủy hóa đơn, khách trả ghi quantity dương nên trừ; hủy phiếu trả cộng lại).
/// </summary>
public static class SalesFigures
{
    public const string InvoiceOrderType = "INVOICE";
    public const string CompletedStatus = "COMPLETED";

    /// <summary>Xuất bán – CreatePosOrderCommand ghi thẻ kho "ISSUE_SALE"</summary>
    public const string SaleIssueType = "ISSUE_SALE";

    /// <summary>Hủy hóa đơn – CancelOrderCommandHandler.CancelTransactionType</summary>
    public const string SaleCancelType = CancelOrderCommandHandler.CancelTransactionType;

    /// <summary>Khách trả hàng – SalesReturnOps.StockInType</summary>
    public const string SaleReturnType = SalesReturnOps.StockInType;

    /// <summary>Hủy phiếu trả hàng – SalesReturnOps.StockCancelType</summary>
    public const string SaleReturnCancelType = SalesReturnOps.StockCancelType;

    public static readonly string[] CogsTransactionTypes =
        { SaleIssueType, SaleCancelType, SaleReturnType, SaleReturnCancelType };

    /// <summary>Hóa đơn hoàn thành trong kỳ tại các kho được phép.</summary>
    public static IQueryable<TrxOrder> Invoices(
        IStockFlowDbContext context, ReportPeriod period, IReadOnlyCollection<int> warehouseIds)
    {
        var ids = warehouseIds.ToList();
        return context.TrxOrders.AsNoTracking()
            .Where(o => o.OrderType == InvoiceOrderType && o.Status == CompletedStatus
                        && o.OrderDate >= period.Start && o.OrderDate < period.EndExclusive
                        && o.WarehouseId != null && ids.Contains(o.WarehouseId.Value));
    }

    /// <summary>Phiếu trả hàng bán hoàn thành trong kỳ tại các kho được phép.</summary>
    public static IQueryable<TrxReturnRequest> Returns(
        IStockFlowDbContext context, ReportPeriod period, IReadOnlyCollection<int> warehouseIds)
    {
        var ids = warehouseIds.ToList();
        return context.TrxReturnRequests.AsNoTracking()
            .Where(r => r.Status == SalesReturnOps.Completed
                        && r.RequestDate >= period.Start && r.RequestDate < period.EndExclusive
                        && r.WarehouseId != null && ids.Contains(r.WarehouseId.Value));
    }

    /// <summary>Dòng thẻ kho dùng tính giá vốn hàng bán trong kỳ tại các kho được phép.</summary>
    public static IQueryable<TrxInventoryTransaction> CogsLines(
        IStockFlowDbContext context, ReportPeriod period, IReadOnlyCollection<int> warehouseIds)
    {
        var ids = warehouseIds.ToList();
        var types = CogsTransactionTypes;
        return context.TrxInventoryTransactions.AsNoTracking()
            .Where(t => t.TransactionType != null && types.Contains(t.TransactionType)
                        && t.TransactionDate >= period.Start && t.TransactionDate < period.EndExclusive
                        && ids.Contains(t.WarehouseId));
    }

    /// <summary>Tỷ suất lợi nhuận gộp (%), 0 khi doanh thu thuần = 0.</summary>
    public static decimal MarginPercent(decimal grossProfit, decimal netRevenue) =>
        netRevenue == 0 ? 0 : Math.Round(grossProfit / netRevenue * 100, 2);
}
