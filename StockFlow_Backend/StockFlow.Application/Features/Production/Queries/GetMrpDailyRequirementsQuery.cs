using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>Nhu cầu NVL theo ngày của một lần chạy, kèm nguồn nhu cầu (kế hoạch / lệnh) từ bảng truy vết.</summary>
public record GetMrpDailyRequirementsQuery(
    int MrpRunId,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int? MaterialId = null) : IRequest<Result<List<MrpDailyRequirementDto>>>;

public class GetMrpDailyRequirementsQueryHandler
    : IRequestHandler<GetMrpDailyRequirementsQuery, Result<List<MrpDailyRequirementDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMrpDailyRequirementsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<MrpDailyRequirementDto>>> Handle(GetMrpDailyRequirementsQuery request, CancellationToken ct)
    {
        var (run, _, error) = await MrpRunAccess.LoadAsync(_context, _currentUser, request.MrpRunId, ct);
        if (run == null) return Result.Failure<List<MrpDailyRequirementDto>>(error!);

        var lines = _context.DtlMrpRunLines.AsNoTracking()
            .Where(l => l.MrpRunId == run.MrpRunId && l.GrossRequirement > 0);
        var demands = _context.DtlMrpRunDemands.AsNoTracking()
            .Where(d => d.MrpRunId == run.MrpRunId);
        if (request.FromDate is DateOnly from)
        {
            lines = lines.Where(l => l.BucketDate >= from);
            demands = demands.Where(d => d.NeedDate >= from);
        }
        if (request.ToDate is DateOnly to)
        {
            lines = lines.Where(l => l.BucketDate <= to);
            demands = demands.Where(d => d.NeedDate <= to);
        }
        if (request.MaterialId is int materialId)
        {
            lines = lines.Where(l => l.MaterialId == materialId);
            demands = demands.Where(d => d.MaterialId == materialId);
        }

        var lineRows = await lines
            .OrderBy(l => l.BucketDate).ThenBy(l => l.Material.ProductCode)
            .Select(l => new
            {
                l.BucketDate,
                l.MaterialId,
                Code = l.Material.ProductCode ?? "",
                Name = l.Material.ProductName ?? "",
                Unit = l.Material.BaseUnit.UnitName ?? "",
                l.GrossRequirement,
            })
            .ToListAsync(ct);

        var sources = await demands
            .OrderBy(d => d.SourceType).ThenBy(d => d.ProductionPlanId).ThenBy(d => d.ProductionOrderId)
            .Select(d => new
            {
                d.NeedDate,
                d.MaterialId,
                d.SourceType,
                Code = d.SourceType == MrpDemandSource.Order
                    ? (d.ProductionOrder != null ? d.ProductionOrder.ProductionOrderCode : null)
                    : (d.ProductionPlan != null ? d.ProductionPlan.PlanCode : null),
                ProductCode = d.Product.ProductCode,
                d.RequiredQty,
            })
            .ToListAsync(ct);
        var sourcesByBucket = sources.ToLookup(s => (s.NeedDate, s.MaterialId));

        return Result.Success(lineRows.Select(l => new MrpDailyRequirementDto(
            l.BucketDate, l.MaterialId, l.Code, l.Name, l.Unit, l.GrossRequirement,
            sourcesByBucket[(l.BucketDate, l.MaterialId)]
                .Select(s => new MrpDemandSourceDto(s.SourceType, s.Code ?? "", s.ProductCode ?? "", s.RequiredQty))
                .ToList())).ToList());
    }
}
