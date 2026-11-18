using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// Nhu cầu NVL gom theo tháng ("yyyy-MM") hoặc tuần ISO bắt đầu thứ Hai ("yyyy-Www", năm theo ISO) của một lần chạy (AC-02).
/// Kỳ gom dùng <see cref="MrpPolicy.PeriodStart"/> để khớp với bộ tính.
/// </summary>
public record GetMrpMonthlyDemandQuery(int MrpRunId, string Bucket = "month") : IRequest<Result<MrpMonthlyDemandDto>>;

public class GetMrpMonthlyDemandQueryHandler : IRequestHandler<GetMrpMonthlyDemandQuery, Result<MrpMonthlyDemandDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMrpMonthlyDemandQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<MrpMonthlyDemandDto>> Handle(GetMrpMonthlyDemandQuery request, CancellationToken ct)
    {
        var (run, _, error) = await MrpRunAccess.LoadAsync(_context, _currentUser, request.MrpRunId, ct);
        if (run == null) return Result.Failure<MrpMonthlyDemandDto>(error!);

        var period = string.Equals(request.Bucket, "week", StringComparison.OrdinalIgnoreCase) ? MrpPeriod.Week : MrpPeriod.Month;
        string Label(DateOnly start)
        {
            if (period == MrpPeriod.Month) return start.ToString("yyyy-MM", CultureInfo.InvariantCulture);
            var date = start.ToDateTime(TimeOnly.MinValue);
            return $"{ISOWeek.GetYear(date)}-W{ISOWeek.GetWeekOfYear(date):D2}";
        }

        // Mọi kỳ trong khoảng chạy (kể cả kỳ không có nhu cầu) để cột liên tục
        var starts = new List<DateOnly>();
        for (var s = MrpPolicy.PeriodStart(run.PeriodStart, period); s <= run.PeriodEnd;
             s = period == MrpPeriod.Week ? s.AddDays(7) : s.AddMonths(1))
            starts.Add(s);

        var lines = await _context.DtlMrpRunLines.AsNoTracking()
            .Where(l => l.MrpRunId == run.MrpRunId && l.GrossRequirement > 0)
            .Select(l => new
            {
                l.MaterialId,
                Code = l.Material.ProductCode ?? "",
                Name = l.Material.ProductName ?? "",
                Unit = l.Material.BaseUnit.UnitName ?? "",
                l.BucketDate,
                l.GrossRequirement,
            })
            .ToListAsync(ct);

        var materials = lines.GroupBy(l => l.MaterialId).Select(g =>
        {
            var byPeriod = MrpPolicy.Aggregate(g.Select(l => (l.BucketDate, l.GrossRequirement)), period)
                .ToDictionary(x => x.PeriodStart, x => x.Quantity);
            var quantities = starts.Select(s => byPeriod.GetValueOrDefault(s)).ToList();
            var first = g.First();
            return new MrpMonthlyMaterialDemandDto(first.MaterialId, first.Code, first.Name, first.Unit, quantities, quantities.Sum());
        });

        return Result.Success(new MrpMonthlyDemandDto(
            starts.Select(Label).ToList(),
            materials.OrderBy(m => m.MaterialCode).ToList()));
    }
}
