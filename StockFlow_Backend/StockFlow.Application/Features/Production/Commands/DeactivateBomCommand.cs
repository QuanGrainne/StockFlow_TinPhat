using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-57 / A51.7: ngừng áp dụng BOM (giữ lại lịch sử). Thành phẩm không còn BOM đang áp dụng
/// thì không lập được lệnh sản xuất mới (BR-30); lệnh đã lập không bị ảnh hưởng.
/// </summary>
public record DeactivateBomCommand(int BomId) : IRequest<Result<BomDetailDto>>;

public class DeactivateBomCommandHandler : IRequestHandler<DeactivateBomCommand, Result<BomDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public DeactivateBomCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<BomDetailDto>> Handle(DeactivateBomCommand command, CancellationToken ct)
    {
        var bom = await _context.MstBoms.FirstOrDefaultAsync(b => b.BomId == command.BomId, ct);
        if (bom == null) return Result.Failure<BomDetailDto>(ProductionMessages.BomNotFound);

        if (bom.IsActive == true)
        {
            bom.IsActive = false;
            await _context.SaveChangesAsync(ct);
        }

        var detail = await ProductionReader.BomDetailAsync(_context, bom.BomId, ct);
        return Result.Success(detail!);
    }
}
