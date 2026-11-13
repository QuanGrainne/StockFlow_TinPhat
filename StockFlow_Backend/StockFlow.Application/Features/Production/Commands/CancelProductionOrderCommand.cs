using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>UC-59 / A58.1 bước 6, BR-38: Manager huỷ lệnh chưa xuất NVL (MSG18 xác nhận ở giao diện).</summary>
public record CancelProductionOrderCommand(int ProductionOrderId) : IRequest<Result<ProductionOrderDetailDto>>;

public class CancelProductionOrderCommandHandler : IRequestHandler<CancelProductionOrderCommand, Result<ProductionOrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelProductionOrderCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(CancelProductionOrderCommand command, CancellationToken ct)
    {
        var order = await _context.TrxProductionOrders.FirstOrDefaultAsync(o => o.ProductionOrderId == command.ProductionOrderId, ct);
        if (order == null) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.OrderNotFound);

        var hasIssue = await _context.TrxStockIssues.AnyAsync(
            i => i.ProductionOrderId == order.ProductionOrderId && i.IssueType == StockIssueType.Production, ct);
        if (!order.CanCancel() || hasIssue)
            return Result.Failure<ProductionOrderDetailDto>("Chỉ huỷ được lệnh sản xuất chưa xuất nguyên vật liệu.");

        order.MarkCancelled();
        await _context.SaveChangesAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
