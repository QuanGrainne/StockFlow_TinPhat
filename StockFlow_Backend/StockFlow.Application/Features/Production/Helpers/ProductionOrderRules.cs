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
        // V-04: số lượng từng dòng và tổng (cột numeric(18,2) của lệnh) không vượt giới hạn lưu trữ, tránh lỗi 500 khi lưu
        if (items.Any(i => i.PlannedQuantity > ProductionPolicy.MaxStoredQuantity)
            || items.Sum(i => i.PlannedQuantity) > ProductionPolicy.MaxStoredQuantity)
            return ProductionMessages.QuantityLimit;

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

            // V-04: nhu cầu tính ra phải lưu được vào numeric(18,2)
            if (bom.DtlBomItems.Any(b => !ProductionPolicy.TryCalculateRequirement(
                    it.PlannedQuantity, b.Quantity ?? 0, b.WastageRate ?? 0, out _)))
                return ProductionMessages.QuantityLimit;

            // BR-31: nhu cầu NVL = SL kế hoạch × định mức BOM × (1 + hao hụt %)
            AddRequirementsFromBom(context, order, bom, it.PlannedQuantity, orderItem);
        }

        return null;
    }

    // Kiểm tra thiếu NVL khi lập / sửa lệnh trực tiếp (ShortagesAsync, ApplyShortageCheckAsync...) đã bỏ cùng chức năng
    // "Lập lệnh sản xuất" (17/11/2026). Lệnh lập từ kế hoạch: CreateProductionOrderFromPlanCommand.
}
