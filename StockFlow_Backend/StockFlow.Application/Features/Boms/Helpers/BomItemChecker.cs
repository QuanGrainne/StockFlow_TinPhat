using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.DTOs;

namespace StockFlow.Application.Features.Boms.Helpers;

/// <summary>Các kiểm tra dòng NVL cần đọc CSDL (BR-54). Trả về thông báo lỗi, hoặc null nếu hợp lệ.</summary>
public static class BomItemChecker
{
    public static async Task<string?> CheckAsync(
        IStockFlowDbContext context,
        int productId,
        IReadOnlyCollection<BomItemRequest> items,
        CancellationToken cancellationToken)
    {
        // MSG74: BOM không được chứa chính thành phẩm của nó (một cấp, D7)
        if (items.Any(i => i.MaterialId == productId))
            return BomMessages.Msg74SelfComponent;

        // Thành phần phải là mặt hàng đang hoạt động (IsActive NULL coi như đang hoạt động, khớp màn Hàng hóa)
        var materialIds = items.Select(i => i.MaterialId).Distinct().ToList();
        var materials = await context.MstProducts
            .AsNoTracking()
            .Where(p => materialIds.Contains(p.ProductId) && p.IsActive != false)
            .Select(p => new { p.ProductId, p.BaseUnitId })
            .ToListAsync(cancellationToken);
        var materialMap = materials.ToDictionary(m => m.ProductId, m => m.BaseUnitId);

        foreach (var id in materialIds)
        {
            if (!materialMap.ContainsKey(id)) return BomMessages.MaterialNotUsable(id);
        }

        // Đơn vị phải là đơn vị cơ sở của NVL, hoặc có quy đổi sang/từ đơn vị cơ sở (BR-26)
        var unitIds = items.Select(i => i.UnitId).Distinct().ToList();
        var existingUnits = await context.MstUnits
            .AsNoTracking()
            .Where(u => unitIds.Contains(u.UnitId))
            .Select(u => u.UnitId)
            .ToListAsync(cancellationToken);

        var conversions = await context.MstUnitConversions
            .AsNoTracking()
            .Where(c => (c.ProductId == null || materialIds.Contains(c.ProductId.Value))
                        && (unitIds.Contains(c.FromUnitId) || unitIds.Contains(c.ToUnitId)))
            .Select(c => new { c.ProductId, c.FromUnitId, c.ToUnitId })
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            if (!existingUnits.Contains(item.UnitId)) return BomMessages.UnitNotValid(item.MaterialId, item.UnitId);

            var baseUnit = materialMap[item.MaterialId];
            if (item.UnitId == baseUnit) continue;

            var convertible = conversions.Any(c =>
                (c.ProductId == null || c.ProductId == item.MaterialId)
                && ((c.FromUnitId == item.UnitId && c.ToUnitId == baseUnit)
                    || (c.FromUnitId == baseUnit && c.ToUnitId == item.UnitId)));
            if (!convertible) return BomMessages.UnitNotValid(item.MaterialId, item.UnitId);
        }

        return null;
    }
}
