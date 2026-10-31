using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Products.Commands;

public record CreateCategoryRequest(string CategoryName, string? Description);

public record CreateProductCategoryCommand(CreateCategoryRequest Request) : IRequest<Result<ProductCategoryDto>>;

public class CreateProductCategoryCommandHandler : IRequestHandler<CreateProductCategoryCommand, Result<ProductCategoryDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateProductCategoryCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ProductCategoryDto>> Handle(CreateProductCategoryCommand command, CancellationToken cancellationToken)
    {
        var name = command.Request.CategoryName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return Result.Failure<ProductCategoryDto>("Tên nhóm hàng không được để trống.");
        }

        var existing = await _context.MstProductCategories
            .FirstOrDefaultAsync(c => c.CategoryName != null && c.CategoryName.ToLower() == name.ToLower(), cancellationToken);

        if (existing != null)
        {
            return Result.Success(new ProductCategoryDto(
                CategoryId: existing.CategoryId,
                CategoryName: existing.CategoryName ?? name,
                Description: existing.Description,
                IsActive: existing.IsActive ?? true,
                ProductCount: 0
            ));
        }

        var cat = new MstProductCategory
        {
            CategoryName = name,
            Description = command.Request.Description ?? $"Nhóm hàng {name}",
            IsActive = true
        };

        await _context.MstProductCategories.AddAsync(cat, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(new ProductCategoryDto(
            CategoryId: cat.CategoryId,
            CategoryName: cat.CategoryName,
            Description: cat.Description,
            IsActive: true,
            ProductCount: 0
        ));
    }
}

