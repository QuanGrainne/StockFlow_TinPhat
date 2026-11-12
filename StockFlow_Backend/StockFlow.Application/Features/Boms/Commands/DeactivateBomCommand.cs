using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.DTOs;
using StockFlow.Application.Features.Boms.Helpers;

namespace StockFlow.Application.Features.Boms.Commands;

/// <summary>
/// Chuyển BOM Active → Inactive. Đây là cách duy nhất để "gỡ" một BOM đã được lệnh sản xuất tham chiếu
/// (không được xóa). Sau khi gỡ, thành phẩm không còn BOM Active nên MSG58 sẽ hiện khi tạo lệnh.
/// </summary>
public record DeactivateBomCommand(int BomId) : IRequest<Result<BomDto>>;

public class DeactivateBomCommandHandler(
    IStockFlowDbContext context,
    ICurrentUserService currentUser,
    ILogger<DeactivateBomCommandHandler> logger)
    : IRequestHandler<DeactivateBomCommand, Result<BomDto>>
{
    public async Task<Result<BomDto>> Handle(DeactivateBomCommand command, CancellationToken cancellationToken)
    {
        var bom = await context.MstBoms.FirstOrDefaultAsync(b => b.BomId == command.BomId, cancellationToken);
        if (bom == null) return Result.Failure<BomDto>(BomMessages.BomNotFound);

        if (bom.Status != BomStatuses.Active)
            return Result.Failure<BomDto>(BomMessages.OnlyActiveDeactivatable);

        bom.Status = BomStatuses.Inactive;
        bom.IsActive = false;
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "AUDIT BOM_DEACTIVATED bomId={BomId} productId={ProductId} version={Version} userId={UserId}",
            bom.BomId, bom.ProductId, bom.Version, currentUser.UserId);

        var dto = await BomReader.LoadAsync(context, bom.BomId, cancellationToken);
        return Result.Success(dto!);
    }
}
