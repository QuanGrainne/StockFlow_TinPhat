using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Application.Features.Products.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Products.Commands;

public record UpdateProductCommand(int ProductId, UpdateProductRequest Request) : IRequest<Result<ProductDto>>;

public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, Result<ProductDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IImageStorage _imageStorage;

    public UpdateProductCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser, IImageStorage imageStorage)
    {
        _context = context;
        _currentUser = currentUser;
        _imageStorage = imageStorage;
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

        // Lưu ảnh thành file trước mọi thay đổi (handler có SaveChanges giữa chừng khi tạo nhóm hàng/đơn vị mới)
        ImageStoreResult? image = null;
        if (req.ImageUrl != null)
        {
            image = await _imageStorage.StoreAsync(req.ImageUrl, cancellationToken);
            if (image.Rejected)
            {
                return Result.Failure<ProductDto>(image.Error!);
            }
        }

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
        else if (!string.IsNullOrWhiteSpace(req.CategoryName))
        {
            var defaultCatName = req.CategoryName.Trim();
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
            product.CategoryId = cat.CategoryId;
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
            // Giá vốn hiển thị theo từng kho lấy từ TrxInventoryBalances.UnitCost → phải cập nhật cả các dòng tồn,
            // nếu chỉ sửa MovingAverageCost thì màn hình vẫn hiện giá vốn cũ của kho.
            var newCost = CostingPolicy.RoundCost(Math.Max(0, req.CostPrice.Value));
            var scopeIds = req.CostWarehouseIds?.Where(id => id > 0).Distinct().ToList();
            var applyAll = scopeIds == null || scopeIds.Count == 0;

            // Thẻ kho: mỗi kho có giá vốn thay đổi ghi 1 dòng "Cập nhật giá vốn" (SL 0, tồn cuối = tổng tồn của kho),
            // dùng chung 1 mã CB cho lần sửa này. Giá vốn tính theo cả kho nên mọi dòng tồn (lô / vị trí) cùng nhận giá mới.
            int? costUpdateRef = null;
            var now = VietnamTime.Now;

            foreach (var warehouse in product.TrxInventoryBalances
                         .Where(b => applyAll || scopeIds!.Contains(b.WarehouseId))
                         .GroupBy(b => b.WarehouseId))
            {
                var rows = warehouse.ToList();
                var changed = rows.Any(b => CostingPolicy.RoundCost(b.UnitCost ?? 0) != newCost);
                foreach (var balance in rows)
                {
                    balance.UnitCost = newCost;
                    balance.LastUpdated = now;
                }

                if (changed && _currentUser.UserId.HasValue)
                {
                    costUpdateRef ??= (int)await _context.GetNextSequenceValueAsync("stockflow.seq_cost_update", cancellationToken);
                    _context.TrxInventoryTransactions.Add(new TrxInventoryTransaction
                    {
                        WarehouseId = warehouse.Key,
                        ProductId = product.ProductId,
                        TransactionType = "COST_UPDATE",
                        Quantity = 0,
                        ReferenceType = "COST_UPDATE",
                        ReferenceId = costUpdateRef,
                        TransactionDate = now,
                        CreatedBy = _currentUser.UserId.Value,
                        UnitCost = newCost,
                        BalanceAfter = rows.Sum(b => b.Quantity ?? 0),
                    });
                }
            }

            // Giá vốn chung = bình quân theo SL trên mọi kho (đổi giá vốn tất cả kho thì bằng đúng giá mới)
            product.MovingAverageCost = applyAll
                ? newCost
                : InventoryCosting.CostOf(product.TrxInventoryBalances, newCost);
        }

        if (req.StandardPrice.HasValue)
        {
            product.StandardPrice = req.StandardPrice.Value;

            // Giữ dòng Bảng giá chung (nếu đã có) khớp với Giá bán mới
            var defaultBookItem = await _context.DtlPriceBookItems
                .Where(i => i.ProductId == product.ProductId && i.PriceBook.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);
            if (defaultBookItem != null)
            {
                defaultBookItem.Price = req.StandardPrice.Value;
                defaultBookItem.UpdatedAt = DateTime.UtcNow;
            }
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

        // MRP: thời gian giao 0–365 ngày; ClearLeadTime = true thì về "chưa khai báo"
        if (req.ClearLeadTime == true)
        {
            product.LeadTimeDays = null;
        }
        else if (req.LeadTimeDays.HasValue)
        {
            if (req.LeadTimeDays is < 0 or > ProductLeadTime.MaxDays)
                return Result.Failure<ProductDto>(ProductLeadTime.RangeMessage);
            product.LeadTimeDays = req.LeadTimeDays.Value;
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

        if (image != null)
        {
            product.ImageUrl = image.Url;
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

        if (req.InitialStock.HasValue)
        {
            var targetWhId = req.InitialWarehouseId;
            if (!targetWhId.HasValue || targetWhId.Value <= 0)
            {
                var firstWh = await _context.MstWarehouses.FirstOrDefaultAsync(w => w.IsActive != false, cancellationToken);
                targetWhId = firstWh?.WarehouseId ?? 1;
            }

            var balance = product.TrxInventoryBalances.FirstOrDefault(b => b.WarehouseId == targetWhId.Value);
            if (balance != null)
            {
                balance.Quantity = req.InitialStock.Value;
                if (product.MovingAverageCost.HasValue)
                {
                    balance.UnitCost = product.MovingAverageCost.Value;
                }
            }
            else
            {
                await _context.TrxInventoryBalances.AddAsync(new TrxInventoryBalance
                {
                    ProductId = product.ProductId,
                    WarehouseId = targetWhId.Value,
                    Quantity = req.InitialStock.Value,
                    UnitCost = product.MovingAverageCost ?? 0,
                    LastUpdated = DateTime.UtcNow,
                }, cancellationToken);
            }
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
            Supplier: resolvedSupplier,
            LeadTimeDays: updatedProduct.LeadTimeDays
        );

        return Result.Success(dto);
    }
}
