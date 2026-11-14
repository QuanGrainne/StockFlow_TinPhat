using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Settings.Queries;

public record GetDebtWarningSettingsQuery : IRequest<Result<DebtWarningSettingDto>>;

public class GetDebtWarningSettingsQueryHandler : IRequestHandler<GetDebtWarningSettingsQuery, Result<DebtWarningSettingDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetDebtWarningSettingsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<DebtWarningSettingDto>> Handle(GetDebtWarningSettingsQuery request, CancellationToken cancellationToken)
    {
        var setting = await DebtWarningSettingsLoader.LoadAsync(_context, cancellationToken);
        return Result<DebtWarningSettingDto>.Success(await DebtWarningSettingsLoader.ToDtoAsync(_context, setting, cancellationToken));
    }
}

public static class DebtWarningSettingsLoader
{
    /// <summary>Đọc thiết lập; chưa có dòng nào → trả giá trị mặc định (không ghi DB).</summary>
    public static async Task<MstDebtWarningSetting> LoadAsync(IStockFlowDbContext context, CancellationToken ct) =>
        await context.MstDebtWarningSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingId == 1, ct)
        ?? new MstDebtWarningSetting();

    public static async Task<DebtWarningSettingDto> ToDtoAsync(IStockFlowDbContext context, MstDebtWarningSetting s, CancellationToken ct)
    {
        string? updater = null;
        if (s.UpdatedBy.HasValue)
        {
            var user = await context.SecUsers.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == s.UpdatedBy.Value, ct);
            updater = user?.FullName ?? user?.Username;
        }
        return new DebtWarningSettingDto
        {
            EnableDebtAmountWarning = s.EnableDebtAmountWarning,
            DebtAmountThreshold = s.DebtAmountThreshold,
            EnableDebtDaysWarning = s.EnableDebtDaysWarning,
            DebtDaysThreshold = s.DebtDaysThreshold,
            DebtDaysFrom = s.DebtDaysFrom,
            AllowDebtOverLimit = s.AllowDebtOverLimit,
            UpdatedAt = s.UpdatedAt,
            UpdatedByName = updater,
        };
    }
}
