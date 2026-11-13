using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>UC-57: chi tiết BOM kèm các dòng NVL (định mức, hao hụt, định mức sau hao hụt).</summary>
public record GetBomByIdQuery(int BomId) : IRequest<Result<BomDetailDto>>;

public class GetBomByIdQueryHandler : IRequestHandler<GetBomByIdQuery, Result<BomDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetBomByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<BomDetailDto>> Handle(GetBomByIdQuery query, CancellationToken ct)
    {
        var detail = await ProductionReader.BomDetailAsync(_context, query.BomId, ct);
        return detail == null
            ? Result.Failure<BomDetailDto>(ProductionMessages.BomNotFound)
            : Result.Success(detail);
    }
}
