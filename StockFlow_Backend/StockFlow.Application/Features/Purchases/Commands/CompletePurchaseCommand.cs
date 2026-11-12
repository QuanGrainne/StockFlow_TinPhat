using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Commands;

public record CompletePurchaseCommand(int Id, CompletePurchaseRequest Request) : IRequest<Result<PurchaseDetailDto>>;

public class CompletePurchaseCommandHandler : IRequestHandler<CompletePurchaseCommand, Result<PurchaseDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IInventoryLedger _inventoryLedger;

    public CompletePurchaseCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService, IInventoryLedger inventoryLedger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _inventoryLedger = inventoryLedger;
    }

    public async Task<Result<PurchaseDetailDto>> Handle(CompletePurchaseCommand command, CancellationToken cancellationToken)
    {
        var receipt = await _context.TrxGoodsReceipts
            .Include(r => r.Warehouse)
            .Include(r => r.Partner)
            .Include(r => r.ReceivedByNavigation)
            .Include(r => r.DtlGoodsReceiptItems)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.BaseUnit)
            .FirstOrDefaultAsync(r => r.GrId == command.Id, cancellationToken);

        if (receipt == null)
        {
            return Result.Failure<PurchaseDetailDto>($"Không tìm thấy phiếu nhập hàng #{command.Id}.");
        }

        if (string.Equals(receipt.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<PurchaseDetailDto>("Phiếu nhập hàng này đã ở trạng thái Hoàn thành trước đó.");
        }

        if (string.Equals(receipt.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<PurchaseDetailDto>("Phiếu nhập hàng này đã bị hủy, không thể hoàn thành.");
        }

        if (receipt.DtlGoodsReceiptItems.Count == 0)
        {
            return Result.Failure<PurchaseDetailDto>("Phiếu nhập hàng không có mặt hàng nào để nhập kho.");
        }

        // Cô lập dữ liệu kho: chỉ hoàn thành phiếu nhập của kho mình được phân quyền
        if (!await _currentUserService.HasWarehouseAccessAsync(receipt.WarehouseId, cancellationToken))
        {
            return Result.Failure<PurchaseDetailDto>("Bạn không có quyền nhập hàng vào kho này.");
        }

        if (!_currentUserService.UserId.HasValue)
        {
            return Result.Failure<PurchaseDetailDto>("Không xác định được người dùng đăng nhập.");
        }
        int currentUserId = _currentUserService.UserId.Value;

        int warehouseId = receipt.WarehouseId;
        // Thời điểm xác nhận nhập kho theo giờ Việt Nam
        DateTime receivedDate = VietnamTime.Now;

        using var transaction = await _context.BeginTransactionAsync(cancellationToken);

        try
        {
            decimal totalAmount = 0;

            // Sản phẩm của phiếu (đã Include, EF theo dõi) để sổ tồn kho cập nhật giá vốn chung MstProduct.MovingAverageCost
            var products = receipt.DtlGoodsReceiptItems
                .Where(i => i.Product != null)
                .GroupBy(i => i.ProductId)
                .ToDictionary(g => g.Key, g => g.First().Product);

            // 1. Cập nhật tồn kho, tính giá vốn và ghi thẻ kho cho từng mặt hàng
            foreach (var item in receipt.DtlGoodsReceiptItems)
            {
                decimal incomingQty = item.AcceptedQty ?? item.ReceivedQty ?? item.OrderedQty ?? 0;
                decimal unitPrice = item.UnitLandedCost ?? 0;
                totalAmount += incomingQty * unitPrice;

                // Cộng tồn, tính giá vốn BQ gia quyền (cập nhật giá vốn chung MstProduct) và ghi thẻ kho
                // qua sổ tồn kho dùng chung
                await _inventoryLedger.InboundAsync(
                    new StockKey(warehouseId, item.ProductId, item.LocationId, item.LotId),
                    incomingQty, unitPrice, products,
                    new StockRef("INBOUND_RECEIPT", "GOODS_RECEIPT", receipt.GrId, currentUserId),
                    cancellationToken,
                    transactionPrice: PurchaseStockOps.LinePrice(item), // Giá GD = giá nhập trên phiếu (sau giảm giá dòng)
                    transactionDate: receivedDate);
            }

            // 2. Xử lý thanh toán & Công nợ
            decimal paidAmount = Math.Clamp(command.Request.PaidAmount, 0, totalAmount);
            decimal debtAmount = Math.Max(0, totalAmount - paidAmount);

            if (paidAmount > 0)
            {
                var finTx = new TrxFinancialTransaction
                {
                    PartnerId = receipt.PartnerId,
                    TxType = "SUPPLIER_PAYMENT",
                    Amount = paidAmount,
                    PaymentMethod = string.IsNullOrWhiteSpace(command.Request.PaymentMethod) ? "CASH" : command.Request.PaymentMethod.Trim().ToUpperInvariant(),
                    ReferenceType = "GOODS_RECEIPT",
                    ReferenceId = receipt.GrId,
                    TransactionDate = receivedDate,
                    CreatedBy = currentUserId,
                    Status = "COMPLETED",
                    Description = $"Thanh toán tiền hàng phiếu nhập {receipt.GrCode}"
                };
                _context.TrxFinancialTransactions.Add(finTx);
            }

            if (debtAmount > 0 && receipt.Partner != null)
            {
                receipt.Partner.CurrentPayable = (receipt.Partner.CurrentPayable ?? 0) + debtAmount;
            }

            // 3. Đổi trạng thái sang COMPLETED và cập nhật người xác nhận
            receipt.Status = "COMPLETED";
            receipt.ReceivedDate = receivedDate;
            receipt.ReceivedBy = currentUserId;

            await _context.SaveChangesAsync(cancellationToken);
            await PurchaseOrderHelper.RecalculateStatusAsync(_context, receipt.PurchaseOrderId, cancellationToken);

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            // 4. Trả về DTO hoàn chỉnh
            var responseItems = receipt.DtlGoodsReceiptItems.Select(i =>
            {
                decimal qty = i.AcceptedQty ?? i.ReceivedQty ?? i.OrderedQty ?? 0;
                decimal price = i.UnitLandedCost ?? 0;
                return new PurchaseItemDto(
                    i.GrItemId,
                    i.ProductId,
                    i.Product?.ProductCode ?? $"SP{i.ProductId}",
                    i.Product?.ProductName ?? "Sản phẩm",
                    i.Product?.BaseUnit?.UnitName ?? "Cái",
                    qty,
                    price,
                    0,
                    qty * price,
                    i.LotId,
                    null
                );
            }).ToList();

            string receivedByName = (await _context.SecUsers
                .AsNoTracking()
                .Where(u => u.UserId == currentUserId)
                .Select(u => u.FullName ?? u.Username)
                .FirstOrDefaultAsync(cancellationToken)) ?? $"NV #{currentUserId}";

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
                receipt.Status,
                receipt.ReceivedBy,
                receivedByName,
                totalAmount,
                paidAmount,
                debtAmount,
                command.Request.PaymentMethod,
                receipt.Notes,
                responseItems
            );

            return Result.Success(detail);
        }
        catch (Exception ex)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            return Result.Failure<PurchaseDetailDto>($"Lỗi khi hoàn thành phiếu nhập: {ex.Message}");
        }
    }
}
