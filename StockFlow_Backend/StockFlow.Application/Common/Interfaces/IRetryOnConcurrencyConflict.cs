namespace StockFlow.Application.Common.Interfaces;

/// <summary>
/// Đánh dấu command có trừ/cộng tồn kho: khi gặp xung đột đồng thời trên trx_inventory_balances (token xmin),
/// ConcurrencyRetryBehavior chạy lại toàn bộ handler (đọc lại tồn, kiểm tra lại) tối đa 3 lần.
/// </summary>
public interface IRetryOnConcurrencyConflict
{
}
