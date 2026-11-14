using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.Application.Features.Settings.Queries;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Settings.Commands;

public record UpdateDebtWarningSettingsCommand(UpdateDebtWarningSettingDto Dto) : IRequest<Result<DebtWarningSettingDto>>;

public class UpdateDebtWarningSettingsCommandHandler : IRequestHandler<UpdateDebtWarningSettingsCommand, Result<DebtWarningSettingDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateDebtWarningSettingsCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<DebtWarningSettingDto>> Handle(UpdateDebtWarningSettingsCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;

        if (dto.EnableDebtAmountWarning && dto.DebtAmountThreshold <= 0)
            return Result<DebtWarningSettingDto>.Failure("Số tiền nợ cảnh báo phải lớn hơn 0.");
        if (dto.DebtAmountThreshold < 0 || dto.DebtAmountThreshold > 999_999_999_999m)
            return Result<DebtWarningSettingDto>.Failure("Số tiền nợ cảnh báo không hợp lệ.");
        if (dto.EnableDebtDaysWarning && dto.DebtDaysThreshold <= 0)
            return Result<DebtWarningSettingDto>.Failure("Số ngày nợ cảnh báo phải lớn hơn 0.");
        if (dto.DebtDaysThreshold < 0 || dto.DebtDaysThreshold > 3650)
            return Result<DebtWarningSettingDto>.Failure("Số ngày nợ cảnh báo phải trong khoảng 0 – 3650 ngày.");

        var from = dto.DebtDaysFrom?.Trim().ToUpperInvariant();
        if (from != MstDebtWarningSetting.FromFirstDebt && from != MstDebtWarningSetting.FromLastTransaction)
            return Result<DebtWarningSettingDto>.Failure("Mốc tính số ngày nợ không hợp lệ (FIRST_DEBT hoặc LAST_TRANSACTION).");

        var setting = await _context.MstDebtWarningSettings.FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken);
        if (setting == null)
        {
            setting = new MstDebtWarningSetting { SettingId = 1 };
            _context.MstDebtWarningSettings.Add(setting);
        }

        setting.EnableDebtAmountWarning = dto.EnableDebtAmountWarning;
        setting.DebtAmountThreshold = dto.DebtAmountThreshold;
        setting.EnableDebtDaysWarning = dto.EnableDebtDaysWarning;
        setting.DebtDaysThreshold = dto.DebtDaysThreshold;
        setting.DebtDaysFrom = from;
        setting.AllowDebtOverLimit = dto.AllowDebtOverLimit;
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<DebtWarningSettingDto>.Success(await DebtWarningSettingsLoader.ToDtoAsync(_context, setting, cancellationToken));
    }
}
