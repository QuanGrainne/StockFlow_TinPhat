using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Services;

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
        var pb = await _context.MstPriceBooks.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PriceBookId == request.Id, cancellationToken);

        if (pb == null)
            return Result.Failure<PriceBookDto>("Không tìm thấy bảng giá yêu cầu.");

        return Result.Success(await PriceBookDtoBuilder.BuildAsync(_context, pb, cancellationToken));
    }
}
