using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;

namespace StockFlow.Application.Features.CreditRequests.Commands;

/// <summary>UC-64: Manager từ chối yêu cầu, bắt buộc lý do (BR-13, BR-50). Lý do lưu ở approval_notes.</summary>
public record RejectCreditRequestCommand(int RequestId, RejectCreditRequestRequest Request) : IRequest<Result<CreditRequestActionResultDto>>;

public class RejectCreditRequestCommandValidator : AbstractValidator<RejectCreditRequestCommand>
{
    public RejectCreditRequestCommandValidator()
    {
        RuleFor(x => x.RequestId).GreaterThan(0).WithMessage(CreditRequestMessages.NotFound);

        RuleFor(x => x.Request.Reason)
            .Must(r => !string.IsNullOrWhiteSpace(r)).WithMessage(CreditRequestMessages.RejectReasonRequired)
            .MaximumLength(500).WithMessage("Lý do từ chối tối đa 500 ký tự.");
    }
}

public class RejectCreditRequestCommandHandler : IRequestHandler<RejectCreditRequestCommand, Result<CreditRequestActionResultDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public RejectCreditRequestCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CreditRequestActionResultDto>> Handle(RejectCreditRequestCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.UserUnknown);

        var entity = await _context.TrxCreditLimitRequests
            .FirstOrDefaultAsync(r => r.RequestId == command.RequestId, cancellationToken);
        if (entity == null)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.NotFound);

        if (!entity.CanReject())
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.AlreadyProcessed);

        entity.MarkRejected();
        entity.ApprovedBy = _currentUserService.UserId.Value;
        entity.ApprovalDate = VietnamTime.Now;
        entity.ApprovalNotes = command.Request.Reason.Trim();

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
