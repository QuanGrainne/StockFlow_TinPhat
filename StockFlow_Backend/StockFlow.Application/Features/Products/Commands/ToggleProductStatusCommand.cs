using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Products.Commands;

public record ToggleProductStatusCommand(int ProductId) : IRequest<Result<bool>>;

public class ToggleProductStatusCommandHandler : IRequestHandler<ToggleProductStatusCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public ToggleProductStatusCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(ToggleProductStatusCommand command, CancellationToken cancellationToken)
    {
        var product = await _context.MstProducts.FirstOrDefaultAsync(p => p.ProductId == command.ProductId, cancellationToken);
        if (product == null)
        {
            return Result.Failure<bool>("Không tìm thấy thông tin hàng hóa.");
        }

        product.IsActive = product.IsActive != true;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(product.IsActive.Value);
    }
}
