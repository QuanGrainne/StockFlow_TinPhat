using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.DTOs;
using StockFlow.Application.Features.Boms.Helpers;

namespace StockFlow.Application.Features.Boms.Commands;

/// <summary>
/// UC-57: kích hoạt một phiên bản BOM (BR-30). Trong MỘT transaction: bản Active cũ của thành phẩm → Inactive,
/// bản này → Active. Xác nhận MSG70 là hộp thoại phía giao diện; API này chỉ gọi sau khi người dùng đã xác nhận.
/// </summary>
public record ActivateBomCommand(int BomId) : IRequest<Result<BomActivationResultDto>>;

public class ActivateBomCommandHandler(
    IStockFlowDbContext context,
    ICurrentUserService currentUser,
    ILogger<ActivateBomCommandHandler> logger)
    : IRequestHandler<ActivateBomCommand, Result<BomActivationResultDto>>
{
    public async Task<Result<BomActivationResultDto>> Handle(
        ActivateBomCommand command, CancellationToken cancellationToken)
    {
        // Mở transaction trước khi đọc để toàn bộ thao tác nằm trong cùng một đơn vị công việc
        using var tx = await context.BeginTransactionAsync(cancellationToken);

        var bom = await context.MstBoms
            .Include(b => b.DtlBomItems)
            .FirstOrDefaultAsync(b => b.BomId == command.BomId, cancellationToken);
        if (bom == null) return Fail(BomMessages.BomNotFound);

        // Chỉ bản nháp mới kích hoạt được (Active rồi → không làm lại; Inactive → phải tạo phiên bản mới)
        if (bom.Status != BomStatuses.Draft) return Fail(BomMessages.OnlyDraftActivatable);

        var product = await context.MstProducts
            .AsNoTracking()
            .Where(p => p.ProductId == bom.ProductId)
            .Select(p => new { p.IsActive })
            .FirstOrDefaultAsync(cancellationToken);
        if (product == null) return Fail(BomMessages.ProductNotFound);
        if (product.IsActive == false) return Fail(BomMessages.ProductInactive);

        // Kiểm tra lại ở thời điểm kích hoạt: từ lúc lưu nháp, NVL có thể đã bị ngừng kinh doanh
        if (bom.DtlBomItems.Count == 0) return Fail(BomMessages.Msg66NoMaterial); // MSG66
        var itemError = await BomItemChecker.CheckAsync(
            context,
            bom.ProductId,
            bom.DtlBomItems.Select(i => new BomItemRequest
            {
                MaterialId = i.MaterialId,
                UnitId = i.UnitId,
                Quantity = i.Quantity,
                WastageRate = i.WastageRate
            }).ToList(),
            cancellationToken);
        if (itemError != null) return Fail(itemError);

        // Bước 1: hạ các bản Active hiện có của thành phẩm xuống Inactive và LƯU TRƯỚC.
        // Phải lưu riêng, vì unique index uq_mst_boms_one_active_per_product kiểm tra từng dòng ngay khi ghi,
        // nên không được để hai bản cùng Active dù chỉ trong một lệnh UPDATE.
        var currentActives = await context.MstBoms
            .Where(b => b.ProductId == bom.ProductId && b.Status == BomStatuses.Active && b.BomId != bom.BomId)
            .ToListAsync(cancellationToken);
        foreach (var old in currentActives)
        {
            old.Status = BomStatuses.Inactive;
            old.IsActive = false;
        }
        if (currentActives.Count > 0) await context.SaveChangesAsync(cancellationToken);

        // Trường hợp hai người kích hoạt CÙNG MỘT bản nháp: người sau bị chặn ở lệnh UPDATE phía trên
        // cho tới khi người trước commit. Đọc lại trạng thái thật từ CSDL để không kích hoạt hai lần.
        var currentStatus = await context.MstBoms
            .AsNoTracking()
            .Where(b => b.BomId == bom.BomId)
            .Select(b => b.Status)
            .FirstAsync(cancellationToken);
        if (currentStatus != BomStatuses.Draft)
        {
            await tx.RollbackAsync(cancellationToken);
            return Result.Failure<BomActivationResultDto>(BomMessages.NoLongerDraft);
        }

        // Bước 2: bật bản này. Nếu người khác vừa kích hoạt một bản nháp KHÁC của cùng thành phẩm,
        // unique index sẽ từ chối ở đây (DbUpdateException) và transaction của người sau được hoàn tác.
        bom.Status = BomStatuses.Active;
        bom.IsActive = true;
        bom.EffectiveDate ??= DateOnly.FromDateTime(VietnamTime.Now);
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            await tx.RollbackAsync(cancellationToken);

            // Chỉ báo "xung đột kích hoạt" khi đúng là đã có bản Active khác; lỗi khác thì ném lại
            var otherActive = await context.MstBoms
                .AsNoTracking()
                .AnyAsync(b => b.ProductId == bom.ProductId
                               && b.Status == BomStatuses.Active
                               && b.BomId != bom.BomId, cancellationToken);
            if (otherActive) return Result.Failure<BomActivationResultDto>(BomMessages.ActivationConflict);
            throw;
        }

        await tx.CommitAsync(cancellationToken);

        logger.LogInformation(
            "AUDIT BOM_ACTIVATED bomId={BomId} productId={ProductId} version={Version} userId={UserId} deactivatedBomIds=[{Deactivated}]",
            bom.BomId, bom.ProductId, bom.Version, currentUser.UserId,
            string.Join(",", currentActives.Select(a => a.BomId)));

        var dto = await BomReader.LoadAsync(context, bom.BomId, cancellationToken);
        return Result.Success(new BomActivationResultDto(BomMessages.Msg71Activated(bom.Version), dto!)); // MSG71

        // Mọi nhánh lỗi đều hoàn tác transaction trước khi trả về
        Result<BomActivationResultDto> Fail(string message)
        {
            tx.Rollback();
            return Result.Failure<BomActivationResultDto>(message);
        }
    }
}
