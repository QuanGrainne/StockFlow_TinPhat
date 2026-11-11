namespace StockFlow.Application.Common.Inventory;

/// <summary>Chứng từ gây ra biến động kho (ghi vào thẻ kho).</summary>
public sealed record StockRef(string TransactionType, string ReferenceType, int ReferenceId, int UserId);
