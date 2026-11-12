using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.DTOs;
using StockFlow.Application.Features.Boms.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Boms.Commands;

/// <summary>
/// UC-57: lưu BOM nháp. Thêm / sửa / xóa dòng NVL đều là một lần lưu: danh sách gửi lên thay thế danh sách cũ.
/// Chỉ BOM Draft mới được sửa; muốn đổi BOM đang Active thì tạo phiên bản mới.
/// </summary>
public record UpdateBomCommand(int BomId, UpdateBomRequest Request) : IRequest<Result<BomDto>>;

public class UpdateBomCommandValidator : AbstractValidator<UpdateBomCommand>
{
    public UpdateBomCommandValidator()
    {
        RuleFor(x => x.Request.BomName)
            .MaximumLength(100).WithMessage(BomMessages.NameTooLong);
        RuleFor(x => x.Request.Description)
            .MaximumLength(500).WithMessage(BomMessages.DescriptionTooLong);

        // MSG66, MSG67, MSG68, MSG69
        BomItemRules.AddItemListRules(this, x => x.Request.Items);
    }
}

public class UpdateBomCommandHandler(
    IStockFlowDbContext context,
    ICurrentUserService currentUser,
    ILogger<UpdateBomCommandHandler> logger)
    : IRequestHandler<UpdateBomCommand, Result<BomDto>>
{
    public async Task<Result<BomDto>> Handle(UpdateBomCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        var bom = await context.MstBoms
            .Include(b => b.DtlBomItems)
            .FirstOrDefaultAsync(b => b.BomId == command.BomId, cancellationToken);
        if (bom == null) return Result.Failure<BomDto>(BomMessages.BomNotFound);

        // BOM đang Active (hoặc đã Inactive) là bản đã chốt: không sửa tại chỗ, tránh đổi định mức đang áp dụng
        if (bom.Status != BomStatuses.Draft)
            return Result.Failure<BomDto>(BomMessages.OnlyDraftEditable);

        var itemError = await BomItemChecker.CheckAsync(context, bom.ProductId, req.Items, cancellationToken);
        if (itemError != null) return Result.Failure<BomDto>(itemError);

        var before = BomReader.Describe(
            bom.DtlBomItems.Select(i => (i.MaterialId, i.UnitId, i.Quantity, i.WastageRate)));

        if (!string.IsNullOrWhiteSpace(req.BomName)) bom.BomName = req.BomName.Trim();
        bom.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        bom.EffectiveDate = req.EffectiveDate;

        // Đồng bộ danh sách dòng theo NVL: dòng không còn trong danh sách thì xóa,
        // dòng đã có thì cập nhật tại chỗ (giữ nguyên mã dòng), dòng mới thì thêm.
        var incoming = req.Items.ToDictionary(i => i.MaterialId);
        foreach (var existing in bom.DtlBomItems.Where(i => !incoming.ContainsKey(i.MaterialId)).ToList())
        {
            context.DtlBomItems.Remove(existing);
        }
        foreach (var item in req.Items)
        {
            var line = bom.DtlBomItems.FirstOrDefault(i => i.MaterialId == item.MaterialId);
            if (line == null)
            {
                bom.DtlBomItems.Add(new DtlBomItem
                {
                    MaterialId = item.MaterialId,
                    UnitId = item.UnitId,
                    Quantity = item.Quantity,
                    WastageRate = item.WastageRate
                });
            }
            else
            {
                line.UnitId = item.UnitId;
                line.Quantity = item.Quantity;
                line.WastageRate = item.WastageRate;
            }
        }

        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "AUDIT BOM_UPDATED bomId={BomId} productId={ProductId} version={Version} userId={UserId} before=[{Before}] after=[{After}]",
            bom.BomId, bom.ProductId, bom.Version, currentUser.UserId, before,
            BomReader.Describe(req.Items.Select(i => (i.MaterialId, i.UnitId, i.Quantity, i.WastageRate))));

        var dto = await BomReader.LoadAsync(context, bom.BomId, cancellationToken);
        return Result.Success(dto!);
    }
}
