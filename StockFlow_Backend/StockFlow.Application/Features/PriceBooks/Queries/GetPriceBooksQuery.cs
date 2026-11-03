using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;

namespace StockFlow.Application.Features.PriceBooks.Queries;

public record GetPriceBooksQuery(
    string? Search = null,
    bool? IsActive = null,
    int? WarehouseId = null
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
        var query = _context.MstPriceBooks
            .Include(pb => pb.FormulaBasePriceBook)
            .Include(pb => pb.DtlPriceBookItems)
            .AsNoTracking();

        if (request.IsActive.HasValue)
        {
            query = query.Where(pb => pb.IsActive == request.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(pb =>
                (pb.PriceBookCode != null && pb.PriceBookCode.ToLower().Contains(s)) ||
                pb.PriceBookName.ToLower().Contains(s));
        }

        var priceBooks = await query
            .OrderByDescending(pb => pb.IsDefault)
            .ThenByDescending(pb => pb.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = new List<PriceBookDto>();

        foreach (var pb in priceBooks)
        {
            List<int>? warehouseIds = null;
            if (!string.IsNullOrWhiteSpace(pb.ScopeWarehouseIds))
            {
                try { warehouseIds = JsonSerializer.Deserialize<List<int>>(pb.ScopeWarehouseIds); }
                catch { }
            }

            // Nếu lọc theo WarehouseId và bảng giá cấu hình chi nhánh cụ thể
            if (request.WarehouseId.HasValue && pb.ScopeBranchType == "SPECIFIC")
            {
                if (warehouseIds == null || !warehouseIds.Contains(request.WarehouseId.Value))
                {
                    continue; // Bỏ qua bảng giá không áp dụng cho kho này
                }
            }

            List<string>? customerGroups = null;
            if (!string.IsNullOrWhiteSpace(pb.ScopeCustomerGroupCodes))
            {
                try { customerGroups = JsonSerializer.Deserialize<List<string>>(pb.ScopeCustomerGroupCodes); }
                catch { }
            }

            List<int>? userIds = null;
            if (!string.IsNullOrWhiteSpace(pb.ScopeUserIds))
            {
                try { userIds = JsonSerializer.Deserialize<List<int>>(pb.ScopeUserIds); }
                catch { }
            }

            result.Add(new PriceBookDto(
                PriceBookId: pb.PriceBookId,
                PriceBookCode: pb.PriceBookCode,
                PriceBookName: pb.PriceBookName,
                EffectiveFrom: pb.EffectiveFrom,
                EffectiveTo: pb.EffectiveTo,
                IsActive: pb.IsActive,
                IsDefault: pb.IsDefault,
                FormulaBaseType: pb.FormulaBaseType,
                FormulaBasePriceBookId: pb.FormulaBasePriceBookId,
                FormulaBasePriceBookName: pb.FormulaBasePriceBook?.PriceBookName,
                FormulaOperator: pb.FormulaOperator,
                FormulaValue: pb.FormulaValue,
                FormulaUnit: pb.FormulaUnit,
                AllowUnlistedProducts: pb.AllowUnlistedProducts,
                WarnUnlistedProducts: pb.WarnUnlistedProducts,
                ScopeBranchType: pb.ScopeBranchType,
                ScopeWarehouseIds: warehouseIds,
                ScopeCustomerType: pb.ScopeCustomerType,
                ScopeCustomerGroupCodes: customerGroups,
                ScopeUserType: pb.ScopeUserType,
                ScopeUserIds: userIds,
                TotalItemsCount: pb.DtlPriceBookItems.Count,
                UpdatedAt: pb.UpdatedAt ?? pb.CreatedAt
            ));
        }

        return Result.Success(result);
    }
}
