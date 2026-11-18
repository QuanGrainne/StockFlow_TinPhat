using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Kiểm tra dữ liệu BOM dùng chung cho tạo / sửa BOM (UC-57, E51.1, BR-06, BR-30).</summary>
public static class BomRules
{
    /// <summary>Định mức lưu numeric(18,4); hao hụt lưu numeric(5,2), theo phần trăm 0–100.</summary>
    public const int QuantityScale = 4;
    public const int WastageScale = 2;

    /// <summary>
    /// Kiểm tra thành phẩm và các dòng NVL; trả về lỗi đầu tiên hoặc danh sách NVL (đã tải) theo thứ tự dòng.
    /// Đơn vị của dòng BOM luôn là đơn vị cơ sở của NVL (BR-26: nhu cầu quy về đơn vị cơ sở).
    /// </summary>
    public static async Task<(string? Error, MstProduct? Product, List<(SaveBomItemRequest Line, MstProduct Material)> Lines)>
        ValidateAsync(IStockFlowDbContext context, SaveBomRequest req, CancellationToken ct)
    {
        var empty = new List<(SaveBomItemRequest, MstProduct)>();

        var product = await context.MstProducts.FirstOrDefaultAsync(p => p.ProductId == req.ProductId, ct);
        if (product == null || product.IsActive == false)
            return ("Vui lòng chọn thành phẩm đang hoạt động.", null, empty);

        if (req.Items == null || req.Items.Count == 0)
            return ("Định mức phải có ít nhất một nguyên vật liệu.", product, empty);

        // Báo lỗi kèm số dòng (đếm từ 1, theo thứ tự người dùng nhập) để dễ tìm dòng sai khi BOM nhiều NVL.
        var firstSeen = new Dictionary<int, int>();
        for (var idx = 0; idx < req.Items.Count; idx++)
        {
            var i = req.Items[idx];
            var row = idx + 1;
            if (i.MaterialId == req.ProductId)
                return ($"Dòng {row}: thành phẩm không được là nguyên vật liệu trong định mức của chính nó.", product, empty);
            if (!firstSeen.TryAdd(i.MaterialId, row))
                return ($"Dòng {row}: nguyên vật liệu trùng với dòng {firstSeen[i.MaterialId]}, một nguyên vật liệu chỉ được xuất hiện một lần trong định mức.", product, empty);
            if (i.Quantity <= 0 || !ProductionHelper.HasMaxScale(i.Quantity, QuantityScale))
                return ($"Dòng {row}: định mức phải lớn hơn 0 và có tối đa {QuantityScale} chữ số thập phân.", product, empty);
            if (i.WastageRate < 0 || i.WastageRate > 100 || !ProductionHelper.HasMaxScale(i.WastageRate, WastageScale))
                return ($"Dòng {row}: tỷ lệ hao hụt phải từ 0 đến 100% và có tối đa {WastageScale} chữ số thập phân.", product, empty);
        }

        var ids = req.Items.Select(i => i.MaterialId).ToList();
        var materials = await context.MstProducts.Where(p => ids.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
        var lines = new List<(SaveBomItemRequest, MstProduct)>();
        for (var idx = 0; idx < req.Items.Count; idx++)
        {
            var i = req.Items[idx];
            if (!materials.TryGetValue(i.MaterialId, out var m) || m.IsActive == false)
                return ($"Dòng {idx + 1}: nguyên vật liệu không tồn tại hoặc đã ngừng kinh doanh.", product, empty);
            lines.Add((i, m));
        }
        return (null, product, lines);
    }

    /// <summary>
    /// BOM đã được dùng trong lệnh sản xuất chưa (BR-06). Lệnh nhiều thành phẩm chỉ lưu BOM thành phẩm đầu
    /// ở <c>trx_production_orders.bom_id</c>; BOM các thành phẩm còn lại nằm ở <c>dtl_production_order_items.bom_id</c>.
    /// </summary>
    public static async Task<bool> IsUsedAsync(IStockFlowDbContext context, int bomId, CancellationToken ct) =>
        await context.TrxProductionOrders.AnyAsync(o => o.BomId == bomId, ct)
        || await context.DtlProductionOrderItems.AnyAsync(i => i.BomId == bomId, ct);

    /// <summary>Phiên bản tiếp theo của BOM thành phẩm (1, 2, 3...) khi người dùng không nhập.</summary>
    public static async Task<string> NextVersionAsync(IStockFlowDbContext context, int productId, CancellationToken ct)
    {
        var count = await context.MstBoms.CountAsync(b => b.ProductId == productId, ct);
        var version = count + 1;
        while (await context.MstBoms.AnyAsync(b => b.ProductId == productId && b.Version == version.ToString(), ct))
        {
            version++;
        }
        return version.ToString();
    }

    /// <summary>Thay toàn bộ dòng NVL của BOM.</summary>
    public static void ReplaceItems(IStockFlowDbContext context, MstBom bom, List<(SaveBomItemRequest Line, MstProduct Material)> lines)
    {
        context.DtlBomItems.RemoveRange(bom.DtlBomItems);
        foreach (var (line, material) in lines)
        {
            context.DtlBomItems.Add(new DtlBomItem
            {
                Bom = bom,
                MaterialId = material.ProductId,
                UnitId = material.BaseUnitId,
                Quantity = line.Quantity,
                WastageRate = line.WastageRate,
            });
        }
    }

    /// <summary>
    /// Kích hoạt BOM: bản đang áp dụng khác của cùng thành phẩm chuyển sang ngừng áp dụng trước (BR-30).
    /// Lưu 2 bước để không vi phạm chỉ mục duy nhất uq_mst_boms_active_product.
    /// </summary>
    public static async Task ActivateAsync(IStockFlowDbContext context, MstBom bom, CancellationToken ct)
    {
        var others = await context.MstBoms
            .Where(b => b.ProductId == bom.ProductId && b.BomId != bom.BomId && b.IsActive == true)
            .ToListAsync(ct);
        foreach (var o in others) o.IsActive = false;
        if (others.Count > 0) await context.SaveChangesAsync(ct);

        bom.IsActive = true;
        await context.SaveChangesAsync(ct);
    }
}
