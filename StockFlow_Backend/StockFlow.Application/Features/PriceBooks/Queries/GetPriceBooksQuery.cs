using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Services;

namespace StockFlow.Application.Features.PriceBooks.Queries;

/// <summary>
/// Danh sách bảng giá.
/// - Màn Thiết lập giá: lấy tất cả (lọc tên/mã, trạng thái, chi nhánh).
/// - POS (ForSale = true): chỉ bảng giá dùng được lúc này cho chi nhánh + khách đang chọn
///   (đang áp dụng, trong hiệu lực, đúng phạm vi); bảng giá chung luôn có.
/// </summary>
public record GetPriceBooksQuery(
    string? Search = null,
    bool? IsActive = null,
    int? WarehouseId = null,
    int? CustomerId = null,
    bool ForSale = false
) : IRequest<Result<List<PriceBookDto>>>;

public class GetPriceBooksQueryHandler : IRequestHandler<GetPriceBooksQuery, Result<List<PriceBookDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetPriceBooksQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<PriceBookDto>>> Handle(GetPriceBooksQuery request, CancellationToken cancellationToken)
    {
        var query = _context.MstPriceBooks.AsNoTracking();

        if (request.IsActive.HasValue)
            query = query.Where(pb => pb.IsActive == request.IsActive.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(pb =>
                (pb.PriceBookCode != null && pb.PriceBookCode.ToLower().Contains(s)) ||
                pb.PriceBookName.ToLower().Contains(s));
        }

        // Đếm số hàng hóa bằng SQL thay vì nạp toàn bộ dòng giá vào bộ nhớ
        var rows = await query
            .OrderByDescending(pb => pb.IsDefault)
            .ThenByDescending(pb => pb.CreatedAt)
            .Select(pb => new
            {
                Book = pb,
                BaseName = pb.FormulaBasePriceBook != null ? pb.FormulaBasePriceBook.PriceBookName : null,
                ItemCount = pb.DtlPriceBookItems.Count,
            })
            .ToListAsync(cancellationToken);

        var now = VietnamTime.Now;
        var filtered = rows.Where(r =>
        {
            if (request.ForSale)
                return PriceBookScope.IsApplicable(r.Book, now, request.WarehouseId, request.CustomerId);

            // Màn quản lý: lọc chi nhánh như trước (bảng giá áp dụng cho kho đó hoặc toàn hệ thống)
            return !request.WarehouseId.HasValue
                   || r.Book.ScopeBranchType != PriceBookScope.Specific
                   || PriceBookScope.ParseIds(r.Book.ScopeWarehouseIds).Contains(request.WarehouseId.Value);
        }).ToList();

        var customers = await PriceBookDtoBuilder.LoadCustomersAsync(_context, filtered.Select(r => r.Book), cancellationToken);
        var result = filtered
            .Select(r => PriceBookDtoBuilder.ToDto(r.Book, r.BaseName, r.ItemCount, customers))
            .ToList();

        return Result.Success(result);
    }
}
