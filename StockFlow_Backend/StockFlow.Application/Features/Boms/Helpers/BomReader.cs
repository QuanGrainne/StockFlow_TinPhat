using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.DTOs;

namespace StockFlow.Application.Features.Boms.Helpers;

/// <summary>Đọc BOM ra DTO; dùng chung cho truy vấn chi tiết và kết quả trả về của các lệnh.</summary>
public static class BomReader
{
    public static async Task<BomDto?> LoadAsync(
        IStockFlowDbContext context, int bomId, CancellationToken cancellationToken)
    {
        var bom = await context.MstBoms
            .AsNoTracking()
            .Where(b => b.BomId == bomId)
            .Select(b => new
            {
                b.BomId,
                b.ProductId,
                ProductCode = b.Product.ProductCode,
                ProductName = b.Product.ProductName,
                b.Version,
                b.BomName,
                b.Description,
                b.Status,
                b.EffectiveDate,
                b.CreatedAt,
                Items = b.DtlBomItems
                    .OrderBy(i => i.BomItemId)
                    .Select(i => new
                    {
                        i.BomItemId,
                        i.MaterialId,
                        MaterialCode = i.Material.ProductCode,
                        MaterialName = i.Material.ProductName,
                        i.UnitId,
                        UnitName = i.Unit.UnitName,
                        i.Quantity,
                        i.WastageRate
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (bom == null) return null;

        var inUse = await IsInUseAsync(context, bomId, cancellationToken);

        return new BomDto(
            bom.BomId, bom.ProductId, bom.ProductCode, bom.ProductName, bom.Version, bom.BomName,
            bom.Description, bom.Status, bom.EffectiveDate, bom.CreatedAt, inUse,
            bom.Items.Select(i => new BomItemDto(
                i.BomItemId, i.MaterialId, i.MaterialCode, i.MaterialName, i.UnitId, i.UnitName,
                BomQuantityRules.Normalize(i.Quantity), BomQuantityRules.Normalize(i.WastageRate))).ToList());
    }

    /// <summary>BOM đã được dòng thành phẩm của lệnh sản xuất tham chiếu (không được xóa, chỉ được chuyển Inactive).</summary>
    public static Task<bool> IsInUseAsync(
        IStockFlowDbContext context, int bomId, CancellationToken cancellationToken) =>
        context.TrxProductionOrderItems.AsNoTracking().AnyAsync(i => i.BomId == bomId, cancellationToken);

    /// <summary>Số phiên bản kế tiếp của thành phẩm: số nguyên lớn nhất hiện có + 1 (nhãn "1", "2", ...).</summary>
    public static async Task<string> NextVersionAsync(
        IStockFlowDbContext context, int productId, CancellationToken cancellationToken)
    {
        var versions = await context.MstBoms
            .AsNoTracking()
            .Where(b => b.ProductId == productId)
            .Select(b => b.Version)
            .ToListAsync(cancellationToken);

        var max = 0;
        foreach (var v in versions)
        {
            if (int.TryParse(v, out var n) && n > max) max = n;
        }
        // Nếu có nhãn không phải số, vẫn bảo đảm lớn hơn số phiên bản đã có
        return (Math.Max(max, versions.Count) + 1).ToString();
    }

    /// <summary>Chuỗi tóm tắt dòng NVL để ghi Audit (giá trị trước/sau).</summary>
    public static string Describe(IEnumerable<(int MaterialId, int UnitId, decimal Quantity, decimal WastageRate)> items) =>
        string.Join("; ", items.OrderBy(i => i.MaterialId).Select(i =>
            $"material={i.MaterialId} unit={i.UnitId} qty={BomQuantityRules.Normalize(i.Quantity)} wastage={BomQuantityRules.Normalize(i.WastageRate)}"));
}
