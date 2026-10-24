using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.DTOs;

namespace StockFlow.Application.Features.Suppliers.Queries;

/// <summary>
/// Truy vấn chi tiết một Nhà cung cấp kèm lịch sử các chứng từ nhập kho gần đây.
/// </summary>
public record GetSupplierByIdQuery(int PartnerId) : IRequest<Result<SupplierDetailDto>>;

public class GetSupplierByIdQueryHandler : IRequestHandler<GetSupplierByIdQuery, Result<SupplierDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetSupplierByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<SupplierDetailDto>> Handle(GetSupplierByIdQuery request, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PartnerId == request.PartnerId, cancellationToken);

        if (partner == null)
        {
            return Result.Failure<SupplierDetailDto>("Không tìm thấy thông tin nhà cung cấp.");
        }

        // Lấy danh sách phiếu nhập kho phát sinh từ nhà cung cấp này
        var receipts = await _context.TrxGoodsReceipts
            .Include(r => r.Warehouse)
            .Include(r => r.DtlGoodsReceiptItems)
            .Where(r => r.PartnerId == request.PartnerId)
            .OrderByDescending(r => r.ReceivedDate ?? DateTime.MinValue)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        int totalCount = receipts.Count;
        decimal totalAmount = receipts.Sum(r =>
            r.DtlGoodsReceiptItems.Sum(item => (item.ReceivedQty ?? 0) * (item.UnitLandedCost ?? 0)));

        var recentReceiptDtos = receipts.Take(10).Select(r =>
        {
            var receiptTotal = r.DtlGoodsReceiptItems.Sum(item => (item.ReceivedQty ?? 0) * (item.UnitLandedCost ?? 0));
            return new SupplierRecentReceiptDto(
                ReceiptId: r.GrId,
                ReceiptNumber: r.GrCode ?? r.ExternalPoNumber ?? $"PNK-{r.GrId:D6}",
                ReceiptDate: r.ReceivedDate,
                WarehouseId: r.WarehouseId,
                WarehouseName: r.Warehouse?.WarehouseName ?? $"Kho #{r.WarehouseId}",
                TotalAmount: receiptTotal,
                Status: r.Status ?? "COMPLETED"
            );
        }).ToList();

        // Tính phân bổ công nợ và tổng tiền mua theo từng Kho / Chi nhánh
        var warehouseBreakdown = receipts
            .GroupBy(r => new { r.WarehouseId, Code = r.Warehouse?.WarehouseCode, Name = r.Warehouse?.WarehouseName })
            .Select(g =>
            {
                var whPurchased = g.Sum(r => r.DtlGoodsReceiptItems.Sum(item => (item.ReceivedQty ?? 0) * (item.UnitLandedCost ?? 0)));
                var currentTotalPayable = partner.CurrentPayable ?? 0m;
                decimal branchDebt = totalAmount > 0 
                    ? Math.Round(currentTotalPayable * (whPurchased / totalAmount), 0)
                    : 0m;

                return new WarehouseDebtBreakdownDto(
                    WarehouseId: g.Key.WarehouseId,
                    WarehouseCode: g.Key.Code ?? $"K{g.Key.WarehouseId:D3}",
                    WarehouseName: g.Key.Name ?? $"Kho #{g.Key.WarehouseId}",
                    TotalPurchasedAmount: whPurchased,
                    BranchPayableAmount: branchDebt > 0 ? branchDebt : (currentTotalPayable > 0 ? currentTotalPayable : whPurchased),
                    ReceiptsCount: g.Count()
                );
            })
            .OrderByDescending(b => b.TotalPurchasedAmount)
            .ToList();

        var detailDto = new SupplierDetailDto(
            Id: partner.PartnerId.ToString(),
            PartnerId: partner.PartnerId,
            Code: partner.PartnerCode ?? $"NCC{partner.PartnerId:D6}",
            Name: partner.PartnerName ?? "",
            Type: partner.PartnerType ?? "SUPPLIER",
            Phone: partner.Phone,
            Email: partner.Email,
            Address: partner.Address,
            CreditLimit: partner.CreditLimit ?? 0m,
            CurrentPayable: partner.CurrentPayable ?? 0m,
            CurrentDebt: partner.CurrentDebt ?? 0m,
            Status: partner.IsActive != false ? "ACTIVE" : "INACTIVE",
            TotalReceiptsCount: totalCount,
            TotalPurchasedAmount: totalAmount,
            RecentReceipts: recentReceiptDtos,
            WarehouseBreakdown: warehouseBreakdown
        );

        return Result.Success(detailDto);
    }
}
