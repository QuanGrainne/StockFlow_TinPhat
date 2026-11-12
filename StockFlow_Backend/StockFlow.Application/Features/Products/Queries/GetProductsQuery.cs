using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Application.Features.Products.Helpers;

namespace StockFlow.Application.Features.Products.Queries;

public record GetProductsQuery(
    string? Search = null,
    string? Type = null,
    int? CategoryId = null,
    int? WarehouseId = null,
    bool? LowStockOnly = null,
    string? Status = null
) : IRequest<Result<List<ProductDto>>>;

public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, Result<List<ProductDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetProductsQueryHandler(
        IStockFlowDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<ProductDto>>> Handle(GetProductsQuery query, CancellationToken cancellationToken)
    {
        // Kiểm tra phân quyền truy cập kho nếu query chỉ định WarehouseId cụ thể
        if (query.WarehouseId.HasValue && query.WarehouseId.Value > 0)
        {
            if (_currentUserService.IsAuthenticated)
            {
                var hasAccess = await _currentUserService.HasWarehouseAccessAsync(query.WarehouseId.Value, cancellationToken);
                if (!hasAccess)
                {
                    return Result.Failure<List<ProductDto>>("Bạn không có quyền truy cập dữ liệu của kho này.");
                }
            }
        }

        var productsQuery = _context.MstProducts
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.TrxInventoryBalances)
                .ThenInclude(b => b.Warehouse)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower().Trim();
            productsQuery = productsQuery.Where(p =>
                (p.ProductCode != null && p.ProductCode.ToLower().Contains(s)) ||
                (p.ProductName != null && p.ProductName.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(query.Type) && query.Type != "ALL")
        {
            var t = query.Type.Trim();
            productsQuery = productsQuery.Where(p => p.ProductType != null && p.ProductType.ToUpper() == t.ToUpper());
        }

        if (query.CategoryId.HasValue && query.CategoryId.Value > 0)
        {
            productsQuery = productsQuery.Where(p => p.CategoryId == query.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && query.Status != "ALL")
        {
            if (query.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase))
                productsQuery = productsQuery.Where(p => p.IsActive != false); // NULL coi như đang kinh doanh (khớp Status hiển thị)
            else if (query.Status.Equals("INACTIVE", StringComparison.OrdinalIgnoreCase) || query.Status.Equals("LOCKED", StringComparison.OrdinalIgnoreCase))
                productsQuery = productsQuery.Where(p => p.IsActive == false);
        }

        var products = await productsQuery.OrderBy(p => p.ProductId).ToListAsync(cancellationToken);

        // Lấy danh sách ID kho được cấp quyền nếu là tài khoản nhân sự
        IReadOnlyList<int>? authorizedWarehouseIds = null;
        if (_currentUserService.IsAuthenticated)
        {
            authorizedWarehouseIds = await _currentUserService.GetAuthorizedWarehouseIdsAsync(cancellationToken);
        }

        var supplierMap = await ProductSupplierLookup.GetSupplierNamesAsync(
            _context, products.Select(p => p.ProductId).ToList(), cancellationToken);

        // Khách đặt theo kho (đơn đặt hàng còn mở, chưa giao)
        var reservedMap = await SalesBookingOps.ReservedByWarehouseAsync(_context, products.Select(p => p.ProductId).ToList(), cancellationToken);

        var result = products.Select(p =>
        {
            decimal stockQty;
            if (query.WarehouseId.HasValue && query.WarehouseId.Value > 0)
            {
                stockQty = p.TrxInventoryBalances
                    .Where(b => b.WarehouseId == query.WarehouseId.Value)
                    .Sum(b => b.Quantity ?? 0);
            }
            else if (authorizedWarehouseIds != null)
            {
                // Cách ly dữ liệu: Nhân viên chỉ nhìn thấy tổng tồn trên các kho được phân quyền
                stockQty = p.TrxInventoryBalances
                    .Where(b => authorizedWarehouseIds.Contains(b.WarehouseId))
                    .Sum(b => b.Quantity ?? 0);
            }
            else
            {
                stockQty = p.TrxInventoryBalances.Sum(b => b.Quantity ?? 0);
            }

            var costPrice = p.MovingAverageCost ?? 0;
            var standardPrice = p.StandardPrice ?? (costPrice > 0 ? Math.Round(costPrice * 1.35m, 0) : 0);

            // Nhà cung cấp: tính từ các phiếu nhập đã hoàn thành (chỉ đọc)
            var supplier = supplierMap.GetValueOrDefault(p.ProductId);

            var warehouseStocks = p.TrxInventoryBalances
                .GroupBy(b => b.WarehouseId)
                .Select(g =>
                {
                    var first = g.First();
                    return new ProductWarehouseStockDto(
                        WarehouseId: g.Key,
                        WarehouseCode: first.Warehouse?.WarehouseCode ?? $"WH-{g.Key}",
                        WarehouseName: first.Warehouse?.WarehouseName ?? $"Kho #{g.Key}",
                        Quantity: g.Sum(x => x.Quantity ?? 0),
                        UnitCost: g.Average(x => x.UnitCost ?? costPrice),
                        ReservedQuantity: reservedMap.GetValueOrDefault((g.Key, p.ProductId))
                    );
                }).ToList();

            if (authorizedWarehouseIds != null)
            {
                warehouseStocks = warehouseStocks.Where(w => authorizedWarehouseIds.Contains(w.WarehouseId)).ToList();
            }

            return new ProductDto(
                Id: p.ProductId.ToString(),
                ProductId: p.ProductId,
                Code: p.ProductCode ?? $"PROD-{p.ProductId:D3}",
                Name: p.ProductName ?? "",
                Type: p.ProductType ?? "FINISHED",
                CategoryId: p.CategoryId,
                CategoryName: p.Category?.CategoryName ?? "Chung",
                BaseUnitId: p.BaseUnitId,
                Uom: p.BaseUnit?.UnitName ?? p.BaseUnit?.Abbreviation ?? "Cái",
                StandardPrice: standardPrice,
                CostPrice: costPrice,
                ReorderPoint: p.ReorderPoint ?? 0,
                StockQuantity: stockQty,
                Status: p.IsActive != false ? "ACTIVE" : "INACTIVE",
                Barcode: p.Barcode,
                Brand: p.Brand,
                MinSafeStock: p.MinSafeStock,
                MaxSafeStock: p.MaxSafeStock,
                Weight: p.Weight,
                Dimensions: p.Dimensions,
                LocationName: p.LocationName,
                IsDirectSale: p.IsDirectSale,
                HasRewardPoints: p.HasRewardPoints,
                ImageUrl: p.ImageUrl,
                VariantsJson: p.VariantsJson,
                Description: p.Description,
                CreatedAt: p.CreatedAt,
                Supplier: supplier,
                Warehouses: warehouseStocks
            );
        }).ToList();

        if (query.LowStockOnly == true)
        {
            result = result.Where(r => r.StockQuantity <= r.ReorderPoint).ToList();
        }

        return Result.Success(result);
    }
}
