using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.CreditRequests.Commands;

/// <summary>
/// UC-64 Approve Credit Request (BR-13): Manager duyệt ngoại lệ một lần (ONE_TIME)
/// hoặc nâng hạn mức (NEW_LIMIT → cập nhật CreditLimit của khách bằng hạn mức đề xuất).
/// </summary>
public record ApproveCreditRequestCommand(int RequestId, ApproveCreditRequestRequest Request) : IRequest<Result<CreditRequestActionResultDto>>;

public class ApproveCreditRequestCommandValidator : AbstractValidator<ApproveCreditRequestCommand>
{
    public ApproveCreditRequestCommandValidator()
    {
        RuleFor(x => x.RequestId).GreaterThan(0).WithMessage(CreditRequestMessages.NotFound);

        RuleFor(x => x.Request.ApprovalType)
            .Must(CreditApprovalType.IsValid).WithMessage(CreditRequestMessages.InvalidApprovalType);

        RuleFor(x => x.Request.ApprovedLimit)
            .GreaterThan(0).When(x => x.Request.ApprovedLimit.HasValue)
            .WithMessage("Mức duyệt phải lớn hơn 0.");

        RuleFor(x => x.Request.Notes)
            .MaximumLength(500).WithMessage("Ghi chú tối đa 500 ký tự.");
    }
}

public class ApproveCreditRequestCommandHandler : IRequestHandler<ApproveCreditRequestCommand, Result<CreditRequestActionResultDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ApproveCreditRequestCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CreditRequestActionResultDto>> Handle(ApproveCreditRequestCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.UserUnknown);
        var currentUserId = _currentUserService.UserId.Value;
        var approvalType = command.Request.ApprovalType;

        var entity = await _context.TrxCreditLimitRequests
            .Include(r => r.Partner)
            .FirstOrDefaultAsync(r => r.RequestId == command.RequestId, cancellationToken);
        if (entity == null)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.NotFound);

        // MSG57: đã duyệt / từ chối thì không xử lý lại
        if (!entity.CanApprove())
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.AlreadyProcessed);

        // Kế toán trưởng quyết định con số (sửa được); bỏ trống = theo số Sales đề xuất
        decimal approvedLimit = command.Request.ApprovedLimit ?? entity.RequestedLimit ?? 0;
        decimal partnerLimit = entity.Partner.CreditLimit ?? 0;

        if (approvalType == CreditApprovalType.NewLimit)
        {
            // E62.1: hạn mức mới không được thấp hơn hạn mức hiện tại của khách
            if (approvedLimit < partnerLimit)
                return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.NewLimitBelowCurrent(partnerLimit));

            entity.Partner.CreditLimit = approvedLimit;
        }
        else if (approvedLimit <= partnerLimit)
        {
            // Ngoại lệ một lần: mức dư nợ tối đa phải vượt hạn mức hiện tại, nếu không thì không cần ngoại lệ
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.OneTimeCeilingTooLow(partnerLimit));
        }

        entity.MarkApproved(approvalType, approvedLimit);
        entity.ApprovedBy = currentUserId;
        entity.ApprovalDate = VietnamTime.Now;
        entity.ApprovalNotes = string.IsNullOrWhiteSpace(command.Request.Notes) ? null : command.Request.Notes.Trim();

        // Một lần SaveChanges = một transaction: trạng thái yêu cầu và hạn mức khách cùng lưu hoặc cùng hủy.
        // Status là concurrency token: Manager khác đã xử lý trước thì UPDATE không khớp → MSG57.
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.AlreadyProcessed);
        }

        var dto = await _context.TrxCreditLimitRequests
            .AsNoTracking()
            .Where(r => r.RequestId == entity.RequestId)
            .Select(CreditRequestProjection.ToDto)
            .FirstAsync(cancellationToken);

        return Result<CreditRequestActionResultDto>.Success(new CreditRequestActionResultDto
        {
            Request = dto,
            Message = CreditRequestMessages.DecisionRecorded,
        });
    }
}
