using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-49 bước 3: danh sách vị trí lưu kho để chọn khi Duyệt hoàn thành — lấy từ trường "Vị trí" của danh mục Hàng hóa
/// (mst_products.location_name, các giá trị khác nhau đang dùng), không phải danh mục vị trí kho.
/// </summary>
public record GetProductLocationNamesQuery : IRequest<Result<List<string>>>;

public class GetProductLocationNamesQueryHandler : IRequestHandler<GetProductLocationNamesQuery, Result<List<string>>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductLocationNamesQueryHandler(IStockFlowDbContext context) => _context = context;

    public async Task<Result<List<string>>> Handle(GetProductLocationNamesQuery query, CancellationToken ct)
    {
        var names = await _context.MstProducts.AsNoTracking()
            .Where(p => p.LocationName != null && p.LocationName.Trim() != "")
            .Select(p => p.LocationName!.Trim())
            .Distinct()
            .ToListAsync(ct);
        names.Sort(StringComparer.Create(new System.Globalization.CultureInfo("vi-VN"), ignoreCase: true));
        return Result.Success(names);
    }
}
