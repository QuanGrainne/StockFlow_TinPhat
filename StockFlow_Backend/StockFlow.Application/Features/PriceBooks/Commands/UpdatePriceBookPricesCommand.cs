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
            if (existingMap.TryGetValue(item.ProductId, out var existing))
            {
                existing.Price = Math.Max(0, item.Price);
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                await _context.DtlPriceBookItems.AddAsync(new DtlPriceBookItem
                {
                    PriceBookId = request.PriceBookId,
                    ProductId = item.ProductId,
                    Price = Math.Max(0, item.Price),
                    UpdatedAt = DateTime.UtcNow
                }, cancellationToken);
            }
        }

        pb.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
