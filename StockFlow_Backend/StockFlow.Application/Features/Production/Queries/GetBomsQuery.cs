using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>UC-57: danh sách BOM (lọc trạng thái áp dụng, tìm theo mã BOM / mã, tên thành phẩm).</summary>
public record GetBomsQuery(bool? IsActive, string? Search, int? ProductId) : IRequest<Result<List<BomSummaryDto>>>;

public class GetBomsQueryHandler : IRequestHandler<GetBomsQuery, Result<List<BomSummaryDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetBomsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<BomSummaryDto>>> Handle(GetBomsQuery query, CancellationToken ct)
    {
        var q = _context.MstBoms.AsQueryable();
        if (query.IsActive.HasValue)
        {
            var active = query.IsActive.Value;
            q = q.Where(b => (b.IsActive == true) == active);
        }
        if (query.ProductId.HasValue) q = q.Where(b => b.ProductId == query.ProductId.Value);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(b => (b.BomName != null && b.BomName.ToLower().Contains(s))
                             || (b.Product.ProductCode != null && b.Product.ProductCode.ToLower().Contains(s))
                             || (b.Product.ProductName != null && b.Product.ProductName.ToLower().Contains(s)));
        }

        // Đang áp dụng lên trước; trong mỗi nhóm, mới tạo lên đầu (cùng thời điểm tạo thì id lớn hơn đứng trước)
        var list = await ProductionReader.BomSummaries(q
                .OrderByDescending(b => b.IsActive == true)
                .ThenByDescending(b => b.CreatedAt)
                .ThenByDescending(b => b.BomId))
            .ToListAsync(ct);
        return Result.Success(list);
    }
}
