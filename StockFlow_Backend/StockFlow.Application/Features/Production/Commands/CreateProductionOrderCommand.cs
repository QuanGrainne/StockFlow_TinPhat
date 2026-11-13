using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-59 / A58.1: Manager lập lệnh sản xuất cho thành phẩm có BOM đang áp dụng (BR-30).
/// Nhu cầu NVL do hệ thống tính từ BOM (BR-31) và được chụp lại trên lệnh; lệnh lưu ở trạng thái Chưa bắt đầu.
/// </summary>
public record CreateProductionOrderCommand(SaveProductionOrderRequest Request) : IRequest<Result<ProductionOrderDetailDto>>;

public class CreateProductionOrderCommandValidator : AbstractValidator<CreateProductionOrderCommand>
{
    public CreateProductionOrderCommandValidator()
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

public class CreateProductionOrderCommandHandler : IRequestHandler<CreateProductionOrderCommand, Result<ProductionOrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ITransactionCodeGenerator _codeGenerator;

    public CreateProductionOrderCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, ITransactionCodeGenerator codeGenerator)
    {
        _context = context;
        _currentUser = currentUser;
        _codeGenerator = codeGenerator;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(CreateProductionOrderCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionOrderDetailDto>("Không xác định được người dùng đăng nhập.");

        var deadlineError = ProductionOrderRules.ValidateDeadline(req.Deadline);
        if (deadlineError != null) return Result.Failure<ProductionOrderDetailDto>(deadlineError);

        var product = await _context.MstProducts.AsNoTracking().FirstOrDefaultAsync(p => p.ProductId == req.ProductId, ct);
        if (product == null || product.IsActive == false)
            return Result.Failure<ProductionOrderDetailDto>("Vui lòng chọn thành phẩm đang hoạt động.");

        var bom = await _context.MstBoms.AsNoTracking()
            .Include(b => b.DtlBomItems)
            .FirstOrDefaultAsync(b => b.ProductId == req.ProductId && b.IsActive == true, ct);
        if (bom == null || bom.DtlBomItems.Count == 0)
            return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.NoActiveBom);

        await using var tx = await _context.BeginTransactionAsync(ct);

        var code = await ProductionHelper.NextCodeAsync(_context, _codeGenerator, "PRODUCTION_ORDER",
            (c, token) => _context.TrxProductionOrders.AnyAsync(o => o.ProductionOrderCode == c, token), ct);

        var order = new TrxProductionOrder
        {
            ProductionOrderCode = code,
            ProductId = req.ProductId,
            BomId = bom.BomId,
            PlannedQuantity = req.PlannedQuantity,
            ActualQuantity = 0,
            Status = ProductionOrderStatus.NotStarted,
            CreatedBy = userId,
            StartDate = VietnamTime.Now,
            EndDate = req.Deadline?.Date,
            Workshop = string.IsNullOrWhiteSpace(req.Workshop) ? null : req.Workshop.Trim(),
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
        };
        _context.TrxProductionOrders.Add(order);
        ProductionOrderRules.AddRequirementsFromBom(_context, order, bom, req.PlannedQuantity);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
