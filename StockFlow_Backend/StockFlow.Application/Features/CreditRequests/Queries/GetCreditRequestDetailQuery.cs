using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;

namespace StockFlow.Application.Features.CreditRequests.Queries;

/// <summary>Chi tiết một yêu cầu để Manager quyết định (UC-64, A62.2).</summary>
public record GetCreditRequestDetailQuery(int RequestId) : IRequest<Result<CreditRequestDto>>;

public class GetCreditRequestDetailQueryHandler : IRequestHandler<GetCreditRequestDetailQuery, Result<CreditRequestDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetCreditRequestDetailQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CreditRequestDto>> Handle(GetCreditRequestDetailQuery request, CancellationToken cancellationToken)
    {
        var dto = await _context.TrxCreditLimitRequests
            .AsNoTracking()
            .Where(r => r.RequestId == request.RequestId)
            .Select(CreditRequestProjection.ToDto)
            .FirstOrDefaultAsync(cancellationToken);

        return dto == null
            ? Result<CreditRequestDto>.Failure(CreditRequestMessages.NotFound)
            : Result<CreditRequestDto>.Success(dto);
    }
}
