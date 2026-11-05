using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Helpers;

namespace StockFlow.Application.Features.Customers.Commands;

public record UpdateCustomerCommand(int PartnerId, UpdateCustomerRequest Request) : IRequest<Result<CustomerDto>>;

public class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerCommandValidator()
    {
        RuleFor(x => x.Request.Name)
            .NotEmpty().WithMessage("Tên khách hàng không được để trống.")
            .MaximumLength(150).WithMessage("Tên khách hàng tối đa 150 ký tự.");

        When(x => !string.IsNullOrWhiteSpace(x.Request.Email), () =>
        {
            RuleFor(x => x.Request.Email)
                .EmailAddress().WithMessage("Địa chỉ email không đúng định dạng.");
        });

        When(x => !string.IsNullOrWhiteSpace(x.Request.Phone), () =>
        {
            RuleFor(x => x.Request.Phone)
                .MaximumLength(20).WithMessage("Số điện thoại tối đa 20 ký tự.");
        });
    }
}

public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, Result<CustomerDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateCustomerCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CustomerDto>> Handle(UpdateCustomerCommand command, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId &&
                                      p.PartnerType != null &&
                                      (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"),
                                 cancellationToken);

        if (partner == null)
        {
            return Result<CustomerDto>.Failure($"Không tìm thấy khách hàng với mã ID #{command.PartnerId}");
        }

        var req = command.Request;
        partner.PartnerName = req.Name.Trim();
        partner.Phone = req.Phone?.Trim();
        partner.Email = req.Email?.Trim();
        partner.Address = req.Address?.Trim();
        partner.Phone2 = CustomerProfileHelper.Clean(req.Phone2, 20);
        partner.Gender = CustomerProfileHelper.NormalizeGender(req.Gender);
        partner.BirthDate = req.BirthDate?.Date;
        partner.Facebook = CustomerProfileHelper.Clean(req.Facebook, 255);
        partner.Notes = CustomerProfileHelper.Clean(req.Notes, 500);

        if (req.CreditLimit.HasValue)
        {
            partner.CreditLimit = req.CreditLimit.Value;
        }

        if (req.CurrentDebt.HasValue)
        {
            partner.CurrentDebt = req.CurrentDebt.Value;
        }

        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            partner.IsActive = !string.Equals(req.Status, "INACTIVE", StringComparison.OrdinalIgnoreCase);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var lookups = await CustomerProfileHelper.LoadLookupsAsync(_context, new[] { partner }, null, null, cancellationToken);
        var dto = CustomerProfileHelper.ToDto(partner, lookups);
        return Result<CustomerDto>.Success(dto);
    }
}

