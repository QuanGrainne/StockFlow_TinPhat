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
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Commands;

public record UpdatePurchaseCommand(int Id, UpdatePurchaseRequest Request) : IRequest<Result<PurchaseDetailDto>>, IRetryOnConcurrencyConflict;

public class UpdatePurchaseCommandHandler : IRequestHandler<UpdatePurchaseCommand, Result<PurchaseDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdatePurchaseCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PurchaseDetailDto>> Handle(UpdatePurchaseCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var req = command.Request;

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

            // Cô lập dữ liệu kho: chỉ thao tác trên phiếu thuộc kho mình được phân quyền
            if (!await _currentUserService.HasWarehouseAccessAsync(receipt.WarehouseId, cancellationToken))
            {
                return Result.Failure<PurchaseDetailDto>("Bạn không có quyền truy cập phiếu nhập của kho này.");
            }

            var isCompleted = string.Equals(receipt.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase);
            if (!isCompleted && !string.Equals(receipt.Status, "DRAFT", StringComparison.OrdinalIgnoreCase))
            {
                return Result.Failure<PurchaseDetailDto>("Phiếu nhập đã hủy, không thể chỉnh sửa.");
            }
            // Phiếu nhập đã có phiếu trả hàng nhập → không sửa được (dòng hàng đang được phiếu trả tham chiếu)
            var returnCodes = await PurchaseReturnLogic.ActiveReturnCodesAsync(_context, receipt.GrId, cancellationToken);
            if (returnCodes.Count > 0)
            {
                return Result.Failure<PurchaseDetailDto>(
                    $"Phiếu nhập đã có phiếu trả hàng nhập {string.Join(", ", returnCodes)}. Vui lòng hủy phiếu trả hàng trước khi sửa.");
            }

            if (isCompleted && req.PartnerId != receipt.PartnerId)
            {
                return Result.Failure<PurchaseDetailDto>("Không thể đổi nhà cung cấp của phiếu đã nhập hàng. Vui lòng hủy phiếu và lập phiếu mới.");
            }
            if (isCompleted && !_currentUserService.UserId.HasValue)
            {
                return Result.Failure<PurchaseDetailDto>("Không xác định được người dùng đăng nhập.");
            }

            if (req.Items == null || req.Items.Count == 0)
            {
                return Result.Failure<PurchaseDetailDto>("Phiếu nhập hàng phải có ít nhất 1 mặt hàng.");
            }

            foreach (var item in req.Items)
            {
                var qtyError = PurchaseItemMapper.ValidateQuantities(item);
                if (qtyError != null) return Result.Failure<PurchaseDetailDto>(qtyError);
                if (item.UnitPrice < 0)
                {
                    return Result.Failure<PurchaseDetailDto>($"Đơn giá nhập của sản phẩm ID #{item.ProductId} không được âm.");
                }
            }

            var partner = await _context.MstBusinessPartners
                .FirstOrDefaultAsync(p => p.PartnerId == req.PartnerId, cancellationToken);
            if (partner == null)
            {
                return Result.Failure<PurchaseDetailDto>($"Không tìm thấy nhà cung cấp ID #{req.PartnerId}.");
            }
            // Chỉ nhập hàng từ nhà cung cấp (SUPPLIER / BOTH), không nhận khách hàng (ISS-01)
            if (!partner.IsSupplier())
            {
                return Result.Failure<PurchaseDetailDto>("Đối tác được chọn không phải nhà cung cấp.");
            }

            // Gồm cả sản phẩm của dòng cũ (để đảo nhập kho khi sửa phiếu đã nhập)
            var productIds = req.Items.Select(i => i.ProductId)
                .Concat(receipt.DtlGoodsReceiptItems.Select(i => i.ProductId))
                .Distinct().ToList();
            var products = await _context.MstProducts
                .Include(p => p.BaseUnit)
                .Where(p => productIds.Contains(p.ProductId))
                .ToDictionaryAsync(p => p.ProductId, cancellationToken);

            if (req.Items.Select(i => i.ProductId).Distinct().Any(id => !products.ContainsKey(id)))
            {
                return Result.Failure<PurchaseDetailDto>("Một số sản phẩm trong danh sách không tồn tại trong danh mục.");
            }

            // Cập nhật thông tin phiếu
            receipt.PartnerId = partner.PartnerId;
            receipt.ExternalPoNumber = req.ExternalPoNumber?.Trim();
            receipt.ReceivedDate = req.ReceivedDate.HasValue ? VietnamTime.From(req.ReceivedDate) : receipt.ReceivedDate;
            receipt.Notes = req.Notes?.Trim();

            using var transaction = await _context.BeginTransactionAsync(cancellationToken);

            // Phiếu đã nhập: đảo nhập kho theo các dòng cũ trước khi thay bằng dòng mới
            var oldItems = receipt.DtlGoodsReceiptItems.ToList();
            var oldNetTotal = PurchaseItemMapper.NetTotal(oldItems);
            if (isCompleted)
            {
                foreach (var old in oldItems)
                {
                    await PurchaseStockOps.ReverseInboundAsync(
                        _context, receipt, old, products, "INBOUND_RECEIPT_EDIT_OUT", _currentUserService.UserId!.Value, cancellationToken);
                }
            }

            // Xóa các chi tiết cũ và tạo mới danh sách chi tiết
            _context.DtlGoodsReceiptItems.RemoveRange(oldItems);

            var pricing = PurchasePricing.Compute(req.Items, req.DiscountAmount);
            receipt.DiscountAmount = pricing.DiscountApplied;
            var newItems = new List<DtlGoodsReceiptItem>();
            // SL đặt từng mặt hàng nếu phiếu nhập theo phiếu đặt → ghi vào ordered_qty
            var orderedByProduct = await PurchaseOrderHelper.OrderedQtyByProductAsync(_context, receipt.PurchaseOrderId, cancellationToken);

            foreach (var line in pricing.Lines)
            {
                var dtl = PurchaseItemMapper.NewItem(line.Request, line.LandedCost,
                    receipt.PurchaseOrderId.HasValue ? orderedByProduct.GetValueOrDefault(line.Request.ProductId) : null);
                dtl.GrId = receipt.GrId;
                newItems.Add(dtl);
                _context.DtlGoodsReceiptItems.Add(dtl);
            }

            if (isCompleted)
            {
                // Nhập kho lại theo dòng mới + điều chỉnh công nợ NCC theo chênh lệch tổng tiền
                foreach (var dtl in newItems)
                {
                    await PurchaseStockOps.ApplyInboundAsync(
                        _context, receipt, dtl, products, "INBOUND_RECEIPT_EDIT_IN", _currentUserService.UserId!.Value, cancellationToken);
                }

                var newNetTotal = PurchaseItemMapper.NetTotal(newItems);
                partner.CurrentPayable = (partner.CurrentPayable ?? 0) + (newNetTotal - oldNetTotal);
            }

            await _context.SaveChangesAsync(cancellationToken);
            await PurchaseOrderHelper.RecalculateStatusAsync(_context, receipt.PurchaseOrderId, cancellationToken);
            if (transaction != null) await transaction.CommitAsync(cancellationToken);

            var responseItems = newItems.Select(i =>
            {
                var p = products[i.ProductId];
                decimal qty = i.AcceptedQty ?? i.ReceivedQty ?? i.OrderedQty ?? 0;
                decimal price = i.UnitLandedCost ?? 0;
                return new PurchaseItemDto(
                    i.GrItemId,
                    i.ProductId,
                    p.ProductCode ?? $"SP{i.ProductId}",
                    p.ProductName ?? "Sản phẩm",
                    p.BaseUnit?.UnitName ?? "Cái",
                    qty,
                    price,
                    0,
                    qty * price,
                    i.LotId,
                    null
                );
            }).ToList();

            var totalAmount = PurchaseItemMapper.NetTotal(newItems);

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
                partner.PartnerId,
                partner.PartnerCode ?? $"NCC{partner.PartnerId}",
                partner.PartnerName ?? "Nhà cung cấp",
                partner.Phone,
                partner.Address,
                partner.CurrentPayable ?? 0,
                receipt.ReceivedDate,
                receipt.Status ?? "DRAFT",
                receipt.ReceivedBy,
                receivedByName,
                totalAmount,
                0,
                totalAmount,
                null,
                receipt.Notes,
                responseItems
            );

            return Result.Success(detail);
        }
        catch (Exception ex) when (ex is not DbUpdateConcurrencyException)
        {
            return Result.Failure<PurchaseDetailDto>($"Lỗi khi cập nhật phiếu nhập: {ex.Message}");
        }
    }
}
