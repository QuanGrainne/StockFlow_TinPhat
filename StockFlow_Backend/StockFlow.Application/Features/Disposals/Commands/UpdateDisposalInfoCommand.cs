using FluentValidation;
using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Helpers;

namespace StockFlow.Application.Features.Disposals.Commands;

/// <summary>
/// Nút "Lưu" ở chi tiết phiếu: đổi Người xuất hủy, Ghi chú; Ngày xuất hủy chỉ đổi được khi còn là phiếu tạm
/// (phiếu đã hoàn thành đã ghi thẻ kho theo ngày đó). Không đổi hàng hóa, không đổi tồn kho.
/// </summary>
public record UpdateDisposalInfoCommand(int DisposalId, UpdateDisposalInfoRequest Request) : IRequest<Result<DisposalDetailDto>>;

public class UpdateDisposalInfoCommandValidator : AbstractValidator<UpdateDisposalInfoCommand>
{
    public UpdateDisposalInfoCommandValidator()
    {
        RuleFor(x => x.Request.ProcessedBy).GreaterThan(0).WithMessage("Vui lòng chọn người xuất hủy.");
        RuleFor(x => x.Request.Reason).MaximumLength(500).WithMessage("Ghi chú tối đa 500 ký tự.");
    }
}

public class UpdateDisposalInfoCommandHandler : IRequestHandler<UpdateDisposalInfoCommand, Result<DisposalDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UpdateDisposalInfoCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<DisposalDetailDto>> Handle(UpdateDisposalInfoCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var disposal = await DisposalLogic.LoadAsync(_context, command.DisposalId, ct);
        if (disposal == null) return Result.Failure<DisposalDetailDto>("Không tìm thấy phiếu xuất hủy.");
        if (!await _currentUser.HasWarehouseAccessAsync(disposal.WarehouseId, ct))
            return Result.Failure<DisposalDetailDto>("Bạn không có quyền sửa phiếu xuất hủy của kho này.");
        if (!disposal.CanEditInfo())
            return Result.Failure<DisposalDetailDto>($"Phiếu {disposal.DisposalCode} đã hủy, không sửa được.");

        if (req.ProcessedBy != disposal.ProcessedBy)
        {
            var personError = await DisposalLogic.ValidateProcessedByAsync(_context, req.ProcessedBy, disposal.WarehouseId, ct);
            if (personError != null) return Result.Failure<DisposalDetailDto>(personError);
            disposal.ProcessedBy = req.ProcessedBy;
        }

        if (req.DisposalDate.HasValue)
        {
            var date = DisposalLogic.ResolveDate(req.DisposalDate);
            if (!date.IsSuccess) return Result.Failure<DisposalDetailDto>(date.Error!);
            // So theo phút (form chọn ngày giờ không có giây)
            var changed = disposal.DisposalDate is not { } current
                || Math.Abs((current - date.Value).TotalMinutes) >= 1;
            if (changed)
            {
                if (!disposal.CanChangeDate())
                    return Result.Failure<DisposalDetailDto>("Phiếu đã hoàn thành, không đổi được ngày xuất hủy (đã ghi thẻ kho).");
                disposal.DisposalDate = date.Value;
            }
        }

        disposal.Reason = string.IsNullOrWhiteSpace(req.Reason) ? null : req.Reason.Trim();
        if (!disposal.CreatedBy.HasValue) disposal.CreatedBy = disposal.ProcessedBy > 0 ? disposal.ProcessedBy : null;
        await _context.SaveChangesAsync(ct);

        var saved = await DisposalLogic.LoadAsync(_context, disposal.DisposalId, ct);
        return Result.Success(await DisposalLogic.ToDetailAsync(_context, saved!, ct));
    }
}
