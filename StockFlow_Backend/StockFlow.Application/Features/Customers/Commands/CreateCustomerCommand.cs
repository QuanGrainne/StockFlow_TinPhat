using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;
using System.Text.RegularExpressions;

namespace StockFlow.Application.Features.Customers.Commands;

public record CreateCustomerCommand(CreateCustomerRequest Request) : IRequest<Result<CustomerDto>>;

public class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerCommandValidator()
    {
        // VR-01: Tên khách hàng (Bắt buộc, 2-200 ký tự sau khi trim)
        RuleFor(x => x.Request.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Tên khách hàng không được để trống.")
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Tên khách hàng không được chỉ chứa khoảng trắng.")
            .Must(n => n.Trim().Length >= 2).WithMessage("Tên khách hàng phải có từ 2 ký tự trở lên.")
            .Must(n => n.Trim().Length <= 200).WithMessage("Tên khách hàng tối đa 200 ký tự.");

        // VR-04: Phương thức liên hệ (Bắt buộc ít nhất một trong hai: SĐT hoặc Email)
        RuleFor(x => x.Request)
            .Must(r => !string.IsNullOrWhiteSpace(r.Phone) || !string.IsNullOrWhiteSpace(r.Email))
            .WithMessage("Cần cung cấp ít nhất một phương thức liên hệ (Số điện thoại hoặc Email).")
            .WithName("Contact");

        // VR-05: Số điện thoại (Nếu nhập thì phải đúng định dạng)
        When(x => !string.IsNullOrWhiteSpace(x.Request.Phone), () =>
        {
            RuleFor(x => x.Request.Phone)
                .Must(p =>
                {
                    var clean = Regex.Replace(p!, @"[\s\-\.]+", "");
                    return Regex.IsMatch(clean, @"^(?:\+84|0)[1-9]\d{8,9}$");
                })
                .WithMessage("Số điện thoại không đúng định dạng (từ 10-11 số, ví dụ: 0912 345 678 hoặc +84912345678).");
        });

        // VR-06: Email (Nếu nhập thì phải đúng định dạng và tối đa 254 ký tự)
        When(x => !string.IsNullOrWhiteSpace(x.Request.Email), () =>
        {
            RuleFor(x => x.Request.Email)
                .Cascade(CascadeMode.Stop)
                .Must(e => e!.Trim().Length <= 254).WithMessage("Email không được vượt quá 254 ký tự.")
                .Must(e => Regex.IsMatch(e!.Trim(), @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"))
                .WithMessage("Địa chỉ email không đúng định dạng (ví dụ: contact@nama.vn).");
        });

        // VR-07: Địa chỉ (Tùy chọn, tối đa 500 ký tự)
        When(x => !string.IsNullOrWhiteSpace(x.Request.Address), () =>
        {
            RuleFor(x => x.Request.Address)
                .Must(a => a!.Trim().Length <= 500).WithMessage("Địa chỉ tối đa 500 ký tự.");
        });

        // VR-08: Mã khách hàng (Nếu nhập thủ công: không khoảng trắng ở giữa, tối đa 30 ký tự)
        When(x => !string.IsNullOrWhiteSpace(x.Request.Code) && 
                  !x.Request.Code.Trim().Equals("Tự động", StringComparison.OrdinalIgnoreCase) && 
                  !x.Request.Code.Trim().Equals("AUTO", StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.Request.Code)
                .Cascade(CascadeMode.Stop)
                .Must(c => !c!.Contains(' ')).WithMessage("Mã khách hàng không được chứa khoảng trắng ở giữa.")
                .Must(c => c!.Trim().Length <= 30).WithMessage("Mã khách hàng tối đa 30 ký tự.")
                .Matches(@"^[a-zA-Z0-9\-_]+$").WithMessage("Mã khách hàng chỉ được chứa chữ cái, số và dấu gạch.");
        });

        // VR-09: Hạn mức tín dụng (Không âm)
        When(x => x.Request.CreditLimit.HasValue, () =>
        {
            RuleFor(x => x.Request.CreditLimit!.Value)
                .GreaterThanOrEqualTo(0).WithMessage("Hạn mức tín dụng không được âm.");
        });

        // VR-10: Trạng thái (ACTIVE hoặc INACTIVE)
        When(x => !string.IsNullOrWhiteSpace(x.Request.Status), () =>
        {
            RuleFor(x => x.Request.Status)
                .Must(s => s!.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase) || s.Equals("INACTIVE", StringComparison.OrdinalIgnoreCase))
                .WithMessage("Trạng thái chỉ chấp nhận 'ACTIVE' hoặc 'INACTIVE'.");
        });
    }
}

public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, Result<CustomerDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateCustomerCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CustomerDto>> Handle(CreateCustomerCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        string codeNormalized;
        var rawCode = req.Code?.Trim();

        if (string.IsNullOrWhiteSpace(rawCode) || 
            rawCode.Equals("Tự động", StringComparison.OrdinalIgnoreCase) || 
            rawCode.Equals("AUTO", StringComparison.OrdinalIgnoreCase))
        {
            // Cấp mã an toàn, nguyên tử thông qua PostgreSQL Sequence (CON-01, CON-08)
            try
            {
                var seqVal = await _context.GetNextSequenceValueAsync("stockflow.seq_customer_code", cancellationToken);
                if (seqVal <= 0) seqVal = 909;
                codeNormalized = $"KH{seqVal.ToString().PadLeft(5, '0')}";
            }
            catch
            {
                // Fallback nếu sequence chưa khởi tạo
                var existingCodes = await _context.MstBusinessPartners
                    .Where(p => p.PartnerCode != null && p.PartnerCode.StartsWith("KH"))
                    .Select(p => p.PartnerCode!)
                    .ToListAsync(cancellationToken);

                var maxNum = 908;
                foreach (var code in existingCodes)
                {
                    var numPart = code.Substring(2);
                    if (int.TryParse(numPart, out var n) && n > maxNum)
                    {
                        maxNum = n;
                    }
                }
                codeNormalized = $"KH{(maxNum + 1).ToString().PadLeft(5, '0')}";
            }
        }
        else
        {
            codeNormalized = rawCode.ToUpperInvariant();
            var exists = await _context.MstBusinessPartners
                .AnyAsync(p => p.PartnerCode != null && p.PartnerCode.ToUpper() == codeNormalized, cancellationToken);
            if (exists)
            {
                return Result<CustomerDto>.Failure($"CUSTOMER_CODE_EXISTS:Mã khách hàng '{codeNormalized}' đã tồn tại trong hệ thống.");
            }
        }

        var normalizedPhone = string.IsNullOrWhiteSpace(req.Phone)
            ? null
            : Regex.Replace(req.Phone.Trim(), @"\s+", " ");

        var normalizedEmail = string.IsNullOrWhiteSpace(req.Email)
            ? null
            : req.Email.Trim().ToLowerInvariant();

        var normalizedAddress = string.IsNullOrWhiteSpace(req.Address)
            ? null
            : req.Address.Trim();

        var isActive = string.IsNullOrWhiteSpace(req.Status) || !req.Status.Equals("INACTIVE", StringComparison.OrdinalIgnoreCase);

        var partner = new MstBusinessPartner
        {
            PartnerCode = codeNormalized,
            PartnerName = req.Name.Trim(),
            PartnerType = "CUSTOMER", // VR-12 / Nghiệp vụ: Phân loại đối tác là khách hàng
            Phone = normalizedPhone,
            Email = normalizedEmail,
            Address = normalizedAddress,
            CreditLimit = req.CreditLimit ?? 0,
            CurrentDebt = 0,
            CurrentPayable = 0,
            IsActive = isActive
        };

        try
        {
            await _context.MstBusinessPartners.AddAsync(partner, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            // Bảo vệ toàn vẹn dữ liệu (VR-13 / CON-02)
            var msg = ex.InnerException?.Message ?? ex.Message;
            if (msg.Contains("23505") || msg.Contains("ux_customers_code_normalized") || msg.Contains("uq_mst_business_partners"))
            {
                return Result<CustomerDto>.Failure($"CUSTOMER_CODE_EXISTS:Mã khách hàng '{codeNormalized}' đã tồn tại trong hệ thống.");
            }
            throw;
        }

        var dto = new CustomerDto(
            Id: partner.PartnerId.ToString(),
            PartnerId: partner.PartnerId,
            Code: partner.PartnerCode,
            Name: partner.PartnerName,
            Type: partner.PartnerType,
            Phone: partner.Phone,
            Email: partner.Email,
            Address: partner.Address,
            CreditLimit: partner.CreditLimit ?? 0,
            CurrentDebt: 0,
            CurrentPayable: 0,
            Status: isActive ? "ACTIVE" : "INACTIVE",
            IsOverCreditLimit: false
        );

        return Result<CustomerDto>.Success(dto);
    }
}
