using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.Helpers;

namespace StockFlow.Application.Features.PurchaseReturns.Helpers;

/// <summary>
/// Bù trừ phiếu trả hàng nhập vào phiếu nhập gốc (chỉ phần hiển thị / kiểm tra số tiền, sổ công nợ NCC không đổi).
///
/// Phiếu trả đã hoàn thành ghi giảm công nợ NCC một khoản "Tính vào công nợ" = Tổng cộng − NCC đã trả (tiền mặt).
/// Khoản này được trừ vào số mình còn nợ của chính phiếu nhập gốc:
///   - Phần còn nợ của phiếu nhập (open) = max(0, Tổng cộng − Đã trả NCC).
///   - Các phiếu trả của phiếu nhập được trừ lần lượt theo thời gian: bù trừ = min(khoản tính vào công nợ, open còn lại).
///   - Phiếu nhập: Cần trả NCC = open − Σ bù trừ.
///   - Phiếu trả: NCC cần trả (NCC còn nợ mình) = Tổng cộng − NCC đã trả − bù trừ.
/// Trả hàng không theo phiếu nhập thì không bù trừ (NCC cần trả = Tổng cộng − NCC đã trả).
/// </summary>
public static class ReturnOffsetCalculator
{
    public sealed record Allocation(
        IReadOnlyDictionary<int, decimal> OffsetByReceipt,
        IReadOnlyDictionary<int, decimal> OffsetByReturn);

    public static readonly Allocation Empty = new(new Dictionary<int, decimal>(), new Dictionary<int, decimal>());

    /// <summary>Tính bù trừ khi đã biết phần còn nợ (open) của từng phiếu nhập COMPLETED.</summary>
    public static async Task<Allocation> ComputeAsync(
        IStockFlowDbContext context, IReadOnlyDictionary<int, decimal> openByReceipt, CancellationToken ct)
    {
        if (openByReceipt.Count == 0) return Empty;
        var grIds = openByReceipt.Keys.ToList();

        var returns = await context.TrxPurchaseReturns
            .AsNoTracking()
            .Where(r => r.GrId != null && grIds.Contains(r.GrId.Value) && r.Status == PurchaseReturnLogic.Completed)
            .Select(r => new
            {
                r.PurchaseReturnId,
                GrId = r.GrId!.Value,
                r.ReturnDate,
                Credit = (r.TotalAmount ?? 0) - (r.RefundAmount ?? 0),
            })
            .ToListAsync(ct);

        var byReceipt = new Dictionary<int, decimal>();
        var byReturn = new Dictionary<int, decimal>();
        foreach (var group in returns.GroupBy(r => r.GrId))
        {
            var open = Math.Max(0, openByReceipt.GetValueOrDefault(group.Key));
            decimal applied = 0;
            foreach (var r in group.OrderBy(r => r.ReturnDate).ThenBy(r => r.PurchaseReturnId))
            {
                var offset = Math.Min(Math.Max(0, r.Credit), open - applied);
                byReturn[r.PurchaseReturnId] = offset;
                applied += offset;
            }
            byReceipt[group.Key] = applied;
        }
        return new Allocation(byReceipt, byReturn);
    }

    /// <summary>Tự tải phiếu nhập + thanh toán để tính phần còn nợ rồi bù trừ (dùng cho màn trả hàng nhập).</summary>
    public static async Task<Allocation> ComputeForReceiptsAsync(
        IStockFlowDbContext context, IEnumerable<int> grIds, CancellationToken ct)
    {
        var ids = grIds.Distinct().ToList();
        if (ids.Count == 0) return Empty;

        var receipts = await context.TrxGoodsReceipts
            .AsNoTracking()
            .Include(r => r.DtlGoodsReceiptItems)
            .Where(r => ids.Contains(r.GrId) && r.Status == "COMPLETED")
            .ToListAsync(ct);
        var paid = await PaidByReceiptAsync(context, ids, ct);

        var open = receipts.ToDictionary(
            r => r.GrId,
            r => Math.Max(0, PurchaseItemMapper.NetTotal(r.DtlGoodsReceiptItems) - paid.GetValueOrDefault(r.GrId)));
        return await ComputeAsync(context, open, ct);
    }

    /// <summary>Tổng đã thanh toán (khoản chưa hủy) theo phiếu nhập.</summary>
    public static async Task<Dictionary<int, decimal>> PaidByReceiptAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int> grIds, CancellationToken ct)
    {
        return await context.TrxFinancialTransactions
            .AsNoTracking()
            .Where(t => t.TxType == "SUPPLIER_PAYMENT" && t.Status != "CANCELLED"
                        && t.ReferenceType == "GOODS_RECEIPT" && t.ReferenceId.HasValue && grIds.Contains(t.ReferenceId.Value))
            .GroupBy(t => t.ReferenceId!.Value)
            .Select(g => new { GrId = g.Key, Paid = g.Sum(x => x.Amount ?? 0) })
            .ToDictionaryAsync(x => x.GrId, x => x.Paid, ct);
    }
}
