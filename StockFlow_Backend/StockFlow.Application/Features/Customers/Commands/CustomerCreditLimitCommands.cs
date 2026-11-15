using FluentValidation;
using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Commands;

/// <summary>Manager (Kế toán trưởng) đặt hạn mức công nợ cho một khách.</summary>
public record UpdateCustomerCreditLimitCommand(int PartnerId, UpdateCustomerCreditLimitRequest Request)
    : IRequest<Result<CreditLimitChangeDto>>;

/// <summary>Manager (Kế toán trưởng) điều chỉnh hạn mức nhiều khách cùng lúc; khách không đổi được thì bỏ qua và báo lý do.</summary>
public record BatchUpdateCustomerCreditLimitCommand(BatchUpdateCustomerCreditLimitRequest Request)
    : IRequest<Result<BatchCreditLimitResultDto>>;

public class UpdateCustomerCreditLimitCommandValidator : AbstractValidator<UpdateCustomerCreditLimitCommand>
{
    public UpdateCustomerCreditLimitCommandValidator()
    {
        RuleFor(x => x.Request.NewLimit)
            .InclusiveBetween(0, CustomerCreditPolicy.MaxCreditLimit)
            .WithMessage("Hạn mức phải trong khoảng 0 – 999.999.999.999 đ.");
        RuleFor(x => x.Request.Reason)
            .Must(r => !string.IsNullOrWhiteSpace(r)).WithMessage("Vui lòng nhập lý do điều chỉnh hạn mức.")
            .MaximumLength(500).WithMessage("Lý do tối đa 500 ký tự.");
    }
}

public class BatchUpdateCustomerCreditLimitCommandValidator : AbstractValidator<BatchUpdateCustomerCreditLimitCommand>
{
    public const int MaxCustomers = 500;

    public BatchUpdateCustomerCreditLimitCommandValidator()
    {
        RuleFor(x => x.Request.PartnerIds)
            .NotEmpty().WithMessage("Chưa chọn khách hàng nào.")
            .Must(ids => ids.Count <= MaxCustomers).WithMessage($"Mỗi lần điều chỉnh tối đa {MaxCustomers} khách hàng.");
        RuleFor(x => x.Request.Mode)
            .Must(CreditLimitBatchModes.IsValid).WithMessage("Cách điều chỉnh không hợp lệ (SET, PERCENT hoặc RESET_DEFAULT).");
        RuleFor(x => x.Request.Value)
            .InclusiveBetween(0, CustomerCreditPolicy.MaxCreditLimit)
            .When(x => x.Request.Mode == CreditLimitBatchModes.Set)
            .WithMessage("Hạn mức phải trong khoảng 0 – 999.999.999.999 đ.");
        RuleFor(x => x.Request.Value)
            .Must(v => v != 0 && v > -100 && v <= 1000)
            .When(x => x.Request.Mode == CreditLimitBatchModes.Percent)
            .WithMessage("Tỷ lệ điều chỉnh phải khác 0, lớn hơn -100% và không quá 1000%.");
        RuleFor(x => x.Request.Reason)
            .Must(r => !string.IsNullOrWhiteSpace(r)).WithMessage("Vui lòng nhập lý do điều chỉnh hạn mức.")
            .MaximumLength(500).WithMessage("Lý do tối đa 500 ký tự.");
    }
}

public class CustomerCreditLimitCommandsHandler :
    IRequestHandler<UpdateCustomerCreditLimitCommand, Result<CreditLimitChangeDto>>,
    IRequestHandler<BatchUpdateCustomerCreditLimitCommand, Result<BatchCreditLimitResultDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CustomerCreditLimitCommandsHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<CreditLimitChangeDto>> Handle(UpdateCustomerCreditLimitCommand command, CancellationToken ct)
    {
        var req = command.Request;
        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            var outcome = await CreditLimitChanger.ApplyAsync(
                _context, command.PartnerId, _ => req.NewLimit,
                CreditLimitChangeSource.Manual, req.Reason!.Trim(), _currentUser.UserId, ct);

            if (outcome.Status != CreditLimitChangeStatus.Changed)
            {
                await tx.RollbackAsync(ct);
                return Result<CreditLimitChangeDto>.Failure(outcome.Message);
            }

            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<CreditLimitChangeDto>.Success(ToDto(outcome));
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<Result<BatchCreditLimitResultDto>> Handle(BatchUpdateCustomerCreditLimitCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var reason = req.Reason!.Trim();
        decimal defaultLimit = req.Mode == CreditLimitBatchModes.ResetDefault
            ? await CustomerCreditPolicy.GetDefaultCreditLimitAsync(_context, ct)
            : 0;

        Func<decimal, decimal> compute = req.Mode switch
        {
            CreditLimitBatchModes.Set => _ => req.Value,
            CreditLimitBatchModes.Percent => old => CreditLimitChanger.RoundToThousand(old * (1 + req.Value / 100m)),
            _ => _ => defaultLimit,
        };

        var updated = new List<CreditLimitChangeDto>();
        var skipped = new List<CreditLimitSkipDto>();

        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            // Khóa theo thứ tự id tăng dần để hai lượt hàng loạt chồng nhau không khóa chéo
            foreach (var id in req.PartnerIds.Distinct().OrderBy(i => i))
            {
                var outcome = await CreditLimitChanger.ApplyAsync(
                    _context, id, compute, CreditLimitChangeSource.Bulk, reason, _currentUser.UserId, ct);

                if (outcome.Status == CreditLimitChangeStatus.Changed)
                    updated.Add(ToDto(outcome));
                else
                    skipped.Add(new CreditLimitSkipDto(
                        outcome.PartnerId, outcome.PartnerCode, outcome.PartnerName,
                        outcome.OldLimit, outcome.NewLimit, outcome.CurrentDebt, outcome.Message));
            }

            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }

        return Result<BatchCreditLimitResultDto>.Success(new BatchCreditLimitResultDto(updated, skipped));
    }

    private static CreditLimitChangeDto ToDto(CreditLimitChangeOutcome o) =>
        new(o.PartnerId, o.PartnerCode, o.PartnerName, o.OldLimit, o.NewLimit, o.CurrentDebt);
}
