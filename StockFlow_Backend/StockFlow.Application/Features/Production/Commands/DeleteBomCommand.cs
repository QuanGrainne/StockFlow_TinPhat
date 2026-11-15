using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-57 / E51.3, BR-06: chỉ xoá được BOM chưa dùng cho lệnh sản xuất nào; BOM đã dùng thì chỉ ngừng áp dụng.
/// </summary>
public record DeleteBomCommand(int BomId) : IRequest<Result>;

public class DeleteBomCommandHandler : IRequestHandler<DeleteBomCommand, Result>
{
    private readonly IStockFlowDbContext _context;

    public DeleteBomCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteBomCommand command, CancellationToken ct)
    {
        var bom = await _context.MstBoms
            .Include(b => b.DtlBomItems)
            .FirstOrDefaultAsync(b => b.BomId == command.BomId, ct);
        if (bom == null) return Result.Failure(ProductionMessages.BomNotFound);

        if (await BomRules.IsUsedAsync(_context, bom.BomId, ct))
            return Result.Failure("BOM đã được dùng cho lệnh sản xuất nên không xoá được. Bạn có thể ngừng áp dụng BOM.");

        _context.DtlBomItems.RemoveRange(bom.DtlBomItems);
        _context.MstBoms.Remove(bom);
        await _context.SaveChangesAsync(ct);
        return Result.Success();
    }
}
