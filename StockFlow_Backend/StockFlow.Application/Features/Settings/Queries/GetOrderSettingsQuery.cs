using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Settings.Queries;

public record GetOrderSettingsQuery : IRequest<Result<OrderSettingDto>>;

public class GetOrderSettingsQueryHandler : IRequestHandler<GetOrderSettingsQuery, Result<OrderSettingDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetOrderSettingsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<OrderSettingDto>> Handle(GetOrderSettingsQuery request, CancellationToken cancellationToken)
    {
        var setting = await _context.MstOrderSettings
            .Include(s => s.UpdatedByUser)
            .FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken);

        if (setting == null)
        {
            // Chưa có dòng cài đặt: tạo với mặc định (cả 2 tuỳ chọn đều cho phép)
            setting = new MstOrderSetting { SettingId = 1, UpdatedAt = System.DateTime.UtcNow };
            _context.MstOrderSettings.Add(setting);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result.Success(OrderSettingMapper.ToDto(setting, setting.UpdatedByUser?.FullName ?? setting.UpdatedByUser?.Username));
    }
}

/// <summary>Chuyển entity cài đặt sang DTO (dùng chung cho xem và lưu).</summary>
public static class OrderSettingMapper
{
    public static OrderSettingDto ToDto(MstOrderSetting setting, string? updatedByName) => new()
    {
        SettingId = setting.SettingId,
        AllowNegativeStockSale = setting.AllowNegativeStockSale,
        AllowNegativeStockTransfer = setting.AllowNegativeStockTransfer,
        UpdatedAt = setting.UpdatedAt,
        UpdatedBy = setting.UpdatedBy,
        UpdatedByName = updatedByName,
    };
}
