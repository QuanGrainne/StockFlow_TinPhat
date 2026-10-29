using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.DTOs;

namespace StockFlow.Application.Features.Purchases.Queries;

public record GetPurchaseByIdQuery(int Id) : IRequest<Result<PurchaseDetailDto>>;

public class GetPurchaseByIdQueryHandler : IRequestHandler<GetPurchaseByIdQuery, Result<PurchaseDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetPurchaseByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
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

            var payments = await _context.TrxFinancialTransactions
                .AsNoTracking()
                .Where(t => t.ReferenceType == "GOODS_RECEIPT" && t.ReferenceId == receipt.GrId)
                .ToListAsync(cancellationToken);

            decimal paidAmount = payments.Sum(t => t.Amount ?? 0);
            string? paymentMethod = payments.FirstOrDefault()?.PaymentMethod;

            var items = receipt.DtlGoodsReceiptItems.Select(i =>
            {
                decimal qty = i.AcceptedQty ?? i.ReceivedQty ?? i.OrderedQty ?? 0;
                decimal unitPrice = i.UnitLandedCost ?? 0;
                decimal totalPrice = qty * unitPrice;

                return new PurchaseItemDto(
                    i.GrItemId,
                    i.ProductId,
                    i.Product?.ProductCode ?? $"SP{i.ProductId}",
                    i.Product?.ProductName ?? "Sản phẩm",
                    i.Product?.BaseUnit?.UnitName ?? "Cái",
                    qty,
                    unitPrice,
                    0, // Chiết khấu %
                    totalPrice,
                    i.LotId,
                    i.Lot?.LotNumber
                );
            }).ToList();

            decimal totalAmount = items.Sum(i => i.TotalPrice);
            decimal debtAmount = Math.Max(0, totalAmount - paidAmount);

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
                items
            );

            return Result.Success(detail);
        }
        catch (Exception ex)
        {
            return Result.Failure<PurchaseDetailDto>($"Lỗi khi lấy thông tin chi tiết phiếu nhập: {ex.Message}");
        }
    }
}
