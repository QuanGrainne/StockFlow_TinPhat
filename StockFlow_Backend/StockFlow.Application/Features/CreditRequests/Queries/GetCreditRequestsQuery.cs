using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.CreditRequests.Queries;

/// <summary>
/// Approval Inbox của Manager (UC-64, màn 3.2.2.2 – tab Yêu cầu hạn mức): toàn bộ yêu cầu, lọc trạng thái và tìm kiếm.
/// Kèm số yêu cầu đang chờ để hiển thị trên tab.
/// </summary>
public record GetCreditRequestsQuery(string? Status, string? Search) : IRequest<Result<CreditRequestListDto>>;

public class GetCreditRequestsQueryHandler : IRequestHandler<GetCreditRequestsQuery, Result<CreditRequestListDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetCreditRequestsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CreditRequestListDto>> Handle(GetCreditRequestsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.TrxCreditLimitRequests.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim().ToUpperInvariant();
            query = query.Where(r => r.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(r =>
                (r.RequestCode != null && r.RequestCode.ToLower().Contains(term)) ||
                (r.Partner.PartnerCode != null && r.Partner.PartnerCode.ToLower().Contains(term)) ||
                (r.Partner.PartnerName != null && r.Partner.PartnerName.ToLower().Contains(term)));
        }

        // Chờ duyệt lên đầu, rồi mới nhất trước
        var items = await query
            .OrderBy(r => r.Status == CreditRequestStatus.Pending ? 0 : 1)
            .ThenByDescending(r => r.RequestDate)
            .ThenByDescending(r => r.RequestId)
            .Select(CreditRequestProjection.ToDto)
            .ToListAsync(cancellationToken);

        var pendingCount = await _context.TrxCreditLimitRequests
            .CountAsync(r => r.Status == CreditRequestStatus.Pending, cancellationToken);

        return Result<CreditRequestListDto>.Success(new CreditRequestListDto
        {
            Items = items,
            PendingCount = pendingCount,
        });
    }
}
