using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Helpers;

namespace StockFlow.Application.Features.Reports.Queries;

/// <summary>
/// UC-87 – Báo cáo nhập – xuất – tồn theo kho và kỳ, đọc từ thẻ kho (trx_inventory_transactions), mỗi dòng = 1 hàng tại 1 kho:
/// - Tồn đầu = balance_after của dòng thẻ kho cuối cùng trước From (theo kho + hàng; thứ tự thời gian rồi id).
/// - Nhập / xuất = tổng quantity dương / âm trong kỳ, tách theo nhóm loại giao dịch (StockMovementGroups).
/// - Tồn cuối = tồn đầu + nhập − xuất; lệch balance_after của dòng thẻ kho cuối kỳ thì đánh dấu, không sửa dữ liệu.
/// - Kỳ kéo tới hôm nay: so thêm với tồn hiện tại (trx_inventory_balances), cũng chỉ đánh dấu.
/// - Giá trị: đầu / cuối kỳ = số lượng × giá vốn sau dòng thẻ kho cuối trước kỳ / cuối kỳ;
///   nhập / xuất = Σ |quantity| × giá vốn sau giao dịch (unit_cost) của từng dòng.
/// </summary>
public record GetStockMovementReportQuery(
    DateOnly From, DateOnly To, int? WarehouseId, int? CategoryId, bool OnlyMismatch = false, int Page = 1, int PageSize = 50)
    : IRequest<Result<StockMovementReportDto>>, IReportPeriodQuery;

public class GetStockMovementReportQueryValidator : AbstractValidator<GetStockMovementReportQuery>
{
    public GetStockMovementReportQueryValidator()
    {
        ReportValidation.AddPeriodRules(this);
        ReportValidation.AddPagingRules(this, x => x.Page, x => x.PageSize);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue).WithMessage("Nhóm hàng không hợp lệ.");
    }
}

public class GetStockMovementReportQueryHandler : IRequestHandler<GetStockMovementReportQuery, Result<StockMovementReportDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetStockMovementReportQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    private sealed class CardPoint
    {
        public int WarehouseId { get; set; }
        public int ProductId { get; set; }
        public decimal? BalanceAfter { get; set; }
        public decimal? UnitCost { get; set; }
    }

    private sealed class TypeSums
    {
        public int WarehouseId { get; set; }
        public int ProductId { get; set; }
        public string? TransactionType { get; set; }
        public decimal InQuantity { get; set; }
        public decimal OutQuantity { get; set; }
        public decimal InValue { get; set; }
        public decimal OutValue { get; set; }
    }

    public async Task<Result<StockMovementReportDto>> Handle(GetStockMovementReportQuery request, CancellationToken ct)
    {
        var (warehouseIds, error) = await ReportScope.ResolveWarehousesAsync(_currentUser, request.WarehouseId, ct);
        if (error != null) return Result.Failure<StockMovementReportDto>(error);

        var period = ReportPeriod.Of(request.From, request.To);
        var cards = _context.TrxInventoryTransactions.AsNoTracking().Where(t => warehouseIds.Contains(t.WarehouseId));
        if (request.CategoryId.HasValue)
        {
            var categoryId = request.CategoryId.Value;
            cards = cards.Where(t => t.Product.CategoryId == categoryId);
        }

        var opening = (await LastCardBeforeAsync(cards, period.Start, ct)).ToDictionary(c => (c.WarehouseId, c.ProductId));
        var closing = (await LastCardBeforeAsync(cards, period.EndExclusive, ct)).ToDictionary(c => (c.WarehouseId, c.ProductId));

        var movements = await cards
            .Where(t => t.TransactionDate >= period.Start && t.TransactionDate < period.EndExclusive)
            .GroupBy(t => new { t.WarehouseId, t.ProductId, t.TransactionType })
            .Select(g => new TypeSums
            {
                WarehouseId = g.Key.WarehouseId,
                ProductId = g.Key.ProductId,
                TransactionType = g.Key.TransactionType,
                InQuantity = g.Sum(t => t.Quantity > 0 ? t.Quantity.Value : 0),
                OutQuantity = g.Sum(t => t.Quantity < 0 ? -t.Quantity.Value : 0),
                InValue = g.Sum(t => t.Quantity > 0 ? t.Quantity.Value * (t.UnitCost ?? 0) : 0),
                OutValue = g.Sum(t => t.Quantity < 0 ? -t.Quantity.Value * (t.UnitCost ?? 0) : 0),
            })
            .ToListAsync(ct);

        // Kỳ kéo tới hôm nay: so với tồn hiện tại
        Dictionary<(int, int), decimal>? current = null;
        if (request.To >= DateOnly.FromDateTime(VietnamTime.Now))
        {
            var balances = _context.TrxInventoryBalances.AsNoTracking().Where(b => warehouseIds.Contains(b.WarehouseId));
            if (request.CategoryId.HasValue)
            {
                var categoryId = request.CategoryId.Value;
                balances = balances.Where(b => b.Product.CategoryId == categoryId);
            }
            current = (await balances
                    .GroupBy(b => new { b.WarehouseId, b.ProductId })
                    .Select(g => new { g.Key.WarehouseId, g.Key.ProductId, Quantity = g.Sum(b => b.Quantity ?? 0) })
                    .ToListAsync(ct))
                .ToDictionary(x => (x.WarehouseId, x.ProductId), x => x.Quantity);
        }

        // ── Ghép dòng theo (kho, hàng) ──
        var rows = new Dictionary<(int WarehouseId, int ProductId), StockMovementRowDto>();
        StockMovementRowDto RowOf((int WarehouseId, int ProductId) key)
        {
            if (!rows.TryGetValue(key, out var row))
            {
                rows[key] = row = new StockMovementRowDto
                {
                    Key = $"{key.WarehouseId}-{key.ProductId}",
                    WarehouseId = key.WarehouseId,
                    ProductId = key.ProductId,
                };
            }
            return row;
        }

        foreach (var (key, card) in opening)
        {
            if ((card.BalanceAfter ?? 0) == 0) continue;
            var row = RowOf(key);
            row.OpeningQuantity = card.BalanceAfter ?? 0;
            row.OpeningValue = Math.Round(row.OpeningQuantity * (card.UnitCost ?? 0), 2);
        }
        foreach (var m in movements)
        {
            var row = RowOf((m.WarehouseId, m.ProductId));
            var group = StockMovementGroups.GroupOf(m.TransactionType);
            row.InQuantity += m.InQuantity;
            row.OutQuantity += m.OutQuantity;
            row.InValue += m.InValue;
            row.OutValue += m.OutValue;
            StockMovementGroups.Add(row.InByGroup, group, m.InQuantity);
            StockMovementGroups.Add(row.OutByGroup, group, m.OutQuantity);
        }
        if (current != null)
        {
            foreach (var (key, qty) in current)
                if (qty != 0) RowOf(key);
        }

        foreach (var (key, row) in rows)
        {
            row.InValue = Math.Round(row.InValue, 2);
            row.OutValue = Math.Round(row.OutValue, 2);
            row.ClosingQuantity = row.OpeningQuantity + row.InQuantity - row.OutQuantity;
            if (closing.TryGetValue(key, out var last))
            {
                row.ClosingValue = Math.Round(row.ClosingQuantity * (last.UnitCost ?? 0), 2);
                row.LedgerBalanceAfter = last.BalanceAfter;
                row.IsLedgerMismatch = last.BalanceAfter.HasValue && last.BalanceAfter.Value != row.ClosingQuantity;
            }
            if (current != null)
            {
                row.CurrentQuantity = current.GetValueOrDefault(key);
                row.IsCurrentMismatch = row.CurrentQuantity.Value != row.ClosingQuantity;
            }
        }

        await FillNamesAsync(rows.Values, ct);

        var all = rows.Values
            .OrderBy(r => r.WarehouseCode).ThenBy(r => r.ProductCode).ThenBy(r => r.ProductId)
            .ToList();
        var ledgerMismatch = all.Count(r => r.IsLedgerMismatch);
        var currentMismatch = all.Count(r => r.IsCurrentMismatch);
        if (request.OnlyMismatch) all = all.Where(r => r.IsLedgerMismatch || r.IsCurrentMismatch).ToList();

        return Result.Success(new StockMovementReportDto
        {
            Items = all.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToList(),
            TotalCount = all.Count,
            Page = request.Page,
            PageSize = request.PageSize,
            Totals = Sum(all),
            LedgerMismatchCount = ledgerMismatch,
            CurrentMismatchCount = currentMismatch,
        });
    }

    /// <summary>Dòng thẻ kho cuối cùng (theo thời gian rồi id) trước mốc, của từng (kho, hàng).</summary>
    private static Task<List<CardPoint>> LastCardBeforeAsync(
        IQueryable<StockFlow.Domain.Entities.TrxInventoryTransaction> cards, DateTime before, CancellationToken ct) =>
        cards
            .Where(t => t.TransactionDate < before)
            .GroupBy(t => new { t.WarehouseId, t.ProductId })
            .Select(g => g
                .OrderByDescending(t => t.TransactionDate)
                .ThenByDescending(t => t.TransactionId)
                .Select(t => new CardPoint
                {
                    WarehouseId = t.WarehouseId,
                    ProductId = t.ProductId,
                    BalanceAfter = t.BalanceAfter,
                    UnitCost = t.UnitCost,
                })
                .First())
            .ToListAsync(ct);

    private async Task FillNamesAsync(IEnumerable<StockMovementRowDto> rows, CancellationToken ct)
    {
        var list = rows.ToList();
        var productIds = list.Select(r => r.ProductId).Distinct().ToList();
        var warehouseIds = list.Select(r => r.WarehouseId).Distinct().ToList();
        var products = await _context.MstProducts.AsNoTracking()
            .Where(p => productIds.Contains(p.ProductId))
            .Select(p => new { p.ProductId, p.ProductCode, p.ProductName, UnitName = p.BaseUnit.UnitName })
            .ToDictionaryAsync(p => p.ProductId, ct);
        var warehouses = await _context.MstWarehouses.AsNoTracking()
            .Where(w => warehouseIds.Contains(w.WarehouseId))
            .Select(w => new { w.WarehouseId, w.WarehouseCode, w.WarehouseName })
            .ToDictionaryAsync(w => w.WarehouseId, ct);

        foreach (var r in list)
        {
            if (products.TryGetValue(r.ProductId, out var p))
            {
                r.ProductCode = p.ProductCode ?? "";
                r.ProductName = p.ProductName ?? "";
                r.UnitName = p.UnitName ?? "";
            }
            if (warehouses.TryGetValue(r.WarehouseId, out var w))
            {
                r.WarehouseCode = w.WarehouseCode ?? "";
                r.WarehouseName = w.WarehouseName ?? "";
            }
        }
    }

    private static StockMovementRowDto Sum(IEnumerable<StockMovementRowDto> rows)
    {
        var total = new StockMovementRowDto { Key = "TOTAL", ProductCode = "Tổng cộng" };
        foreach (var r in rows)
        {
            total.OpeningQuantity += r.OpeningQuantity;
            total.OpeningValue += r.OpeningValue;
            total.InQuantity += r.InQuantity;
            total.InValue += r.InValue;
            total.OutQuantity += r.OutQuantity;
            total.OutValue += r.OutValue;
            total.ClosingQuantity += r.ClosingQuantity;
            total.ClosingValue += r.ClosingValue;
            StockMovementGroups.AddAll(total.InByGroup, r.InByGroup);
            StockMovementGroups.AddAll(total.OutByGroup, r.OutByGroup);
        }
        return total;
    }
}
