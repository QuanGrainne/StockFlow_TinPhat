using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Helpers;

namespace StockFlow.Application.Features.Disposals.Commands;

/// <summary>
/// Hủy phiếu xuất hủy (nút "Hủy" ở chi tiết phiếu): phiếu tạm chỉ đổi trạng thái;
/// phiếu đã hoàn thành được hoàn lại tồn kho (đúng vị trí / lô, giá vốn lúc hủy) và ghi thẻ kho.
/// </summary>
public record CancelDisposalCommand(int DisposalId) : IRequest<Result<DisposalDetailDto>>;

public class CancelDisposalCommandHandler : IRequestHandler<CancelDisposalCommand, Result<DisposalDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IInventoryLedger _ledger;

    public CancelDisposalCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser, IInventoryLedger ledger)
    {
        _context = context;
        _currentUser = currentUser;
        _ledger = ledger;
    }

    public async Task<Result<DisposalDetailDto>> Handle(CancelDisposalCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<DisposalDetailDto>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;

        var disposal = await DisposalLogic.LoadAsync(_context, command.DisposalId, ct);
        if (disposal == null) return Result.Failure<DisposalDetailDto>("Không tìm thấy phiếu xuất hủy.");
        if (!await _currentUser.HasWarehouseAccessAsync(disposal.WarehouseId, ct))
            return Result.Failure<DisposalDetailDto>("Bạn không có quyền hủy phiếu xuất hủy của kho này.");
        if (!disposal.CanCancel())
            return Result.Failure<DisposalDetailDto>($"Phiếu {disposal.DisposalCode} đã hủy trước đó.");

        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            var done = await DisposalLogic.CancelAsync(_context, _ledger, disposal, userId, ct);
            if (!done.IsSuccess) return Result.Failure<DisposalDetailDto>(done.Error!);
            await _context.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }

        var saved = await DisposalLogic.LoadAsync(_context, disposal.DisposalId, ct);
        return Result.Success(await DisposalLogic.ToDetailAsync(_context, saved!, ct));
    }
}
