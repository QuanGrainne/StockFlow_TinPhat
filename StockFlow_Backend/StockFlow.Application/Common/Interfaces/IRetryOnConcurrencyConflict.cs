namespace StockFlow.Application.Common.Interfaces;

/// <summary>
/// Đánh dấu command có cộng / trừ tồn kho: khi gặp xung đột đồng thời trên trx_inventory_balances (token xmin),
/// ConcurrencyRetryBehavior chạy lại toàn bộ handler (đọc lại tồn, kiểm tra lại) tối đa 3 lần (DEF-IT-01).
/// Handler phải để DbUpdateConcurrencyException đi ra ngoài (không bắt rồi trả Result.Failure).
/// </summary>
public interface IRetryOnConcurrencyConflict
{
}
