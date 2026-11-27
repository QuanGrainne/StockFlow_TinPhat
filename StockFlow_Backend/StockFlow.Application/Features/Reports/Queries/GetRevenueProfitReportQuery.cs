using System.Linq.Expressions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Helpers;
using StockFlow.Application.Features.SalesReturns.Queries;

namespace StockFlow.Application.Features.Reports.Queries;

/// <summary>
/// UC-88 – Báo cáo doanh thu và lợi nhuận theo kỳ, kho, nhóm hàng; nhóm theo Ngày / Hàng hóa / Khách hàng.
/// Tính ở mức dòng hàng (gộp ở DB) để lọc được theo nhóm hàng:
/// - Doanh thu = tiền dòng hóa đơn (sau giảm giá dòng); Giảm giá = giảm giá hóa đơn phân bổ theo tỷ lệ tiền dòng / tiền hàng hóa đơn.
/// - Hàng trả = SL × giá trả − giảm giá phiếu trả phân bổ theo tỷ lệ tiền hàng trả.
/// - Giá vốn từ thẻ kho bán / hủy bán / trả hàng / hủy phiếu trả (SalesFigures). Theo khách: lần ngược chứng từ của dòng thẻ kho.
/// Không lọc nhóm hàng thì tổng các dòng bằng doanh thu thuần, giá vốn ở báo cáo tổng quan.
/// </summary>
public record GetRevenueProfitReportQuery(
    DateOnly From, DateOnly To, int? WarehouseId, int? CategoryId, string GroupBy, int Page = 1, int PageSize = 50)
    : IRequest<Result<RevenueProfitReportDto>>, IReportPeriodQuery;

public class GetRevenueProfitReportQueryValidator : AbstractValidator<GetRevenueProfitReportQuery>
{
    public GetRevenueProfitReportQueryValidator()
    {
        ReportValidation.AddPeriodRules(this);
        ReportValidation.AddPagingRules(this, x => x.Page, x => x.PageSize);
        RuleFor(x => x.GroupBy)
            .Must(g => RevenueProfitGroupBy.All.Contains((g ?? "").Trim().ToUpperInvariant()))
            .WithMessage("Kiểu nhóm phải là Ngày, Hàng hóa hoặc Khách hàng.");
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue).WithMessage("Nhóm hàng không hợp lệ.");
    }
}

public class GetRevenueProfitReportQueryHandler : IRequestHandler<GetRevenueProfitReportQuery, Result<RevenueProfitReportDto>>
{
    /// <summary>Khách không xác định được (dòng thẻ kho không lần được về hóa đơn / phiếu trả)</summary>
    public const string UnknownCustomerName = "Không xác định";

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetRevenueProfitReportQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    // Dòng trung gian (EF chiếu vào lớp có tên để dùng chung giữa các cách nhóm)
    private sealed class SaleLine
    {
        public DateTime Day { get; set; }
        public int ProductId { get; set; }
        public int PartnerId { get; set; }
        public int CategoryId { get; set; }
        public decimal Quantity { get; set; }
        public decimal Revenue { get; set; }
        public decimal Discount { get; set; }
    }

    private sealed class ReturnLine
    {
        public DateTime Day { get; set; }
        public int ProductId { get; set; }
        public int PartnerId { get; set; }
        public int CategoryId { get; set; }
        public decimal Value { get; set; }
    }

    private sealed class CostLine
    {
        public DateTime Day { get; set; }
        public int ProductId { get; set; }
        public int PartnerId { get; set; }
        public int CategoryId { get; set; }
        public decimal Cost { get; set; }
    }

    private sealed class Sums<TKey>
    {
        public TKey Key { get; set; } = default!;
        public decimal A { get; set; }
        public decimal B { get; set; }
        public decimal C { get; set; }
    }

    public async Task<Result<RevenueProfitReportDto>> Handle(GetRevenueProfitReportQuery request, CancellationToken ct)
    {
        var (warehouseIds, error) = await ReportScope.ResolveWarehousesAsync(_currentUser, request.WarehouseId, ct);
        if (error != null) return Result.Failure<RevenueProfitReportDto>(error);

        var period = ReportPeriod.Of(request.From, request.To);
        var groupBy = request.GroupBy.Trim().ToUpperInvariant();
        var withPartner = groupBy == RevenueProfitGroupBy.Customer;

        var sales = SaleLines(period, warehouseIds);
        var returns = ReturnLines(period, warehouseIds);
        var costs = CostLines(period, warehouseIds, withPartner);
        if (request.CategoryId.HasValue)
        {
            var categoryId = request.CategoryId.Value;
            sales = sales.Where(l => l.CategoryId == categoryId);
            returns = returns.Where(l => l.CategoryId == categoryId);
            costs = costs.Where(l => l.CategoryId == categoryId);
        }

        List<RevenueProfitRowDto> rows = groupBy switch
        {
            RevenueProfitGroupBy.Day => await BuildRowsAsync(sales, returns, costs, l => l.Day, l => l.Day, l => l.Day,
                d => d.ToString("yyyy-MM-dd"), ct),
            RevenueProfitGroupBy.Product => await BuildRowsAsync(sales, returns, costs, l => l.ProductId, l => l.ProductId,
                l => l.ProductId, id => id.ToString(), ct),
            _ => await BuildRowsAsync(sales, returns, costs, l => l.PartnerId, l => l.PartnerId, l => l.PartnerId,
                id => id.ToString(), ct),
        };

        await FillNamesAsync(rows, groupBy, ct);
        rows = groupBy == RevenueProfitGroupBy.Day
            ? rows.OrderBy(r => r.Key).ToList()
            : rows.OrderByDescending(r => r.NetRevenue).ThenBy(r => r.Code).ToList();

        var totals = new RevenueProfitRowDto { Key = "TOTAL", Code = "Tổng cộng" };
        foreach (var r in rows)
        {
            totals.QuantitySold += r.QuantitySold;
            totals.Revenue += r.Revenue;
            totals.Discount += r.Discount;
            totals.ReturnValue += r.ReturnValue;
            totals.CostOfGoodsSold += r.CostOfGoodsSold;
        }
        Complete(totals);

        return Result.Success(new RevenueProfitReportDto
        {
            Items = rows.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToList(),
            TotalCount = rows.Count,
            Page = request.Page,
            PageSize = request.PageSize,
            Totals = totals,
        });
    }

    private IQueryable<SaleLine> SaleLines(ReportPeriod period, List<int> warehouseIds) =>
        SalesFigures.Invoices(_context, period, warehouseIds)
            .SelectMany(o => o.DtlOrderItems.Select(i => new SaleLine
            {
                Day = o.OrderDate!.Value.Date,
                ProductId = i.ProductId,
                PartnerId = o.PartnerId,
                CategoryId = i.Product.CategoryId,
                // SL theo đơn vị cơ bản (dòng bán theo đơn vị quy đổi: SL × hệ số)
                Quantity = (i.Quantity ?? 0) * i.ConversionRate,
                Revenue = i.LineTotal,
                Discount = o.SubTotal > 0 ? o.DiscountAmount * i.LineTotal / o.SubTotal : 0,
            }));

    private IQueryable<ReturnLine> ReturnLines(ReportPeriod period, List<int> warehouseIds) =>
        SalesFigures.Returns(_context, period, warehouseIds)
            .SelectMany(r => r.DtlReturnRequestItems.Select(i => new ReturnLine
            {
                Day = r.RequestDate!.Value.Date,
                ProductId = i.ProductId,
                PartnerId = r.PartnerId,
                CategoryId = i.Product.CategoryId,
                Value = (i.Quantity ?? 0) * i.ReturnPrice
                        - (r.TotalGoodsAmount > 0 ? r.DiscountAmount * (i.Quantity ?? 0) * i.ReturnPrice / r.TotalGoodsAmount : 0),
            }));

    /// <summary>Dòng giá vốn; withPartner = lần ngược khách: phiếu xuất bán → hóa đơn, phiếu trả hàng → khách của phiếu.</summary>
    private IQueryable<CostLine> CostLines(ReportPeriod period, List<int> warehouseIds, bool withPartner)
    {
        var lines = SalesFigures.CogsLines(_context, period, warehouseIds);
        if (!withPartner)
        {
            return lines.Select(t => new CostLine
            {
                Day = t.TransactionDate!.Value.Date,
                ProductId = t.ProductId,
                CategoryId = t.Product.CategoryId,
                Cost = -(t.Quantity ?? 0) * (t.UnitCost ?? 0),
            });
        }

        return lines.Select(t => new CostLine
        {
            Day = t.TransactionDate!.Value.Date,
            ProductId = t.ProductId,
            CategoryId = t.Product.CategoryId,
            Cost = -(t.Quantity ?? 0) * (t.UnitCost ?? 0),
            PartnerId = t.ReferenceType == "STOCK_ISSUE"
                ? _context.TrxStockIssues.Where(s => s.StockIssueId == t.ReferenceId && s.SalesOrder != null)
                    .Select(s => s.SalesOrder!.PartnerId).FirstOrDefault()
                : t.ReferenceType == SalesReturnOps.ReferenceType
                    ? _context.TrxReturnRequests.Where(r => r.ReturnRequestId == t.ReferenceId)
                        .Select(r => r.PartnerId).FirstOrDefault()
                    : 0,
        });
    }

    private static async Task<List<RevenueProfitRowDto>> BuildRowsAsync<TKey>(
        IQueryable<SaleLine> sales, IQueryable<ReturnLine> returns, IQueryable<CostLine> costs,
        Expression<Func<SaleLine, TKey>> saleKey, Expression<Func<ReturnLine, TKey>> returnKey,
        Expression<Func<CostLine, TKey>> costKey, Func<TKey, string> keyText, CancellationToken ct)
        where TKey : notnull
    {
        var saleSums = await sales.GroupBy(saleKey)
            .Select(g => new Sums<TKey> { Key = g.Key, A = g.Sum(l => l.Quantity), B = g.Sum(l => l.Revenue), C = g.Sum(l => l.Discount) })
            .ToListAsync(ct);
        var returnSums = await returns.GroupBy(returnKey)
            .Select(g => new Sums<TKey> { Key = g.Key, A = g.Sum(l => l.Value) })
            .ToListAsync(ct);
        var costSums = await costs.GroupBy(costKey)
            .Select(g => new Sums<TKey> { Key = g.Key, A = g.Sum(l => l.Cost) })
            .ToListAsync(ct);

        var rows = new Dictionary<TKey, RevenueProfitRowDto>();
        RevenueProfitRowDto RowOf(TKey key)
        {
            if (!rows.TryGetValue(key, out var row))
                rows[key] = row = new RevenueProfitRowDto { Key = keyText(key) };
            return row;
        }

        foreach (var s in saleSums)
        {
            var row = RowOf(s.Key);
            row.QuantitySold = s.A;
            row.Revenue = s.B;
            row.Discount = Math.Round(s.C, 2);
        }
        foreach (var r in returnSums) RowOf(r.Key).ReturnValue = Math.Round(r.A, 2);
        foreach (var c in costSums) RowOf(c.Key).CostOfGoodsSold = Math.Round(c.A, 2);

        foreach (var row in rows.Values) Complete(row);
        return rows.Values.ToList();
    }

    private static void Complete(RevenueProfitRowDto row)
    {
        row.NetRevenue = row.Revenue - row.Discount - row.ReturnValue;
        row.GrossProfit = row.NetRevenue - row.CostOfGoodsSold;
        row.MarginPercent = SalesFigures.MarginPercent(row.GrossProfit, row.NetRevenue);
    }

    private async Task FillNamesAsync(List<RevenueProfitRowDto> rows, string groupBy, CancellationToken ct)
    {
        if (groupBy == RevenueProfitGroupBy.Day)
        {
            foreach (var r in rows) r.Code = r.Key;
            return;
        }

        var ids = rows.Select(r => int.Parse(r.Key)).ToList();
        var names = groupBy == RevenueProfitGroupBy.Product
            ? await _context.MstProducts.AsNoTracking().Where(p => ids.Contains(p.ProductId))
                .Select(p => new { Id = p.ProductId, Code = p.ProductCode, Name = p.ProductName })
                .ToDictionaryAsync(p => p.Id, ct)
            : await _context.MstBusinessPartners.AsNoTracking().Where(p => ids.Contains(p.PartnerId))
                .Select(p => new { Id = p.PartnerId, Code = p.PartnerCode, Name = p.PartnerName })
                .ToDictionaryAsync(p => p.Id, ct);

        foreach (var r in rows)
        {
            if (names.TryGetValue(int.Parse(r.Key), out var n))
            {
                r.Code = n.Code ?? "";
                r.Name = n.Name ?? "";
            }
            else
            {
                r.Code = "—";
                r.Name = UnknownCustomerName;
            }
        }
    }
}
