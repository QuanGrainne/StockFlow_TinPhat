using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Boms.DTOs;
using StockFlow.Application.Features.Boms.Helpers;

namespace StockFlow.Application.Features.Boms.Queries;

/// <summary>Chi tiết một phiên bản BOM kèm các dòng NVL.</summary>
public record GetBomByIdQuery(int BomId) : IRequest<Result<BomDto>>;

public class GetBomByIdQueryHandler(IStockFlowDbContext context)
    : IRequestHandler<GetBomByIdQuery, Result<BomDto>>
{
    public async Task<Result<BomDto>> Handle(GetBomByIdQuery query, CancellationToken cancellationToken)
    {
        var dto = await BomReader.LoadAsync(context, query.BomId, cancellationToken);
        return dto == null
            ? Result.Failure<BomDto>(BomMessages.BomNotFound)
            : Result.Success(dto);
    }
}
