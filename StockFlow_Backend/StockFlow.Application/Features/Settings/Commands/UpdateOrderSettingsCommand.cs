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

/// <summary>
/// Lưu cài đặt giao dịch (bán hàng vượt tồn kho, chuyển hàng khi âm kho).
/// Quyền lưu theo chức năng "Cài đặt" (feat-settings) trong ma trận phân quyền, kiểm ở controller
/// (trước đây gán cứng chỉ Admin được lưu).
/// </summary>
public record UpdateOrderSettingsCommand(UpdateOrderSettingDto Dto) : IRequest<Result<OrderSettingDto>>;

public class UpdateOrderSettingsCommandHandler : IRequestHandler<UpdateOrderSettingsCommand, Result<OrderSettingDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateOrderSettingsCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<OrderSettingDto>> Handle(UpdateOrderSettingsCommand request, CancellationToken cancellationToken)
    {
        var dto = request.Dto;

        var setting = await _context.MstOrderSettings.FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken);
        if (setting == null)
        {
            setting = new MstOrderSetting { SettingId = 1 };
            _context.MstOrderSettings.Add(setting);
        }

        setting.AllowNegativeStockSale = dto.AllowNegativeStockSale;
        setting.AllowNegativeStockTransfer = dto.AllowNegativeStockTransfer;
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        string? updaterName = null;
        if (setting.UpdatedBy.HasValue)
        {
            var user = await _context.SecUsers.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == setting.UpdatedBy.Value, cancellationToken);
            updaterName = user?.FullName ?? user?.Username;
        }

        return Result.Success(OrderSettingMapper.ToDto(setting, updaterName));
    }
}
