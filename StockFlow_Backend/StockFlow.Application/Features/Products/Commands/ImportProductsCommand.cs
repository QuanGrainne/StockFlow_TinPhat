using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Products.Commands;

public record ImportProductsCommand(ImportProductsRequest Request) : IRequest<Result<ImportProductsResultDto>>;

public class ImportProductsCommandHandler : IRequestHandler<ImportProductsCommand, Result<ImportProductsResultDto>>
{
    private readonly IStockFlowDbContext _context;

    public ImportProductsCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ImportProductsResultDto>> Handle(ImportProductsCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        if (req.Products == null || req.Products.Count == 0)
        {
            return Result.Failure<ImportProductsResultDto>("Danh sách sản phẩm import trống.");
        }

        // 1. Resolve target warehouse
        int defaultWarehouseId = 1;
        if (!string.IsNullOrWhiteSpace(req.TargetWarehouse))
        {
            var matchedWh = await _context.MstWarehouses
                .FirstOrDefaultAsync(w => (w.WarehouseName != null && w.WarehouseName.ToLower() == req.TargetWarehouse.ToLower()) ||
                                          (w.WarehouseCode != null && w.WarehouseCode.ToLower() == req.TargetWarehouse.ToLower()), cancellationToken);
            if (matchedWh != null)
            {
                defaultWarehouseId = matchedWh.WarehouseId;
            }
        }
        else
        {
            var firstWh = await _context.MstWarehouses.FirstOrDefaultAsync(w => w.IsActive != false, cancellationToken);
            if (firstWh != null)
            {
                defaultWarehouseId = firstWh.WarehouseId;
            }
        }

        int importedCount = 0;
        int updatedCount = 0;

        // Preload categories and units into memory for fast lookup
        var categories = await _context.MstProductCategories.ToListAsync(cancellationToken);
        var units = await _context.MstUnits.ToListAsync(cancellationToken);

        for (int i = 0; i < req.Products.Count; i++)
        {
            var pReq = req.Products[i];
            if (string.IsNullOrWhiteSpace(pReq.Name) && string.IsNullOrWhiteSpace(pReq.Code))
            {
                continue;
            }

            var code = !string.IsNullOrWhiteSpace(pReq.Code) ? pReq.Code.Trim().ToUpper() : $"SP{DateTime.UtcNow.Ticks + i}";
            var name = !string.IsNullOrWhiteSpace(pReq.Name) ? pReq.Name.Trim() : code;

            // Check if product already exists
            var existingProduct = await _context.MstProducts
                .Include(p => p.Category)
                .Include(p => p.BaseUnit)
                .Include(p => p.TrxInventoryBalances)
                .FirstOrDefaultAsync(p => p.ProductCode == code, cancellationToken);

            if (existingProduct != null)
            {
                if (req.DuplicateCodeAction.Equals("ERROR", StringComparison.OrdinalIgnoreCase))
                {
                    if (existingProduct.ProductName?.Trim().ToLower() != name.ToLower())
                    {
                        return Result.Failure<ImportProductsResultDto>($"Dòng {i + 1}: Trùng mã hàng '{code}' nhưng khác tên hàng hóa ('{existingProduct.ProductName}' vs '{name}').");
                    }
                }

                // Update existing product
                if (req.DuplicateCodeAction.Equals("REPLACE_NAME", StringComparison.OrdinalIgnoreCase))
                {
                    existingProduct.ProductName = name;
                }

                if (req.UpdateCostPrice && pReq.CostPrice.HasValue)
                {
                    existingProduct.MovingAverageCost = pReq.CostPrice.Value;
                }

                if (pReq.StandardPrice.HasValue)
                {
                    existingProduct.StandardPrice = pReq.StandardPrice.Value;
                }

                if (req.UpdateDescription && !string.IsNullOrWhiteSpace(pReq.Description))
                {
                    existingProduct.Description = pReq.Description.Trim();
                }

                if (!string.IsNullOrWhiteSpace(pReq.Brand))
                {
                    existingProduct.Brand = pReq.Brand.Trim();
                }

                if (!string.IsNullOrWhiteSpace(pReq.LocationName))
                {
                    existingProduct.LocationName = pReq.LocationName.Trim();
                }

                if (pReq.Weight.HasValue)
                {
                    existingProduct.Weight = pReq.Weight.Value;
                }

                if (req.UpdateStock && pReq.StockQuantity.HasValue)
                {
                    var balance = existingProduct.TrxInventoryBalances.FirstOrDefault(b => b.WarehouseId == defaultWarehouseId);
                    if (balance != null)
                    {
                        balance.Quantity = pReq.StockQuantity.Value;
                        if (existingProduct.MovingAverageCost.HasValue)
                        {
                            balance.UnitCost = existingProduct.MovingAverageCost.Value;
                        }
                        balance.LastUpdated = DateTime.UtcNow;
                    }
                    else
                    {
                        await _context.TrxInventoryBalances.AddAsync(new TrxInventoryBalance
                        {
                            ProductId = existingProduct.ProductId,
                            WarehouseId = defaultWarehouseId,
                            Quantity = pReq.StockQuantity.Value,
                            UnitCost = existingProduct.MovingAverageCost ?? 0,
                            LastUpdated = DateTime.UtcNow
                        }, cancellationToken);
                    }
                }

                updatedCount++;
            }
            else
            {
                // Create New Product
                // Resolve Category
                var catName = !string.IsNullOrWhiteSpace(pReq.CategoryName) ? pReq.CategoryName.Trim() : "Hàng hóa";
                var category = categories.FirstOrDefault(c => c.CategoryName != null && c.CategoryName.Equals(catName, StringComparison.OrdinalIgnoreCase));
                if (category == null)
                {
                    category = new MstProductCategory
                    {
                        CategoryName = catName,
                        Description = $"Nhóm hàng {catName}",
                        IsActive = true
                    };
                    await _context.MstProductCategories.AddAsync(category, cancellationToken);
                    await _context.SaveChangesAsync(cancellationToken);
                    categories.Add(category);
                }

                // Resolve Unit
                var uomName = !string.IsNullOrWhiteSpace(pReq.Uom) ? pReq.Uom.Trim() : "Cái";
                var unit = units.FirstOrDefault(u => (u.UnitName != null && u.UnitName.Equals(uomName, StringComparison.OrdinalIgnoreCase)) ||
                                                     (u.Abbreviation != null && u.Abbreviation.Equals(uomName, StringComparison.OrdinalIgnoreCase)));
                if (unit == null)
                {
                    unit = new MstUnit
                    {
                        UnitName = uomName,
                        Abbreviation = uomName.Length > 10 ? uomName[..10] : uomName
                    };
                    await _context.MstUnits.AddAsync(unit, cancellationToken);
                    await _context.SaveChangesAsync(cancellationToken);
                    units.Add(unit);
                }

                var productType = (catName.Contains("Nguyên vật liệu", StringComparison.OrdinalIgnoreCase) ||
                                  (pReq.Type != null && pReq.Type.Contains("RAW", StringComparison.OrdinalIgnoreCase)))
                                  ? "RAW_MATERIAL" : "FINISHED";

                var newProduct = new MstProduct
                {
                    ProductCode = code,
                    ProductName = name,
                    CategoryId = category.CategoryId,
                    BaseUnitId = unit.UnitId,
                    ProductType = productType,
                    StandardPrice = pReq.StandardPrice ?? 0,
                    MovingAverageCost = pReq.CostPrice ?? 0,
                    MinSafeStock = pReq.MinSafeStock ?? 0,
                    MaxSafeStock = pReq.MaxSafeStock ?? 999999999,
                    Barcode = !string.IsNullOrWhiteSpace(pReq.Barcode) ? pReq.Barcode.Trim() : code,
                    Brand = pReq.Brand?.Trim(),
                    Description = pReq.Description?.Trim(),
                    Weight = pReq.Weight ?? 0,
                    LocationName = pReq.LocationName?.Trim(),
                    ImageUrl = pReq.ImageUrl?.Trim(),
                    IsDirectSale = pReq.IsDirectSale ?? true,
                    HasRewardPoints = true,
                    IsActive = pReq.IsActive ?? true,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.MstProducts.AddAsync(newProduct, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                // Add inventory balance if stock specified
                var initialQty = pReq.StockQuantity ?? 0;
                await _context.TrxInventoryBalances.AddAsync(new TrxInventoryBalance
                {
                    ProductId = newProduct.ProductId,
                    WarehouseId = defaultWarehouseId,
                    Quantity = initialQty,
                    UnitCost = newProduct.MovingAverageCost ?? 0,
                    LastUpdated = DateTime.UtcNow
                }, cancellationToken);

                importedCount++;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(new ImportProductsResultDto
        {
            ImportedCount = importedCount,
            UpdatedCount = updatedCount,
            TotalCount = importedCount + updatedCount,
            Message = $"Nhập thành công {importedCount} sản phẩm mới và cập nhật {updatedCount} sản phẩm."
        });
    }
}

