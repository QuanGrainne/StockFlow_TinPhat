using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Stocktakes.Helpers;

/// <summary>
/// Nghiệp vụ kiểm kho (giống KiotViet):
/// - Phiếu tạm (DRAFT): ghi số lượng thực tế, chưa đổi tồn kho.
/// - Hoàn thành = Cân bằng kho (BALANCED): tồn kho của từng hàng được đặt bằng SL thực tế
///   (chênh lệch tính lại theo tồn hiện tại lúc cân bằng), ghi thẻ kho STOCKTAKE_IN / STOCKTAKE_OUT, giá vốn giữ nguyên.
/// - Hủy (CANCELLED): phiếu tạm chỉ đổi trạng thái; phiếu đã cân bằng thì đảo lại phần chênh lệch đã điều chỉnh.
/// - Gộp phiếu: các phiếu tạm cùng kho → 1 phiếu tạm mới (SL thực tế cộng dồn), các phiếu cũ chuyển sang Đã hủy.
/// </summary>
public static class StocktakeLogic
{
    public const string Draft = "DRAFT";
    public const string Balanced = "BALANCED";
    public const string Cancelled = "CANCELLED";
    public const string ReferenceType = "STOCKTAKE";

    public static bool Is(string? status, string expected) =>
        string.Equals(status, expected, StringComparison.OrdinalIgnoreCase);

    public static Task<TrxStocktake?> LoadAsync(IStockFlowDbContext context, int id, CancellationToken ct) =>
        context.TrxStocktakes
            .Include(t => t.Warehouse)
            .Include(t => t.ConductedByNavigation)
            .Include(t => t.DtlStocktakeItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .FirstOrDefaultAsync(t => t.StocktakeId == id, ct);

    /// <summary>Mã phiếu: dùng mã người dùng nhập (không trùng) hoặc sinh KK000001 từ sequence (bỏ qua mã đã có).</summary>
    public static async Task<Result<string>> ResolveCodeAsync(
        IStockFlowDbContext context, string? requested, int? excludeId, CancellationToken ct)
    {
        var code = requested?.Trim().ToUpperInvariant();
        // Mã "Copy_KK..." (phiếu sao chép) không phải mã thật → tự sinh mã mới
        if (code != null && code.StartsWith("COPY_", StringComparison.Ordinal)) code = null;
        if (!string.IsNullOrEmpty(code))
        {
            var exists = await context.TrxStocktakes.AnyAsync(
                t => t.StocktakeCode == code && (!excludeId.HasValue || t.StocktakeId != excludeId.Value), ct);
            return exists
                ? Result.Failure<string>($"Mã kiểm kho '{code}' đã tồn tại.")
                : Result.Success(code);
        }

        for (var attempt = 0; attempt < 10000; attempt++)
        {
            var seq = await context.GetNextSequenceValueAsync("stockflow.seq_stocktake_code", ct);
            var next = $"KK{seq:D6}";
            if (!await context.TrxStocktakes.AnyAsync(t => t.StocktakeCode == next, ct))
                return Result.Success(next);
        }
        return Result.Failure<string>("Không sinh được mã kiểm kho mới.");
    }

    /// <summary>Ghi lại danh sách hàng của phiếu: tồn kho hệ thống + giá vốn lấy theo thời điểm lưu.</summary>
    public static async Task<Result<bool>> ReplaceItemsAsync(
        IStockFlowDbContext context, TrxStocktake stocktake, IEnumerable<StocktakeItemRequest> requested, int userId, CancellationToken ct)
    {
        var lines = requested
            .Where(i => i.ProductId > 0)
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Actual = g.Last().ActualQty, Reason = g.Last().Reason?.Trim() })
            .ToList();
        if (lines.Count == 0)
            return Result.Failure<bool>("Vui lòng chọn ít nhất 1 hàng hóa để kiểm kho.");
        if (lines.Any(l => l.Actual < 0))
            return Result.Failure<bool>("Số lượng thực tế không được âm.");
        if (lines.Any(l => l.Reason is { Length: > ReasonMaxLength }))
            return Result.Failure<bool>($"Lý do chênh lệch tối đa {ReasonMaxLength} ký tự.");

        var ids = lines.Select(l => l.ProductId).ToList();
        var products = await context.MstProducts.Where(p => ids.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
        var missing = ids.Where(id => !products.ContainsKey(id)).ToList();
        if (missing.Count > 0)
            return Result.Failure<bool>($"Không tìm thấy hàng hóa #{string.Join(", #", missing)}.");

        context.DtlStocktakeItems.RemoveRange(stocktake.DtlStocktakeItems);
        stocktake.DtlStocktakeItems.Clear();

        foreach (var line in lines)
        {
            var (qty, cost) = await TransferStockOps.WarehouseStockAsync(context, stocktake.WarehouseId, products[line.ProductId], ct);
            stocktake.DtlStocktakeItems.Add(new DtlStocktakeItem
            {
                ProductId = line.ProductId,
                Product = products[line.ProductId],
                SystemQty = qty,
                ActualQty = line.Actual,
                Discrepancy = line.Actual - qty,
                DiscrepancyReason = string.IsNullOrWhiteSpace(line.Reason) ? null : line.Reason,
                UnitCost = cost,
                AdjustmentStatus = "PENDING",
                RecordedBy = userId,
            });
        }
        return Result.Success(true);
    }

    public const int ReasonMaxLength = 500;

    /// <summary>
    /// BR-43 / MSG51: mọi dòng có chênh lệch (SL thực tế khác tồn hệ thống) phải có lý do trước khi cân bằng kho.
    /// Gọi sau ReplaceItemsAsync (Discrepancy đã tính theo tồn hiện tại). Trả về thông báo lỗi, hoặc null nếu hợp lệ.
    /// </summary>
    public static string? MissingReasonError(TrxStocktake stocktake)
    {
        var missing = stocktake.DtlStocktakeItems
            .Where(i => (i.Discrepancy ?? 0) != 0 && string.IsNullOrWhiteSpace(i.DiscrepancyReason))
            .Select(i => i.Product?.ProductCode ?? $"#{i.ProductId}")
            .ToList();
        return missing.Count == 0
            ? null
            : $"Vui lòng nhập lý do cho mọi dòng có chênh lệch ({string.Join(", ", missing)}).";
    }

    /// <summary>Cân bằng kho: đặt tồn kho = SL thực tế (chênh lệch tính theo tồn hiện tại), ghi thẻ kho.</summary>
    public static async Task BalanceAsync(IStockFlowDbContext context, TrxStocktake stocktake, int userId, CancellationToken ct)
    {
        var ids = stocktake.DtlStocktakeItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await context.MstProducts.Where(p => ids.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
        var now = VietnamTime.Now;

        foreach (var item in stocktake.DtlStocktakeItems)
        {
            var product = products[item.ProductId];
            var (qty, cost) = await TransferStockOps.WarehouseStockAsync(context, stocktake.WarehouseId, product, ct);
            var actual = item.ActualQty ?? 0;
            var diff = actual - qty;

            item.SystemQty = qty;
            item.Discrepancy = diff;
            item.UnitCost = cost;
            item.AdjustmentStatus = "ADJUSTED";
            item.ApprovedBy = userId;
            item.ApprovalDate = now;

            if (diff > 0)
            {
                await TransferStockOps.InboundAsync(context, stocktake.WarehouseId, product, diff, cost,
                    "STOCKTAKE_IN", stocktake.StocktakeId, userId, ct, ReferenceType);
            }
            else if (diff < 0)
            {
                await TransferStockOps.OutboundAsync(context, stocktake.WarehouseId, product, -diff,
                    "STOCKTAKE_OUT", stocktake.StocktakeId, userId, ct, ReferenceType);
            }
        }

        stocktake.Status = Balanced;
        stocktake.BalancedDate = now;
        stocktake.BalancedBy = userId;
    }

    /// <summary>Hủy phiếu đã cân bằng: đảo lại phần chênh lệch đã điều chỉnh.</summary>
    public static async Task ReverseAsync(IStockFlowDbContext context, TrxStocktake stocktake, int userId, CancellationToken ct)
    {
        var ids = stocktake.DtlStocktakeItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await context.MstProducts.Where(p => ids.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);

        foreach (var item in stocktake.DtlStocktakeItems)
        {
            var diff = item.Discrepancy ?? 0;
            var product = products[item.ProductId];
            if (diff > 0)
            {
                await TransferStockOps.OutboundAsync(context, stocktake.WarehouseId, product, diff,
                    "STOCKTAKE_CANCEL_OUT", stocktake.StocktakeId, userId, ct, ReferenceType);
            }
            else if (diff < 0)
            {
                var cost = item.UnitCost ?? (await TransferStockOps.WarehouseStockAsync(context, stocktake.WarehouseId, product, ct)).UnitCost;
                await TransferStockOps.InboundAsync(context, stocktake.WarehouseId, product, -diff, cost,
                    "STOCKTAKE_CANCEL_IN", stocktake.StocktakeId, userId, ct, ReferenceType);
            }
            item.AdjustmentStatus = "REVERSED";
        }
    }

    public static string AppendNote(string? notes, string text) =>
        string.IsNullOrWhiteSpace(notes) ? text : $"{notes} | {text}";

    public static async Task<Dictionary<int, string>> UserNamesAsync(
        IStockFlowDbContext context, IEnumerable<int?> ids, CancellationToken ct)
    {
        var list = ids.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        if (list.Count == 0) return new Dictionary<int, string>();
        return await context.SecUsers
            .Where(u => list.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, u => u.FullName ?? u.Username ?? $"NV #{u.UserId}", ct);
    }

    public static StocktakeListDto ToListDto(TrxStocktake t, IReadOnlyDictionary<int, string> userNames)
    {
        var items = t.DtlStocktakeItems;
        decimal Value(DtlStocktakeItem i, decimal? qty) => Math.Round((qty ?? 0) * (i.UnitCost ?? 0), 0, MidpointRounding.AwayFromZero);
        var increase = items.Where(i => (i.Discrepancy ?? 0) > 0).ToList();
        var decrease = items.Where(i => (i.Discrepancy ?? 0) < 0).ToList();

        return new StocktakeListDto(
            StocktakeId: t.StocktakeId,
            StocktakeCode: t.StocktakeCode ?? $"KK{t.StocktakeId:D6}",
            StocktakeDate: t.StocktakeDate,
            WarehouseId: t.WarehouseId,
            WarehouseName: t.Warehouse?.WarehouseName ?? $"Kho #{t.WarehouseId}",
            Status: t.Status ?? Draft,
            ItemCount: items.Count,
            TotalActualQty: items.Sum(i => i.ActualQty ?? 0),
            TotalActualValue: items.Sum(i => Value(i, i.ActualQty)),
            IncreaseQty: increase.Sum(i => i.Discrepancy ?? 0),
            IncreaseValue: increase.Sum(i => Value(i, i.Discrepancy)),
            DecreaseQty: decrease.Sum(i => i.Discrepancy ?? 0),
            DecreaseValue: decrease.Sum(i => Value(i, i.Discrepancy)),
            TotalDiscrepancyQty: items.Sum(i => i.Discrepancy ?? 0),
            TotalDiscrepancyValue: items.Sum(i => Value(i, i.Discrepancy)),
            BalancedDate: t.BalancedDate,
            CreatedByName: t.ConductedByNavigation?.FullName ?? t.ConductedByNavigation?.Username
                ?? userNames.GetValueOrDefault(t.ConductedBy) ?? $"NV #{t.ConductedBy}",
            BalancedByName: t.BalancedBy.HasValue ? userNames.GetValueOrDefault(t.BalancedBy.Value) : null,
            Notes: t.Notes);
    }

    public static async Task<StocktakeDetailDto> ToDetailAsync(IStockFlowDbContext context, TrxStocktake t, CancellationToken ct)
    {
        var names = await UserNamesAsync(context, new int?[] { t.ConductedBy, t.BalancedBy }, ct);
        var items = t.DtlStocktakeItems
            .OrderBy(i => i.StocktakeItemId)
            .Select(i => new StocktakeItemDto(
                StocktakeItemId: i.StocktakeItemId,
                ProductId: i.ProductId,
                ProductCode: i.Product?.ProductCode ?? $"SP{i.ProductId}",
                ProductName: i.Product?.ProductName ?? "Sản phẩm",
                Unit: i.Product?.BaseUnit?.UnitName ?? "Cái",
                SystemQty: i.SystemQty ?? 0,
                ActualQty: i.ActualQty ?? 0,
                Discrepancy: i.Discrepancy ?? 0,
                UnitCost: i.UnitCost ?? 0,
                DiscrepancyValue: Math.Round((i.Discrepancy ?? 0) * (i.UnitCost ?? 0), 0, MidpointRounding.AwayFromZero),
                Reason: i.DiscrepancyReason))
            .ToList();
        return new StocktakeDetailDto(ToListDto(t, names), items);
    }
}
