using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.Helpers;

namespace StockFlow.Application.Features.Boms.Commands;

/// <summary>
/// Xóa BOM. Không xóa BOM đang Active, và không xóa BOM đã có lệnh sản xuất tham chiếu (chỉ chuyển Inactive).
/// Thực tế chỉ xóa được bản nháp, hoặc bản Inactive chưa từng được dùng.
/// </summary>
public record DeleteBomCommand(int BomId) : IRequest<Result>;

public class DeleteBomCommandHandler(
    IStockFlowDbContext context,
    ICurrentUserService currentUser,
    ILogger<DeleteBomCommandHandler> logger)
    : IRequestHandler<DeleteBomCommand, Result>
{
    public async Task<Result> Handle(DeleteBomCommand command, CancellationToken cancellationToken)
    {
        var bom = await context.MstBoms
            .Include(b => b.DtlBomItems)
            .FirstOrDefaultAsync(b => b.BomId == command.BomId, cancellationToken);
        if (bom == null) return Result.Failure(BomMessages.BomNotFound);

        if (bom.Status == BomStatuses.Active) return Result.Failure(BomMessages.ActiveCannotBeDeleted);

        if (await BomReader.IsInUseAsync(context, bom.BomId, cancellationToken))
            return Result.Failure(BomMessages.InUseCannotBeDeleted);

        context.DtlBomItems.RemoveRange(bom.DtlBomItems);
        context.MstBoms.Remove(bom);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "AUDIT BOM_DELETED bomId={BomId} productId={ProductId} version={Version} status={Status} userId={UserId}",
            bom.BomId, bom.ProductId, bom.Version, bom.Status, currentUser.UserId);

        return Result.Success();
    }
}
