using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.Services;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Commands;

public record ApplyPriceBookFormulaCommand(
    int PriceBookId,
    List<int>? CategoryIds = null,
    bool AllProducts = false
) : IRequest<Result>;

public class ApplyPriceBookFormulaCommandHandler : IRequestHandler<ApplyPriceBookFormulaCommand, Result>
{
    private readonly IStockFlowDbContext _context;

    public ApplyPriceBookFormulaCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ApplyPriceBookFormulaCommand request, CancellationToken cancellationToken)
    {
        var pb = await _context.MstPriceBooks
            .FirstOrDefaultAsync(p => p.PriceBookId == request.PriceBookId, cancellationToken);

        if (pb == null)
        {
            return Result.Failure("Không tìm thấy bảng giá.");
        }

        if (string.IsNullOrWhiteSpace(pb.FormulaBaseType))
        {
            pb.FormulaBaseType = "STANDARD";
        }

        var productsQuery = _context.MstProducts
            .Include(p => p.TrxInventoryBalances)
            .Where(p => p.IsActive != false);

        if (!request.AllProducts && request.CategoryIds != null && request.CategoryIds.Any())
        {
            productsQuery = productsQuery.Where(p => request.CategoryIds.Contains(p.CategoryId));
        }

        var products = await productsQuery.ToListAsync(cancellationToken);

        int? primaryWarehouseId = null;
        if (!string.IsNullOrWhiteSpace(pb.ScopeWarehouseIds))
        {
            try
            {
                var wIds = JsonSerializer.Deserialize<List<int>>(pb.ScopeWarehouseIds);
                if (wIds != null && wIds.Any()) primaryWarehouseId = wIds.First();
            }
            catch { }
        }

        Dictionary<int, decimal>? baseBookPrices = null;
        if (pb.FormulaBaseType == "PRICE_BOOK" && pb.FormulaBasePriceBookId.HasValue)
        {
            baseBookPrices = await _context.DtlPriceBookItems
                .Where(i => i.PriceBookId == pb.FormulaBasePriceBookId.Value)
                .ToDictionaryAsync(i => i.ProductId, i => i.Price, cancellationToken);
        }

        Dictionary<int, decimal>? latestPurchasePrices = null;
        if (pb.FormulaBaseType == "LATEST_PURCHASE")
        {
            var receiptQuery = _context.DtlGoodsReceiptItems
                .Include(r => r.Gr)
                .Where(r => r.Gr.ReceivedDate != null);

            if (primaryWarehouseId.HasValue)
            {
                receiptQuery = receiptQuery.Where(r => r.Gr.WarehouseId == primaryWarehouseId.Value);
            }

            var latestItems = await receiptQuery
                .OrderByDescending(r => r.Gr.ReceivedDate)
                .Select(r => new { r.ProductId, UnitCost = r.UnitLandedCost ?? 0 })
                .ToListAsync(cancellationToken);

            latestPurchasePrices = latestItems
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.First().UnitCost);
        }

        var existingItems = await _context.DtlPriceBookItems
            .Where(i => i.PriceBookId == pb.PriceBookId)
            .ToListAsync(cancellationToken);

        var existingMap = existingItems.ToDictionary(i => i.ProductId, i => i);

        foreach (var p in products)
        {
            decimal basePrice;
            switch (pb.FormulaBaseType)
            {
                case "COST":
                    if (primaryWarehouseId.HasValue)
                    {
                        var b = p.TrxInventoryBalances.FirstOrDefault(x => x.WarehouseId == primaryWarehouseId.Value);
                        basePrice = b?.UnitCost ?? p.MovingAverageCost ?? 0;
                    }
                    else
                    {
                        basePrice = p.MovingAverageCost ?? 0;
                    }
                    break;

                case "LATEST_PURCHASE":
                    if (latestPurchasePrices != null && latestPurchasePrices.TryGetValue(p.ProductId, out var lp))
                    {
                        basePrice = lp;
                    }
                    else
                    {
                        basePrice = p.MovingAverageCost ?? 0;
                    }
                    break;

                case "PRICE_BOOK":
                    if (baseBookPrices != null && baseBookPrices.TryGetValue(p.ProductId, out var bp))
                    {
                        basePrice = bp;
                    }
                    else
                    {
                        basePrice = p.StandardPrice ?? 0;
                    }
                    break;

                case "STANDARD":
                default:
                    basePrice = p.StandardPrice ?? (p.MovingAverageCost > 0 ? Math.Round(p.MovingAverageCost.Value * 1.35m, 0) : 0);
                    break;
            }

            var calculatedPrice = PriceFormulaCalculator.CalculatePrice(
                basePrice,
                pb.FormulaOperator,
                pb.FormulaValue,
                pb.FormulaUnit
            );

            if (existingMap.TryGetValue(p.ProductId, out var item))
            {
                item.Price = calculatedPrice;
                item.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                await _context.DtlPriceBookItems.AddAsync(new DtlPriceBookItem
                {
                    PriceBookId = pb.PriceBookId,
                    ProductId = p.ProductId,
                    Price = calculatedPrice,
                    UpdatedAt = DateTime.UtcNow
                }, cancellationToken);
            }
        }

        pb.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
