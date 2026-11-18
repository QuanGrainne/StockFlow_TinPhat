using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-57 / A51.6 bước 3: kích hoạt phiên bản BOM; bản đang áp dụng trước đó của thành phẩm chuyển ngừng áp dụng (BR-30).
/// </summary>
public record ActivateBomCommand(int BomId) : IRequest<Result<BomDetailDto>>;

public class ActivateBomCommandHandler : IRequestHandler<ActivateBomCommand, Result<BomDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public ActivateBomCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<BomDetailDto>> Handle(ActivateBomCommand command, CancellationToken ct)
    {
        var bom = await _context.MstBoms.FirstOrDefaultAsync(b => b.BomId == command.BomId, ct);
        if (bom == null) return Result.Failure<BomDetailDto>(ProductionMessages.BomNotFound);

        if (!await _context.DtlBomItems.AnyAsync(i => i.BomId == bom.BomId, ct))
            return Result.Failure<BomDetailDto>("Định mức phải có ít nhất một nguyên vật liệu.");

        if (bom.IsActive != true)
        {
            await using var tx = await _context.BeginTransactionAsync(ct);
            await BomRules.ActivateAsync(_context, bom, ct);
            await tx.CommitAsync(ct);
        }

        var detail = await ProductionReader.BomDetailAsync(_context, bom.BomId, ct);
        return Result.Success(detail!);
    }
}
