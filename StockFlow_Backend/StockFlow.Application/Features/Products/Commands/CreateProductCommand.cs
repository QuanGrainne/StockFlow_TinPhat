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
    private readonly ICurrentUserService _currentUserService;

    public CreateProductCommandHandler(
        IStockFlowDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ProductDto>> Handle(CreateProductCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        string codeNormalized;
        var rawCode = req.Code?.Trim();

        if (string.IsNullOrWhiteSpace(rawCode) || rawCode.Equals("Tự động", StringComparison.OrdinalIgnoreCase) || rawCode.Equals("AUTO", StringComparison.OrdinalIgnoreCase))
        {
            var existingCodes = await _context.MstProducts
                .Where(p => p.ProductCode != null && p.ProductCode.StartsWith("SP"))
                .Select(p => p.ProductCode!)
                .ToListAsync(cancellationToken);

            int maxNum = 0;
            foreach (var c in existingCodes)
            {
                var match = System.Text.RegularExpressions.Regex.Match(c, @"^SP(\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var n))
                {
                    if (n > maxNum) maxNum = n;
                }
            }

            int nextNum = maxNum > 0 ? maxNum + 1 : 1;
            codeNormalized = $"SP{nextNum:D6}";

            while (await _context.MstProducts.AnyAsync(p => p.ProductCode == codeNormalized, cancellationToken))
            {
                nextNum++;
                codeNormalized = $"SP{nextNum:D6}";
            }
        }
        else
        {
            codeNormalized = rawCode.ToUpper();
            var exists = await _context.MstProducts
                .AnyAsync(p => p.ProductCode == codeNormalized, cancellationToken);

            if (exists)
            {
                return Result.Failure<ProductDto>($"Mã hàng hóa '{req.Code}' đã tồn tại trong hệ thống.");
            }
        }

        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return Result.Failure<ProductDto>("Tên hàng hóa không được để trống.");
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
        var minSafeStock = req.MinSafeStock ?? req.ReorderPoint ?? 0m;
        var standardPrice = req.StandardPrice ?? (req.CostPrice.HasValue && req.CostPrice.Value > 0 ? Math.Round(req.CostPrice.Value * 1.35m, 0) : 0m);

        string? variantsJson = req.VariantsJson;
        if (string.IsNullOrEmpty(variantsJson) && (req.Variants != null || req.Units != null || req.Attributes != null || !string.IsNullOrWhiteSpace(req.Supplier)))
        {
            variantsJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                units = req.Units,
                attributes = req.Attributes,
                variants = req.Variants,
                supplier = req.Supplier?.Trim()
            });
        }

        var product = new MstProduct
        {
            ProductCode = codeNormalized,
            ProductName = req.Name.Trim(),
            CategoryId = categoryId,
            BaseUnitId = baseUnitId,
            ProductType = string.IsNullOrWhiteSpace(req.Type) ? "FINISHED" : req.Type.Trim().ToUpper(),
            Description = req.Description?.Trim(),
            ReorderPoint = minSafeStock,
            MinSafeStock = minSafeStock,
            MaxSafeStock = req.MaxSafeStock ?? 999999999m,
            MovingAverageCost = req.CostPrice ?? 0m,
            StandardPrice = standardPrice,
            Barcode = req.Barcode?.Trim(),
            Brand = req.Brand?.Trim(),
            Weight = req.Weight,
            Dimensions = req.Dimensions?.Trim(),
            LocationName = req.LocationName?.Trim(),
            IsDirectSale = req.IsDirectSale ?? true,
            HasRewardPoints = req.HasRewardPoints ?? true,
            ImageUrl = req.ImageUrl?.Trim(),
            VariantsJson = variantsJson,
            IsActive = true,
            CreatedAt = req.CreatedAt ?? DateTime.UtcNow
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

            // Kiểm tra phân quyền truy cập kho đối với tài khoản nhân sự
            if (_currentUserService.IsAuthenticated && !_currentUserService.IsAdmin)
            {
                var hasAccess = await _currentUserService.HasWarehouseAccessAsync(warehouseId, cancellationToken);
                if (!hasAccess)
                {
                    return Result.Failure<ProductDto>($"Bạn không có quyền nhập tồn kho ban đầu vào kho ID {warehouseId}.");
                }
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
            StandardPrice: createdProduct.StandardPrice ?? standardPrice,
            CostPrice: costPrice,
            ReorderPoint: createdProduct.ReorderPoint ?? 0,
            StockQuantity: initialStockQty,
            Status: "ACTIVE",
            Barcode: createdProduct.Barcode,
            Brand: createdProduct.Brand,
            MinSafeStock: createdProduct.MinSafeStock,
            MaxSafeStock: createdProduct.MaxSafeStock,
            Weight: createdProduct.Weight,
            Dimensions: createdProduct.Dimensions,
            LocationName: createdProduct.LocationName,
            IsDirectSale: createdProduct.IsDirectSale,
            HasRewardPoints: createdProduct.HasRewardPoints,
            ImageUrl: createdProduct.ImageUrl,
            VariantsJson: createdProduct.VariantsJson,
            Description: createdProduct.Description,
            CreatedAt: createdProduct.CreatedAt,
            Supplier: req.Supplier?.Trim()
        );

        return Result.Success(dto);
    }
}
