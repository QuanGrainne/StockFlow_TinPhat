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
        RuleFor(x => x.Request)
            .Must(r => (r.Items is { Count: > 0 }) || (r.ProductId > 0 && r.PlannedQuantity > 0))
            .WithMessage("Vui lòng chọn ít nhất một thành phẩm và nhập số lượng kế hoạch lớn hơn 0.");
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

        await using var tx = await _context.BeginTransactionAsync(ct);

        var now = VietnamTime.Now;

        var order = new TrxProductionOrder
        {
            ActualQuantity = 0,
            Status = ProductionOrderStatus.NotStarted,
            CreatedBy = userId,
            StartDate = now,
            EndDate = req.Deadline?.Date,
            Workshop = string.IsNullOrWhiteSpace(req.Workshop) ? null : req.Workshop.Trim(),
        };

        // Nhu cầu NVL tính đúng theo công thức BOM đang áp dụng (BR-31)
        var populateError = await ProductionOrderRules.PopulateItemsAndRequirementsAsync(_context, order, req, userId, now, ct);
        if (populateError != null) return Result.Failure<ProductionOrderDetailDto>(populateError);

        // Thiếu NVL tại kho đang chọn: hỏi xác nhận, đã xác nhận thì ghi cảnh báo vào ghi chú lệnh
        var shortageError = await ProductionOrderRules.ApplyShortageCheckAsync(_context, _currentUser, order, req, now, ct);
        if (shortageError != null) return Result.Failure<ProductionOrderDetailDto>(shortageError);

        // Sinh mã sau khi qua kiểm tra để không bỏ phí số thứ tự khi phải hỏi xác nhận
        order.ProductionOrderCode = await ProductionHelper.NextCodeAsync(_context, _codeGenerator, "PRODUCTION_ORDER",
            (c, token) => _context.TrxProductionOrders.AnyAsync(o => o.ProductionOrderCode == c, token), ct);

        _context.TrxProductionOrders.Add(order);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
