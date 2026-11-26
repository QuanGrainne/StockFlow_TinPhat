using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Helpers;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Chi tiết hồ sơ Khách hàng (dòng mở rộng ở màn Khách hàng):
/// - Thông tin: liên hệ, sinh nhật, giới tính, người tạo, chi nhánh tạo...
/// - Lịch sử bán/trả hàng: các hóa đơn của khách (mới nhất trước).
/// - Nợ cần thu từ khách: bán hàng (+ tổng hóa đơn hoàn thành), thanh toán (− tiền khách trả), số dư lũy kế.
/// </summary>
public record GetCustomerByIdQuery(int PartnerId) : IRequest<Result<CustomerDetailDto>>;

public class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, Result<CustomerDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetCustomerByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CustomerDetailDto>> Handle(GetCustomerByIdQuery request, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PartnerId == request.PartnerId &&
                                      p.PartnerType != null &&
                                      (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"),
                                 cancellationToken);
        if (partner == null)
            return Result<CustomerDetailDto>.Failure($"Không tìm thấy khách hàng với mã ID #{request.PartnerId}");

        var lookups = await CustomerProfileHelper.LoadLookupsAsync(_context, new[] { partner }, null, null, cancellationToken);
        var dto = CustomerProfileHelper.ToDto(partner, lookups);

        // ── Lịch sử bán hàng ──
        var orders = await _context.TrxOrders.AsNoTracking()
            .Where(o => o.PartnerId == partner.PartnerId)
            .OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.OrderId)
            .Select(o => new
            {
                o.OrderId,
                o.OrderCode,
                o.OrderDate,
                Total = o.TotalAmount ?? 0,
                Paid = o.PaidAmount ?? 0,
                Outstanding = o.OutstandingAmount ?? 0,
                o.Status,
                Seller = o.CreatedByNavigation.FullName ?? o.CreatedByNavigation.Username,
                Warehouse = o.TrxStockIssues.Select(si => si.Warehouse.WarehouseName).FirstOrDefault()
                            ?? (o.Warehouse != null ? o.Warehouse.WarehouseName : null),
                IsBooking = o.OrderType == "BOOKING",
            })
            .ToListAsync(cancellationToken);

        // Lịch sử bán hàng chỉ gồm hóa đơn; đơn đặt hàng (chưa bán) ở Lịch sử đặt hàng
        var recentBookings = orders
            .Where(o => o.IsBooking)
            .Select(o => new CustomerRecentOrderDto(
                o.OrderId, o.OrderCode ?? "", o.OrderDate, o.Total, o.Status, o.Seller, o.Warehouse, o.Paid, 0))
            .ToList();
        var recentOrders = orders
            .Where(o => !o.IsBooking)
            .Select(o => new CustomerRecentOrderDto(
                o.OrderId, o.OrderCode ?? $"HD{o.OrderId:D6}", o.OrderDate, o.Total, o.Status, o.Seller, o.Warehouse, o.Paid, o.Outstanding))
            .ToList();

        // ── Lịch sử trả hàng (phiếu trả của khách, hiện chung tab Lịch sử bán/trả hàng) ──
        var recentReturns = await _context.TrxReturnRequests.AsNoTracking()
            .Where(r => r.PartnerId == partner.PartnerId)
            .OrderByDescending(r => r.RequestDate).ThenByDescending(r => r.ReturnRequestId)
            .Select(r => new CustomerRecentReturnDto(
                r.ReturnRequestId,
                r.ReturnCode ?? "",
                r.RequestDate,
                r.TotalAmount,
                r.Status,
                r.CreatedByNavigation.FullName ?? r.CreatedByNavigation.Username,
                r.Warehouse != null ? r.Warehouse.WarehouseName : null,
                r.SalesOrder != null ? r.SalesOrder.OrderCode : null))
            .ToListAsync(cancellationToken);

        // ── Sổ nợ cần thu (dùng chung với báo cáo công nợ UC-86 – CustomerDebtLedger) ──
        var movements = await CustomerDebtLedger.LoadMovementsAsync(_context, new[] { partner.PartnerId }, cancellationToken);

        var balance = 0m;
        var ledger = new List<CustomerDebtLedgerEntryDto>(movements.Count);
        foreach (var m in movements)
        {
            balance += m.Amount;
            ledger.Add(new CustomerDebtLedgerEntryDto(m.Code, m.Date, m.Type, m.Label, m.Ref, m.Amount, balance));
        }
        ledger.Reverse(); // mới nhất trước

        var detail = new CustomerDetailDto(
            Id: dto.Id,
            PartnerId: dto.PartnerId,
            Code: dto.Code,
            Name: dto.Name,
            Type: dto.Type,
            Phone: dto.Phone,
            Email: dto.Email,
            Address: dto.Address,
            CreditLimit: dto.CreditLimit,
            CurrentDebt: dto.CurrentDebt,
            CurrentPayable: dto.CurrentPayable,
            Status: dto.Status,
            IsOverCreditLimit: dto.IsOverCreditLimit,
            RecentOrders: recentOrders,
            Phone2: dto.Phone2,
            Gender: dto.Gender,
            BirthDate: dto.BirthDate,
            Facebook: dto.Facebook,
            Notes: dto.Notes,
            CreatedAt: dto.CreatedAt,
            CreatedByName: dto.CreatedByName,
            CreatedWarehouseId: dto.CreatedWarehouseId,
            CreatedWarehouseName: dto.CreatedWarehouseName,
            TotalSales: dto.TotalSales,
            TotalSalesNetReturns: dto.TotalSalesNetReturns,
            DebtLedger: ledger,
            RecentBookings: recentBookings,
            RecentReturns: recentReturns);

        return Result<CustomerDetailDto>.Success(detail);
    }
}
