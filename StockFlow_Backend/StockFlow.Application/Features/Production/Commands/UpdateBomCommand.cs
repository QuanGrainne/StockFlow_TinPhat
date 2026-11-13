using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-57: sửa BOM chưa được lệnh sản xuất nào dùng. BOM đã dùng thì tạo phiên bản mới
/// (lệnh đã lập giữ snapshot định mức riêng nên không bị ảnh hưởng).
/// </summary>
public record UpdateBomCommand(int BomId, SaveBomRequest Request) : IRequest<Result<BomDetailDto>>;

public class UpdateBomCommandValidator : AbstractValidator<UpdateBomCommand>
{
    public UpdateBomCommandValidator()
    {
        RuleFor(x => x.Request.ProductId).GreaterThan(0).WithMessage("Vui lòng chọn thành phẩm.");
        RuleFor(x => x.Request.BomCode).MaximumLength(100).WithMessage("Mã BOM tối đa 100 ký tự.");
        RuleFor(x => x.Request.Version).MaximumLength(20).WithMessage("Phiên bản tối đa 20 ký tự.");
        RuleFor(x => x.Request.Description).MaximumLength(500).WithMessage("Ghi chú kỹ thuật tối đa 500 ký tự.");
    }
}

public class UpdateBomCommandHandler : IRequestHandler<UpdateBomCommand, Result<BomDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateBomCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<BomDetailDto>> Handle(UpdateBomCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var bom = await _context.MstBoms
            .Include(b => b.DtlBomItems)
            .FirstOrDefaultAsync(b => b.BomId == command.BomId, ct);
        if (bom == null) return Result.Failure<BomDetailDto>(ProductionMessages.BomNotFound);

        if (await _context.TrxProductionOrders.AnyAsync(o => o.BomId == bom.BomId, ct))
            return Result.Failure<BomDetailDto>(
                "BOM đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới.");

        var (error, product, lines) = await BomRules.ValidateAsync(_context, req, ct);
        if (error != null) return Result.Failure<BomDetailDto>(error);

        var version = string.IsNullOrWhiteSpace(req.Version) ? bom.Version ?? "1" : req.Version.Trim();
        if (await _context.MstBoms.AnyAsync(b => b.BomId != bom.BomId && b.ProductId == req.ProductId && b.Version == version, ct))
            return Result.Failure<BomDetailDto>($"Thành phẩm đã có BOM phiên bản {version}.");

        var code = string.IsNullOrWhiteSpace(req.BomCode)
            ? $"BOM-{product!.ProductCode}-V{version}".ToUpperInvariant()
            : req.BomCode.Trim();
        if (await _context.MstBoms.AnyAsync(b => b.BomId != bom.BomId && b.BomName == code, ct))
            return Result.Failure<BomDetailDto>($"Mã BOM {code} đã tồn tại trong hệ thống.");

        await using var tx = await _context.BeginTransactionAsync(ct);

        // Đổi thành phẩm khi BOM đang áp dụng: tắt trước để không trùng BOM đang áp dụng của thành phẩm mới
        var productChanged = bom.ProductId != req.ProductId;
        var wasActive = bom.IsActive == true;
        if (productChanged && wasActive)
        {
            bom.IsActive = false;
            await _context.SaveChangesAsync(ct);
        }

        bom.ProductId = req.ProductId;
        bom.BomName = code;
        bom.Version = version;
        bom.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        BomRules.ReplaceItems(_context, bom, lines);
        await _context.SaveChangesAsync(ct);

        if (req.Activate || (productChanged && wasActive)) await BomRules.ActivateAsync(_context, bom, ct);

        await tx.CommitAsync(ct);

        var detail = await ProductionReader.BomDetailAsync(_context, bom.BomId, ct);
        return Result.Success(detail!);
    }
}
