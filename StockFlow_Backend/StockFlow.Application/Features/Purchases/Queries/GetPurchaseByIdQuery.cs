using System;
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

public record GetPurchaseByIdQuery(int Id) : IRequest<Result<PurchaseDetailDto>>;

public class GetPurchaseByIdQueryHandler : IRequestHandler<GetPurchaseByIdQuery, Result<PurchaseDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetPurchaseByIdQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PurchaseDetailDto>> Handle(GetPurchaseByIdQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var receipt = await _context.TrxGoodsReceipts
                .AsNoTracking()
                .Include(r => r.Warehouse)
                .Include(r => r.Partner)
                .Include(r => r.ReceivedByNavigation)
                .Include(r => r.DtlGoodsReceiptItems)
                    .ThenInclude(i => i.Product)
                        .ThenInclude(p => p.BaseUnit)
                .Include(r => r.DtlGoodsReceiptItems)
                    .ThenInclude(i => i.Lot)
                .FirstOrDefaultAsync(r => r.GrId == request.Id, cancellationToken);

            if (receipt == null)
            {
                return Result.Failure<PurchaseDetailDto>($"Không tìm thấy phiếu nhập hàng với mã #{request.Id}.");
            }

            // Cô lập dữ liệu kho: chỉ thao tác trên phiếu thuộc kho mình được phân quyền
            if (!await _currentUserService.HasWarehouseAccessAsync(receipt.WarehouseId, cancellationToken))
            {
                return Result.Failure<PurchaseDetailDto>("Bạn không có quyền truy cập phiếu nhập của kho này.");
            }

            // Các khoản trả cho phiếu: trả lúc nhập (không mã) + phần phân bổ từ phiếu chi PC...
            var payments = await _context.TrxFinancialTransactions
                .AsNoTracking()
                .Include(t => t.CreatedByNavigation)
                .Where(t => t.TxType == "SUPPLIER_PAYMENT" && t.ReferenceType == "GOODS_RECEIPT" && t.ReferenceId == receipt.GrId)
                .OrderBy(t => t.TransactionDate)
                .ToListAsync(cancellationToken);
            var activePayments = payments.Where(t => t.Status != "CANCELLED").ToList();

            decimal paidAmount = activePayments.Sum(t => t.Amount ?? 0);
            string? paymentMethod = activePayments.FirstOrDefault()?.PaymentMethod;

            var items = receipt.DtlGoodsReceiptItems.Select(PurchaseItemMapper.ToDto).ToList();

            // Tổng tiền hàng (trước giảm giá phiếu), giảm giá phiếu, tổng cộng = số cần trả NCC
            decimal totalGoods = items.Sum(i => i.TotalPrice);
            decimal discountAmount = receipt.DiscountAmount ?? 0;
            decimal totalAmount = PurchaseItemMapper.NetTotal(receipt.DtlGoodsReceiptItems);
            decimal openAmount = Math.Max(0, totalAmount - paidAmount);
            decimal returnOffset = 0;
            List<PurchaseCostingDto>? costing = null;
            if (string.Equals(receipt.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                var offsets = await ReturnOffsetCalculator.ComputeAsync(
                    _context, new Dictionary<int, decimal> { [receipt.GrId] = openAmount }, cancellationToken);
                returnOffset = offsets.OffsetByReceipt.GetValueOrDefault(receipt.GrId);
                // Cách tính giá vốn BQ gia quyền của từng dòng (từ thẻ kho)
                costing = await PurchaseCostingReader.ReadAsync(_context, receipt, cancellationToken);
            }
            // Cần trả NCC = Tổng cộng − Đã trả − Trả hàng nhập trừ vào công nợ
            decimal debtAmount = Math.Max(0, openAmount - returnOffset);

            var receiptCode = receipt.GrCode ?? $"PN{receipt.GrId:D6}";
            // Lịch sử thanh toán: phiếu mới nhất lên đầu
            var paymentDtos = payments.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.TxId).Select(t => new PurchasePaymentDto(
                Code: string.IsNullOrEmpty(t.TxCode) ? $"TT{receiptCode}" : t.TxCode!,
                PaymentDate: t.TransactionDate,
                CreatedByName: t.CreatedByNavigation?.FullName ?? t.CreatedByNavigation?.Username ?? $"NV #{t.CreatedBy}",
                PaymentMethod: t.PaymentMethod ?? "CASH",
                Status: t.Status ?? "COMPLETED",
                Amount: t.Amount ?? 0)).ToList();

            // Lịch sử trả hàng: các phiếu trả hàng nhập lập từ phiếu này (mới nhất trước)
            var returns = await _context.TrxPurchaseReturns
                .AsNoTracking()
                .Include(r => r.CreatedByNavigation)
                .Where(r => r.GrId == receipt.GrId)
                .OrderByDescending(r => r.ReturnDate)
                .ThenByDescending(r => r.PurchaseReturnId)
                .Select(r => new PurchaseReturnSummaryDto(
                    r.PurchaseReturnId,
                    r.ReturnCode ?? "THN" + r.PurchaseReturnId,
                    r.ReturnDate,
                    r.CreatedByNavigation.FullName ?? r.CreatedByNavigation.Username ?? "",
                    r.TotalAmount ?? 0,
                    r.Status ?? "DRAFT"))
                .ToListAsync(cancellationToken);

            string receivedByName = receipt.ReceivedByNavigation?.FullName ??
                                    receipt.ReceivedByNavigation?.Username ??
                                    $"NV #{receipt.ReceivedBy}";

            var detail = new PurchaseDetailDto(
                receipt.GrId,
                receipt.GrCode ?? $"PN{receipt.GrId:D6}",
                receipt.ExternalPoNumber,
                receipt.WarehouseId,
                receipt.Warehouse?.WarehouseCode ?? $"K{receipt.WarehouseId}",
                receipt.Warehouse?.WarehouseName ?? $"Kho #{receipt.WarehouseId}",
                receipt.PartnerId,
                receipt.Partner?.PartnerCode ?? $"NCC{receipt.PartnerId}",
                receipt.Partner?.PartnerName ?? "Nhà cung cấp",
                receipt.Partner?.Phone,
                receipt.Partner?.Address,
                receipt.Partner?.CurrentPayable ?? 0,
                receipt.ReceivedDate,
                receipt.Status ?? "DRAFT",
                receipt.ReceivedBy,
                receivedByName,
                totalAmount,
                paidAmount,
                debtAmount,
                paymentMethod,
                receipt.Notes,
                items,
                TotalGoodsAmount: totalGoods,
                DiscountAmount: discountAmount,
                Payments: paymentDtos,
                Returns: returns,
                ReturnOffsetAmount: returnOffset,
                Costing: costing
            );

            return Result.Success(detail);
        }
        catch (Exception ex)
        {
            return Result.Failure<PurchaseDetailDto>($"Lỗi khi lấy thông tin chi tiết phiếu nhập: {ex.Message}");
        }
    }
}
