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
            setting = new MstOrderSetting
            {
                SettingId = 1,
                EnableOrderPlacement = true,
                AllowOrderWhenOutOfStock = true,
                AllowSellingReservedStock = false,
                AllowTransferringOrderBranch = true,
                AllowNegativeStockSale = false,
                EnablePrintQuotation = true,
                ConfirmBeforeCompleteOrder = false,
                EnableReturnTimeLimit = true,
                ReturnTimeLimitDays = 30,
                LockTransactionTime = true,
                OrderCodeRule = "SEQUENTIAL",
                OrderCodePrefix = "HD",
                BookingCodePrefix = "DH",
                ReturnCodePrefix = "TH",
                TransferCodePrefix = "CK",
                UpdatedAt = System.DateTime.UtcNow
            };
            _context.MstOrderSettings.Add(setting);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var dto = new OrderSettingDto
        {
            SettingId = setting.SettingId,
            EnableOrderPlacement = setting.EnableOrderPlacement,
            AllowOrderWhenOutOfStock = setting.AllowOrderWhenOutOfStock,
            AllowSellingReservedStock = setting.AllowSellingReservedStock,
            AllowTransferringOrderBranch = setting.AllowTransferringOrderBranch,
            AllowNegativeStockSale = setting.AllowNegativeStockSale,
            EnablePrintQuotation = setting.EnablePrintQuotation,
            ConfirmBeforeCompleteOrder = setting.ConfirmBeforeCompleteOrder,
            EnableReturnTimeLimit = setting.EnableReturnTimeLimit,
            ReturnTimeLimitDays = setting.ReturnTimeLimitDays,
            LockTransactionTime = setting.LockTransactionTime,
            OrderCodeRule = setting.OrderCodeRule ?? "SEQUENTIAL",
            OrderCodePrefix = setting.OrderCodePrefix ?? "HD",
            BookingCodePrefix = setting.BookingCodePrefix ?? "DH",
            ReturnCodePrefix = setting.ReturnCodePrefix ?? "TH",
            TransferCodePrefix = setting.TransferCodePrefix ?? "CK",
            UpdatedAt = setting.UpdatedAt,
            UpdatedBy = setting.UpdatedBy,
            UpdatedByName = setting.UpdatedByUser?.FullName ?? setting.UpdatedByUser?.Username
        };

        return Result.Success(dto);
    }
}

