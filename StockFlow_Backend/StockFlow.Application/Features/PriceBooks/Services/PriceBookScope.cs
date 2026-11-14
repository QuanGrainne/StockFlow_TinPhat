using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Services;

/// <summary>
/// Phạm vi áp dụng của bảng giá: chi nhánh (kho) và khách hàng cụ thể.
/// - "Người tạo giao dịch" và "Nhóm khách hàng" đã bỏ (hệ thống không có nhóm khách; cột cũ giữ nguyên, không dùng).
/// - Danh sách ID lưu dạng JSON trong cột text (scope_warehouse_ids, scope_customer_ids).
/// </summary>
public static class PriceBookScope
{
    public const string All = "ALL";
    public const string Specific = "SPECIFIC";

    /// <summary>Mã khách lẻ: không áp dụng bảng giá theo khách cụ thể.</summary>
    public const string WalkInCustomerCode = "KH00000";

    public static List<int> ParseIds(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<int>();
        try { return JsonSerializer.Deserialize<List<int>>(json) ?? new List<int>(); }
        catch (JsonException) { return new List<int>(); }
    }

    public static string? SerializeIds(IEnumerable<int>? ids)
    {
        var list = ids?.Where(i => i > 0).Distinct().OrderBy(i => i).ToList();
        return list == null || list.Count == 0 ? null : JsonSerializer.Serialize(list);
    }

    public static string NormalizeType(string? type) =>
        string.Equals(type, Specific, StringComparison.OrdinalIgnoreCase) ? Specific : All;

    /// <summary>
    /// Bảng giá dùng được khi bán: đang áp dụng, trong thời gian hiệu lực, đúng chi nhánh và đúng khách.
    /// Bảng giá chung (mặc định) luôn dùng được.
    /// </summary>
    public static bool IsApplicable(MstPriceBook pb, DateTime now, int? warehouseId, int? customerId)
    {
        if (pb.IsDefault) return true;
        if (!pb.IsActive) return false;
        if (pb.EffectiveFrom.HasValue && pb.EffectiveFrom.Value > now) return false;
        if (pb.EffectiveTo.HasValue && pb.EffectiveTo.Value < now) return false;

        if (pb.ScopeBranchType == Specific && warehouseId.HasValue && !ParseIds(pb.ScopeWarehouseIds).Contains(warehouseId.Value))
            return false;

        if (pb.ScopeCustomerType == Specific && (!customerId.HasValue || !ParseIds(pb.ScopeCustomerIds).Contains(customerId.Value)))
            return false;

        return true;
    }

    /// <summary>
    /// Kiểm tra phạm vi trước khi lưu: chọn "cụ thể" thì phải có ít nhất 1 mục;
    /// kho phải tồn tại và đang hoạt động; khách phải là khách hàng đang hoạt động (không phải khách lẻ).
    /// Trả về thông báo lỗi hoặc null nếu hợp lệ.
    /// </summary>
    public static async Task<string?> ValidateAsync(
        IStockFlowDbContext context,
        string branchType, List<int> warehouseIds,
        string customerType, List<int> customerIds,
        CancellationToken ct)
    {
        if (branchType == Specific)
        {
            if (warehouseIds.Count == 0) return "Vui lòng chọn ít nhất một chi nhánh áp dụng.";
            var activeCount = await context.MstWarehouses
                .CountAsync(w => warehouseIds.Contains(w.WarehouseId) && w.IsActive != false, ct);
            if (activeCount != warehouseIds.Count) return "Có chi nhánh không tồn tại hoặc đã ngừng hoạt động.";
        }

        if (customerType == Specific)
        {
            if (customerIds.Count == 0) return "Vui lòng chọn ít nhất một khách hàng áp dụng.";
            var validCount = await context.MstBusinessPartners
                .CountAsync(p => customerIds.Contains(p.PartnerId)
                                 && p.IsActive != false
                                 && p.PartnerCode != WalkInCustomerCode
                                 && p.PartnerType != null
                                 && (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"), ct);
            if (validCount != customerIds.Count) return "Có khách hàng không tồn tại, đã ngừng hoạt động hoặc là khách lẻ.";
        }

        return null;
    }
}
