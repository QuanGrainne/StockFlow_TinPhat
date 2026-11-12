using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PurchaseReturns.Commands;

/// <summary>Hủy phiếu trả hàng nhập (phiếu đã hoàn thành sẽ nhập lại kho và cộng lại công nợ).</summary>
public record CancelPurchaseReturnCommand(int Id) : IRequest<Result<bool>>;

public class CancelPurchaseReturnHandler : IRequestHandler<CancelPurchaseReturnCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelPurchaseReturnHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(CancelPurchaseReturnCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");

        var ret = await _context.TrxPurchaseReturns
            .Include(r => r.DtlPurchaseReturnItems)
            .FirstOrDefaultAsync(r => r.PurchaseReturnId == command.Id, ct);
        if (ret == null)
            return Result.Failure<bool>($"Không tìm thấy phiếu trả hàng nhập #{command.Id}.");
        if (!await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId, ct))
            return Result.Failure<bool>("Bạn không có quyền truy cập phiếu trả hàng của kho này.");
        if (PurchaseReturnLogic.Is(ret.Status, PurchaseReturnLogic.Cancelled))
            return Result.Failure<bool>("Phiếu trả hàng nhập này đã bị hủy trước đó.");

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            if (PurchaseReturnLogic.Is(ret.Status, PurchaseReturnLogic.Completed))
            {
                await PurchaseReturnLogic.ReverseCompletionAsync(_context, ret, _currentUser.UserId.Value, ct);
            }
            ret.Status = PurchaseReturnLogic.Cancelled;
            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
            return Result.Success(true);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<bool>($"Lỗi khi hủy phiếu trả hàng nhập: {ex.Message}");
        }
    }
}
