using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.DTOs;

namespace StockFlow.Application.Features.Suppliers.Commands;

public record UpdateSupplierCommand(int PartnerId, UpdateSupplierRequest Request) : IRequest<Result<SupplierDto>>;

public class UpdateSupplierCommandValidator : AbstractValidator<UpdateSupplierCommand>
{
    public UpdateSupplierCommandValidator()
    {
        RuleFor(x => x.Request.Name)
            .NotEmpty().WithMessage("Tên nhà cung cấp không được để trống.")
            .MaximumLength(150).WithMessage("Tên nhà cung cấp tối đa 150 ký tự.");

        When(x => !string.IsNullOrWhiteSpace(x.Request.Email), () =>
        {
            RuleFor(x => x.Request.Email)
                .EmailAddress().WithMessage("Địa chỉ email không đúng định dạng.");
        });

        When(x => !string.IsNullOrWhiteSpace(x.Request.Phone), () =>
        {
            RuleFor(x => x.Request.Phone)
                .MaximumLength(11).WithMessage("Số điện thoại tối đa 11 ký tự.");
        });
    }
}

public class UpdateSupplierCommandHandler : IRequestHandler<UpdateSupplierCommand, Result<SupplierDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateSupplierCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<SupplierDto>> Handle(UpdateSupplierCommand command, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, cancellationToken);

        if (partner == null)
        {
            return Result.Failure<SupplierDto>("Không tìm thấy thông tin nhà cung cấp.");
        }

        var req = command.Request;

        partner.PartnerName = req.Name.Trim();
        partner.Phone = req.Phone?.Trim();
        partner.Email = req.Email?.Trim();
        partner.Address = req.Address?.Trim();

        if (req.CreditLimit.HasValue)
        {
            partner.CreditLimit = req.CreditLimit.Value;
        }

        if (req.CurrentPayable.HasValue)
        {
            partner.CurrentPayable = req.CurrentPayable.Value;
        }

        if (req.IsActive.HasValue)
        {
            partner.IsActive = req.IsActive.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var dto = new SupplierDto(
            Id: partner.PartnerId.ToString(),
            PartnerId: partner.PartnerId,
            Code: partner.PartnerCode ?? $"NCC{partner.PartnerId:D6}",
            Name: partner.PartnerName,
            Type: partner.PartnerType ?? "SUPPLIER",
            Phone: partner.Phone,
            Email: partner.Email,
            Address: partner.Address,
            CreditLimit: partner.CreditLimit ?? 0m,
            CurrentPayable: partner.CurrentPayable ?? 0m,
            CurrentDebt: partner.CurrentDebt ?? 0m,
            Status: partner.IsActive != false ? "ACTIVE" : "INACTIVE"
        );

        return Result.Success(dto);
    }
}
