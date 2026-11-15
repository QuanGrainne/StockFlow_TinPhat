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
            i.Lot?.LotNumber,
            i.DefectiveQty ?? 0);
    }

    /// <summary>
    /// Kiểm tra SL lỗi của dòng nhập: không âm, tối đa 2 chữ số thập phân. Trả về thông báo lỗi hoặc null.
    /// SL đạt (Quantity) vẫn phải &gt; 0 — dòng lỗi toàn bộ thì bỏ khỏi phiếu và ghi chú lý do.
    /// </summary>
    public static string? ValidateDefect(CreatePurchaseItemRequest item)
    {
        if (item.DefectQuantity < 0)
            return $"Số lượng lỗi của sản phẩm ID #{item.ProductId} không được âm.";
        if (decimal.Round(item.DefectQuantity, 2) != item.DefectQuantity)
            return $"Số lượng lỗi của sản phẩm ID #{item.ProductId} có tối đa 2 chữ số thập phân.";
        return null;
    }

    /// <summary>Dòng chi tiết phiếu nhập: SL thực nhận = SL đạt + SL lỗi; chỉ SL đạt vào kho và tính tiền.</summary>
    public static DtlGoodsReceiptItem NewItem(CreatePurchaseItemRequest item, decimal landedCost)
    {
        var defect = Math.Max(0, item.DefectQuantity);
        return new DtlGoodsReceiptItem
        {
            ProductId = item.ProductId,
            OrderedQty = item.Quantity + defect,
            ReceivedQty = item.Quantity + defect,
            AcceptedQty = item.Quantity,
            DefectiveQty = defect,
            DamagedQty = 0,
            ShortageQty = 0,
            UnitLandedCost = landedCost,
            UnitPrice = item.UnitPrice,
            DiscountPercent = Math.Clamp(item.DiscountPercent, 0, 100),
            LotId = item.LotId,
        };
    }

    /// <summary>Số tiền cần trả NCC của phiếu = Σ SL × giá vốn thực (đã trừ giảm giá dòng + phiếu).</summary>
    public static decimal NetTotal(IEnumerable<DtlGoodsReceiptItem> items) =>
        Math.Round(items.Sum(i => PurchaseStockOps.Quantity(i) * (i.UnitLandedCost ?? 0)), 0, MidpointRounding.AwayFromZero);
}
