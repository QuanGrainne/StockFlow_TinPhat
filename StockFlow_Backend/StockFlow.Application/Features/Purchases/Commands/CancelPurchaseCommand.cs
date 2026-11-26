using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Application.Features.Purchases.Helpers;

namespace StockFlow.Application.Features.Purchases.Commands;

public record CancelPurchaseCommand(int Id, CancelPurchaseRequest? Request = null) : IRequest<Result<bool>>, IRetryOnConcurrencyConflict;

public class CancelPurchaseCommandHandler : IRequestHandler<CancelPurchaseCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CancelPurchaseCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(CancelPurchaseCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var receipt = await _context.TrxGoodsReceipts
                .FirstOrDefaultAsync(r => r.GrId == command.Id, cancellationToken);

            if (receipt == null)
            {
                return Result.Failure<bool>($"Không tìm thấy phiếu nhập hàng #{command.Id}.");
            }

            // Cô lập dữ liệu kho: chỉ thao tác trên phiếu thuộc kho mình được phân quyền
            if (!await _currentUserService.HasWarehouseAccessAsync(receipt.WarehouseId, cancellationToken))
            {
                return Result.Failure<bool>("Bạn không có quyền truy cập phiếu nhập của kho này.");
            }

            if (string.Equals(receipt.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                return Result.Failure<bool>("Phiếu nhập hàng này đã ở trạng thái Đã hủy trước đó.");
            }

            // Phiếu nhập đã có phiếu trả hàng nhập → phải hủy phiếu trả trước để không lệch tồn kho / công nợ
            var returnCodes = await PurchaseReturnLogic.ActiveReturnCodesAsync(_context, receipt.GrId, cancellationToken);
            if (returnCodes.Count > 0)
            {
                return Result.Failure<bool>(
                    $"Phiếu nhập đã có phiếu trả hàng nhập {string.Join(", ", returnCodes)}. Vui lòng hủy phiếu trả hàng trước.");
            }

            using var transaction = await _context.BeginTransactionAsync(cancellationToken);

            // Hủy phiếu ĐÃ NHẬP KHO: đảo tồn kho + giá vốn, hủy khoản trả lúc nhập, giảm công nợ NCC
            if (string.Equals(receipt.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                if (!_currentUserService.UserId.HasValue)
                {
                    return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
                }
                var userId = _currentUserService.UserId.Value;

                var payments = await _context.TrxFinancialTransactions
                    .Where(t => t.TxType == "SUPPLIER_PAYMENT" && t.Status != "CANCELLED"
                                && t.ReferenceType == "GOODS_RECEIPT" && t.ReferenceId == receipt.GrId)
                    .ToListAsync(cancellationToken);

                // Đã có phiếu chi (PC...) trả cho phiếu này → phải xử lý phiếu chi trước để không lệch sổ quỹ
                var vouchers = payments.Where(t => !string.IsNullOrEmpty(t.TxCode)).Select(t => t.TxCode).Distinct().ToList();
                if (vouchers.Count > 0)
                {
                    return Result.Failure<bool>(
                        $"Phiếu nhập đã được thanh toán bằng phiếu chi {string.Join(", ", vouchers)}. Không thể hủy phiếu nhập này.");
                }

                var items = await _context.DtlGoodsReceiptItems
                    .Where(i => i.GrId == receipt.GrId)
                    .ToListAsync(cancellationToken);
                var productIds = items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.MstProducts
                    .Where(p => productIds.Contains(p.ProductId))
                    .ToDictionaryAsync(p => p.ProductId, cancellationToken);

                foreach (var item in items)
                {
                    await PurchaseStockOps.ReverseInboundAsync(
                        _context, receipt, item, products, "INBOUND_RECEIPT_CANCEL", userId, cancellationToken);
                }

                // Khoản trả lúc nhập bị hủy theo phiếu; phần còn nợ của phiếu được trừ khỏi công nợ NCC
                var paidAtReceipt = payments.Sum(t => t.Amount ?? 0);
                foreach (var p in payments) p.Status = "CANCELLED";

                var netTotal = PurchaseItemMapper.NetTotal(items);
                var partner = await _context.MstBusinessPartners
                    .FirstOrDefaultAsync(p => p.PartnerId == receipt.PartnerId, cancellationToken);
                if (partner != null)
                {
                    partner.CurrentPayable = (partner.CurrentPayable ?? 0) - Math.Max(0, netTotal - paidAtReceipt);
                }
            }

            receipt.Status = "CANCELLED";

            if (!string.IsNullOrWhiteSpace(command.Request?.Reason))
            {
                var reason = command.Request.Reason.Trim();
                receipt.Notes = string.IsNullOrEmpty(receipt.Notes)
                    ? $"[Lý do hủy]: {reason}"
                    : $"{receipt.Notes} | [Lý do hủy]: {reason}";
            }

            await _context.SaveChangesAsync(cancellationToken);
            await PurchaseOrderHelper.RecalculateStatusAsync(_context, receipt.PurchaseOrderId, cancellationToken);
            if (transaction != null) await transaction.CommitAsync(cancellationToken);

            return Result.Success(true);
        }
        catch (Exception ex) when (ex is not DbUpdateConcurrencyException)
        {
            return Result.Failure<bool>($"Lỗi khi hủy phiếu nhập: {ex.Message}");
        }
    }
}
