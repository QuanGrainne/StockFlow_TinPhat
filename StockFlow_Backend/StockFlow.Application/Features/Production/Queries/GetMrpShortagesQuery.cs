using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// NVL thiếu của một lần chạy MRP (BR-MRP-18, 21): ngày thiếu đầu tiên, tổng nhu cầu ròng, kế hoạch / lệnh bị thiếu
/// (bảng truy vết dtl_mrp_run_demands), đơn đặt chưa có ngày giao và tồn ở kho khác người dùng được xem (gợi ý chuyển kho).
/// Hai phần cuối đọc theo dữ liệu hiện tại (chỉ để tham khảo).
/// </summary>
public record GetMrpShortagesQuery(int MrpRunId, bool LateOnly = false) : IRequest<Result<List<MrpShortageDto>>>;

public class GetMrpShortagesQueryHandler : IRequestHandler<GetMrpShortagesQuery, Result<List<MrpShortageDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMrpShortagesQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<MrpShortageDto>>> Handle(GetMrpShortagesQuery request, CancellationToken ct)
    {
        var (run, whIds, error) = await MrpRunAccess.LoadAsync(_context, _currentUser, request.MrpRunId, ct);
        if (run == null) return Result.Failure<List<MrpShortageDto>>(error!);

        var lines = await _context.DtlMrpRunLines.AsNoTracking()
            .Include(l => l.Material).ThenInclude(m => m.BaseUnit)
            .Where(l => l.MrpRunId == run.MrpRunId)
            .OrderBy(l => l.BucketDate)
            .ToListAsync(ct);

        var shortGroups = lines.GroupBy(l => l.MaterialId)
            .Where(g => g.Sum(l => l.NetRequirement) > 0)
            .Where(g => !request.LateOnly || g.Any(l => l.IsLate))
            .ToList();
        if (shortGroups.Count == 0) return Result.Success(new List<MrpShortageDto>());
        var materialIds = shortGroups.Select(g => g.Key).ToList();

        var affected = await _context.DtlMrpRunDemands.AsNoTracking()
            .Where(d => d.MrpRunId == run.MrpRunId && d.ShortageQty > 0 && materialIds.Contains(d.MaterialId))
            .OrderBy(d => d.NeedDate)
            .Select(d => new
            {
                d.MaterialId,
                d.SourceType,
                Code = d.SourceType == MrpDemandSource.Order
                    ? (d.ProductionOrder != null ? d.ProductionOrder.ProductionOrderCode : null)
                    : (d.ProductionPlan != null ? d.ProductionPlan.PlanCode : null),
                ProductCode = d.Product.ProductCode,
                d.NeedDate,
                d.ShortageQty,
            })
            .ToListAsync(ct);
        var affectedByMaterial = affected.ToLookup(a => a.MaterialId);

        // Đơn đặt chưa có ngày giao (BR-MRP-12): không được trừ vào thiếu, chỉ hiện để người dùng bổ sung ngày giao
        var supply = await MrpSupplyReader.ReadAsync(_context, whIds, materialIds, run.PeriodStart, run.PeriodEnd, ct);

        // Gợi ý chuyển kho (BR-MRP-16): tồn ở các kho khác mà người dùng có quyền
        var otherWarehouseIds = new List<int>();
        var candidates = await _context.MstWarehouses.AsNoTracking()
            .Where(w => w.IsActive == true && !whIds.Contains(w.WarehouseId))
            .Select(w => w.WarehouseId)
            .ToListAsync(ct);
        foreach (var id in candidates)
        {
            if (await _currentUser.HasWarehouseAccessAsync(id, ct)) otherWarehouseIds.Add(id);
        }
        var otherStocks = await _context.TrxInventoryBalances.AsNoTracking()
            .Where(b => otherWarehouseIds.Contains(b.WarehouseId) && materialIds.Contains(b.ProductId))
            .GroupBy(b => new { b.ProductId, b.WarehouseId, b.Warehouse.WarehouseName })
            .Select(g => new { g.Key.ProductId, g.Key.WarehouseId, g.Key.WarehouseName, Qty = g.Sum(b => b.Quantity ?? 0) })
            .ToListAsync(ct);
        var otherByMaterial = otherStocks.Where(s => s.Qty > 0).ToLookup(s => s.ProductId);

        var result = shortGroups.Select(g =>
        {
            var material = g.First().Material;
            var withPlan = g.Where(l => l.PlannedReceipt > 0).ToList();
            return new MrpShortageDto(
                g.Key,
                material.ProductCode ?? "",
                material.ProductName ?? "",
                material.BaseUnit?.UnitName ?? "",
                g.FirstOrDefault(l => l.NetRequirement > 0)?.BucketDate,
                g.Sum(l => l.NetRequirement),
                g.Any(l => l.IsLate),
                // Thời gian giao theo đúng lúc chạy: có đề xuất mà không có ngày đặt nghĩa là NVL chưa khai báo thời gian giao
                withPlan.All(l => l.PlannedReleaseDate.HasValue),
                MrpRunAccess.OpeningBalance(g, run.PeriodStart),
                supply.OnOrderWithoutDate.GetValueOrDefault(g.Key),
                affectedByMaterial[g.Key]
                    .Select(a => new MrpAffectedRequirementDto(a.SourceType, a.Code ?? "", a.ProductCode ?? "", a.NeedDate, a.ShortageQty))
                    .ToList(),
                otherByMaterial[g.Key]
                    .Select(s => new MrpOtherWarehouseStockDto(s.WarehouseId, s.WarehouseName ?? "", s.Qty))
                    .ToList());
        });

        return Result.Success(result.OrderByDescending(s => s.IsLate).ThenBy(s => s.FirstShortageDate).ToList());
    }
}
