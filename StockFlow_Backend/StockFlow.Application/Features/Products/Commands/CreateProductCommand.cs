using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Products.Commands;

public record CreateProductCommand(CreateProductRequest Request) : IRequest<Result<ProductDto>>;

public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Result<ProductDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateProductCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ProductDto>> Handle(CreateProductCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        if (string.IsNullOrWhiteSpace(req.Code))
        {
            return Result.Failure<ProductDto>("Mã hàng hóa không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return Result.Failure<ProductDto>("Tên hàng hóa không được để trống.");
        }

        var codeNormalized = req.Code.Trim().ToUpper();
        var exists = await _context.MstProducts
            .AnyAsync(p => p.ProductCode == codeNormalized, cancellationToken);

        if (exists)
        {
            return Result.Failure<ProductDto>($"Mã hàng hóa '{req.Code}' đã tồn tại trong hệ thống.");
        }

        // 1. Resolve Category
        int categoryId = req.CategoryId ?? 0;
        if (categoryId <= 0)
        {
            var defaultCatName = !string.IsNullOrWhiteSpace(req.CategoryName) 
                ? req.CategoryName.Trim() 
                : (req.Type?.ToUpper() == "RAW_MATERIAL" ? "Nguyên vật liệu" : "Thành phẩm");

            var cat = await _context.MstProductCategories
                .FirstOrDefaultAsync(c => c.CategoryName != null && c.CategoryName.ToLower() == defaultCatName.ToLower(), cancellationToken);

            if (cat == null)
            {
                cat = new MstProductCategory
                {
                    CategoryName = defaultCatName,
                    Description = $"Nhóm hàng {defaultCatName}",
                    IsActive = true
                };
                await _context.MstProductCategories.AddAsync(cat, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }
            categoryId = cat.CategoryId;
        }

        // 2. Resolve Base Unit
        int baseUnitId = req.BaseUnitId ?? 0;
        if (baseUnitId <= 0)
        {
            var uomName = !string.IsNullOrWhiteSpace(req.Uom) ? req.Uom.Trim() : "Cái";
            var unit = await _context.MstUnits
                .FirstOrDefaultAsync(u => (u.UnitName != null && u.UnitName.ToLower() == uomName.ToLower()) ||
                                          (u.Abbreviation != null && u.Abbreviation.ToLower() == uomName.ToLower()), cancellationToken);

            if (unit == null)
            {
                unit = new MstUnit
                {
                    UnitName = uomName,
                    Abbreviation = uomName.Length > 10 ? uomName[..10] : uomName
                };
                await _context.MstUnits.AddAsync(unit, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }
            baseUnitId = unit.UnitId;
        }

        // 3. Create Product
        var product = new MstProduct
        {
            ProductCode = codeNormalized,
            ProductName = req.Name.Trim(),
            CategoryId = categoryId,
            BaseUnitId = baseUnitId,
            ProductType = string.IsNullOrWhiteSpace(req.Type) ? "FINISHED" : req.Type.Trim().ToUpper(),
            Description = req.Description?.Trim(),
            ReorderPoint = req.ReorderPoint ?? 10m,
            MovingAverageCost = req.CostPrice ?? 0m,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _context.MstProducts.AddAsync(product, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // 4. Initial Stock balance if provided
        decimal initialStockQty = 0;
        if (req.InitialStock.HasValue && req.InitialStock.Value > 0)
        {
            int warehouseId = req.InitialWarehouseId ?? 0;
            if (warehouseId <= 0)
            {
                var firstWarehouse = await _context.MstWarehouses.FirstOrDefaultAsync(cancellationToken);
                warehouseId = firstWarehouse?.WarehouseId ?? 1;
            }

            var balance = new TrxInventoryBalance
            {
                ProductId = product.ProductId,
                WarehouseId = warehouseId,
                Quantity = req.InitialStock.Value,
                UnitCost = req.CostPrice ?? 0m,
                LastUpdated = DateTime.UtcNow
            };
            await _context.TrxInventoryBalances.AddAsync(balance, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            initialStockQty = req.InitialStock.Value;
        }

        // 5. Query loaded entity for DTO
        var createdProduct = await _context.MstProducts
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .FirstAsync(p => p.ProductId == product.ProductId, cancellationToken);

        var costPrice = createdProduct.MovingAverageCost ?? 0;
        var standardPrice = req.StandardPrice ?? (costPrice > 0 ? Math.Round(costPrice * 1.35m, 0) : 0);

        var dto = new ProductDto(
            Id: createdProduct.ProductId.ToString(),
            ProductId: createdProduct.ProductId,
            Code: createdProduct.ProductCode ?? codeNormalized,
            Name: createdProduct.ProductName ?? "",
            Type: createdProduct.ProductType ?? "FINISHED",
            CategoryId: createdProduct.CategoryId,
            CategoryName: createdProduct.Category?.CategoryName ?? "Chung",
            BaseUnitId: createdProduct.BaseUnitId,
            Uom: createdProduct.BaseUnit?.UnitName ?? createdProduct.BaseUnit?.Abbreviation ?? "Cái",
            StandardPrice: standardPrice,
            CostPrice: costPrice,
            ReorderPoint: createdProduct.ReorderPoint ?? 0,
            StockQuantity: initialStockQty,
            Status: "ACTIVE",
            Description: createdProduct.Description,
            CreatedAt: createdProduct.CreatedAt
        );

        return Result.Success(dto);
    }
}
