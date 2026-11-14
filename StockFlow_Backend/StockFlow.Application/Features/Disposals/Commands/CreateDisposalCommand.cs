using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Disposals.Commands;

/// <summary>
/// Tạo phiếu xuất hủy: Status = DRAFT (Lưu tạm, chưa trừ tồn) hoặc COMPLETED (Hoàn thành, trừ tồn kho ngay).
/// Phải có quyền trên kho hủy (cô lập dữ liệu theo kho).
/// </summary>
public record CreateDisposalCommand(SaveDisposalRequest Request) : IRequest<Result<DisposalDetailDto>>;

public class SaveDisposalRequestValidator : AbstractValidator<SaveDisposalRequest>
{
    public SaveDisposalRequestValidator()
    {
        RuleFor(x => x.WarehouseId).GreaterThan(0).WithMessage("Vui lòng chọn kho xuất hủy.");
        RuleFor(x => x.DisposalCode).MaximumLength(30).WithMessage("Mã phiếu xuất hủy tối đa 30 ký tự.");
        RuleFor(x => x.Status)
            .Must(s => s is DisposalStatus.Draft or DisposalStatus.Completed)
            .WithMessage("Trạng thái phiếu chỉ gồm Phiếu tạm (DRAFT) hoặc Hoàn thành (COMPLETED).");
        RuleFor(x => x.Reason).MaximumLength(500).WithMessage("Lý do xuất hủy tối đa 500 ký tự.");
        // Hoàn thành phiếu (trừ tồn kho) phải ghi rõ lý do xuất hủy
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Vui lòng nhập lý do xuất hủy trước khi hoàn thành phiếu.")
            .When(x => x.Status == DisposalStatus.Completed);
        RuleFor(x => x.Items).NotEmpty().WithMessage("Vui lòng thêm ít nhất 1 hàng hóa cần xuất hủy.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage("Hàng hóa không hợp lệ.");
            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage("Số lượng hủy phải lớn hơn 0.")
                // Cột quantity DECIMAL(18,2)
                .Must(q => decimal.Round(q, 2) == q).WithMessage("Số lượng hủy có tối đa 2 chữ số thập phân.");
            item.RuleFor(i => i.Reason).MaximumLength(255).WithMessage("Lý do từng dòng tối đa 255 ký tự.");
        });
    }
}

public class CreateDisposalCommandValidator : AbstractValidator<CreateDisposalCommand>
{
    public CreateDisposalCommandValidator()
    {
        RuleFor(x => x.Request).SetValidator(new SaveDisposalRequestValidator());
    }
}

public class CreateDisposalCommandHandler : IRequestHandler<CreateDisposalCommand, Result<DisposalDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IInventoryLedger _ledger;

    public CreateDisposalCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser, IInventoryLedger ledger)
    {
        _context = context;
        _currentUser = currentUser;
        _ledger = ledger;
    }

    public async Task<Result<DisposalDetailDto>> Handle(CreateDisposalCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<DisposalDetailDto>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;
        var req = command.Request;

        var warehouse = await _context.MstWarehouses.AsNoTracking().FirstOrDefaultAsync(w => w.WarehouseId == req.WarehouseId, ct);
        if (warehouse == null || warehouse.IsActive == false)
            return Result.Failure<DisposalDetailDto>("Kho xuất hủy không tồn tại hoặc đã ngừng hoạt động.");
        if (!await _currentUser.HasWarehouseAccessAsync(req.WarehouseId, ct))
            return Result.Failure<DisposalDetailDto>($"Bạn không có quyền xuất hủy hàng của kho '{warehouse.WarehouseName}'.");

        var date = DisposalLogic.ResolveDate(req.DisposalDate);
        if (!date.IsSuccess) return Result.Failure<DisposalDetailDto>(date.Error!);
        // Người xuất hủy: mặc định là người lập phiếu
        var processedBy = req.ProcessedBy is > 0 ? req.ProcessedBy.Value : userId;
        if (processedBy != userId)
        {
            var personError = await DisposalLogic.ValidateProcessedByAsync(_context, processedBy, req.WarehouseId, ct);
            if (personError != null) return Result.Failure<DisposalDetailDto>(personError);
        }

        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            var code = await DisposalLogic.ResolveCodeAsync(_context, req.DisposalCode, null, ct);
            if (!code.IsSuccess) return Result.Failure<DisposalDetailDto>(code.Error!);

            var disposal = new TrxInventoryDisposal
            {
                DisposalCode = code.Value,
                WarehouseId = req.WarehouseId,
                CreatedBy = userId,
                ProcessedBy = processedBy,
                DisposalDate = date.Value,
                Reason = string.IsNullOrWhiteSpace(req.Reason) ? null : req.Reason.Trim(),
            };
            disposal.MarkDraft();

            var items = await DisposalLogic.ReplaceItemsAsync(_context, disposal, req.Items, ct);
            if (!items.IsSuccess) return Result.Failure<DisposalDetailDto>(items.Error!);

            _context.TrxInventoryDisposals.Add(disposal);
            await _context.SaveChangesAsync(ct);

            if (req.Status == DisposalStatus.Completed)
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
