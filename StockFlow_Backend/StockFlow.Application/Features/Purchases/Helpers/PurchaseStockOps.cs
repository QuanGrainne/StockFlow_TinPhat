using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Helpers;

/// <summary>
/// Thao tác tồn kho theo giá vốn bình quân gia quyền:
/// - Nhập kho: cộng tồn + tính lại giá vốn BQ (phiếu nhập hoàn thành, hủy phiếu trả hàng nhập...).
/// - Xuất ngược: trừ tồn + tính ngược giá vốn BQ (hủy / sửa phiếu nhập đã hoàn thành, trả hàng nhập...).
/// Mỗi thao tác đều ghi 1 dòng thẻ kho (TrxInventoryTransaction).
/// Phần lõi nằm ở Common/Inventory/InventoryLedger (IInventoryLedger); các hàm dưới đây giữ chữ ký cũ cho code đang gọi.
/// </summary>
public static class PurchaseStockOps
{
    /// <summary>Giá nhập trên phiếu (đơn giá sau giảm giá của dòng, chưa phân bổ giảm giá tổng phiếu) — Giá GD trên thẻ kho.</summary>
    public static decimal LinePrice(DtlGoodsReceiptItem item) =>
        Math.Round((item.UnitPrice ?? item.UnitLandedCost ?? 0) * (1 - (item.DiscountPercent ?? 0) / 100m), 2, MidpointRounding.AwayFromZero);

    public static decimal Quantity(DtlGoodsReceiptItem item) =>
        item.AcceptedQty ?? item.ReceivedQty ?? item.OrderedQty ?? 0;

    /// <summary>Tồn kho và giá vốn hiện tại tại một vị trí.</summary>
    public static Task<(decimal Quantity, decimal UnitCost)> GetBalanceAsync(
        IStockFlowDbContext context, StockKey key, CancellationToken ct) =>
        new InventoryLedger(context).GetBalanceAsync(key, ct);

    /// <summary>Cộng tồn kho theo giá vốn bình quân gia quyền.</summary>
    public static Task InboundAsync(
        IStockFlowDbContext context,
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null) =>
        new InventoryLedger(context).InboundAsync(key, qty, price, products, reference, ct, transactionPrice);

    /// <summary>
    /// Trừ tồn và tính ngược giá vốn BQ: (Tồn × Giá − SL × Giá xuất) / (Tồn − SL);
    /// hết tồn hoặc ra số âm thì giữ nguyên giá vốn hiện tại. Cho phép tồn âm (theo chính sách hiện tại).
    /// </summary>
    public static Task OutboundAsync(
        IStockFlowDbContext context,
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null) =>
        new InventoryLedger(context).OutboundAsync(key, qty, price, products, reference, ct, transactionPrice);

    private static StockKey KeyOf(TrxGoodsReceipt receipt, DtlGoodsReceiptItem item) =>
        new(receipt.WarehouseId, item.ProductId, item.LocationId, item.LotId);

    /// <summary>Nhập kho 1 dòng phiếu nhập (giống lúc hoàn thành phiếu nhập).</summary>
    public static Task ApplyInboundAsync(
        IStockFlowDbContext context,
        TrxGoodsReceipt receipt,
        DtlGoodsReceiptItem item,
        IReadOnlyDictionary<int, MstProduct> products,
        string transactionType,
        int userId,
        CancellationToken ct) =>
        InboundAsync(context, KeyOf(receipt, item), Quantity(item), item.UnitLandedCost ?? 0, products,
            new StockRef(transactionType, "GOODS_RECEIPT", receipt.GrId, userId), ct, LinePrice(item));

    /// <summary>Đảo nhập kho 1 dòng phiếu nhập (khi hủy / sửa phiếu đã nhập).</summary>
    public static Task ReverseInboundAsync(
        IStockFlowDbContext context,
        TrxGoodsReceipt receipt,
        DtlGoodsReceiptItem item,
        IReadOnlyDictionary<int, MstProduct> products,
        string transactionType,
        int userId,
        CancellationToken ct) =>
        OutboundAsync(context, KeyOf(receipt, item), Quantity(item), item.UnitLandedCost ?? 0, products,
            new StockRef(transactionType, "GOODS_RECEIPT", receipt.GrId, userId), ct, LinePrice(item));
}
