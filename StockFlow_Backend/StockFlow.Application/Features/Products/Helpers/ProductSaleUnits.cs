using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Products.Helpers;

/// <summary>Một đơn vị bán của hàng: đơn vị cơ bản (Rate = 1) hoặc đơn vị quy đổi (VD "túi (10 bịch/túi)", Rate = 10)</summary>
/// <param name="Code">Mã hàng của đơn vị (mã KiotViet của dòng đơn vị, VD SP004346); null = mã hàng chính</param>
/// <param name="SalePrice">Giá bán đã thiết lập cho đơn vị ở "Hàng cùng loại" (0 = chưa thiết lập)</param>
public sealed record SaleUnit(string Name, decimal Rate, bool IsBase, string? Code, decimal SalePrice);

/// <summary>
/// Đọc đơn vị bán của hàng từ variants_json (units + variants) – bán theo đơn vị quy đổi (26/11/2026).
/// Hệ số quy đổi luôn lấy từ thiết lập của hàng, không tin số trình duyệt gửi.
/// </summary>
public static class ProductSaleUnits
{
    /// <summary>Các đơn vị bán, đơn vị cơ bản đứng đầu. Hàng chưa thiết lập đơn vị → chỉ đơn vị cơ bản.</summary>
    public static List<SaleUnit> Parse(MstProduct product)
    {
        var baseName = product.BaseUnit?.UnitName?.Trim();
        var units = new List<SaleUnit>();
        if (!string.IsNullOrWhiteSpace(product.VariantsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(product.VariantsJson);
                var root = doc.RootElement;
                // Mã + giá bán theo tên đơn vị (lấy dòng đầu tiên của mỗi đơn vị)
                var byUnit = new Dictionary<string, (string? Code, decimal Price)>(StringComparer.OrdinalIgnoreCase);
                if (Prop(root, "variants") is { ValueKind: JsonValueKind.Array } variants)
                {
                    foreach (var v in variants.EnumerateArray())
                    {
                        var unitName = Str(v, "UnitName");
                        if (string.IsNullOrWhiteSpace(unitName) || byUnit.ContainsKey(unitName)) continue;
                        byUnit[unitName] = (Str(v, "Code"), Num(v, "SalePrice") ?? 0);
                    }
                }
                if (Prop(root, "units") is { ValueKind: JsonValueKind.Array } arr)
                {
                    foreach (var u in arr.EnumerateArray())
                    {
                        var name = Str(u, "Name")?.Trim();
                        if (string.IsNullOrWhiteSpace(name)) continue;
                        var isBase = Prop(u, "IsBase") is { ValueKind: JsonValueKind.True };
                        var rate = isBase ? 1 : Num(u, "ConversionRate") ?? 1;
                        if (rate <= 0) continue;
                        byUnit.TryGetValue(name, out var info);
                        if (isBase) baseName ??= name;
                        units.Add(new SaleUnit(name, rate, isBase, info.Code, info.Price));
                    }
                }
            }
            catch (JsonException)
            {
                // JSON hỏng: coi như hàng chỉ có đơn vị cơ bản
            }
        }

        baseName ??= "Cái";
        var baseUnit = units.FirstOrDefault(u => u.IsBase) ?? new SaleUnit(baseName, 1, true, product.ProductCode, 0);
        var others = units
            .Where(u => !u.IsBase && !u.Name.Equals(baseUnit.Name, StringComparison.OrdinalIgnoreCase))
            .GroupBy(u => u.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First());
        return new[] { baseUnit with { IsBase = true, Rate = 1 } }.Concat(others).ToList();
    }

    /// <summary>Đơn vị bán theo tên; tên trống = đơn vị cơ bản; không có trong thiết lập của hàng → null</summary>
    public static SaleUnit? Find(MstProduct product, string? unitName)
    {
        var units = Parse(product);
        if (string.IsNullOrWhiteSpace(unitName)) return units[0];
        return units.FirstOrDefault(u => u.Name.Equals(unitName.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>Id đơn vị trong mst_units cho tên đơn vị bán (tạo mới nếu chưa có) – lưu vào dtl_order_items.unit_id</summary>
    public static async Task<int> UnitIdAsync(
        IStockFlowDbContext context, MstProduct product, SaleUnit unit, Dictionary<string, int> cache, CancellationToken ct)
    {
        if (unit.IsBase) return product.BaseUnitId;
        if (cache.TryGetValue(unit.Name, out var cached)) return cached;
        var name = unit.Name.Length > 50 ? unit.Name[..50] : unit.Name;
        var lower = name.ToLower();
        var existing = await context.MstUnits.FirstOrDefaultAsync(u => u.UnitName != null && u.UnitName.ToLower() == lower, ct);
        if (existing == null)
        {
            existing = new MstUnit { UnitName = name, Abbreviation = name.Length > 10 ? name[..10] : name };
            context.MstUnits.Add(existing);
            await context.SaveChangesAsync(ct);
        }
        cache[unit.Name] = existing.UnitId;
        return existing.UnitId;
    }

    private static JsonElement? Prop(JsonElement el, string name)
    {
        if (el.ValueKind != JsonValueKind.Object) return null;
        foreach (var p in el.EnumerateObject())
        {
            if (p.Name.Equals(name, StringComparison.OrdinalIgnoreCase)) return p.Value;
        }
        return null;
    }

    private static string? Str(JsonElement el, string name) =>
        Prop(el, name) is { ValueKind: JsonValueKind.String } v ? v.GetString() : null;

    private static decimal? Num(JsonElement el, string name) =>
        Prop(el, name) is { ValueKind: JsonValueKind.Number } v && v.TryGetDecimal(out var d) ? d : null;
}
