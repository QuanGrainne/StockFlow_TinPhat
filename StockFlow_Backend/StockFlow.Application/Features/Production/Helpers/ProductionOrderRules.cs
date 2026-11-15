using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Luật dùng chung khi lập / sửa lệnh sản xuất (UC-59, E58.2, BR-31): theo đúng BOM, kiểm tra thiếu NVL tại kho.</summary>
public static class ProductionOrderRules
{
    /// <summary>E58.2: hạn hoàn thành không được ở quá khứ (so theo ngày giờ Việt Nam).</summary>
    public static string? ValidateDeadline(DateTime? deadline)
    {
        if (deadline.HasValue && deadline.Value.Date < VietnamTime.Now.Date)
            return "Hạn hoàn thành không được trước ngày hôm nay.";
        return null;
    }

    /// <summary>Chuẩn hoá danh sách thành phẩm từ request (hỗ trợ cả 1 thành phẩm lẫn nhiều thành phẩm).</summary>
    public static List<SaveProductionOrderItemInput> NormalizeItems(SaveProductionOrderRequest req) =>
        req.Items is { Count: > 0 }
            ? req.Items
            : [new SaveProductionOrderItemInput(req.ProductId, req.PlannedQuantity, null, req.CustomMaterials, req.AdjustReason)];

    /// <summary>Chụp định mức từ BOM đang áp dụng thành nhu cầu NVL của lệnh (BR-31).</summary>
    public static void AddRequirementsFromBom(
        IStockFlowDbContext context, TrxProductionOrder order, MstBom bom, decimal plannedQuantity,
        DtlProductionOrderItem? orderItem = null)
    {
        foreach (var item in bom.DtlBomItems.OrderBy(i => i.BomItemId))
        {
            var norm = item.Quantity ?? 0;
            var rate = item.WastageRate ?? 0;
            var required = ProductionPolicy.CalculateRequirement(plannedQuantity, norm, rate);
            context.TrxProductionMaterialRequirements.Add(new TrxProductionMaterialRequirement
            {
                ProductionOrder = order,
                ProductionOrderItem = orderItem,
                MaterialId = item.MaterialId,
                UnitId = item.UnitId,
                SourceBomItemId = item.BomItemId,
                NormPerUnit = norm,
                WastageRate = rate,
                RequiredQty = required,
                IssuedQty = 0,
                ShortageQty = required,
                IsAdjusted = false,
            });
        }
    }

    /// <summary>
    /// Tạo danh sách dòng thành phẩm (dtl_production_order_items) và nhu cầu NVL tính đúng theo BOM đang áp dụng (BR-31).
    /// Trả về thông báo lỗi nếu dữ liệu không hợp lệ, hoặc null nếu thành công.
    /// </summary>
    public static async Task<string?> PopulateItemsAndRequirementsAsync(
        IStockFlowDbContext context, TrxProductionOrder order, SaveProductionOrderRequest req,
        int userId, DateTime now, CancellationToken ct)
    {
        var items = NormalizeItems(req);
        if (items.Count == 0) return "Vui lòng chọn ít nhất một thành phẩm.";
        // Lệnh sản xuất bắt buộc theo đúng công thức BOM đang áp dụng (quyết định nhóm 15/11/2026, thay BR-51 khi lập lệnh):
        // không nhận định mức tự sửa / NVL ngoài BOM khi lập hoặc sửa lệnh.
        if (req.CustomMaterials is { Count: > 0 } || items.Any(i => i.CustomMaterials is { Count: > 0 }))
            return ProductionMessages.MustFollowBom;
        if (items.Select(i => i.ProductId).Distinct().Count() != items.Count)
            return "Mỗi thành phẩm chỉ được chọn một dòng trong cùng một lệnh sản xuất.";

        foreach (var it in items)
        {
            if (it.ProductId <= 0) return "Vui lòng chọn thành phẩm.";
            if (it.PlannedQuantity <= 0 || !ProductionHelper.HasMaxScale(it.PlannedQuantity, ProductionPolicy.QuantityScale))
                return "Số lượng kế hoạch của từng thành phẩm phải lớn hơn 0 và có tối đa 2 chữ số thập phân.";
        }

        var productIds = items.Select(i => i.ProductId).ToList();
        var products = await context.MstProducts.AsNoTracking()
            .Where(p => productIds.Contains(p.ProductId) && p.IsActive != false)
            .ToDictionaryAsync(p => p.ProductId, ct);
        if (products.Count != productIds.Count)
            return "Vui lòng chọn thành phẩm đang hoạt động.";

        var boms = await context.MstBoms.AsNoTracking()
            .Include(b => b.DtlBomItems)
            .Where(b => productIds.Contains(b.ProductId) && b.IsActive == true)
            .ToDictionaryAsync(b => b.ProductId, ct);

        foreach (var it in items)
        {
            if (!boms.TryGetValue(it.ProductId, out var bom) || bom.DtlBomItems.Count == 0)
                return $"{ProductionMessages.NoActiveBom} ({products[it.ProductId].ProductCode})";
        }

        var firstItem = items[0];
        order.ProductId = firstItem.ProductId;
        order.BomId = boms[firstItem.ProductId].BomId;
        order.PlannedQuantity = items.Sum(i => i.PlannedQuantity);

        foreach (var it in items)
        {
            var bom = boms[it.ProductId];
            var orderItem = new DtlProductionOrderItem
            {
                ProductionOrder = order,
                ProductId = it.ProductId,
                BomId = bom.BomId,
                PlannedQuantity = it.PlannedQuantity,
                ActualQuantity = 0,
                Notes = string.IsNullOrWhiteSpace(it.Notes) ? null : it.Notes.Trim(),
            };
            context.DtlProductionOrderItems.Add(orderItem);

            // BR-31: nhu cầu NVL = SL kế hoạch × định mức BOM × (1 + hao hụt %)
            AddRequirementsFromBom(context, order, bom, it.PlannedQuantity, orderItem);
        }

        return null;
    }

    /// <summary>1 NVL không đủ tồn tại kho cho lệnh (đã gộp nhu cầu của mọi thành phẩm trong lệnh)</summary>
    public sealed record MaterialShortage(string Code, string Name, string Unit, decimal Required, decimal Available, decimal Shortage);

    private const string ShortageNoteTag = "[Cảnh báo thiếu NVL";
    private const int NotesMaxLength = 500;

    /// <summary>
    /// Kiểm tra tồn NVL tại kho theo nhu cầu BOM của lệnh (BR-31): gộp nhu cầu còn phải xuất theo từng NVL
    /// (nhiều thành phẩm dùng chung NVL thì cộng dồn), so với tồn hiện có của kho (mọi vị trí / lô).
    /// Đọc các dòng nhu cầu đang được theo dõi trong context (vừa tạo khi lập lệnh hoặc vừa tính lại khi sửa lệnh).
    /// </summary>
    public static async Task<List<MaterialShortage>> ShortagesAsync(
        IStockFlowDbContext context, TrxProductionOrder order, int warehouseId, CancellationToken ct)
    {
        var needs = context.TrxProductionMaterialRequirements.Local
            .Where(r => ReferenceEquals(r.ProductionOrder, order)
                        || (order.ProductionOrderId > 0 && r.ProductionOrderId == order.ProductionOrderId))
            .GroupBy(r => r.MaterialId)
            .Select(g => new { MaterialId = g.Key, Needed = g.Sum(r => Math.Max(0, (r.RequiredQty ?? 0) - (r.IssuedQty ?? 0))) })
            .Where(x => x.Needed > 0)
            .ToList();
        if (needs.Count == 0) return new List<MaterialShortage>();

        var ids = needs.Select(n => n.MaterialId).ToList();
        var available = await ProductionStockOps.AvailableAsync(context, warehouseId, ids, ct);
        var materials = await context.MstProducts.AsNoTracking()
            .Where(p => ids.Contains(p.ProductId))
            .Select(p => new { p.ProductId, p.ProductCode, p.ProductName, Unit = p.BaseUnit.UnitName })
            .ToDictionaryAsync(p => p.ProductId, ct);

        return needs
            .Select(n =>
            {
                var stock = available.GetValueOrDefault(n.MaterialId);
                var m = materials.GetValueOrDefault(n.MaterialId);
                return new MaterialShortage(m?.ProductCode ?? $"#{n.MaterialId}", m?.ProductName ?? "", m?.Unit ?? "",
                    n.Needed, stock, ProductionPolicy.RoundQuantity(n.Needed - stock));
            })
            .Where(x => x.Shortage > 0)
            .OrderBy(x => x.Code)
            .ToList();
    }

    /// <summary>Mô tả ngắn danh sách NVL thiếu: "VAI01 Vải (thiếu 3 m), KEO01 Keo (thiếu 1,5 kg)"</summary>
    public static string DescribeShortages(IEnumerable<MaterialShortage> shortages) =>
        string.Join(", ", shortages.Select(s => $"{s.Code} {s.Name} (cần {s.Required:0.##}, tồn {s.Available:0.##}, thiếu {s.Shortage:0.##} {s.Unit})".Replace(" )", ")")));

    /// <summary>
    /// Ghi chú lệnh sau khi lưu: giữ ghi chú người dùng (bỏ cảnh báo thiếu NVL cũ) và thêm cảnh báo mới nếu còn thiếu,
    /// để kế toán lên kế hoạch mua / nhập bù. Tổng độ dài tối đa 500 ký tự (cột notes).
    /// </summary>
    public static string? BuildNotesWithShortage(string? userNotes, IReadOnlyCollection<MaterialShortage> shortages, string warehouseName, DateTime now)
    {
        var kept = string.Join("\n", (userNotes ?? "")
            .Split('\n')
            .Select(l => l.TrimEnd('\r'))
            .Where(l => !l.TrimStart().StartsWith(ShortageNoteTag, StringComparison.Ordinal)))
            .Trim();
        if (shortages.Count == 0) return string.IsNullOrEmpty(kept) ? null : kept;

        var warning = $"{ShortageNoteTag} {now:dd/MM/yyyy HH:mm} - {warehouseName}] {DescribeShortages(shortages)}";
        var room = NotesMaxLength - (string.IsNullOrEmpty(kept) ? 0 : kept.Length + 1);
        if (room < 40)
        {
            // Ghi chú người dùng quá dài: rút gọn để luôn còn chỗ cho cảnh báo
            kept = kept[..Math.Max(0, NotesMaxLength - 200)];
            room = NotesMaxLength - (string.IsNullOrEmpty(kept) ? 0 : kept.Length + 1);
        }
        if (warning.Length > room) warning = warning[..Math.Max(0, room - 1)] + "…";
        return string.IsNullOrEmpty(kept) ? warning : $"{kept}\n{warning}";
    }

    /// <summary>
    /// Kiểm tra thiếu NVL khi lập / sửa lệnh (quyết định nhóm 15/11/2026: cho lưu nhưng phải cảnh báo):
    /// - Không gửi kho → không kiểm tra, chỉ chuẩn hoá ghi chú.
    /// - Thiếu NVL mà chưa xác nhận → trả lỗi có tiền tố [CONFIRM_SHORTAGE] để FE hỏi người dùng.
    /// - Đã xác nhận → vẫn lưu, cảnh báo thiếu NVL được ghi vào ghi chú lệnh để lên kế hoạch mua / nhập bù.
    /// Trả về thông báo lỗi, hoặc null nếu được lưu (order.Notes đã được gán).
    /// </summary>
    public static async Task<string?> ApplyShortageCheckAsync(
        IStockFlowDbContext context, ICurrentUserService currentUser, TrxProductionOrder order,
        SaveProductionOrderRequest req, DateTime now, CancellationToken ct)
    {
        if (req.WarehouseId is not > 0)
        {
            order.Notes = BuildNotesWithShortage(req.Notes, Array.Empty<MaterialShortage>(), "", now);
            return null;
        }

        var warehouseId = req.WarehouseId.Value;
        if (!await currentUser.HasWarehouseAccessAsync(warehouseId, ct)) return ProductionMessages.NoWarehouseAccess;
        var warehouseName = await context.MstWarehouses.AsNoTracking()
            .Where(w => w.WarehouseId == warehouseId)
            .Select(w => w.WarehouseName)
            .FirstOrDefaultAsync(ct) ?? $"Kho #{warehouseId}";

        var shortages = await ShortagesAsync(context, order, warehouseId, ct);
        if (shortages.Count > 0 && !req.ConfirmShortage)
            return $"{ProductionMessages.ConfirmShortagePrefix} Thiếu nguyên vật liệu tại {warehouseName} theo công thức BOM: "
                   + $"{DescribeShortages(shortages)}. Bạn có muốn vẫn lưu lệnh để lên kế hoạch mua / nhập bù không?";

        order.Notes = BuildNotesWithShortage(req.Notes, shortages, warehouseName, now);
        return null;
    }
}
