using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Helpers;

/// <summary>Chuyển dòng phiếu nhập sang DTO hiển thị (đơn giá gốc, % giảm dòng, thành tiền trước giảm giá phiếu).</summary>
public static class PurchaseItemMapper
{
    public static PurchaseItemDto ToDto(DtlGoodsReceiptItem i)
    {
        var qty = PurchaseStockOps.Quantity(i);
        // Dữ liệu cũ chưa lưu đơn giá gốc → dùng giá vốn thực, giảm 0%
        var unitPrice = i.UnitPrice ?? i.UnitLandedCost ?? 0;
        var discountPercent = i.UnitPrice.HasValue ? i.DiscountPercent ?? 0 : 0;
        var lineTotal = Math.Round(qty * unitPrice * (1 - discountPercent / 100m), 0, MidpointRounding.AwayFromZero);

        return new PurchaseItemDto(
            i.GrItemId,
            i.ProductId,
            i.Product?.ProductCode ?? $"SP{i.ProductId}",
            i.Product?.ProductName ?? "Sản phẩm",
            i.Product?.BaseUnit?.UnitName ?? "Cái",
            qty,
            unitPrice,
            discountPercent,
            lineTotal,
            i.LotId,
            i.Lot?.LotNumber);
    }

    /// <summary>Số tiền cần trả NCC của phiếu = Σ SL × giá vốn thực (đã trừ giảm giá dòng + phiếu).</summary>
    public static decimal NetTotal(IEnumerable<DtlGoodsReceiptItem> items) =>
        Math.Round(items.Sum(i => PurchaseStockOps.Quantity(i) * (i.UnitLandedCost ?? 0)), 0, MidpointRounding.AwayFromZero);
}
