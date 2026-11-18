using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// Đề xuất mua của một lần chạy (BR-MRP-23..29): mỗi mốc ngày có đề xuất là một dòng (cùng NVL có thể nhiều dòng khác ngày).
/// Trạng thái ON_TIME / LATE / NO_LEAD_TIME. NVL đã ngừng kinh doanh không đề xuất mua (BR-MRP-29).
/// Nhà cung cấp gợi ý là nhà cung cấp của đơn đặt gần nhất có NVL đó (không phải nhà cung cấp mặc định).
/// </summary>
public record GetMrpPurchaseSuggestionsQuery(int MrpRunId, string? Status = null)
    : IRequest<Result<List<MrpPurchaseSuggestionDto>>>;

public class GetMrpPurchaseSuggestionsQueryHandler
    : IRequestHandler<GetMrpPurchaseSuggestionsQuery, Result<List<MrpPurchaseSuggestionDto>>>
{
    public const string OnTime = "ON_TIME";
    public const string Late = "LATE";
    public const string NoLeadTime = "NO_LEAD_TIME";

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMrpPurchaseSuggestionsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<MrpPurchaseSuggestionDto>>> Handle(GetMrpPurchaseSuggestionsQuery request, CancellationToken ct)
    {
        var (run, _, error) = await MrpRunAccess.LoadAsync(_context, _currentUser, request.MrpRunId, ct);
        if (run == null) return Result.Failure<List<MrpPurchaseSuggestionDto>>(error!);

        var lines = await _context.DtlMrpRunLines.AsNoTracking()
            .Where(l => l.MrpRunId == run.MrpRunId && l.PlannedReceipt > 0 && l.Material.IsActive != false)
            .OrderBy(l => l.PlannedReleaseDate ?? l.BucketDate).ThenBy(l => l.Material.ProductCode)
            .Select(l => new
            {
                l.MaterialId,
                Code = l.Material.ProductCode ?? "",
                Name = l.Material.ProductName ?? "",
                Unit = l.Material.BaseUnit.UnitName ?? "",
                l.PlannedReceipt,
                l.BucketDate,
                l.PlannedReleaseDate,
                l.IsLate,
            })
            .ToListAsync(ct);
        if (lines.Count == 0) return Result.Success(new List<MrpPurchaseSuggestionDto>());

        var materialIds = lines.Select(l => l.MaterialId).Distinct().ToList();
        var recent = await _context.DtlPurchaseOrderItems.AsNoTracking()
            .Where(i => materialIds.Contains(i.ProductId) && i.Po.Status != PurchaseOrderHelper.Cancelled)
            .OrderByDescending(i => i.Po.OrderDate).ThenByDescending(i => i.PoId)
            .Select(i => new { i.ProductId, i.Po.PartnerId, i.Po.Partner.PartnerName })
            .ToListAsync(ct);
        var lastSupplier = recent.GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => new MrpLastSupplierDto(g.First().PartnerId, g.First().PartnerName ?? ""));

        var result = lines
            .Select(l =>
            {
                var status = l.PlannedReleaseDate == null ? NoLeadTime : l.IsLate ? Late : OnTime;
                return new MrpPurchaseSuggestionDto(
                    l.MaterialId, l.Code, l.Name, l.Unit,
                    l.PlannedReceipt,
                    MrpPolicy.RoundUpForPurchase(l.PlannedReceipt), // BR-MRP-27
                    l.BucketDate, // đệm an toàn, kiểm nhận = 0 (chưa cấu hình) nên ngày hàng phải tới = ngày cần
                    l.PlannedReleaseDate,
                    status,
                    lastSupplier.GetValueOrDefault(l.MaterialId));
            })
            .Where(s => string.IsNullOrWhiteSpace(request.Status)
                        || string.Equals(s.Status, request.Status.Trim(), StringComparison.OrdinalIgnoreCase))
            .ToList();

        return Result.Success(result);
    }
}
