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

public record DeleteProductCommand(int ProductId) : IRequest<Result<bool>>;

public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public DeleteProductCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(DeleteProductCommand command, CancellationToken cancellationToken)
    {
        var product = await _context.MstProducts
            .Include(p => p.TrxInventoryBalances)
            .FirstOrDefaultAsync(p => p.ProductId == command.ProductId, cancellationToken);

        if (product == null)
        {
            return Result.Failure<bool>("Không tìm thấy thông tin hàng hóa.");
        }

        var hasBalance = product.TrxInventoryBalances.Any(b => (b.Quantity ?? 0) > 0);
        if (hasBalance)
        {
            // Soft-deactivate if product has existing stock
            product.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }

        try
        {
            _context.MstProducts.Remove(product);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
        catch
        {
            // Fallback to soft-deactivate on foreign key constraint
            product.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
    }
}
