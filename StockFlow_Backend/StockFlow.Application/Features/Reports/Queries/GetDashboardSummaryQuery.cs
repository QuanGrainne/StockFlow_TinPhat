using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Reports.Queries;

/// <summary>
/// UC-90 – Báo cáo tổng quan cho Manager: KPI bán hàng / tồn kho / công nợ, doanh thu – lợi nhuận theo ngày,
/// top 10 hàng bán, việc chờ xử lý, hàng dưới định mức. Chỉ đọc dữ liệu.
/// Số liệu theo kho chỉ tính các kho được phân quyền (BR-04); công nợ không lọc theo kho.
/// </summary>
public record GetDashboardSummaryQuery(DateOnly From, DateOnly To, int? WarehouseId)
    : IRequest<Result<DashboardSummaryDto>>, IReportPeriodQuery;

public class GetDashboardSummaryQueryValidator : AbstractValidator<GetDashboardSummaryQuery>
{
    public GetDashboardSummaryQueryValidator()
    {
        ReportValidation.AddPeriodRules(this);
    }
}

public class GetDashboardSummaryQueryHandler : IRequestHandler<GetDashboardSummaryQuery, Result<DashboardSummaryDto>>
{
    public const int TopProductLimit = 10;
    public const int LowStockLimit = 20;

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetDashboardSummaryQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<DashboardSummaryDto>> Handle(GetDashboardSummaryQuery request, CancellationToken ct)
    {
        var (warehouseIds, error) = await ReportScope.ResolveWarehousesAsync(_currentUser, request.WarehouseId, ct);
        if (error != null) return Result.Failure<DashboardSummaryDto>(error);

        var period = ReportPeriod.Of(request.From, request.To);

        // ── Doanh thu, hàng trả, giá vốn theo ngày (gộp ở DB) ──
        var invoiceByDay = await SalesFigures.Invoices(_context, period, warehouseIds)
            .GroupBy(o => o.OrderDate!.Value.Date)
            .Select(g => new { Day = g.Key, Amount = g.Sum(o => o.TotalAmount ?? 0), Count = g.Count() })
            .ToListAsync(ct);
        var returnByDay = await SalesFigures.Returns(_context, period, warehouseIds)
            .GroupBy(r => r.RequestDate!.Value.Date)
            .Select(g => new { Day = g.Key, Amount = g.Sum(r => r.TotalGoodsAmount - r.DiscountAmount) })
            .ToListAsync(ct);
        var cogsByDay = await SalesFigures.CogsLines(_context, period, warehouseIds)
            .GroupBy(t => t.TransactionDate!.Value.Date)
            .Select(g => new { Day = g.Key, Amount = g.Sum(t => -(t.Quantity ?? 0) * (t.UnitCost ?? 0)) })
            .ToListAsync(ct);

        var invoiceMap = invoiceByDay.ToDictionary(x => DateOnly.FromDateTime(x.Day), x => x.Amount);
        var returnMap = returnByDay.ToDictionary(x => DateOnly.FromDateTime(x.Day), x => x.Amount);
        var cogsMap = cogsByDay.ToDictionary(x => DateOnly.FromDateTime(x.Day), x => x.Amount);

        var daily = new List<DailyRevenuePointDto>();
        for (var day = request.From; day <= request.To; day = day.AddDays(1))
        {
            var net = invoiceMap.GetValueOrDefault(day) - returnMap.GetValueOrDefault(day);
            daily.Add(new DailyRevenuePointDto { Date = day, NetRevenue = net, GrossProfit = net - cogsMap.GetValueOrDefault(day) });
        }

        var invoiceRevenue = invoiceByDay.Sum(x => x.Amount);
        var invoiceCount = invoiceByDay.Sum(x => x.Count);
        var returnValue = returnByDay.Sum(x => x.Amount);
        var netRevenue = invoiceRevenue - returnValue;
        var cogs = cogsByDay.Sum(x => x.Amount);
        var grossProfit = netRevenue - cogs;

        // ── Tồn kho và công nợ hiện tại ──
        var inventoryValue = await _context.TrxInventoryBalances.AsNoTracking()
            .Where(b => warehouseIds.Contains(b.WarehouseId))
            .SumAsync(b => (b.Quantity ?? 0) * (b.UnitCost ?? 0), ct);
        var receivable = await _context.MstBusinessPartners.AsNoTracking()
            .Where(p => p.PartnerType == "CUSTOMER" || p.PartnerType == "BOTH")
            .SumAsync(p => p.CurrentDebt ?? 0, ct);
        var payable = await _context.MstBusinessPartners.AsNoTracking()
            .Where(p => p.PartnerType == "SUPPLIER" || p.PartnerType == "BOTH")
            .SumAsync(p => p.CurrentPayable ?? 0, ct);

        var dto = new DashboardSummaryDto
        {
            From = request.From,
            To = request.To,
            WarehouseId = request.WarehouseId,
            Kpi = new DashboardKpiDto
            {
                InvoiceRevenue = invoiceRevenue,
                ReturnValue = returnValue,
                NetRevenue = netRevenue,
                CostOfGoodsSold = cogs,
                GrossProfit = grossProfit,
                GrossMarginPercent = SalesFigures.MarginPercent(grossProfit, netRevenue),
                InvoiceCount = invoiceCount,
                AverageOrderValue = invoiceCount == 0 ? 0 : Math.Round(invoiceRevenue / invoiceCount, 0),
                InventoryValue = inventoryValue,
                Receivable = receivable,
                Payable = payable,
            },
            Daily = daily,
            TopProducts = await GetTopProductsAsync(period, warehouseIds, ct),
            Pending = await GetPendingTasksAsync(warehouseIds, ct),
        };
        (dto.LowStock, dto.LowStockTotal) = await GetLowStockAsync(warehouseIds, ct);
        return Result.Success(dto);
    }

    private async Task<List<TopProductDto>> GetTopProductsAsync(ReportPeriod period, List<int> warehouseIds, CancellationToken ct)
    {
        var top = await SalesFigures.Invoices(_context, period, warehouseIds)
            .SelectMany(o => o.DtlOrderItems)
            .GroupBy(i => i.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                Quantity = g.Sum(i => i.Quantity ?? 0),
                Revenue = g.Sum(i => i.LineTotal != 0 ? i.LineTotal : (i.Quantity ?? 0) * (i.UnitPrice ?? 0)),
            })
            .OrderByDescending(x => x.Revenue)
            .ThenBy(x => x.ProductId)
            .Take(TopProductLimit)
            .ToListAsync(ct);

        var ids = top.Select(x => x.ProductId).ToList();
        var products = await _context.MstProducts.AsNoTracking()
            .Where(p => ids.Contains(p.ProductId))
            .Select(p => new { p.ProductId, p.ProductCode, p.ProductName })
            .ToDictionaryAsync(p => p.ProductId, ct);

        return top.Select(x => new TopProductDto
        {
            ProductId = x.ProductId,
            ProductCode = products.GetValueOrDefault(x.ProductId)?.ProductCode ?? "",
            ProductName = products.GetValueOrDefault(x.ProductId)?.ProductName ?? "",
            Quantity = x.Quantity,
            Revenue = x.Revenue,
        }).ToList();
    }

    private async Task<PendingTasksDto> GetPendingTasksAsync(List<int> warehouseIds, CancellationToken ct) => new()
    {
        CreditRequests = await _context.TrxCreditLimitRequests.AsNoTracking()
            .CountAsync(r => r.Status == CreditRequestStatus.Pending, ct),
        ProductionPlansPendingApproval = await _context.TrxProductionPlans.AsNoTracking()
            .CountAsync(p => p.Status == ProductionPlanStatus.PendingApproval, ct),
        ProductionOrdersInProgress = await _context.TrxProductionOrders.AsNoTracking()
            .CountAsync(o => o.Status == ProductionOrderStatus.InProgress, ct),
        TransfersInTransit = await _context.TrxStockTransfers.AsNoTracking()
            .CountAsync(t => t.Status == TransferStatus.InTransit && warehouseIds.Contains(t.DestWarehouseId), ct),
    };

    /// <summary>
    /// Hàng dưới định mức theo từng kho: tồn (cộng mọi vị trí / lô) ≤ điểm đặt hàng lại hoặc ≤ tồn an toàn tối thiểu.
    /// Chỉ xét hàng đang kinh doanh có ít nhất một ngưỡng &gt; 0 và đã có dòng tồn tại kho.
    /// </summary>
    private async Task<(List<LowStockItemDto> Items, int Total)> GetLowStockAsync(List<int> warehouseIds, CancellationToken ct)
    {
        var products = await _context.MstProducts.AsNoTracking()
            .Where(p => p.IsActive != false && ((p.ReorderPoint ?? 0) > 0 || (p.MinSafeStock ?? 0) > 0))
            .Select(p => new { p.ProductId, p.ProductCode, p.ProductName, p.ReorderPoint, p.MinSafeStock })
            .ToDictionaryAsync(p => p.ProductId, ct);
        if (products.Count == 0) return (new List<LowStockItemDto>(), 0);

        var productIds = products.Keys.ToList();
        var stock = await _context.TrxInventoryBalances.AsNoTracking()
            .Where(b => warehouseIds.Contains(b.WarehouseId) && productIds.Contains(b.ProductId))
            .GroupBy(b => new { b.WarehouseId, b.ProductId })
            .Select(g => new { g.Key.WarehouseId, g.Key.ProductId, Quantity = g.Sum(b => b.Quantity ?? 0) })
            .ToListAsync(ct);

        var low = stock
            .Select(s => new { Stock = s, Product = products[s.ProductId] })
            .Select(x => new
            {
                x.Stock,
                x.Product,
                Threshold = Math.Max(x.Product.ReorderPoint ?? 0, x.Product.MinSafeStock ?? 0),
            })
            .Where(x => x.Stock.Quantity <= x.Threshold)
            .OrderBy(x => x.Stock.Quantity - x.Threshold)
            .ThenBy(x => x.Product.ProductCode)
            .ToList();
        if (low.Count == 0) return (new List<LowStockItemDto>(), 0);

        var warehouseNames = await _context.MstWarehouses.AsNoTracking()
            .Where(w => warehouseIds.Contains(w.WarehouseId))
            .ToDictionaryAsync(w => w.WarehouseId, w => w.WarehouseName ?? "", ct);

        var items = low.Take(LowStockLimit).Select(x => new LowStockItemDto
        {
            WarehouseId = x.Stock.WarehouseId,
            WarehouseName = warehouseNames.GetValueOrDefault(x.Stock.WarehouseId) ?? "",
            ProductId = x.Product.ProductId,
            ProductCode = x.Product.ProductCode ?? "",
            ProductName = x.Product.ProductName ?? "",
            Quantity = x.Stock.Quantity,
            ReorderPoint = x.Product.ReorderPoint,
            MinSafeStock = x.Product.MinSafeStock,
        }).ToList();
        return (items, low.Count);
    }
}
