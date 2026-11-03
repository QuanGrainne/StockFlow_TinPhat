using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Application.Features.Suppliers.Helpers;

namespace StockFlow.Application.Features.Suppliers.Queries;

/// <summary>
/// Truy vấn danh sách Nhà cung cấp kèm tìm kiếm và bộ lọc.
/// </summary>
public record GetSuppliersQuery(
    string? Search = null,
    string? DebtStatus = null,
    string? Status = null,
    int? WarehouseId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null
) : IRequest<Result<List<SupplierDto>>>;

public class GetSuppliersQueryHandler : IRequestHandler<GetSuppliersQuery, Result<List<SupplierDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetSuppliersQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<SupplierDto>>> Handle(GetSuppliersQuery query, CancellationToken cancellationToken)
    {
        // 1. Chỉ lấy đối tác có loại là Nhà cung cấp (SUPPLIER hoặc BOTH)
        var dbQuery = _context.MstBusinessPartners
            .Where(p => p.PartnerType != null && 
                       (p.PartnerType.ToUpper() == "SUPPLIER" || p.PartnerType.ToUpper() == "BOTH"))
            .AsNoTracking();

        // 2. Tìm kiếm từ khóa đa năng (Mã, Tên, Số điện thoại, Email, Địa chỉ)
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower().Trim();
            dbQuery = dbQuery.Where(p =>
                (p.PartnerCode != null && p.PartnerCode.ToLower().Contains(s)) ||
                (p.PartnerName != null && p.PartnerName.ToLower().Contains(s)) ||
                (p.Phone != null && p.Phone.ToLower().Contains(s)) ||
                (p.Email != null && p.Email.ToLower().Contains(s)) ||
                (p.Address != null && p.Address.ToLower().Contains(s)));
        }

        // 3. Lọc theo tình trạng công nợ phải trả
        if (!string.IsNullOrWhiteSpace(query.DebtStatus) && !query.DebtStatus.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.DebtStatus.Equals("HAS_DEBT", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => (p.CurrentPayable ?? 0) > 0);
            }
            else if (query.DebtStatus.Equals("NO_DEBT", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => (p.CurrentPayable ?? 0) <= 0);
            }
        }

        // 4. Lọc theo trạng thái hoạt động (ACTIVE / INACTIVE)
        if (!string.IsNullOrWhiteSpace(query.Status) && !query.Status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => p.IsActive != false);
            }
            else if (query.Status.Equals("INACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => p.IsActive == false);
            }
        }

        // 5. Lọc theo Chi nhánh / Kho nhập hàng (nếu có chọn kho)
        if (query.WarehouseId.HasValue && query.WarehouseId.Value > 0)
        {
            var targetWhId = query.WarehouseId.Value;
            var partnerIdsInWh = await _context.TrxGoodsReceipts
                .Where(r => r.WarehouseId == targetWhId && r.Status == "COMPLETED")
                .Select(r => r.PartnerId)
                .Distinct()
                .ToListAsync(cancellationToken);

            dbQuery = dbQuery.Where(p => partnerIdsInWh.Contains(p.PartnerId));
        }

        // 5b. Lọc theo thời gian phát sinh nhập hàng (ngày nhập của phiếu nhập, ToDate tính hết ngày)
        var hasTimeFilter = query.FromDate.HasValue || query.ToDate.HasValue;
        var fromDate = query.FromDate?.Date;
        var toDateExclusive = query.ToDate?.Date.AddDays(1);
        if (hasTimeFilter)
        {
            var partnerIdsInRange = await _context.TrxGoodsReceipts
                .Where(r => r.Status == "COMPLETED" && r.ReceivedDate != null
                    && (fromDate == null || r.ReceivedDate >= fromDate)
                    && (toDateExclusive == null || r.ReceivedDate < toDateExclusive))
                .Select(r => r.PartnerId)
                .Distinct()
                .ToListAsync(cancellationToken);

            dbQuery = dbQuery.Where(p => partnerIdsInRange.Contains(p.PartnerId));
        }

        // 6. Sắp xếp danh sách
        var partners = await dbQuery
            .OrderByDescending(p => p.PartnerId) // NCC mới tạo lên đầu danh sách
            .ToListAsync(cancellationToken);

        var partnerIds = partners.Select(p => p.PartnerId).ToList();

        // 7. Thống kê Tổng mua hàng từ các phiếu nhập đã hoàn thành (phiếu tạm / đã hủy không phát sinh tiền hàng)
        var receiptsQuery = _context.TrxGoodsReceipts
            .Include(r => r.DtlGoodsReceiptItems)
            .Where(r => partnerIds.Contains(r.PartnerId) && r.Status == "COMPLETED")
            .AsNoTracking();

        if (query.WarehouseId.HasValue && query.WarehouseId.Value > 0)
        {
            receiptsQuery = receiptsQuery.Where(r => r.WarehouseId == query.WarehouseId.Value);
        }

        // Tổng mua chỉ tính các phiếu nhập trong khoảng thời gian đang lọc
        if (hasTimeFilter)
        {
            receiptsQuery = receiptsQuery.Where(r => r.ReceivedDate != null
                && (fromDate == null || r.ReceivedDate >= fromDate)
                && (toDateExclusive == null || r.ReceivedDate < toDateExclusive));
        }

        var receipts = await receiptsQuery.ToListAsync(cancellationToken);

        // Thanh toán theo phiếu nhập để tính nợ còn lại tại từng kho
        var receiptIds = receipts.Select(r => r.GrId).ToList();
        var payments = await _context.TrxFinancialTransactions
            .Where(t => t.TxType == SupplierDebtCalculator.PaymentTxType
                        && t.ReferenceType == SupplierDebtCalculator.GoodsReceiptRef
                        && t.ReferenceId != null && receiptIds.Contains(t.ReferenceId.Value))
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var paidByReceipt = SupplierDebtCalculator.PaidByReceipt(payments);
        // Trả hàng nhập (phần tính vào công nợ) trừ vào số còn nợ của phiếu nhập gốc
        var returnOffsets = await StockFlow.Application.Features.PurchaseReturns.Helpers.ReturnOffsetCalculator.ComputeAsync(
            _context,
            receipts.Where(SupplierDebtCalculator.IsCompleted)
                .ToDictionary(r => r.GrId, r => SupplierDebtCalculator.ReceiptDebt(r, paidByReceipt)),
            cancellationToken);

        var stats = receipts
            .GroupBy(r => r.PartnerId)
            .ToDictionary(
                g => g.Key,
                g => (
                    TotalPurchased: g.Sum(SupplierDebtCalculator.ReceiptTotal),
                    Payable: g.Sum(r => Math.Max(0,
                        SupplierDebtCalculator.ReceiptDebt(r, paidByReceipt) - returnOffsets.OffsetByReceipt.GetValueOrDefault(r.GrId))),
                    ReceiptCount: g.Count()
                )
            );

        // 8. Map sang DTO
        var dtos = partners.Select(p =>
        {
            decimal totalPurchased = 0m;
            decimal? branchPayable = null;
            int? branchReceiptsCount = null;

            if (stats.TryGetValue(p.PartnerId, out var stat))
            {
                totalPurchased = stat.TotalPurchased;
                if (query.WarehouseId.HasValue && query.WarehouseId.Value > 0)
                {
                    // Nợ tại chi nhánh = tiền hàng các phiếu tại kho đó − số đã thanh toán cho các phiếu này
                    // (trước đây gán bằng tổng tiền mua nên NCC đã trả đủ vẫn hiện còn nợ)
                    branchPayable = stat.Payable;
                    branchReceiptsCount = stat.ReceiptCount;
                }
            }

            return new SupplierDto(
                Id: p.PartnerId.ToString(),
                PartnerId: p.PartnerId,
                Code: p.PartnerCode ?? $"NCC{p.PartnerId:D6}",
                Name: p.PartnerName ?? "",
                Type: p.PartnerType ?? "SUPPLIER",
                Phone: p.Phone,
                Email: p.Email,
                Address: p.Address,
                CreditLimit: p.CreditLimit ?? 0m,
                CurrentPayable: p.CurrentPayable ?? 0m,
                CurrentDebt: p.CurrentDebt ?? 0m,
                Status: p.IsActive != false ? "ACTIVE" : "INACTIVE",
                TotalPurchased: totalPurchased,
                BranchPayable: branchPayable,
                BranchReceiptsCount: branchReceiptsCount
            );
        }).ToList();

        return Result.Success(dtos);
    }
}
