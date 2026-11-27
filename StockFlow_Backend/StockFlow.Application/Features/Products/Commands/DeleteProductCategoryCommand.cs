using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Products.Commands;

/// <summary>
/// Xóa nhóm hàng (nút xóa ở bộ lọc Nhóm hàng). Hàng hóa bắt buộc thuộc một nhóm (category_id không null),
/// nên nhóm còn hàng hóa (kể cả hàng ngừng kinh doanh) thì không xóa được: chuyển hàng sang nhóm khác trước.
/// </summary>
public record DeleteProductCategoryCommand(int CategoryId) : IRequest<Result<bool>>;

public class DeleteProductCategoryCommandHandler : IRequestHandler<DeleteProductCategoryCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public DeleteProductCategoryCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(DeleteProductCategoryCommand command, CancellationToken cancellationToken)
    {
        var category = await _context.MstProductCategories
            .FirstOrDefaultAsync(c => c.CategoryId == command.CategoryId, cancellationToken);
        if (category == null)
        {
            return Result.Failure<bool>("Không tìm thấy nhóm hàng.");
        }

        var productCount = await _context.MstProducts.CountAsync(p => p.CategoryId == command.CategoryId, cancellationToken);
        if (productCount > 0)
        {
            return Result.Failure<bool>(
                $"Nhóm hàng \"{category.CategoryName}\" đang có {productCount} hàng hóa. Chuyển các hàng hóa sang nhóm khác trước khi xóa.");
        }

        _context.MstProductCategories.Remove(category);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}
