using FluentValidation;
using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Helpers;

namespace StockFlow.Application.Features.Disposals.Commands;

/// <summary>
/// Sửa phiếu tạm xuất hủy (mở lại "Phiếu tạm"): ghi lại danh sách hàng, lý do;
/// Status = COMPLETED thì hoàn thành phiếu (trừ tồn kho). Phiếu đã hoàn thành không sửa được.
/// </summary>
public record UpdateDisposalCommand(int DisposalId, SaveDisposalRequest Request) : IRequest<Result<DisposalDetailDto>>;

public class UpdateDisposalCommandValidator : AbstractValidator<UpdateDisposalCommand>
{
    public UpdateDisposalCommandValidator()
    {
        RuleFor(x => x.Request).SetValidator(new SaveDisposalRequestValidator());
    }
}

public class UpdateDisposalCommandHandler : IRequestHandler<UpdateDisposalCommand, Result<DisposalDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IInventoryLedger _ledger;

    public UpdateDisposalCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser, IInventoryLedger ledger)
    {
        _context = context;
        _currentUser = currentUser;
        _ledger = ledger;
    }

    public async Task<Result<DisposalDetailDto>> Handle(UpdateDisposalCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<DisposalDetailDto>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;
        var req = command.Request;

        var disposal = await DisposalLogic.LoadAsync(_context, command.DisposalId, ct);
        if (disposal == null) return Result.Failure<DisposalDetailDto>("Không tìm thấy phiếu xuất hủy.");
        if (!await _currentUser.HasWarehouseAccessAsync(disposal.WarehouseId, ct))
            return Result.Failure<DisposalDetailDto>("Bạn không có quyền thao tác phiếu xuất hủy của kho này.");
        if (!disposal.CanEdit())
            return Result.Failure<DisposalDetailDto>($"Phiếu {disposal.DisposalCode} đã hoàn thành, không sửa được.");
        // Kho của phiếu cố định từ khi lập (giống phiếu kiểm kho)
        if (req.WarehouseId != disposal.WarehouseId)
            return Result.Failure<DisposalDetailDto>("Không đổi được kho của phiếu xuất hủy đã lập.");

        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            var code = await DisposalLogic.ResolveCodeAsync(_context, req.DisposalCode ?? disposal.DisposalCode, disposal.DisposalId, ct);
            if (!code.IsSuccess) return Result.Failure<DisposalDetailDto>(code.Error!);
            disposal.DisposalCode = code.Value;
            disposal.Reason = string.IsNullOrWhiteSpace(req.Reason) ? null : req.Reason.Trim();
            disposal.ProcessedBy = userId;

            var items = await DisposalLogic.ReplaceItemsAsync(_context, disposal, req.Items, ct);
            if (!items.IsSuccess) return Result.Failure<DisposalDetailDto>(items.Error!);
            await _context.SaveChangesAsync(ct);

            if (req.Status == Domain.Entities.DisposalStatus.Completed)
            {
                var done = await DisposalLogic.CompleteAsync(_context, _ledger, disposal, userId, ct);
                if (!done.IsSuccess)
                {
                    if (tx != null) await tx.RollbackAsync(ct);
                    return Result.Failure<DisposalDetailDto>(done.Error!);
                }
                await _context.SaveChangesAsync(ct);
            }

            if (tx != null) await tx.CommitAsync(ct);

            var saved = await DisposalLogic.LoadAsync(_context, disposal.DisposalId, ct);
            return Result.Success(await DisposalLogic.ToDetailAsync(_context, saved!, ct));
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
    }
}
