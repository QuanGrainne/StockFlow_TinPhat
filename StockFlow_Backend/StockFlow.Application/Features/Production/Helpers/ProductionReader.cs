using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>
/// Đọc dữ liệu sản xuất thành DTO (dùng chung cho Query và để trả kết quả sau Command).
/// Dữ liệu kho (phiếu xuất, phiếu nhập, tồn) chỉ lấy của các kho người dùng được phân quyền (BR-04).
/// </summary>
public static class ProductionReader
{
    // ─── BOM ────────────────────────────────────────────────────────────────

    /// <summary>Chiếu BOM ra DTO; lọc / sắp xếp phải làm trên <paramref name="boms"/> trước (EF không dịch được điều kiện trên record DTO).</summary>
    public static IQueryable<BomSummaryDto> BomSummaries(IQueryable<MstBom> boms) =>
        boms.AsNoTracking().Select(b => new BomSummaryDto(
            b.BomId,
            b.BomName ?? "",
            b.Version ?? "",
            b.ProductId,
            b.Product.ProductCode ?? "",
            b.Product.ProductName ?? "",
            b.Product.BaseUnit.UnitName ?? "",
            b.IsActive == true,
            b.DtlBomItems.Count,
            b.CreatedAt,
            b.Description,
            b.TrxProductionOrders.Any()));

    public static async Task<BomDetailDto?> BomDetailAsync(IStockFlowDbContext context, int bomId, CancellationToken ct)
    {
        var summary = await BomSummaries(context.MstBoms.Where(b => b.BomId == bomId)).FirstOrDefaultAsync(ct);
        if (summary == null) return null;

        var items = await context.DtlBomItems.AsNoTracking()
            .Where(i => i.BomId == bomId)
            .OrderBy(i => i.BomItemId)
            .Select(i => new
            {
                i.BomItemId,
                i.MaterialId,
                Code = i.Material.ProductCode ?? "",
                Name = i.Material.ProductName ?? "",
                Unit = i.Unit.UnitName ?? "",
                Qty = i.Quantity ?? 0,
                Rate = i.WastageRate ?? 0,
            })
            .ToListAsync(ct);

        return new BomDetailDto(summary, items.Select(i => new BomItemDto(
            i.BomItemId, i.MaterialId, i.Code, i.Name, i.Unit, i.Qty, i.Rate,
            Math.Round(i.Qty * (1 + i.Rate / 100m), 6, MidpointRounding.AwayFromZero))).ToList());
    }

    // ─── Lệnh sản xuất ─────────────────────────────────────────────────────

    private sealed record OrderRow(
        int ProductionOrderId, string? Code, int ProductId, string? ProductCode, string? ProductName, string? UnitName,
        int BomId, string? BomCode, string? BomVersion, decimal? Planned, decimal? Received, decimal Defect,
        DateTime? StartDate, DateTime? EndDate, string? Workshop, string? Status, string? CreatorFullName,
        string? CreatorUsername, int ShortageLines, int ReviewFlags, string? Notes);

    private static IQueryable<OrderRow> OrderRows(IQueryable<TrxProductionOrder> orders) =>
        orders.AsNoTracking().Select(o => new OrderRow(
            o.ProductionOrderId,
            o.ProductionOrderCode,
            o.ProductId,
            o.Product.ProductCode,
            o.Product.ProductName,
            o.Product.BaseUnit.UnitName,
            o.BomId,
            o.Bom.BomName,
            o.Bom.Version,
            o.PlannedQuantity,
            o.ActualQuantity,
            o.TrxProductionReports.Sum(r => r.DefectQty ?? 0),
            o.StartDate,
            o.EndDate,
            o.Workshop,
            o.Status,
            o.CreatedByNavigation.FullName,
            o.CreatedByNavigation.Username,
            o.TrxProductionMaterialRequirements.Count(r => (r.ShortageQty ?? 0) > 0),
            o.TrxFinishedGoodsReceipts.Count(f => f.NeedsReview),
            o.Notes));

    private static ProductionOrderSummaryDto ToSummary(OrderRow o)
    {
        var planned = o.Planned ?? 0;
        var received = o.Received ?? 0;
        var progress = planned > 0 ? Math.Min(100, Math.Round(received * 100 / planned, 1)) : 0;
        return new ProductionOrderSummaryDto(
            o.ProductionOrderId,
            o.Code ?? "",
            o.ProductId,
            o.ProductCode ?? "",
            o.ProductName ?? "",
            o.UnitName ?? "",
            o.BomId,
            o.BomCode ?? "",
            o.BomVersion ?? "",
            planned,
            received,
            o.Defect,
            progress,
            o.StartDate,
            o.EndDate,
            o.Workshop,
            o.Status ?? ProductionOrderStatus.NotStarted,
            !string.IsNullOrWhiteSpace(o.CreatorFullName) ? o.CreatorFullName! : o.CreatorUsername ?? "",
            o.ShortageLines > 0 ? "SHORTAGE" : "FULL",
            o.ShortageLines,
            o.ReviewFlags);
    }

    public static async Task<List<ProductionOrderSummaryDto>> OrderSummariesAsync(
        IQueryable<TrxProductionOrder> orders, CancellationToken ct)
    {
        var rows = await OrderRows(orders).ToListAsync(ct);
        return rows.Select(ToSummary).ToList();
    }

    /// <summary>Chi tiết lệnh: NVL (kèm tồn tại kho <paramref name="warehouseId"/> nếu được quyền), phiếu xuất, phiếu nhập.</summary>
    public static async Task<ProductionOrderDetailDto?> OrderDetailAsync(
        IStockFlowDbContext context, ICurrentUserService currentUser, int productionOrderId, int? warehouseId,
        CancellationToken ct)
    {
        var row = await OrderRows(context.TrxProductionOrders.Where(o => o.ProductionOrderId == productionOrderId))
            .FirstOrDefaultAsync(ct);
        if (row == null) return null;

        var authorized = await currentUser.GetAuthorizedWarehouseIdsAsync(ct);

        var reqs = await context.TrxProductionMaterialRequirements.AsNoTracking()
            .Where(r => r.ProductionOrderId == productionOrderId)
            .OrderBy(r => r.RequirementId)
            .Select(r => new
            {
                r.RequirementId,
                r.MaterialId,
                Code = r.Material.ProductCode ?? "",
                Name = r.Material.ProductName ?? "",
                Unit = r.Unit.UnitName ?? "",
                Norm = r.NormPerUnit ?? 0,
                Rate = r.WastageRate ?? 0,
                Required = r.RequiredQty ?? 0,
                Issued = r.IssuedQty ?? 0,
                Shortage = r.ShortageQty ?? 0,
                r.IsAdjusted,
                r.AdjustReason,
                r.AdjustedBy,
                r.AdjustedAt,
                r.SourceBomItemId,
            })
            .ToListAsync(ct);

        int? availabilityWarehouseId = warehouseId.HasValue && authorized.Contains(warehouseId.Value) ? warehouseId : null;
        var available = availabilityWarehouseId.HasValue
            ? await ProductionStockOps.AvailableAsync(context, availabilityWarehouseId.Value, reqs.Select(r => r.MaterialId), ct)
            : new Dictionary<int, decimal>();

        var adjusterIds = reqs.Where(r => r.AdjustedBy.HasValue).Select(r => r.AdjustedBy!.Value).Distinct().ToList();
        var adjusters = await context.SecUsers.AsNoTracking()
            .Where(u => adjusterIds.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, ct);

        var materials = reqs.Select(r => new ProductionMaterialDto(
            r.RequirementId, r.MaterialId, r.Code, r.Name, r.Unit, r.Norm, r.Rate, r.Required, r.Issued, r.Shortage,
            availabilityWarehouseId.HasValue ? available.GetValueOrDefault(r.MaterialId) : null,
            r.IsAdjusted, r.AdjustReason,
            r.AdjustedBy.HasValue && adjusters.TryGetValue(r.AdjustedBy.Value, out var u) ? ProductionHelper.UserName(u) : null,
            r.AdjustedAt,
            r.SourceBomItemId.HasValue)).ToList();

        var issues = await IssuesAsync(
            context.TrxStockIssues.Where(i => i.ProductionOrderId == productionOrderId), authorized, ct);
        var receipts = await ReceiptsAsync(
            context.TrxFinishedGoodsReceipts.Where(f => f.ProductionOrderId == productionOrderId), authorized, ct);

        return new ProductionOrderDetailDto(ToSummary(row), row.Notes, availabilityWarehouseId, materials, issues, receipts);
    }

    // ─── Phiếu xuất NVL ────────────────────────────────────────────────────

    public static async Task<List<MaterialIssueDto>> IssuesAsync(
        IQueryable<TrxStockIssue> source, IReadOnlyList<int> authorizedWarehouseIds, CancellationToken ct)
    {
        var headers = await source.AsNoTracking()
            .Where(i => i.IssueType == StockIssueType.Production && i.ProductionOrderId != null
                        && authorizedWarehouseIds.Contains(i.WarehouseId))
            .OrderByDescending(i => i.ProcessedDate ?? i.RequestedDate)
            .ThenByDescending(i => i.StockIssueId)
            .Select(i => new
            {
                i.StockIssueId,
                i.IssueCode,
                Date = i.ProcessedDate ?? i.RequestedDate,
                OrderId = i.ProductionOrderId!.Value,
                OrderCode = i.ProductionOrder!.ProductionOrderCode,
                ProductName = i.ProductionOrder.Product.ProductName,
                i.WarehouseId,
                WarehouseName = i.Warehouse.WarehouseName,
                Supplementary = i.IsSupplementary == true,
                i.Reason,
                FullName = i.RequestedByNavigation.FullName,
                Username = i.RequestedByNavigation.Username,
            })
            .ToListAsync(ct);

        var ids = headers.Select(h => h.StockIssueId).ToList();
        var items = await source.AsNoTracking()
            .Where(i => ids.Contains(i.StockIssueId))
            .SelectMany(i => i.DtlStockIssueItems)
            .Where(d => d.MaterialRequirementId != null)
            .Select(d => new
            {
                d.StockIssueId,
                RequirementId = d.MaterialRequirementId!.Value,
                MaterialId = d.MaterialRequirement!.MaterialId,
                Code = d.MaterialRequirement.Material.ProductCode ?? "",
                Name = d.MaterialRequirement.Material.ProductName ?? "",
                Unit = d.MaterialRequirement.Unit.UnitName ?? "",
                Qty = d.ActualIssuedQty ?? 0,
            })
            .ToListAsync(ct);
        var byIssue = items.GroupBy(i => i.StockIssueId).ToDictionary(g => g.Key, g => g.ToList());

        return headers.Select(h =>
        {
            var lines = byIssue.GetValueOrDefault(h.StockIssueId) ?? [];
            return new MaterialIssueDto(
                h.StockIssueId, h.IssueCode ?? "", h.Date, h.OrderId, h.OrderCode ?? "", h.ProductName ?? "",
                h.WarehouseId, h.WarehouseName ?? "", h.Supplementary, h.Reason,
                !string.IsNullOrWhiteSpace(h.FullName) ? h.FullName! : h.Username ?? "",
                lines.Sum(l => l.Qty),
                lines.Select(l => new MaterialIssueItemDto(l.RequirementId, l.MaterialId, l.Code, l.Name, l.Unit, l.Qty)).ToList());
        }).ToList();
    }

    // ─── Phiếu nhập thành phẩm ─────────────────────────────────────────────

    public static async Task<List<FinishedGoodsReceiptDto>> ReceiptsAsync(
        IQueryable<TrxFinishedGoodsReceipt> source, IReadOnlyList<int> authorizedWarehouseIds, CancellationToken ct)
    {
        var rows = await source.AsNoTracking()
            .Where(f => authorizedWarehouseIds.Contains(f.WarehouseId))
            .OrderByDescending(f => f.ReceivedDate)
            .ThenByDescending(f => f.FgrId)
            .Select(f => new
            {
                f.FgrId,
                f.FgrCode,
                f.ReceivedDate,
                f.ProductionOrderId,
                OrderCode = f.ProductionOrder.ProductionOrderCode,
                f.ProductId,
                ProductCode = f.Product.ProductCode,
                ProductName = f.Product.ProductName,
                UnitName = f.Product.BaseUnit.UnitName,
                f.WarehouseId,
                WarehouseName = f.Warehouse.WarehouseName,
                LocationName = f.Location != null ? f.Location.LocationName ?? f.Location.LocationCode : null,
                LotNumber = f.Lot != null ? f.Lot.LotNumber : null,
                MfgDate = f.Lot != null ? f.Lot.MfgDate : null,
                Accepted = f.Quantity ?? 0,
                Defect = f.Report.DefectQty ?? 0,
                DefectReason = f.Report.Notes,
                f.NeedsReview,
                f.ReviewNote,
                f.Notes,
                FullName = f.ReceivedByNavigation.FullName,
                Username = f.ReceivedByNavigation.Username,
            })
            .ToListAsync(ct);

        return rows.Select(f => new FinishedGoodsReceiptDto(
            f.FgrId, f.FgrCode ?? "", f.ReceivedDate, f.ProductionOrderId, f.OrderCode ?? "", f.ProductId,
            f.ProductCode ?? "", f.ProductName ?? "", f.UnitName ?? "", f.WarehouseId, f.WarehouseName ?? "",
            f.LocationName, f.LotNumber, f.MfgDate, f.Accepted, f.Defect, f.DefectReason, f.NeedsReview,
            f.ReviewNote, f.Notes, !string.IsNullOrWhiteSpace(f.FullName) ? f.FullName! : f.Username ?? "")).ToList();
    }

    // ─── Nhu cầu NVL dự kiến từ BOM đang áp dụng ───────────────────────────

    /// <summary>Tính nhu cầu NVL theo BOM đang áp dụng của thành phẩm (BR-30, BR-31). Null nếu chưa có BOM đang áp dụng.</summary>
    public static async Task<RequirementPreviewDto?> RequirementPreviewAsync(
        IStockFlowDbContext context, int productId, decimal plannedQuantity, int? warehouseId, CancellationToken ct)
    {
        var bom = await context.MstBoms.AsNoTracking()
            .Where(b => b.ProductId == productId && b.IsActive == true)
            .Select(b => new { b.BomId, b.BomName, b.Version })
            .FirstOrDefaultAsync(ct);
        if (bom == null) return null;

        var items = await context.DtlBomItems.AsNoTracking()
            .Where(i => i.BomId == bom.BomId)
            .OrderBy(i => i.BomItemId)
            .Select(i => new
            {
                i.MaterialId,
                Code = i.Material.ProductCode ?? "",
                Name = i.Material.ProductName ?? "",
                Unit = i.Unit.UnitName ?? "",
                Qty = i.Quantity ?? 0,
                Rate = i.WastageRate ?? 0,
            })
            .ToListAsync(ct);

        var available = warehouseId.HasValue
            ? await ProductionStockOps.AvailableAsync(context, warehouseId.Value, items.Select(i => i.MaterialId), ct)
            : null;

        var lines = items.Select(i =>
        {
            var required = ProductionPolicy.CalculateRequirement(plannedQuantity, i.Qty, i.Rate);
            decimal? avail = available != null ? available.GetValueOrDefault(i.MaterialId) : null;
            decimal? shortage = avail.HasValue ? Math.Max(0, required - Math.Max(0, avail.Value)) : null;
            return new RequirementPreviewItemDto(i.MaterialId, i.Code, i.Name, i.Unit, i.Qty, i.Rate, required, avail, shortage);
        }).ToList();

        return new RequirementPreviewDto(productId, bom.BomId, bom.BomName ?? "", bom.Version ?? "", lines);
    }
}
