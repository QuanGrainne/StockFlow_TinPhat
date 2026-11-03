using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;

namespace StockFlow.Application.Features.PriceBooks.Queries;

public record GetPriceBookByIdQuery(int Id) : IRequest<Result<PriceBookDto>>;

public class GetPriceBookByIdQueryHandler : IRequestHandler<GetPriceBookByIdQuery, Result<PriceBookDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetPriceBookByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PriceBookDto>> Handle(GetPriceBookByIdQuery request, CancellationToken cancellationToken)
    {
        var pb = await _context.MstPriceBooks
            .Include(p => p.FormulaBasePriceBook)
            .Include(p => p.DtlPriceBookItems)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PriceBookId == request.Id, cancellationToken);

        if (pb == null)
        {
            return Result.Failure<PriceBookDto>("Không tìm thấy bảng giá yêu cầu.");
        }

        List<int>? warehouseIds = null;
        if (!string.IsNullOrWhiteSpace(pb.ScopeWarehouseIds))
        {
            try { warehouseIds = JsonSerializer.Deserialize<List<int>>(pb.ScopeWarehouseIds); }
            catch { }
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

        var dto = new PriceBookDto(
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
        );

        return Result.Success(dto);
    }
}
