using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-59 / A58.1 bước 6, BR-38: Manager đóng sớm lệnh đang sản xuất, bắt buộc có lý do.
/// Lệnh chuyển Hoàn thành; lý do được ghi vào ghi chú của lệnh.
/// </summary>
public record CloseProductionOrderCommand(int ProductionOrderId, CloseProductionOrderRequest Request)
    : IRequest<Result<ProductionOrderDetailDto>>;

public class CloseProductionOrderCommandValidator : AbstractValidator<CloseProductionOrderCommand>
{
    public CloseProductionOrderCommandValidator()
    {
        RuleFor(x => x.Request.Reason)
            .NotEmpty().WithMessage(ProductionMessages.ReasonRequired)
            .MaximumLength(300).WithMessage("Lý do tối đa 300 ký tự.");
    }
}

public class CloseProductionOrderCommandHandler : IRequestHandler<CloseProductionOrderCommand, Result<ProductionOrderDetailDto>>
{
    private const int NotesMaxLength = 500;

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CloseProductionOrderCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(CloseProductionOrderCommand command, CancellationToken ct)
    {
        var order = await _context.TrxProductionOrders.FirstOrDefaultAsync(o => o.ProductionOrderId == command.ProductionOrderId, ct);
        if (order == null) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.OrderNotFound);
        if (!order.CanClose()) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.StatusNotAllowed);

        var reason = command.Request.Reason!.Trim();
        var closeNote = $"[Đóng lệnh {VietnamTime.Now:dd/MM/yyyy HH:mm}] {reason}";
        var notes = string.IsNullOrWhiteSpace(order.Notes) ? closeNote : $"{order.Notes}\n{closeNote}";
        order.Notes = notes.Length > NotesMaxLength ? notes[^NotesMaxLength..] : notes;
        order.MarkCompleted();

        await _context.SaveChangesAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
