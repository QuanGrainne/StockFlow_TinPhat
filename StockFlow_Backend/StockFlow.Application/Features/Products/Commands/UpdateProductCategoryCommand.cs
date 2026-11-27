using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;

namespace StockFlow.Application.Features.Products.Commands;

public record UpdateCategoryRequest(string CategoryName, string? Description);

/// <summary>Đổi tên / mô tả nhóm hàng (nút sửa ở bộ lọc Nhóm hàng). Hàng hóa giữ nguyên nhóm (theo category_id).</summary>
public record UpdateProductCategoryCommand(int CategoryId, UpdateCategoryRequest Request) : IRequest<Result<ProductCategoryDto>>;

public class UpdateProductCategoryCommandHandler : IRequestHandler<UpdateProductCategoryCommand, Result<ProductCategoryDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateProductCategoryCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ProductCategoryDto>> Handle(UpdateProductCategoryCommand command, CancellationToken cancellationToken)
    {
        var name = command.Request.CategoryName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return Result.Failure<ProductCategoryDto>("Tên nhóm hàng không được để trống.");
        }
        if (name.Length > 100)
        {
            return Result.Failure<ProductCategoryDto>("Tên nhóm hàng không được dài quá 100 ký tự.");
        }
        if (command.Request.Description?.Trim().Length > 255)
        {
            return Result.Failure<ProductCategoryDto>("Mô tả nhóm hàng không được dài quá 255 ký tự.");
        }

        var category = await _context.MstProductCategories
            .FirstOrDefaultAsync(c => c.CategoryId == command.CategoryId, cancellationToken);
        if (category == null)
        {
            return Result.Failure<ProductCategoryDto>("Không tìm thấy nhóm hàng.");
        }

        var lower = name.ToLower();
        var duplicated = await _context.MstProductCategories.AnyAsync(
            c => c.CategoryId != command.CategoryId && c.CategoryName != null && c.CategoryName.ToLower() == lower,
            cancellationToken);
        if (duplicated)
        {
            return Result.Failure<ProductCategoryDto>($"Nhóm hàng \"{name}\" đã tồn tại.");
        }

        category.CategoryName = name;
        if (command.Request.Description != null)
        {
            category.Description = command.Request.Description.Trim();
        }
        await _context.SaveChangesAsync(cancellationToken);

        var productCount = await _context.MstProducts.CountAsync(p => p.CategoryId == category.CategoryId, cancellationToken);
        return Result.Success(new ProductCategoryDto(
            CategoryId: category.CategoryId,
            CategoryName: name,
            Description: category.Description,
            IsActive: category.IsActive ?? true,
            ProductCount: productCount));
    }
}
