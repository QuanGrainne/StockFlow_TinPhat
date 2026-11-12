using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.DTOs;

namespace StockFlow.Application.Features.Boms.Queries;

/// <summary>
/// Danh sách BOM; truyền ProductId để xem lịch sử các phiên bản của một thành phẩm (UC-57).
/// </summary>
public record GetBomsQuery(int? ProductId, string? Status, string? Search)
    : IRequest<Result<List<BomListItemDto>>>;

public class GetBomsQueryHandler(IStockFlowDbContext context)
    : IRequestHandler<GetBomsQuery, Result<List<BomListItemDto>>>
{
    public async Task<Result<List<BomListItemDto>>> Handle(GetBomsQuery query, CancellationToken cancellationToken)
    {
        var boms = context.MstBoms.AsNoTracking().AsQueryable();

        if (query.ProductId.HasValue) boms = boms.Where(b => b.ProductId == query.ProductId.Value);

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = query.Status.Trim();
            boms = boms.Where(b => b.Status.ToLower() == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var keyword = query.Search.Trim().ToLower();
            boms = boms.Where(b =>
                (b.Product.ProductCode != null && b.Product.ProductCode.ToLower().Contains(keyword)) ||
                (b.Product.ProductName != null && b.Product.ProductName.ToLower().Contains(keyword)) ||
                (b.BomName != null && b.BomName.ToLower().Contains(keyword)));
        }

        // Mới nhất lên trên: với một thành phẩm đây chính là lịch sử phiên bản
        var rows = await boms
            .OrderBy(b => b.Product.ProductName)
            .ThenByDescending(b => b.BomId)
            .Select(b => new BomListItemDto(
                b.BomId,
                b.ProductId,
                b.Product.ProductCode,
                b.Product.ProductName,
                b.Version,
                b.BomName,
                b.Status,
                b.EffectiveDate,
                b.CreatedAt,
                b.DtlBomItems.Count,
                context.TrxProductionOrderItems.Any(i => i.BomId == b.BomId)))
            .ToListAsync(cancellationToken);

        return Result.Success(rows);
    }
}
