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

/// <summary>UC-57: tạo BOM nháp cho một thành phẩm (phiên bản mới, trạng thái Draft).</summary>
public record CreateBomCommand(CreateBomRequest Request) : IRequest<Result<BomDto>>;

public class CreateBomCommandValidator : AbstractValidator<CreateBomCommand>
{
    public CreateBomCommandValidator()
    {
        RuleFor(x => x.Request.ProductId).GreaterThan(0).WithMessage("Product is required.");

        RuleFor(x => x.Request.BomName)
            .MaximumLength(100).WithMessage(BomMessages.NameTooLong);
        RuleFor(x => x.Request.Description)
            .MaximumLength(500).WithMessage(BomMessages.DescriptionTooLong);

        // MSG66, MSG67, MSG68, MSG69 và MSG74 (truyền mã thành phẩm để kiểm tra MSG74)
        BomItemRules.AddItemListRules(this, x => x.Request.Items, cmd => cmd.Request.ProductId);
    }
}

public class CreateBomCommandHandler(
    IStockFlowDbContext context,
    ICurrentUserService currentUser,
    ILogger<CreateBomCommandHandler> logger)
    : IRequestHandler<CreateBomCommand, Result<BomDto>>
{
    public async Task<Result<BomDto>> Handle(CreateBomCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        // Thành phẩm phải tồn tại và còn hoạt động
        var product = await context.MstProducts
            .AsNoTracking()
            .Where(p => p.ProductId == req.ProductId)
            .Select(p => new { p.ProductCode, p.IsActive })
            .FirstOrDefaultAsync(cancellationToken);
        if (product == null) return Result.Failure<BomDto>(BomMessages.ProductNotFound);
        if (product.IsActive == false) return Result.Failure<BomDto>(BomMessages.ProductInactive);

        // Kiểm tra cần CSDL: NVL còn hoạt động, đơn vị hợp lệ, không chứa chính thành phẩm (BR-54)
        var itemError = await BomItemChecker.CheckAsync(context, req.ProductId, req.Items, cancellationToken);
        if (itemError != null) return Result.Failure<BomDto>(itemError);

        var version = await BomReader.NextVersionAsync(context, req.ProductId, cancellationToken);
        var name = string.IsNullOrWhiteSpace(req.BomName)
            ? $"BOM {product.ProductCode} v{version}"
            : req.BomName.Trim();
        if (name.Length > 100) name = name[..100];

        // BOM mới luôn là Draft; chỉ kích hoạt qua ActivateBomCommand để giữ BR-30
        var bom = new MstBom
        {
            ProductId = req.ProductId,
            BomName = name,
            Version = version,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            EffectiveDate = req.EffectiveDate,
            Status = BomStatuses.Draft,
            IsActive = false,
            CreatedAt = VietnamTime.Now
        };
        foreach (var item in req.Items)
        {
            bom.DtlBomItems.Add(new DtlBomItem
            {
                MaterialId = item.MaterialId,
                UnitId = item.UnitId,
                Quantity = item.Quantity,
                WastageRate = item.WastageRate
            });
        }

        context.MstBoms.Add(bom);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "AUDIT BOM_CREATED bomId={BomId} productId={ProductId} version={Version} userId={UserId} after=[{After}]",
            bom.BomId, bom.ProductId, bom.Version, currentUser.UserId,
            BomReader.Describe(req.Items.Select(i => (i.MaterialId, i.UnitId, i.Quantity, i.WastageRate))));

        var dto = await BomReader.LoadAsync(context, bom.BomId, cancellationToken);
        return Result.Success(dto!);
    }
}
