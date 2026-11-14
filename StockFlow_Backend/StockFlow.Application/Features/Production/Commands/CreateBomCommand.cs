using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>UC-57 / A51.6: Manager tạo một phiên bản BOM cho thành phẩm (có thể kích hoạt luôn).</summary>
public record CreateBomCommand(SaveBomRequest Request) : IRequest<Result<BomDetailDto>>;

public class CreateBomCommandValidator : AbstractValidator<CreateBomCommand>
{
    public CreateBomCommandValidator()
    {
        RuleFor(x => x.Request.ProductId).GreaterThan(0).WithMessage("Vui lòng chọn thành phẩm.");
        RuleFor(x => x.Request.BomCode).MaximumLength(100).WithMessage("Mã BOM tối đa 100 ký tự.");
        RuleFor(x => x.Request.Version).MaximumLength(20).WithMessage("Phiên bản tối đa 20 ký tự.");
        RuleFor(x => x.Request.Description).MaximumLength(500).WithMessage("Ghi chú kỹ thuật tối đa 500 ký tự.");
    }
}

public class CreateBomCommandHandler : IRequestHandler<CreateBomCommand, Result<BomDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateBomCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<BomDetailDto>> Handle(CreateBomCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var (error, product, lines) = await BomRules.ValidateAsync(_context, req, ct);
        if (error != null) return Result.Failure<BomDetailDto>(error);

        var version = string.IsNullOrWhiteSpace(req.Version)
            ? await BomRules.NextVersionAsync(_context, req.ProductId, ct)
            : req.Version.Trim();
        if (await _context.MstBoms.AnyAsync(b => b.ProductId == req.ProductId && b.Version == version, ct))
            return Result.Failure<BomDetailDto>($"Thành phẩm đã có BOM phiên bản {version}.");

        var code = string.IsNullOrWhiteSpace(req.BomCode)
            ? $"BOM-{product!.ProductCode}-V{version}".ToUpperInvariant()
            : req.BomCode.Trim();
        if (await _context.MstBoms.AnyAsync(b => b.BomName == code, ct))
            return Result.Failure<BomDetailDto>($"Mã BOM {code} đã tồn tại trong hệ thống.");

        await using var tx = await _context.BeginTransactionAsync(ct);

        var bom = new MstBom
        {
            ProductId = req.ProductId,
            BomName = code,
            Version = version,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            IsActive = false,
            CreatedAt = VietnamTime.Now,
        };
        _context.MstBoms.Add(bom);
        BomRules.ReplaceItems(_context, bom, lines);
        await _context.SaveChangesAsync(ct);

        if (req.Activate) await BomRules.ActivateAsync(_context, bom, ct);

        await tx.CommitAsync(ct);

        var detail = await ProductionReader.BomDetailAsync(_context, bom.BomId, ct);
        return Result.Success(detail!);
    }
}
