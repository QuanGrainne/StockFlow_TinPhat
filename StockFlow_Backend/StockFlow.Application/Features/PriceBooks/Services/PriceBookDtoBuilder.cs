using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Services;

/// <summary>Dựng PriceBookDto dùng chung cho danh sách, chi tiết, tạo và sửa (trước đây lặp ở 4 chỗ).</summary>
public static class PriceBookDtoBuilder
{
    /// <summary>Tên + mã các khách được chọn trong phạm vi của nhiều bảng giá (1 truy vấn).</summary>
    public static async Task<Dictionary<int, PriceBookCustomerRefDto>> LoadCustomersAsync(
        IStockFlowDbContext context, IEnumerable<MstPriceBook> books, CancellationToken ct)
    {
        var ids = books.SelectMany(b => PriceBookScope.ParseIds(b.ScopeCustomerIds)).Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<int, PriceBookCustomerRefDto>();
        return await context.MstBusinessPartners.AsNoTracking()
            .Where(p => ids.Contains(p.PartnerId))
            .Select(p => new PriceBookCustomerRefDto(p.PartnerId, p.PartnerCode, p.PartnerName, p.Phone))
            .ToDictionaryAsync(p => p.PartnerId, ct);
    }

    public static PriceBookDto ToDto(
        MstPriceBook pb, string? basePriceBookName, int totalItems,
        IReadOnlyDictionary<int, PriceBookCustomerRefDto> customers)
    {
        var warehouseIds = PriceBookScope.ParseIds(pb.ScopeWarehouseIds);
        var customerIds = PriceBookScope.ParseIds(pb.ScopeCustomerIds);
        return new PriceBookDto(
            PriceBookId: pb.PriceBookId,
            PriceBookCode: pb.PriceBookCode,
            PriceBookName: pb.PriceBookName,
            EffectiveFrom: pb.EffectiveFrom,
            EffectiveTo: pb.EffectiveTo,
            IsActive: pb.IsActive,
            IsDefault: pb.IsDefault,
            FormulaBaseType: pb.FormulaBaseType,
            FormulaBasePriceBookId: pb.FormulaBasePriceBookId,
            FormulaBasePriceBookName: basePriceBookName,
            FormulaOperator: pb.FormulaOperator,
            FormulaValue: pb.FormulaValue,
            FormulaUnit: pb.FormulaUnit,
            AllowUnlistedProducts: pb.AllowUnlistedProducts,
            WarnUnlistedProducts: pb.WarnUnlistedProducts,
            ScopeBranchType: pb.ScopeBranchType,
            ScopeWarehouseIds: warehouseIds,
            ScopeCustomerType: pb.ScopeCustomerType,
            ScopeCustomerIds: customerIds,
            ScopeCustomers: customerIds.Where(customers.ContainsKey).Select(id => customers[id]).ToList(),
            TotalItemsCount: totalItems,
            UpdatedAt: pb.UpdatedAt ?? pb.CreatedAt);
    }

    /// <summary>Dựng DTO cho 1 bảng giá vừa lưu (đọc thêm tên bảng giá nguồn, số hàng hóa, khách).</summary>
    public static async Task<PriceBookDto> BuildAsync(IStockFlowDbContext context, MstPriceBook pb, CancellationToken ct)
    {
        var baseName = pb.FormulaBasePriceBookId.HasValue
            ? await context.MstPriceBooks.Where(b => b.PriceBookId == pb.FormulaBasePriceBookId.Value)
                .Select(b => b.PriceBookName).FirstOrDefaultAsync(ct)
            : null;
        var count = await context.DtlPriceBookItems.CountAsync(i => i.PriceBookId == pb.PriceBookId, ct);
        var customers = await LoadCustomersAsync(context, new[] { pb }, ct);
        return ToDto(pb, baseName, count, customers);
    }

    /// <summary>Mã bảng giá BG000002... lấy từ sequence (không đếm + 1: xóa bảng giá rồi tạo lại sẽ trùng mã).</summary>
    public static async Task<string> NextCodeAsync(IStockFlowDbContext context, CancellationToken ct)
    {
        var seq = await context.GetNextSequenceValueAsync("stockflow.seq_price_book_code", ct);
        return $"BG{seq:D6}";
    }
}
