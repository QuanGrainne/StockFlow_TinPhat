using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;

namespace StockFlow.Application.Features.CreditRequests.Queries;

/// <summary>
/// Yêu cầu do chính người đăng nhập gửi (UC-27): Sales xem trạng thái và chọn ngoại lệ đã duyệt để dùng ở POS.
/// Lọc thêm theo khách hàng (khách đang chọn ở POS) và trạng thái.
/// </summary>
public record GetMyCreditRequestsQuery(int? PartnerId, string? Status) : IRequest<Result<List<CreditRequestDto>>>;

public class GetMyCreditRequestsQueryHandler : IRequestHandler<GetMyCreditRequestsQuery, Result<List<CreditRequestDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMyCreditRequestsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<CreditRequestDto>>> Handle(GetMyCreditRequestsQuery request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue)
            return Result<List<CreditRequestDto>>.Failure(CreditRequestMessages.UserUnknown);
        var currentUserId = _currentUserService.UserId.Value;

        var query = _context.TrxCreditLimitRequests
            .AsNoTracking()
            .Where(r => r.RequestedBy == currentUserId);

        if (request.PartnerId is > 0)
            query = query.Where(r => r.PartnerId == request.PartnerId.Value);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim().ToUpperInvariant();
            query = query.Where(r => r.Status == status);
        }

        var items = await query
            .OrderByDescending(r => r.RequestDate)
            .ThenByDescending(r => r.RequestId)
            .Select(CreditRequestProjection.ToDto)
            .ToListAsync(cancellationToken);

        return Result<List<CreditRequestDto>>.Success(items);
    }
}
