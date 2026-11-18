using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// Tồn dự phóng theo ngày của một NVL trong một lần chạy (AC-03). Tồn sau đề xuất = tồn nếu không mua + đề xuất lũy kế.
/// </summary>
public record GetMrpProjectionQuery(int MrpRunId, int MaterialId) : IRequest<Result<MrpProjectionDto>>;

public class GetMrpProjectionQueryHandler : IRequestHandler<GetMrpProjectionQuery, Result<MrpProjectionDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMrpProjectionQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<MrpProjectionDto>> Handle(GetMrpProjectionQuery request, CancellationToken ct)
    {
        var (run, _, error) = await MrpRunAccess.LoadAsync(_context, _currentUser, request.MrpRunId, ct);
        if (run == null) return Result.Failure<MrpProjectionDto>(error!);

        var lines = await _context.DtlMrpRunLines.AsNoTracking()
            .Include(l => l.Material).ThenInclude(m => m.BaseUnit)
            .Where(l => l.MrpRunId == run.MrpRunId && l.MaterialId == request.MaterialId)
            .OrderBy(l => l.BucketDate)
            .ToListAsync(ct);
        if (lines.Count == 0)
            return Result.Failure<MrpProjectionDto>("Nguyên vật liệu này không có trong lần chạy MRP.");

        var material = lines[0].Material;
        var cumulative = 0m;
        var rows = lines.Select(l =>
        {
            cumulative += l.PlannedReceipt;
            return new MrpProjectionRowDto(
                l.BucketDate, l.GrossRequirement, l.ScheduledReceipt, l.ProjectedBalance, l.NetRequirement,
                l.PlannedReceipt, l.ProjectedBalance + cumulative, l.PlannedReleaseDate, l.IsLate);
        }).ToList();

        return Result.Success(new MrpProjectionDto(
            new MrpProductLookupDto(material.ProductId, material.ProductCode ?? "", material.ProductName ?? ""),
            material.BaseUnit?.UnitName ?? "",
            MrpRunAccess.OpeningBalance(lines, run.PeriodStart),
            SafetyStock: 0, // Q5: giai đoạn đầu MRP không dùng tồn an toàn
            material.LeadTimeDays,
            rows));
    }
}
