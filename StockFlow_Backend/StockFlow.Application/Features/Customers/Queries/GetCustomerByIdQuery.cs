using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Helpers;
using StockFlow.Application.Features.SalesReturns.Queries;

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

        // ── Sổ nợ cần thu: bán hàng (+), khách thanh toán (−) ──
        var orderCodes = orders.ToDictionary(o => o.OrderId, o => o.OrderCode ?? $"HD{o.OrderId:D6}");
        var receipts = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.PartnerId == partner.PartnerId && t.TxType == "RECEIPT" && (t.Status == null || t.Status != "CANCELLED"))
            .Select(t => new { t.TxId, t.TxCode, t.ReferenceType, t.ReferenceId, t.TransactionDate, Amount = t.Amount ?? 0 })
            .ToListAsync(cancellationToken);

        // Trả hàng: khách được trả lại "Cần trả khách" (−); tiền trả khách ngay (+)
        var returnRows = await _context.TrxReturnRequests.AsNoTracking()
            .Where(r => r.PartnerId == partner.PartnerId && r.Status == "COMPLETED")
            .Select(r => new { r.ReturnRequestId, r.ReturnCode, r.RequestDate, r.TotalAmount })
            .ToListAsync(cancellationToken);
        var refundRows = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.PartnerId == partner.PartnerId && t.TxType == "CUSTOMER_REFUND" && t.Status != "CANCELLED")
            .Select(t => new { t.TxId, t.TxCode, t.ReferenceType, t.ReferenceId, t.TransactionDate, Amount = t.Amount ?? 0 })
            .ToListAsync(cancellationToken);

        // Phiếu điều chỉnh công nợ (DC...): amount = chênh lệch nợ mới − nợ cũ
        var adjustRows = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.PartnerId == partner.PartnerId && t.TxType == AdjustCustomerDebtCommandHandler.TxType && t.Status != "CANCELLED")
            .Select(t => new { t.TxId, t.TxCode, t.TransactionDate, Amount = t.Amount ?? 0 })
            .ToListAsync(cancellationToken);

        // Thứ tự sổ: theo thời gian chứng từ; trùng thời gian (form chọn giờ chỉ đến phút) thì
        // hóa đơn → phiếu thu / điều chỉnh theo thứ tự tạo thực tế (TxId) → trả hàng → trả tiền khách
        var movements = orders
            .Where(o => string.Equals(o.Status, CustomerProfileHelper.CompletedStatus, StringComparison.OrdinalIgnoreCase))
            .Select(o => (Code: orderCodes[o.OrderId], Date: o.OrderDate, Type: "SALE", Label: "Bán hàng",
                          Ref: (int?)o.OrderId, Amount: o.Total, Order: 0, Seq: o.OrderId))
            .Concat(receipts.Select(t =>
            {
                var forOrder = t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue && orderCodes.ContainsKey(t.ReferenceId.Value);
                var code = t.TxCode ?? (forOrder ? $"TT{orderCodes[t.ReferenceId!.Value]}" : $"PT{t.TxId:D6}");
                return (Code: code, Date: t.TransactionDate, Type: "PAYMENT", Label: "Thanh toán",
                        Ref: forOrder ? t.ReferenceId : null, Amount: -t.Amount, Order: 1, Seq: t.TxId);
            }))
            .Concat(adjustRows.Select(t => (Code: t.TxCode ?? $"{DebtAdjustCodes.Prefix}{t.TxId:D6}", Date: t.TransactionDate, Type: "ADJUST",
                                            Label: "Điều chỉnh", Ref: (int?)null, Amount: t.Amount, Order: 1, Seq: t.TxId)))
            .Concat(returnRows.Select(r => (Code: r.ReturnCode ?? $"TH{r.ReturnRequestId:D6}", Date: r.RequestDate, Type: "RETURN",
                                            Label: "Trả hàng", Ref: (int?)r.ReturnRequestId, Amount: -r.TotalAmount, Order: 2, Seq: r.ReturnRequestId)))
            // Trả tiền khách theo phiếu trả hàng (REFUND, mở phiếu trả) / phiếu chi trả khách độc lập PC... (DEBT_REFUND)
            .Concat(refundRows.Select(t => (Code: t.TxCode ?? $"PC{t.TxId:D6}", Date: t.TransactionDate,
                                            Type: t.ReferenceType == SalesReturnOps.ReferenceType ? "REFUND" : "DEBT_REFUND",
                                            Label: "Trả tiền khách", Ref: t.ReferenceId, Amount: t.Amount, Order: 3, Seq: t.TxId)))
            .OrderBy(m => m.Date ?? DateTime.MinValue)
            .ThenBy(m => m.Order)
            .ThenBy(m => m.Seq)
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
            DebtLedger: ledger,
            RecentBookings: recentBookings);

        return Result<CustomerDetailDto>.Success(detail);
    }
}
