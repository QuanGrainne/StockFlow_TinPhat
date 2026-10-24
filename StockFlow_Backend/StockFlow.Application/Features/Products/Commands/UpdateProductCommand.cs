using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Products.Commands;

public record UpdateProductCommand(int ProductId, UpdateProductRequest Request) : IRequest<Result<ProductDto>>;

public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, Result<ProductDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateProductCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ProductDto>> Handle(UpdateProductCommand command, CancellationToken cancellationToken)
    {
        var product = await _context.MstProducts
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.TrxInventoryBalances)
            .FirstOrDefaultAsync(p => p.ProductId == command.ProductId, cancellationToken);

        if (product == null)
        {
            return Result.Failure<ProductDto>("Không tìm thấy thông tin hàng hóa.");
        }

        var req = command.Request;

        // Code update check
        if (!string.IsNullOrWhiteSpace(req.Code))
        {
            var newCode = req.Code.Trim().ToUpper();
            if (newCode != product.ProductCode)
            {
                var codeExists = await _context.MstProducts
                    .AnyAsync(p => p.ProductId != product.ProductId && p.ProductCode == newCode, cancellationToken);

                if (codeExists)
                {
                    return Result.Failure<ProductDto>($"Mã hàng hóa '{req.Code}' đã được sử dụng.");
                }
                product.ProductCode = newCode;
            }
        }

        if (!string.IsNullOrWhiteSpace(req.Name))
        {
            product.ProductName = req.Name.Trim();
        }

        if (!string.IsNullOrWhiteSpace(req.Type))
        {
            product.ProductType = req.Type.Trim().ToUpper();
        }

        if (req.CategoryId.HasValue && req.CategoryId.Value > 0)
        {
            product.CategoryId = req.CategoryId.Value;
        }

        if (req.BaseUnitId.HasValue && req.BaseUnitId.Value > 0)
        {
            product.BaseUnitId = req.BaseUnitId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(req.Uom))
        {
            var uomName = req.Uom.Trim();
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
            product.BaseUnitId = unit.UnitId;
        }

        if (req.CostPrice.HasValue)
        {
            product.MovingAverageCost = req.CostPrice.Value;
        }

        if (req.StandardPrice.HasValue)
        {
            product.StandardPrice = req.StandardPrice.Value;
        }

        if (req.MinSafeStock.HasValue)
        {
            product.MinSafeStock = req.MinSafeStock.Value;
            product.ReorderPoint = req.MinSafeStock.Value;
        }
        else if (req.ReorderPoint.HasValue)
        {
            product.ReorderPoint = req.ReorderPoint.Value;
            product.MinSafeStock = req.ReorderPoint.Value;
        }

        if (req.MaxSafeStock.HasValue)
        {
            product.MaxSafeStock = req.MaxSafeStock.Value;
        }

        if (req.Barcode != null)
        {
            product.Barcode = req.Barcode.Trim();
        }

        if (req.Brand != null)
        {
            product.Brand = req.Brand.Trim();
        }

        if (req.Weight.HasValue)
        {
            product.Weight = req.Weight.Value;
        }

        if (req.Dimensions != null)
        {
            product.Dimensions = req.Dimensions.Trim();
        }

        if (req.LocationName != null)
        {
            product.LocationName = req.LocationName.Trim();
        }

        if (req.IsDirectSale.HasValue)
        {
            product.IsDirectSale = req.IsDirectSale.Value;
        }

        if (req.HasRewardPoints.HasValue)
        {
            product.HasRewardPoints = req.HasRewardPoints.Value;
        }

        if (req.ImageUrl != null)
        {
            product.ImageUrl = req.ImageUrl.Trim();
        }

        if (!string.IsNullOrEmpty(req.VariantsJson))
        {
            product.VariantsJson = req.VariantsJson;
        }
        else if (req.Variants != null || req.Units != null || req.Attributes != null || req.Supplier != null)
        {
            var units = req.Units;
            var attributes = req.Attributes;
            var variants = req.Variants;
            string? supplierToSave = req.Supplier?.Trim();

            if (!string.IsNullOrEmpty(product.VariantsJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(product.VariantsJson);
                    var root = doc.RootElement;
                    if (units == null && root.TryGetProperty("units", out var uEl))
                    {
                        units = System.Text.Json.JsonSerializer.Deserialize<List<ProductConversionUnitDto>>(uEl.GetRawText());
                    }
                    if (attributes == null && root.TryGetProperty("attributes", out var aEl))
                    {
                        attributes = System.Text.Json.JsonSerializer.Deserialize<List<ProductAttributeDto>>(aEl.GetRawText());
                    }
                    if (variants == null && root.TryGetProperty("variants", out var vEl))
                    {
                        variants = System.Text.Json.JsonSerializer.Deserialize<List<ProductVariantItemDto>>(vEl.GetRawText());
                    }
                    if (req.Supplier == null && root.TryGetProperty("supplier", out var supEl))
                    {
                        supplierToSave = supEl.GetString();
                    }
                }
                catch { }
            }

            product.VariantsJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                units = units,
                attributes = attributes,
                variants = variants,
                supplier = supplierToSave
            });
        }

        if (req.Description != null)
        {
            product.Description = req.Description.Trim();
        }

        if (req.IsActive.HasValue)
        {
            product.IsActive = req.IsActive.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Reload fresh navigations
        var updatedProduct = await _context.MstProducts
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.TrxInventoryBalances)
            .FirstAsync(p => p.ProductId == product.ProductId, cancellationToken);

        var costPrice = updatedProduct.MovingAverageCost ?? 0;
        var standardPrice = updatedProduct.StandardPrice ?? (costPrice > 0 ? Math.Round(costPrice * 1.35m, 0) : 0);
        var totalStock = updatedProduct.TrxInventoryBalances.Sum(b => b.Quantity ?? 0);

        string? resolvedSupplier = null;
        if (!string.IsNullOrEmpty(updatedProduct.VariantsJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(updatedProduct.VariantsJson);
                if (doc.RootElement.TryGetProperty("supplier", out var supEl))
                {
                    resolvedSupplier = supEl.GetString();
                }
            }
            catch { }
        }
        if (string.IsNullOrEmpty(resolvedSupplier))
        {
            resolvedSupplier = req.Supplier?.Trim();
        }

        var dto = new ProductDto(
            Id: updatedProduct.ProductId.ToString(),
            ProductId: updatedProduct.ProductId,
            Code: updatedProduct.ProductCode ?? "",
            Name: updatedProduct.ProductName ?? "",
            Type: updatedProduct.ProductType ?? "FINISHED",
            CategoryId: updatedProduct.CategoryId,
            CategoryName: updatedProduct.Category?.CategoryName ?? "Chung",
            BaseUnitId: updatedProduct.BaseUnitId,
            Uom: updatedProduct.BaseUnit?.UnitName ?? updatedProduct.BaseUnit?.Abbreviation ?? "Cái",
            StandardPrice: standardPrice,
            CostPrice: costPrice,
            ReorderPoint: updatedProduct.ReorderPoint ?? 0,
            StockQuantity: totalStock,
            Status: updatedProduct.IsActive != false ? "ACTIVE" : "INACTIVE",
            Barcode: updatedProduct.Barcode,
            Brand: updatedProduct.Brand,
            MinSafeStock: updatedProduct.MinSafeStock,
            MaxSafeStock: updatedProduct.MaxSafeStock,
            Weight: updatedProduct.Weight,
            Dimensions: updatedProduct.Dimensions,
            LocationName: updatedProduct.LocationName,
            IsDirectSale: updatedProduct.IsDirectSale,
            HasRewardPoints: updatedProduct.HasRewardPoints,
            ImageUrl: updatedProduct.ImageUrl,
            VariantsJson: updatedProduct.VariantsJson,
            Description: updatedProduct.Description,
            CreatedAt: updatedProduct.CreatedAt,
            Supplier: resolvedSupplier
        );

        return Result.Success(dto);
    }
}
