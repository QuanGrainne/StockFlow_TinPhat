using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Helpers;

/// <summary>Dữ liệu tra cứu kèm theo hồ sơ khách hàng (tên người tạo, chi nhánh tạo, tổng bán).</summary>
public sealed class CustomerLookups
{
    public Dictionary<int, string> UserNames { get; init; } = new();
    public Dictionary<int, string> WarehouseNames { get; init; } = new();
    public Dictionary<int, (decimal Total, DateTime? Last)> Sales { get; init; } = new();
}

public static class CustomerProfileHelper
{
    public const string CompletedStatus = "COMPLETED";

    public static bool IsCustomer(MstBusinessPartner p) =>
        p.PartnerType != null &&
        (p.PartnerType.Equals("CUSTOMER", StringComparison.OrdinalIgnoreCase) ||
         p.PartnerType.Equals("BOTH", StringComparison.OrdinalIgnoreCase));

    /// <summary>Chuẩn hóa giới tính: MALE / FEMALE / null</summary>
    public static string? NormalizeGender(string? gender)
    {
        var g = gender?.Trim().ToUpperInvariant();
        return g switch
        {
            "MALE" or "NAM" => "MALE",
            "FEMALE" or "NU" or "NỮ" => "FEMALE",
            _ => null,
        };
    }

    public static string? Clean(string? value, int maxLength)
    {
        var v = value?.Trim();
        if (string.IsNullOrEmpty(v)) return null;
        return v.Length > maxLength ? v[..maxLength] : v;
    }

    /// <summary>
    /// Tổng bán (hóa đơn đã hoàn thành) và ngày giao dịch cuối của từng khách.
    /// from / to (theo ngày) giới hạn khoảng tính tổng bán; null = toàn thời gian.
    /// </summary>
    public static async Task<Dictionary<int, (decimal Total, DateTime? Last)>> SalesTotalsAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int> partnerIds, DateTime? from, DateTime? to, CancellationToken ct)
    {
        if (partnerIds.Count == 0) return new();
        var query = context.TrxOrders.AsNoTracking()
            .Where(o => partnerIds.Contains(o.PartnerId) && o.Status == CompletedStatus);
        if (from.HasValue) query = query.Where(o => o.OrderDate >= from.Value.Date);
        if (to.HasValue)
        {
            var end = to.Value.Date.AddDays(1);
            query = query.Where(o => o.OrderDate < end);
        }
        var rows = await query
            .GroupBy(o => o.PartnerId)
            .Select(g => new { PartnerId = g.Key, Total = g.Sum(o => o.TotalAmount ?? 0), Last = g.Max(o => o.OrderDate) })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.PartnerId, r => (r.Total, r.Last));
    }

    public static async Task<CustomerLookups> LoadLookupsAsync(
        IStockFlowDbContext context, IReadOnlyCollection<MstBusinessPartner> partners,
        DateTime? salesFrom, DateTime? salesTo, CancellationToken ct)
    {
        var userIds = partners.Where(p => p.CreatedBy.HasValue).Select(p => p.CreatedBy!.Value).Distinct().ToList();
        var whIds = partners.Where(p => p.CreatedWarehouseId.HasValue).Select(p => p.CreatedWarehouseId!.Value).Distinct().ToList();

        var userNames = userIds.Count == 0
            ? new Dictionary<int, string>()
            : await context.SecUsers.AsNoTracking()
                .Where(u => userIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId, u => u.FullName ?? u.Username ?? $"NV #{u.UserId}", ct);
        var whNames = whIds.Count == 0
            ? new Dictionary<int, string>()
            : await context.MstWarehouses.AsNoTracking()
                .Where(w => whIds.Contains(w.WarehouseId))
                .ToDictionaryAsync(w => w.WarehouseId, w => w.WarehouseName ?? $"Kho #{w.WarehouseId}", ct);
        var sales = await SalesTotalsAsync(context, partners.Select(p => p.PartnerId).ToList(), salesFrom, salesTo, ct);

        return new CustomerLookups { UserNames = userNames, WarehouseNames = whNames, Sales = sales };
    }

    public static CustomerDto ToDto(MstBusinessPartner p, CustomerLookups lookups)
    {
        var creditLimit = p.CreditLimit ?? 0;
        var currentDebt = p.CurrentDebt ?? 0;
        var sales = lookups.Sales.TryGetValue(p.PartnerId, out var s) ? s : (Total: 0m, Last: (DateTime?)null);
        return new CustomerDto(
            Id: p.PartnerId.ToString(),
            PartnerId: p.PartnerId,
            Code: p.PartnerCode ?? $"KH{p.PartnerId:D5}",
            Name: p.PartnerName ?? "Khách hàng chưa đặt tên",
            Type: p.PartnerType ?? "CUSTOMER",
            Phone: p.Phone,
            Email: p.Email,
            Address: p.Address,
            CreditLimit: creditLimit,
            CurrentDebt: currentDebt,
            CurrentPayable: p.CurrentPayable ?? 0,
            Status: p.IsActive != false ? "ACTIVE" : "INACTIVE",
            IsOverCreditLimit: creditLimit > 0 && currentDebt > creditLimit,
            Phone2: p.Phone2,
            Gender: p.Gender,
            BirthDate: p.BirthDate,
            Facebook: p.Facebook,
            Notes: p.Notes,
            CreatedAt: p.CreatedAt,
            CreatedByName: p.CreatedBy.HasValue ? lookups.UserNames.GetValueOrDefault(p.CreatedBy.Value) : null,
            CreatedWarehouseId: p.CreatedWarehouseId,
            CreatedWarehouseName: p.CreatedWarehouseId.HasValue ? lookups.WarehouseNames.GetValueOrDefault(p.CreatedWarehouseId.Value) : null,
            TotalSales: sales.Total,
            TotalSalesNetReturns: sales.Total,
            LastTransactionDate: sales.Last);
    }
}
