using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Suppliers.Helpers;

/// <summary>
/// Quy tắc tính tiền hàng / công nợ nhà cung cấp dùng chung cho danh sách và chi tiết NCC.
/// - Chỉ phiếu nhập COMPLETED mới phát sinh tiền hàng và công nợ (phiếu tạm DRAFT, phiếu hủy thì không).
/// - Tiền hàng của phiếu = Σ (SL thực nhận × đơn giá sau chiết khấu), làm tròn đến đồng.
/// - Đã trả cho phiếu = Σ giao dịch SUPPLIER_PAYMENT tham chiếu GOODS_RECEIPT của phiếu đó.
/// - Nợ của phiếu = max(0, tiền hàng − đã trả).
/// </summary>
public static class SupplierDebtCalculator
{
    public const string PaymentTxType = "SUPPLIER_PAYMENT";
    public const string GoodsReceiptRef = "GOODS_RECEIPT";

    public static bool IsCompleted(TrxGoodsReceipt r) =>
        string.Equals(r.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase);

    public static bool IsActivePayment(TrxFinancialTransaction t) =>
        string.Equals(t.TxType, PaymentTxType, StringComparison.OrdinalIgnoreCase) &&
        !string.Equals(t.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase);

    /// <summary>Tiền hàng của một phiếu nhập (yêu cầu đã Include DtlGoodsReceiptItems).</summary>
    public static decimal ReceiptTotal(TrxGoodsReceipt r) =>
        RoundReceiptTotal(r.DtlGoodsReceiptItems.Sum(i => (i.AcceptedQty ?? i.ReceivedQty ?? i.OrderedQty ?? 0) * (i.UnitLandedCost ?? 0)));

    /// <summary>Làm tròn tiền hàng phiếu nhập đến đồng (dùng khi tổng dòng đã cộng sẵn ở DB).</summary>
    public static decimal RoundReceiptTotal(decimal rawTotal) =>
        Math.Round(rawTotal, 0, MidpointRounding.AwayFromZero);

    /// <summary>Tổng đã thanh toán theo từng phiếu nhập (key = GrId).</summary>
    public static Dictionary<int, decimal> PaidByReceipt(IEnumerable<TrxFinancialTransaction> payments) =>
        payments
            .Where(t => IsActivePayment(t) &&
                        string.Equals(t.ReferenceType, GoodsReceiptRef, StringComparison.OrdinalIgnoreCase) &&
                        t.ReferenceId.HasValue)
            .GroupBy(t => t.ReferenceId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount ?? 0));

    /// <summary>Nợ còn lại của phiếu nhập COMPLETED.</summary>
    public static decimal ReceiptDebt(TrxGoodsReceipt r, IReadOnlyDictionary<int, decimal> paidByReceipt) =>
        IsCompleted(r)
            ? Math.Max(0, ReceiptTotal(r) - paidByReceipt.GetValueOrDefault(r.GrId))
            : 0;
}
