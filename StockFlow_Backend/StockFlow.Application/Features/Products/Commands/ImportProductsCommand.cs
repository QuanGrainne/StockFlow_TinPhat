using System.Collections.Concurrent;
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
    /// <summary>Số ảnh tải song song khi import (đủ nhanh cho lô ~100 hàng, không làm nghẽn VPS 2 core).</summary>
    private const int ImageDownloadParallelism = 6;

    private readonly IStockFlowDbContext _context;
    private readonly IImageStorage _imageStorage;

    public ImportProductsCommandHandler(IStockFlowDbContext context, IImageStorage imageStorage)
    {
        _context = context;
        _imageStorage = imageStorage;
    }

    public async Task<Result<ImportProductsResultDto>> Handle(ImportProductsCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        if (req.Products == null || req.Products.Count == 0)
        {
            return Result.Failure<ImportProductsResultDto>("Danh sách sản phẩm import trống.");
        }

        // 1. Resolve target warehouse
        // Kho theo tên / mã gửi lên; không gửi hoặc không khớp thì lấy kho đang hoạt động đầu tiên
        // (trước đây không khớp thì rơi về id cứng = 1, có thể là kho đã ngừng hoạt động).
        int? resolvedWarehouseId = null;
        if (!string.IsNullOrWhiteSpace(req.TargetWarehouse))
        {
            var target = req.TargetWarehouse.Trim().ToLower();
            resolvedWarehouseId = await _context.MstWarehouses
                .Where(w => (w.WarehouseName != null && w.WarehouseName.ToLower() == target) ||
                            (w.WarehouseCode != null && w.WarehouseCode.ToLower() == target))
                .OrderByDescending(w => w.IsActive != false)
                .Select(w => (int?)w.WarehouseId)
                .FirstOrDefaultAsync(cancellationToken);
        }
        resolvedWarehouseId ??= await _context.MstWarehouses
            .Where(w => w.IsActive != false)
            .OrderBy(w => w.WarehouseId)
            .Select(w => (int?)w.WarehouseId)
            .FirstOrDefaultAsync(cancellationToken);
        if (resolvedWarehouseId == null)
        {
            return Result.Failure<ImportProductsResultDto>("Chưa có kho nào đang hoạt động để nhập tồn kho.");
        }
        var defaultWarehouseId = resolvedWarehouseId.Value;

        // Tải ảnh (link KiotViet...) về máy chủ TRƯỚC khi ghi DB, để hàng không phụ thuộc ảnh bên ngoài.
        // Link trùng nhau chỉ tải một lần; link lỗi thì giữ nguyên link gốc và báo trong kết quả.
        var images = await StoreImportImagesAsync(req.Products, cancellationToken);
        string? ResolveImage(string? raw) =>
            raw?.Trim() is { Length: > 0 } key && images.TryGetValue(key, out var stored) && !stored.Rejected
                ? stored.Url
                : null;

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

                // Import lại lô cũ: thay ảnh khi hàng chưa có ảnh lưu trên máy chủ (trống, link ngoài hoặc base64 cũ)
                var importedImage = ResolveImage(pReq.ImageUrl);
                if (!string.IsNullOrEmpty(importedImage)
                    && (string.IsNullOrWhiteSpace(existingProduct.ImageUrl)
                        || !existingProduct.ImageUrl.StartsWith(IImageStorage.PublicPathPrefix + "/", StringComparison.OrdinalIgnoreCase)))
                {
                    existingProduct.ImageUrl = importedImage;
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
                    ImageUrl = ResolveImage(pReq.ImageUrl),
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

        var message = $"Nhập thành công {importedCount} sản phẩm mới và cập nhật {updatedCount} sản phẩm.";
        var failedImages = images.Values.Count(r => r.Error != null);
        if (failedImages > 0)
        {
            message += $" {failedImages} ảnh không tải được về máy chủ (vẫn giữ link gốc); có thể tải ảnh lên lại ở màn Sửa hàng hóa.";
        }

        return Result.Success(new ImportProductsResultDto
        {
            ImportedCount = importedCount,
            UpdatedCount = updatedCount,
            TotalCount = importedCount + updatedCount,
            Message = message
        });
    }

    /// <summary>Tải song song các ảnh khác nhau trong file import; trả về bảng "giá trị gốc → kết quả lưu".</summary>
    private async Task<Dictionary<string, ImageStoreResult>> StoreImportImagesAsync(
        IEnumerable<ImportProductItemRequest> products, CancellationToken cancellationToken)
    {
        var distinctValues = products
            .Select(p => p.ImageUrl?.Trim())
            .Where(v => !string.IsNullOrEmpty(v))
            .Select(v => v!)
            .Distinct()
            .ToList();

        var results = new ConcurrentDictionary<string, ImageStoreResult>();
        await Parallel.ForEachAsync(
            distinctValues,
            new ParallelOptions { MaxDegreeOfParallelism = ImageDownloadParallelism, CancellationToken = cancellationToken },
            async (value, token) => results[value] = await _imageStorage.StoreAsync(value, token));

        return new Dictionary<string, ImageStoreResult>(results);
    }
}

