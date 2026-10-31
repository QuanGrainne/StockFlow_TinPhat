using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.DTOs;

namespace StockFlow.Application.Features.Orders.Queries;

public record GetPosOrdersQuery(string? Search = null, string? Status = null) : IRequest<Result<List<PosOrderSummaryDto>>>;

public class GetPosOrdersQueryHandler : IRequestHandler<GetPosOrdersQuery, Result<List<PosOrderSummaryDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetPosOrdersQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<PosOrderSummaryDto>>> Handle(GetPosOrdersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.TrxOrders
            .Include(o => o.Partner)
            .Include(o => o.DtlOrderItems)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(o => 
                (o.OrderCode != null && o.OrderCode.ToLower().Contains(s)) ||
                (o.Partner != null && o.Partner.PartnerName.ToLower().Contains(s)) ||
                (o.Partner != null && o.Partner.Phone != null && o.Partner.Phone.Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "ALL")
        {
            var st = request.Status.Trim().ToUpper();
            query = query.Where(o => o.Status == st);
        }

        var list = await query
            .OrderByDescending(o => o.OrderId)
            .Take(50)
            .Select(o => new PosOrderSummaryDto
            {
                OrderId = o.OrderId,
                OrderCode = o.OrderCode ?? $"HD{o.OrderId:D5}",
                PartnerName = o.Partner.PartnerName,
                PartnerPhone = o.Partner.Phone ?? "",
                TotalAmount = o.TotalAmount ?? 0,
                PaidAmount = o.PaidAmount ?? 0,
                OutstandingAmount = o.OutstandingAmount ?? 0,
                PaymentStatus = o.PaymentStatus ?? "UNPAID",
                Status = o.Status ?? "COMPLETED",
                OrderDate = o.OrderDate,
                TotalItems = o.DtlOrderItems.Count
            })
            .ToListAsync(cancellationToken);

        return Result<List<PosOrderSummaryDto>>.Success(list);
    }
}

