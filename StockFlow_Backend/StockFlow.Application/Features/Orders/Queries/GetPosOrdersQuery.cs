using System;
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

public record GetPosOrdersQuery(
    string? Search = null,
    string? Status = null,
    int? WarehouseId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? ReturnStatus = null,
    string? PaymentMethod = null,
    string? PriceBookName = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResult<PosOrderSummaryDto>>>;

public class GetPosOrdersQueryHandler : IRequestHandler<GetPosOrdersQuery, Result<PaginatedResult<PosOrderSummaryDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetPosOrdersQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PaginatedResult<PosOrderSummaryDto>>> Handle(GetPosOrdersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.TrxOrders
            .Include(o => o.Partner)
            .Include(o => o.DtlOrderItems)
            .Include(o => o.TrxStockIssues).ThenInclude(si => si.Warehouse)
            .Include(o => o.TrxReturnRequests)
            .AsNoTracking()
            .AsQueryable();

        // 1. Phân quyền truy cập kho (Data Isolation)
        if (_currentUserService.IsAuthenticated && !_currentUserService.IsAdmin)
        {
            var authorizedWarehouseIds = await _currentUserService.GetAuthorizedWarehouseIdsAsync(cancellationToken);
            if (authorizedWarehouseIds.Count > 0)
            {
                query = query.Where(o => o.TrxStockIssues.Any(si => authorizedWarehouseIds.Contains(si.WarehouseId)));
            }
        }

        // 2. Lọc theo kho / chi nhánh cụ thể
        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(o => o.TrxStockIssues.Any(si => si.WarehouseId == request.WarehouseId.Value));
        }

        // 3. Tìm kiếm theo từ khóa (Mã đơn, Tên khách hàng, SĐT)
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(o =>
                (o.OrderCode != null && o.OrderCode.ToLower().Contains(s)) ||
                (o.Partner != null && o.Partner.PartnerName != null && o.Partner.PartnerName.ToLower().Contains(s)) ||
                (o.Partner != null && o.Partner.Phone != null && o.Partner.Phone.Contains(s)));
        }

        // 4. Lọc theo trạng thái đơn hàng (Hỗ trợ đa chọn qua dấu phẩy: COMPLETED,CANCELLED)
        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "ALL")
        {
            var stList = request.Status
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToUpper())
                .ToList();

            if (stList.Count > 0)
            {
                query = query.Where(o => o.Status != null && stList.Contains(o.Status.ToUpper()));
            }
        }

        // 5. Lọc theo khoảng thời gian (Từ ngày - Đến ngày)
        if (request.FromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(o => o.OrderDate >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(o => o.OrderDate <= toUtc);
        }

        // 6. Lọc theo trạng thái trả hàng (Chuẩn dữ liệu thực tế)
        if (!string.IsNullOrWhiteSpace(request.ReturnStatus) && request.ReturnStatus != "ALL")
        {
            if (string.Equals(request.ReturnStatus, "NO_RETURN", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(o => !o.TrxReturnRequests.Any());
            }
            else if (string.Equals(request.ReturnStatus, "HAS_RETURN", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(o => o.TrxReturnRequests.Any());
            }
        }

        // 7. Lọc theo phương thức thanh toán
        if (!string.IsNullOrWhiteSpace(request.PaymentMethod) && request.PaymentMethod != "ALL")
        {
            var method = request.PaymentMethod.Trim().ToUpper();
            if (method == "DEBT")
            {
                query = query.Where(o => o.PaymentStatus == "DEBT" || (o.OutstandingAmount != null && o.OutstandingAmount > 0));
            }
            else
            {
                query = query.Where(o => _context.TrxFinancialTransactions.Any(ft =>
                    ft.ReferenceType == "SALES_ORDER" &&
                    ft.ReferenceId == o.OrderId &&
                    ft.PaymentMethod != null &&
                    ft.PaymentMethod.ToUpper() == method));
            }
        }

        // 8. Lọc theo bảng giá (nếu có ghi nhận bảng giá trong Notes)
        if (!string.IsNullOrWhiteSpace(request.PriceBookName) && request.PriceBookName != "ALL")
        {
            var tag = $"[Bảng giá: {request.PriceBookName.Trim()}]";
            query = query.Where(o => o.Notes != null && o.Notes.Contains(tag));
        }

        // Đếm tổng số bản ghi thỏa điều kiện lọc
        var totalCount = await query.CountAsync(cancellationToken);

        // Phân trang
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Max(1, Math.Min(100, request.PageSize));
        var skip = (page - 1) * pageSize;

        var items = await query
            .OrderByDescending(o => o.OrderId)
            .Skip(skip)
            .Take(pageSize)
            .Select(o => new PosOrderSummaryDto
            {
                OrderId = o.OrderId,
                OrderCode = o.OrderCode ?? $"HD{o.OrderId:D5}",
                PartnerName = o.Partner != null && o.Partner.PartnerName != null ? o.Partner.PartnerName : "Khách lẻ tại quầy",
                PartnerPhone = o.Partner != null ? (o.Partner.Phone ?? "") : "",
                SubTotal = o.SubTotal,
                DiscountAmount = o.DiscountAmount,
                TotalAmount = o.TotalAmount ?? 0,
                PaidAmount = o.PaidAmount ?? 0,
                OutstandingAmount = o.OutstandingAmount ?? 0,
                PaymentStatus = o.PaymentStatus ?? "UNPAID",
                Status = o.Status ?? "COMPLETED",
                OrderDate = o.OrderDate,
                TotalItems = o.DtlOrderItems.Count,
                WarehouseId = o.TrxStockIssues.Select(si => (int?)si.WarehouseId).FirstOrDefault(),
                WarehouseName = o.TrxStockIssues.Select(si => si.Warehouse.WarehouseName).FirstOrDefault() ?? "Kho Tổng Gia Lâm - Hà Nội",
                PaymentMethod = _context.TrxFinancialTransactions
                    .Where(ft => ft.ReferenceType == "SALES_ORDER" && ft.ReferenceId == o.OrderId)
                    .Select(ft => ft.PaymentMethod)
                    .FirstOrDefault() ?? (o.OutstandingAmount > 0 && o.PaidAmount == 0 ? "DEBT" : "CASH"),
                HasReturn = o.TrxReturnRequests.Any(),
                Notes = o.Notes
            })
            .ToListAsync(cancellationToken);

        var paginated = new PaginatedResult<PosOrderSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };

        return Result<PaginatedResult<PosOrderSummaryDto>>.Success(paginated);
    }
}
