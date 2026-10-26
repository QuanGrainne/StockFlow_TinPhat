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
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Commands;

public record UpdatePurchaseCommand(int Id, UpdatePurchaseRequest Request) : IRequest<Result<PurchaseDetailDto>>;

public class UpdatePurchaseCommandHandler : IRequestHandler<UpdatePurchaseCommand, Result<PurchaseDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdatePurchaseCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
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

            if (!string.Equals(receipt.Status, "DRAFT", StringComparison.OrdinalIgnoreCase))
            {
                return Result.Failure<PurchaseDetailDto>("Chỉ có thể chỉnh sửa thông tin của phiếu nhập đang ở trạng thái Phiếu tạm (DRAFT).");
            }

            if (req.Items == null || req.Items.Count == 0)
            {
                return Result.Failure<PurchaseDetailDto>("Phiếu nhập hàng phải có ít nhất 1 mặt hàng.");
            }

            foreach (var item in req.Items)
            {
                if (item.Quantity <= 0)
                {
                    return Result.Failure<PurchaseDetailDto>($"Số lượng nhập của sản phẩm ID #{item.ProductId} phải lớn hơn 0.");
                }
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

            var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.MstProducts
                .Include(p => p.BaseUnit)
                .Where(p => productIds.Contains(p.ProductId))
                .ToDictionaryAsync(p => p.ProductId, cancellationToken);

            if (products.Count != productIds.Count)
            {
                return Result.Failure<PurchaseDetailDto>("Một số sản phẩm trong danh sách không tồn tại trong danh mục.");
            }

            // Cập nhật thông tin phiếu
            receipt.PartnerId = partner.PartnerId;
            receipt.ExternalPoNumber = req.ExternalPoNumber?.Trim();
            receipt.ReceivedDate = req.ReceivedDate ?? receipt.ReceivedDate;
            receipt.Notes = req.Notes?.Trim();

            // Xóa các chi tiết cũ và tạo mới danh sách chi tiết
            _context.DtlGoodsReceiptItems.RemoveRange(receipt.DtlGoodsReceiptItems);

            decimal totalAmount = 0;
            var newItems = new List<DtlGoodsReceiptItem>();

            foreach (var item in req.Items)
            {
                decimal effectivePrice = item.UnitPrice * (1 - (item.DiscountPercent / 100m));
                totalAmount += item.Quantity * effectivePrice;

                var dtl = new DtlGoodsReceiptItem
                {
                    GrId = receipt.GrId,
                    ProductId = item.ProductId,
                    OrderedQty = item.Quantity,
                    ReceivedQty = item.Quantity,
                    AcceptedQty = item.Quantity,
                    DefectiveQty = 0,
                    DamagedQty = 0,
                    ShortageQty = 0,
                    UnitLandedCost = Math.Round(effectivePrice, 4, MidpointRounding.AwayFromZero),
                    LotId = item.LotId
                };
                newItems.Add(dtl);
                _context.DtlGoodsReceiptItems.Add(dtl);
            }

            await _context.SaveChangesAsync(cancellationToken);

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
        catch (Exception ex)
        {
            return Result.Failure<PurchaseDetailDto>($"Lỗi khi cập nhật phiếu nhập: {ex.Message}");
        }
    }
}
