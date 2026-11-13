using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-59 / A58.1 bước 6: Manager sửa lệnh còn Chưa bắt đầu.
/// - Đổi thành phẩm: lấy lại BOM đang áp dụng của thành phẩm mới và tính lại toàn bộ nhu cầu.
/// - Giữ thành phẩm, đổi số lượng: tính lại nhu cầu theo định mức đã chụp trên lệnh (giữ phần đã điều chỉnh, BR-51).
/// </summary>
public record UpdateProductionOrderCommand(int ProductionOrderId, SaveProductionOrderRequest Request)
    : IRequest<Result<ProductionOrderDetailDto>>;

public class UpdateProductionOrderCommandValidator : AbstractValidator<UpdateProductionOrderCommand>
{
    public UpdateProductionOrderCommandValidator()
    {
        RuleFor(x => x.Request.ProductId).GreaterThan(0).WithMessage("Vui lòng chọn thành phẩm.");
        RuleFor(x => x.Request.PlannedQuantity)
            .GreaterThan(0).WithMessage("Số lượng kế hoạch phải lớn hơn 0.")
            .Must(q => ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
            .WithMessage("Số lượng kế hoạch có tối đa 2 chữ số thập phân.");
        RuleFor(x => x.Request.Workshop).MaximumLength(200).WithMessage("Tên xưởng tối đa 200 ký tự.");
        RuleFor(x => x.Request.Notes).MaximumLength(500).WithMessage("Ghi chú tối đa 500 ký tự.");
    }
}

public class UpdateProductionOrderCommandHandler : IRequestHandler<UpdateProductionOrderCommand, Result<ProductionOrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UpdateProductionOrderCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(UpdateProductionOrderCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var order = await _context.TrxProductionOrders
            .Include(o => o.TrxProductionMaterialRequirements)
            .FirstOrDefaultAsync(o => o.ProductionOrderId == command.ProductionOrderId, ct);
        if (order == null) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.OrderNotFound);
        if (!order.CanUpdate()) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.StatusNotAllowed);

        var deadlineError = ProductionOrderRules.ValidateDeadline(req.Deadline);
        if (deadlineError != null) return Result.Failure<ProductionOrderDetailDto>(deadlineError);

        await using var tx = await _context.BeginTransactionAsync(ct);

        if (order.ProductId != req.ProductId)
        {
            var product = await _context.MstProducts.AsNoTracking().FirstOrDefaultAsync(p => p.ProductId == req.ProductId, ct);
            if (product == null || product.IsActive == false)
                return Result.Failure<ProductionOrderDetailDto>("Vui lòng chọn thành phẩm đang hoạt động.");

            var bom = await _context.MstBoms.AsNoTracking()
                .Include(b => b.DtlBomItems)
                .FirstOrDefaultAsync(b => b.ProductId == req.ProductId && b.IsActive == true, ct);
            if (bom == null || bom.DtlBomItems.Count == 0)
                return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.NoActiveBom);

            _context.TrxProductionMaterialRequirements.RemoveRange(order.TrxProductionMaterialRequirements.ToList());
            order.ProductId = req.ProductId;
            order.BomId = bom.BomId;
            ProductionOrderRules.AddRequirementsFromBom(_context, order, bom, req.PlannedQuantity);
        }
        else
        {
            foreach (var r in order.TrxProductionMaterialRequirements)
            {
                // Lệnh Chưa bắt đầu chưa có phiếu xuất nên số đã xuất = 0
                var required = ProductionPolicy.CalculateRequirement(req.PlannedQuantity, r.NormPerUnit ?? 0, r.WastageRate ?? 0);
                r.RequiredQty = required;
                r.ShortageQty = ProductionPolicy.CalculateShortage(required, r.IssuedQty ?? 0);
            }
        }

        order.PlannedQuantity = req.PlannedQuantity;
        order.EndDate = req.Deadline?.Date;
        order.Workshop = string.IsNullOrWhiteSpace(req.Workshop) ? null : req.Workshop.Trim();
        order.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
