using System.Text.RegularExpressions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Suppliers.Commands;

public record CreateSupplierCommand(CreateSupplierRequest Request) : IRequest<Result<SupplierDto>>;

public class CreateSupplierCommandValidator : AbstractValidator<CreateSupplierCommand>
{
    public CreateSupplierCommandValidator()
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

public class CreateSupplierCommandHandler : IRequestHandler<CreateSupplierCommand, Result<SupplierDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateSupplierCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<SupplierDto>> Handle(CreateSupplierCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        string codeNormalized;
        var rawCode = req.Code?.Trim();

        // 1. Tự động sinh mã NCC kế tiếp nếu để trống hoặc chọn "Tự động"
        if (string.IsNullOrWhiteSpace(rawCode) || 
            rawCode.Equals("Tự động", StringComparison.OrdinalIgnoreCase) || 
            rawCode.Equals("AUTO", StringComparison.OrdinalIgnoreCase))
        {
            var existingCodes = await _context.MstBusinessPartners
                .Where(p => p.PartnerCode != null && p.PartnerCode.StartsWith("NCC"))
                .Select(p => p.PartnerCode!)
                .ToListAsync(cancellationToken);

            int maxNum = 0;
            foreach (var c in existingCodes)
            {
                var match = Regex.Match(c, @"^NCC(\d+)", RegexOptions.IgnoreCase);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var n))
                {
                    if (n > maxNum) maxNum = n;
                }
            }

            int nextNum = maxNum + 1;
            codeNormalized = $"NCC{nextNum:D6}";

            while (await _context.MstBusinessPartners.AnyAsync(p => p.PartnerCode == codeNormalized, cancellationToken))
            {
                nextNum++;
                codeNormalized = $"NCC{nextNum:D6}";
            }
        }
        else
        {
            codeNormalized = rawCode.ToUpper();
            var exists = await _context.MstBusinessPartners
                .AnyAsync(p => p.PartnerCode == codeNormalized, cancellationToken);

            if (exists)
            {
                return Result.Failure<SupplierDto>($"Mã nhà cung cấp '{codeNormalized}' đã tồn tại trong hệ thống.");
            }
        }

        // 2. Khởi tạo đối tượng MstBusinessPartner
        var partner = new MstBusinessPartner
        {
            PartnerCode = codeNormalized,
            PartnerName = req.Name.Trim(),
            PartnerType = "SUPPLIER",
            Phone = req.Phone?.Trim(),
            Email = req.Email?.Trim(),
            Address = req.Address?.Trim(),
            CreditLimit = req.CreditLimit ?? 0m,
            CurrentPayable = req.InitialPayable ?? 0m,
            CurrentDebt = 0m,
            IsActive = true
        };

        await _context.MstBusinessPartners.AddAsync(partner, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new SupplierDto(
            Id: partner.PartnerId.ToString(),
            PartnerId: partner.PartnerId,
            Code: partner.PartnerCode ?? codeNormalized,
            Name: partner.PartnerName,
            Type: partner.PartnerType,
            Phone: partner.Phone,
            Email: partner.Email,
            Address: partner.Address,
            CreditLimit: partner.CreditLimit ?? 0m,
            CurrentPayable: partner.CurrentPayable ?? 0m,
            CurrentDebt: partner.CurrentDebt ?? 0m,
            Status: "ACTIVE"
        );

        return Result.Success(dto);
    }
}
