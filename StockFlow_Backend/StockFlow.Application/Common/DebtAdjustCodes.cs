namespace StockFlow.Application.Common;

/// <summary>
/// Mã phiếu điều chỉnh công nợ (DC000001...) dùng chung cho Khách hàng và Nhà cung cấp:
/// một sequence chung nên mã tăng dần liên tục giữa hai bên, không trùng nhau.
/// </summary>
public static class DebtAdjustCodes
{
    public const string Sequence = "stockflow.seq_debt_adjust";
    public const string Prefix = "DC";
}
