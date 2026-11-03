using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Application.Features.PurchaseReturns.Helpers;

namespace StockFlow.Application.Features.Purchases.Queries;

public record GetPurchasesQuery(
    int? WarehouseId = null,
    List<int>? WarehouseIds = null,
    string? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int? PartnerId = null,
    string? Search = null
) : IRequest<Result<List<PurchaseListDto>>>;

public class GetPurchasesQueryHandler : IRequestHandler<GetPurchasesQuery, Result<List<PurchaseListDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetPurchasesQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<PurchaseListDto>>> Handle(GetPurchasesQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var query = _context.TrxGoodsReceipts
                .AsNoTracking()
                .Include(r => r.Warehouse)
                .Include(r => r.Partner)
                .Include(r => r.ReceivedByNavigation)
                .Include(r => r.DtlGoodsReceiptItems)
                    .ThenInclude(i => i.Product)
                .AsQueryable();

            // 1. Phân quyền truy cập kho của người dùng (Data Isolation)
            var authorizedWarehouseIds = await _currentUserService.GetAuthorizedWarehouseIdsAsync(cancellationToken);
            if (authorizedWarehouseIds.Count > 0)
            {
                query = query.Where(r => authorizedWarehouseIds.Contains(r.WarehouseId));
            }

            // 2. Lọc theo kho cụ thể hoặc danh sách kho được chọn
            if (request.WarehouseIds != null && request.WarehouseIds.Count > 0)
            {
                query = query.Where(r => request.WarehouseIds.Contains(r.WarehouseId));
            }
            else if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
            {
                query = query.Where(r => r.WarehouseId == request.WarehouseId.Value);
            }

            // 3. Lọc theo trạng thái phiếu
            if (!string.IsNullOrWhiteSpace(request.Status) && !string.Equals(request.Status, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                var normStatus = request.Status.Trim().ToUpperInvariant();
                query = query.Where(r => r.Status != null && r.Status.ToUpper() == normStatus);
            }

            // 4. Lọc theo khoảng thời gian
            if (request.FromDate.HasValue)
            {
                query = query.Where(r => r.ReceivedDate >= request.FromDate.Value);
            }
            if (request.ToDate.HasValue)
            {
                var toDate = request.ToDate.Value.TimeOfDay == TimeSpan.Zero
                    ? request.ToDate.Value.Date.AddDays(1).AddTicks(-1)
                    : request.ToDate.Value;
                query = query.Where(r => r.ReceivedDate <= toDate);
            }

            // 5. Lọc theo Nhà cung cấp
            if (request.PartnerId.HasValue && request.PartnerId.Value > 0)
            {
                query = query.Where(r => r.PartnerId == request.PartnerId.Value);
            }

            // 6. Tìm kiếm theo từ khóa (Mã phiếu, Mã PO ngoài, Tên/Mã NCC, Tên/Mã sản phẩm)
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim().ToLower();
                query = query.Where(r =>
                    (r.GrCode != null && r.GrCode.ToLower().Contains(term)) ||
                    (r.ExternalPoNumber != null && r.ExternalPoNumber.ToLower().Contains(term)) ||
                    (r.Partner.PartnerName != null && r.Partner.PartnerName.ToLower().Contains(term)) ||
                    (r.Partner.PartnerCode != null && r.Partner.PartnerCode.ToLower().Contains(term)) ||
                    r.DtlGoodsReceiptItems.Any(i =>
                        (i.Product.ProductName != null && i.Product.ProductName.ToLower().Contains(term)) ||
                        (i.Product.ProductCode != null && i.Product.ProductCode.ToLower().Contains(term))
                    )
                );
            }

            var receipts = await query
                .OrderByDescending(r => r.ReceivedDate)
                .ThenByDescending(r => r.GrId)
                .ToListAsync(cancellationToken);

            // Tải các giao dịch thanh toán để tính số tiền đã trả cho từng phiếu
            var receiptIds = receipts.Select(r => r.GrId).ToList();
            var payments = await _context.TrxFinancialTransactions
                .AsNoTracking()
                .Where(t => t.TxType == "SUPPLIER_PAYMENT" && t.Status != "CANCELLED" // bỏ khoản trả đã hủy (khi hủy phiếu)
                            && t.ReferenceType == "GOODS_RECEIPT" && t.ReferenceId.HasValue && receiptIds.Contains(t.ReferenceId.Value))
                .GroupBy(t => t.ReferenceId!.Value)
                .Select(g => new { GrId = g.Key, TotalPaid = g.Sum(x => x.Amount ?? 0) })
                .ToDictionaryAsync(x => x.GrId, x => x.TotalPaid, cancellationToken);

            // Phiếu trả hàng nhập (phần tính vào công nợ) được trừ vào số còn nợ của phiếu nhập gốc
            var openByReceipt = receipts
                .Where(r => r.Status == "COMPLETED")
                .ToDictionary(
                    r => r.GrId,
                    r => Math.Max(0, PurchaseItemMapper.NetTotal(r.DtlGoodsReceiptItems) - payments.GetValueOrDefault(r.GrId)));
            var offsets = await ReturnOffsetCalculator.ComputeAsync(_context, openByReceipt, cancellationToken);

            var result = receipts.Select(r =>
            {
                decimal totalQty = r.DtlGoodsReceiptItems.Sum(i => i.AcceptedQty ?? i.ReceivedQty ?? i.OrderedQty ?? 0);
                decimal totalAmount = PurchaseItemMapper.NetTotal(r.DtlGoodsReceiptItems); // đã trừ giảm giá dòng + phiếu

                payments.TryGetValue(r.GrId, out decimal paidAmount);

                // Cần trả NCC = Tổng cộng − Đã trả − Trả hàng nhập trừ vào công nợ
                decimal debtAmount = Math.Max(0, totalAmount - paidAmount - offsets.OffsetByReceipt.GetValueOrDefault(r.GrId));

                string receivedByName = r.ReceivedByNavigation?.FullName ?? r.ReceivedByNavigation?.Username ?? $"NV #{r.ReceivedBy}";

                return new PurchaseListDto(
                    r.GrId,
                    r.GrCode ?? $"PN{r.GrId:D6}",
                    r.ExternalPoNumber,
                    r.WarehouseId,
                    r.Warehouse?.WarehouseCode ?? $"K{r.WarehouseId}",
                    r.Warehouse?.WarehouseName ?? $"Kho #{r.WarehouseId}",
                    r.PartnerId,
                    r.Partner?.PartnerCode ?? $"NCC{r.PartnerId}",
                    r.Partner?.PartnerName ?? "Nhà cung cấp",
                    r.ReceivedDate,
                    r.Status ?? "COMPLETED",
                    r.ReceivedBy,
                    receivedByName,
                    r.DtlGoodsReceiptItems.Count,
                    totalQty,
                    totalAmount,
                    paidAmount,
                    debtAmount,
                    r.Notes
                );
            }).ToList();

            return Result.Success(result);
        }
        catch (Exception ex)
        {
            return Result.Failure<List<PurchaseListDto>>($"Lỗi khi tải danh sách phiếu nhập hàng: {ex.Message}");
        }
    }
}
