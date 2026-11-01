using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Settings.Commands;

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
        if (_currentUserService.IsAuthenticated && !_currentUserService.IsAdmin)
        {
            return Result.Failure<OrderSettingDto>("Chỉ Quản trị viên (Admin) mới có quyền thay đổi thiết lập đơn hàng và quy tắc giao dịch.");
        }

        var dto = request.Dto;

        // Validation
        if (dto.ReturnTimeLimitDays < 0)
        {
            return Result.Failure<OrderSettingDto>("Số ngày giới hạn đổi trả phải lớn hơn hoặc bằng 0.");
        }

        string normalizedRule = dto.OrderCodeRule?.Trim().ToUpperInvariant() ?? "SEQUENTIAL";
        string[] validRules = ["SEQUENTIAL", "DATETIME", "RANDOM"];
        if (!validRules.Contains(normalizedRule))
        {
            return Result.Failure<OrderSettingDto>($"Quy tắc sinh mã không hợp lệ: {dto.OrderCodeRule}. Chấp nhận: SEQUENTIAL, DATETIME, RANDOM.");
        }

        string orderPrefix = string.IsNullOrWhiteSpace(dto.OrderCodePrefix) ? "HD" : dto.OrderCodePrefix.Trim();
        string bookingPrefix = string.IsNullOrWhiteSpace(dto.BookingCodePrefix) ? "DH" : dto.BookingCodePrefix.Trim();
        string returnPrefix = string.IsNullOrWhiteSpace(dto.ReturnCodePrefix) ? "TH" : dto.ReturnCodePrefix.Trim();
        string transferPrefix = string.IsNullOrWhiteSpace(dto.TransferCodePrefix) ? "CK" : dto.TransferCodePrefix.Trim();

        if (orderPrefix.Length > 10 || bookingPrefix.Length > 10 || returnPrefix.Length > 10 || transferPrefix.Length > 10)
        {
            return Result.Failure<OrderSettingDto>("Tiền tố mã chứng từ không được vượt quá 10 ký tự.");
        }

        var setting = await _context.MstOrderSettings
            .Include(s => s.UpdatedByUser)
            .FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken);

        if (setting == null)
        {
            setting = new MstOrderSetting
            {
                SettingId = 1
            };
            _context.MstOrderSettings.Add(setting);
        }

        // Apply fields Group A
        setting.EnableOrderPlacement = dto.EnableOrderPlacement;
        setting.AllowOrderWhenOutOfStock = dto.AllowOrderWhenOutOfStock;
        setting.AllowSellingReservedStock = dto.AllowSellingReservedStock;
        setting.AllowTransferringOrderBranch = dto.AllowTransferringOrderBranch;

        // Group B
        setting.AllowNegativeStockSale = dto.AllowNegativeStockSale;
        setting.EnablePrintQuotation = dto.EnablePrintQuotation;
        setting.ConfirmBeforeCompleteOrder = dto.ConfirmBeforeCompleteOrder;

        // Group C
        setting.EnableReturnTimeLimit = dto.EnableReturnTimeLimit;
        setting.ReturnTimeLimitDays = dto.ReturnTimeLimitDays;

        // Group D
        setting.LockTransactionTime = dto.LockTransactionTime;

        // Group E
        setting.OrderCodeRule = normalizedRule;
        setting.OrderCodePrefix = orderPrefix;
        setting.BookingCodePrefix = bookingPrefix;
        setting.ReturnCodePrefix = returnPrefix;
        setting.TransferCodePrefix = transferPrefix;

        // Audit
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        // Fetch user name if not loaded
        string? updaterName = null;
        if (setting.UpdatedBy.HasValue)
        {
            var user = await _context.SecUsers.FirstOrDefaultAsync(u => u.UserId == setting.UpdatedBy.Value, cancellationToken);
            updaterName = user?.FullName ?? user?.Username;
        }

        return Result.Success(new OrderSettingDto
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
            OrderCodeRule = setting.OrderCodeRule,
            OrderCodePrefix = setting.OrderCodePrefix,
            BookingCodePrefix = setting.BookingCodePrefix,
            ReturnCodePrefix = setting.ReturnCodePrefix,
            TransferCodePrefix = setting.TransferCodePrefix,
            UpdatedAt = setting.UpdatedAt,
            UpdatedBy = setting.UpdatedBy,
            UpdatedByName = updaterName
        });
    }
}
