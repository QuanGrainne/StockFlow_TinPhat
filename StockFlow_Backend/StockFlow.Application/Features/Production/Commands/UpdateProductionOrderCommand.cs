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
        RuleFor(x => x.Request)
            .Must(r => (r.Items is { Count: > 0 }) || (r.ProductId > 0 && r.PlannedQuantity > 0))
            .WithMessage("Vui lòng chọn ít nhất một thành phẩm và nhập số lượng kế hoạch lớn hơn 0.");
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
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionOrderDetailDto>("Không xác định được người dùng đăng nhập.");

        var order = await _context.TrxProductionOrders
            .Include(o => o.DtlProductionOrderItems)
            .Include(o => o.TrxProductionMaterialRequirements)
            .FirstOrDefaultAsync(o => o.ProductionOrderId == command.ProductionOrderId, ct);
        if (order == null) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.OrderNotFound);
        if (!order.CanUpdate()) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.StatusNotAllowed);

        var deadlineError = ProductionOrderRules.ValidateDeadline(req.Deadline);
        if (deadlineError != null) return Result.Failure<ProductionOrderDetailDto>(deadlineError);

        await using var tx = await _context.BeginTransactionAsync(ct);

        // Lệnh thuộc kế hoạch: chạy tuần tự với các thao tác khác trên cùng kế hoạch (UC-PP-05)
        if (order.ProductionPlanId is int planId)
            await _context.AcquireTransactionLockAsync(ProductionPlanRules.LockKey(planId), ct);

        Dictionary<int, decimal> finalQuantities;
        if (req.Items is { Count: > 0 } || req.CustomMaterials is { Count: > 0 } || order.ProductId != req.ProductId || order.DtlProductionOrderItems.Count > 1)
        {
            _context.TrxProductionMaterialRequirements.RemoveRange(order.TrxProductionMaterialRequirements.ToList());
            _context.DtlProductionOrderItems.RemoveRange(order.DtlProductionOrderItems.ToList());
            var populateError = await ProductionOrderRules.PopulateItemsAndRequirementsAsync(
                _context, order, req, userId, VietnamTime.Now, ct);
            if (populateError != null) return Result.Failure<ProductionOrderDetailDto>(populateError);
            // PopulateItemsAndRequirementsAsync đã chặn trùng thành phẩm nên ToDictionary an toàn
            finalQuantities = ProductionOrderRules.NormalizeItems(req).ToDictionary(i => i.ProductId, i => i.PlannedQuantity);
        }
        else
        {
            var singleItem = order.DtlProductionOrderItems.FirstOrDefault();
            finalQuantities = new Dictionary<int, decimal> { [singleItem?.ProductId ?? order.ProductId] = req.PlannedQuantity };
            if (req.PlannedQuantity > ProductionPolicy.MaxStoredQuantity)
                return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.QuantityLimit); // V-04
            if (singleItem != null) singleItem.PlannedQuantity = req.PlannedQuantity;
            foreach (var r in order.TrxProductionMaterialRequirements)
            {
                // Lệnh Chưa bắt đầu chưa có phiếu xuất nên số đã xuất = 0
                if (!ProductionPolicy.TryCalculateRequirement(req.PlannedQuantity, r.NormPerUnit ?? 0, r.WastageRate ?? 0, out var required))
                    return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.QuantityLimit); // V-04
                r.RequiredQty = required;
                r.ShortageQty = ProductionPolicy.CalculateShortage(required, r.IssuedQty ?? 0);
            }
            order.PlannedQuantity = req.PlannedQuantity;
        }

        // BR-PP-20: lệnh thuộc kế hoạch chỉ chứa thành phẩm của kế hoạch và không vượt số còn lại (không tính chính lệnh này)
        if (order.ProductionPlanId is int linkedPlanId)
        {
            var planError = await ProductionPlanRules.ValidateOrderQuantitiesAsync(
                _context, linkedPlanId, finalQuantities, order.ProductionOrderId, ct);
            if (planError != null) return Result.Failure<ProductionOrderDetailDto>(planError);
        }

        order.EndDate = req.Deadline?.Date;
        order.Workshop = string.IsNullOrWhiteSpace(req.Workshop) ? null : req.Workshop.Trim();

        // Thiếu NVL tại kho đang chọn: hỏi xác nhận, đã xác nhận thì ghi (lại) cảnh báo vào ghi chú lệnh
        var shortageError = await ProductionOrderRules.ApplyShortageCheckAsync(_context, _currentUser, order, req, VietnamTime.Now, ct);
        if (shortageError != null) return Result.Failure<ProductionOrderDetailDto>(shortageError);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
