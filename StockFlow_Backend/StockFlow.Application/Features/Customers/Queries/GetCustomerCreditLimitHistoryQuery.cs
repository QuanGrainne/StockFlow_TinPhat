using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>Lịch sử thay đổi hạn mức công nợ của một khách, mới nhất trước.</summary>
public record GetCustomerCreditLimitHistoryQuery(int PartnerId) : IRequest<Result<List<CreditLimitHistoryDto>>>;

public class GetCustomerCreditLimitHistoryQueryHandler
    : IRequestHandler<GetCustomerCreditLimitHistoryQuery, Result<List<CreditLimitHistoryDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetCustomerCreditLimitHistoryQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<CreditLimitHistoryDto>>> Handle(GetCustomerCreditLimitHistoryQuery request, CancellationToken ct)
    {
        bool exists = await _context.MstBusinessPartners.AsNoTracking().AnyAsync(p => p.PartnerId == request.PartnerId, ct);
        if (!exists)
            return Result<List<CreditLimitHistoryDto>>.Failure($"Không tìm thấy khách hàng #{request.PartnerId}");

        var rows = await (
            from h in _context.TrxCreditLimitHistories.AsNoTracking()
            where h.PartnerId == request.PartnerId
            join u in _context.SecUsers.AsNoTracking() on h.ChangedBy equals (int?)u.UserId into users
            from u in users.DefaultIfEmpty()
            join r in _context.TrxCreditLimitRequests.AsNoTracking() on h.RequestId equals (int?)r.RequestId into reqs
            from r in reqs.DefaultIfEmpty()
            orderby h.ChangedAt descending, h.HistoryId descending
            select new CreditLimitHistoryDto(
                h.HistoryId, h.ChangedAt, h.OldLimit, h.NewLimit, h.Source, h.Reason,
                h.RequestId, r != null ? r.RequestCode : null,
                u != null ? (u.FullName ?? u.Username) : null))
            .Take(200)
            .ToListAsync(ct);

        return Result<List<CreditLimitHistoryDto>>.Success(rows);
    }
}
