using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.CreditRequests.Commands;

/// <summary>
/// UC-27 Request Credit Approval: Sales Accountant gửi yêu cầu khi Dư nợ + Nợ mới > Hạn mức (BR-12).
/// Yêu cầu chưa gắn hóa đơn (đơn POS chưa tồn tại lúc bị chặn); POS gắn SalesOrderId khi dùng ngoại lệ.
/// </summary>
public record CreateCreditRequestCommand(CreateCreditRequestRequest Request) : IRequest<Result<CreditRequestActionResultDto>>;

public class CreateCreditRequestCommandValidator : AbstractValidator<CreateCreditRequestCommand>
{
    public CreateCreditRequestCommandValidator()
    {
        RuleFor(x => x.Request.PartnerId)
            .GreaterThan(0).WithMessage("Khách hàng không hợp lệ (CUS-001).");

        RuleFor(x => x.Request.ExpectedNewDebt)
            .GreaterThan(0).WithMessage("Nợ mới dự kiến phải lớn hơn 0.");

        RuleFor(x => x.Request.RequestedLimit)
            .GreaterThan(0).When(x => x.Request.RequestedLimit.HasValue)
            .WithMessage("Hạn mức đề xuất phải lớn hơn 0.");

        RuleFor(x => x.Request.Reason)
            .Must(r => !string.IsNullOrWhiteSpace(r)).WithMessage(CreditRequestMessages.ReasonRequired)
            .MaximumLength(500).WithMessage("Lý do tối đa 500 ký tự.");
    }
}

public class CreateCreditRequestCommandHandler : IRequestHandler<CreateCreditRequestCommand, Result<CreditRequestActionResultDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ITransactionCodeGenerator _codeGenerator;
    private readonly ICurrentUserService _currentUserService;

    public CreateCreditRequestCommandHandler(
        IStockFlowDbContext context,
        ITransactionCodeGenerator codeGenerator,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _codeGenerator = codeGenerator;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CreditRequestActionResultDto>> Handle(CreateCreditRequestCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        if (!_currentUserService.UserId.HasValue)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.UserUnknown);
        var currentUserId = _currentUserService.UserId.Value;

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == req.PartnerId, cancellationToken);
        if (partner == null)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.CustomerNotFound);
        if (partner.IsActive == false)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.CustomerInactive);
        if (partner.PartnerCode == CreatePosOrderCommandHandler.WalkInCustomerCode)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.WalkInNotAllowed);

        // Hạn mức = 0: giữ chặn như POS (CUS-007), SRS chưa đặc tả trường hợp này
        decimal creditLimit = partner.CreditLimit ?? 0;
        if (creditLimit <= 0)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.ZeroLimit);

        // BR-12: chỉ gửi khi Dư nợ hiện tại + Nợ mới > Hạn mức
        decimal currentDebt = partner.CurrentDebt ?? 0;
        decimal requiredLimit = currentDebt + req.ExpectedNewDebt;
        if (requiredLimit <= creditLimit)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.NotOverLimit);

        // Hạn mức đề xuất bỏ trống → lấy mức tối thiểu cần có; dùng làm trần cho ngoại lệ một lần
        decimal requestedLimit = req.RequestedLimit ?? requiredLimit;
        if (requestedLimit < requiredLimit)
            return Result<CreditRequestActionResultDto>.Failure(CreditRequestMessages.RequestedLimitTooLow(requiredLimit));

        // Mã yêu cầu lấy từ sequence (không đếm + 1)
        var settings = await _context.MstOrderSettings
            .FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken)
            ?? new MstOrderSetting();
        string requestCode = await _codeGenerator.GenerateCodeAsync("CREDIT_REQUEST", settings, cancellationToken);

        var entity = new TrxCreditLimitRequest
        {
            RequestCode = requestCode,
            PartnerId = partner.PartnerId,
            RequestedBy = currentUserId,
            CurrentLimit = creditLimit,
            RequestedLimit = requestedLimit,
            Reason = req.Reason.Trim(),
            Status = CreditRequestStatus.Pending,
            RequestDate = VietnamTime.Now,
        };
        _context.TrxCreditLimitRequests.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = await _context.TrxCreditLimitRequests
            .AsNoTracking()
            .Where(r => r.RequestId == entity.RequestId)
            .Select(CreditRequestProjection.ToDto)
            .FirstAsync(cancellationToken);

        return Result<CreditRequestActionResultDto>.Success(new CreditRequestActionResultDto
        {
            Request = dto,
            Message = CreditRequestMessages.Submitted(requestCode),
        });
    }
}
