using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Services;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Commands;

public record UpdatePriceBookPricesCommand(
    int PriceBookId,
    List<UpdateProductPriceItemDto> Items
) : IRequest<Result>;

public class UpdatePriceBookPricesCommandHandler : IRequestHandler<UpdatePriceBookPricesCommand, Result>
{
    private readonly IStockFlowDbContext _context;

    public UpdatePriceBookPricesCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdatePriceBookPricesCommand request, CancellationToken cancellationToken)
    {
        if (request.Items == null || !request.Items.Any())
        {
            return Result.Success();
        }

        var pb = await _context.MstPriceBooks
            .FirstOrDefaultAsync(p => p.PriceBookId == request.PriceBookId, cancellationToken);

        if (pb == null)
        {
            return Result.Failure("Không tìm thấy bảng giá.");
        }

        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var existingItems = await _context.DtlPriceBookItems
            .Where(i => i.PriceBookId == request.PriceBookId && productIds.Contains(i.ProductId))
            .ToListAsync(cancellationToken);

        var existingMap = existingItems.ToDictionary(i => i.ProductId, i => i);

        foreach (var item in request.Items)
        {
            var validPrice = Math.Max(0, item.Price);
            if (existingMap.TryGetValue(item.ProductId, out var existing))
            {
                existing.Price = validPrice;
                existing.UpdatedAt = VietnamTime.Now;
            }
            else
            {
                await _context.DtlPriceBookItems.AddAsync(new DtlPriceBookItem
                {
                    PriceBookId = request.PriceBookId,
                    ProductId = item.ProductId,
                    Price = validPrice,
                    UpdatedAt = VietnamTime.Now
                }, cancellationToken);
            }
        }

        pb.UpdatedAt = VietnamTime.Now;

        // Nếu cập nhật Bảng giá chung (hoặc bảng giá mặc định):
        // 1. Đồng bộ giá bán StandardPrice vào bảng MstProducts để toàn bộ hệ thống (danh mục hàng hóa, đơn hàng) nhận giá mới
        // 2. Tự động tính toán lại đơn giá cho các bảng giá khác có công thức dựa trên Giá chung
        if (pb.IsDefault)
        {
            var products = await _context.MstProducts
                .Where(p => productIds.Contains(p.ProductId))
                .ToListAsync(cancellationToken);

            var priceLookup = request.Items.ToDictionary(x => x.ProductId, x => Math.Max(0, x.Price));
            foreach (var prod in products)
            {
                if (priceLookup.TryGetValue(prod.ProductId, out var newStdPrice))
                {
                    prod.StandardPrice = newStdPrice;
                }
            }

            // Tìm các bảng giá phụ thuộc theo công thức
            var dependentBooks = await _context.MstPriceBooks
                .Where(b => b.IsActive && !b.IsDefault &&
                    (b.FormulaBaseType == "STANDARD" ||
                     (b.FormulaBaseType == "PRICE_BOOK" && b.FormulaBasePriceBookId == pb.PriceBookId)))
                .ToListAsync(cancellationToken);

            if (dependentBooks.Any())
            {
                var depBookIds = dependentBooks.Select(b => b.PriceBookId).ToList();
                var depExistingItems = await _context.DtlPriceBookItems
                    .Where(i => depBookIds.Contains(i.PriceBookId) && productIds.Contains(i.ProductId))
                    .ToListAsync(cancellationToken);

                var depItemMap = depExistingItems
                    .GroupBy(i => (i.PriceBookId, i.ProductId))
                    .ToDictionary(g => g.Key, g => g.First());

                foreach (var depBook in dependentBooks)
                {
                    foreach (var item in request.Items)
                    {
                        var basePrice = Math.Max(0, item.Price);
                        var calculatedPrice = PriceFormulaCalculator.CalculatePrice(
                            basePrice,
                            depBook.FormulaOperator,
                            depBook.FormulaValue,
                            depBook.FormulaUnit
                        );

                        if (depItemMap.TryGetValue((depBook.PriceBookId, item.ProductId), out var existingDepItem))
                        {
                            existingDepItem.Price = calculatedPrice;
                            existingDepItem.UpdatedAt = VietnamTime.Now;
                        }
                        else
                        {
                            await _context.DtlPriceBookItems.AddAsync(new DtlPriceBookItem
                            {
                                PriceBookId = depBook.PriceBookId,
                                ProductId = item.ProductId,
                                Price = calculatedPrice,
                                UpdatedAt = VietnamTime.Now
                            }, cancellationToken);
                        }
                    }

                    depBook.UpdatedAt = VietnamTime.Now;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
