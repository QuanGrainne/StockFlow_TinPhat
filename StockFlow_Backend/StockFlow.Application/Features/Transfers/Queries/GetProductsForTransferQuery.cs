using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Transfers.DTOs;

namespace StockFlow.Application.Features.Transfers.Queries;

public record GetProductsForTransferQuery(
    int SourceWarehouseId,
    int? DestWarehouseId = null,
    string? Search = null
) : IRequest<Result<List<ProductWithStockDto>>>;

public class GetProductsForTransferQueryHandler : IRequestHandler<GetProductsForTransferQuery, Result<List<ProductWithStockDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductsForTransferQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ProductWithStockDto>>> Handle(GetProductsForTransferQuery request, CancellationToken cancellationToken)
    {
        var productQuery = _context.MstProducts
            .Include(p => p.BaseUnit)
            .Where(p => p.IsActive != false)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            productQuery = productQuery.Where(p =>
                (p.ProductCode != null && p.ProductCode.ToLower().Contains(term)) ||
                (p.ProductName != null && p.ProductName.ToLower().Contains(term)) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(term)));
        }

        var products = await productQuery
            .OrderBy(p => p.ProductName)
            .Take(50)
            .ToListAsync(cancellationToken);

        var productIds = products.Select(p => p.ProductId).ToList();

        // Lấy tồn kho 2 đầu
        var warehouseIds = new List<int> { request.SourceWarehouseId };
        if (request.DestWarehouseId.HasValue && request.DestWarehouseId.Value > 0)
        {
            warehouseIds.Add(request.DestWarehouseId.Value);
        }

        var stockBalances = await _context.TrxInventoryBalances
            .Where(b => warehouseIds.Contains(b.WarehouseId) && productIds.Contains(b.ProductId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var result = products.Select(p =>
        {
            var sourceStock = stockBalances
                .Where(b => b.WarehouseId == request.SourceWarehouseId && b.ProductId == p.ProductId)
                .Sum(b => b.Quantity ?? 0);

            var destStock = request.DestWarehouseId.HasValue
                ? stockBalances
                    .Where(b => b.WarehouseId == request.DestWarehouseId.Value && b.ProductId == p.ProductId)
                    .Sum(b => b.Quantity ?? 0)
                : 0;

            return new ProductWithStockDto(
                ProductId: p.ProductId,
                ProductCode: p.ProductCode ?? $"SP-{p.ProductId}",
                ProductName: p.ProductName ?? "Sản phẩm",
                UnitName: p.BaseUnit?.UnitName ?? "Cái",
                CostPrice: p.MovingAverageCost ?? p.StandardPrice ?? 0,
                StandardPrice: p.StandardPrice ?? 0,
                SourceStock: sourceStock,
                DestStock: destStock
            );
        }).ToList();

        return Result.Success(result);
    }
}
