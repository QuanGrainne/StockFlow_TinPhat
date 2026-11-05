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
                o.Status,
                Seller = o.CreatedByNavigation.FullName ?? o.CreatedByNavigation.Username,
                Warehouse = o.TrxStockIssues.Select(si => si.Warehouse.WarehouseName).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var recentOrders = orders
            .Select(o => new CustomerRecentOrderDto(
                o.OrderId, o.OrderCode ?? $"HD{o.OrderId:D6}", o.OrderDate, o.Total, o.Status, o.Seller, o.Warehouse))
            .ToList();

        // ── Sổ nợ cần thu: bán hàng (+), khách thanh toán (−) ──
        var orderCodes = orders.ToDictionary(o => o.OrderId, o => o.OrderCode ?? $"HD{o.OrderId:D6}");
        var receipts = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.PartnerId == partner.PartnerId && t.TxType == "RECEIPT" && (t.Status == null || t.Status != "CANCELLED"))
            .Select(t => new { t.TxId, t.TxCode, t.ReferenceType, t.ReferenceId, t.TransactionDate, Amount = t.Amount ?? 0 })
            .ToListAsync(cancellationToken);

        var movements = orders
            .Where(o => string.Equals(o.Status, CustomerProfileHelper.CompletedStatus, StringComparison.OrdinalIgnoreCase))
            .Select(o => (Code: orderCodes[o.OrderId], Date: o.OrderDate, Type: "SALE", Label: "Bán hàng",
                          Ref: (int?)o.OrderId, Amount: o.Total, Order: 0))
            .Concat(receipts.Select(t =>
            {
                var forOrder = t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue && orderCodes.ContainsKey(t.ReferenceId.Value);
                var code = t.TxCode ?? (forOrder ? $"TT{orderCodes[t.ReferenceId!.Value]}" : $"PT{t.TxId:D6}");
                return (Code: code, Date: t.TransactionDate, Type: "PAYMENT", Label: "Thanh toán",
                        Ref: forOrder ? t.ReferenceId : null, Amount: -t.Amount, Order: 1);
            }))
            .OrderBy(m => m.Date ?? DateTime.MinValue)
            .ThenBy(m => m.Order)
            .ToList();

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
            DebtLedger: ledger);

        return Result<CustomerDetailDto>.Success(detail);
    }
}
