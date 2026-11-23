namespace StockFlow.Application.Common;

/// <summary>
/// Một dòng phát sinh công nợ của đối tác (sổ nợ cần thu khách / nợ cần trả NCC).
/// Amount: + tăng nợ, − giảm nợ. Order / Seq dùng xếp các dòng trùng thời gian theo thứ tự nghiệp vụ / thứ tự tạo.
/// </summary>
public sealed record DebtMovement(
    int PartnerId, string Code, DateTime? Date, string Type, string Label, int? Ref, decimal Amount, int Order, int Seq)
{
    /// <summary>Thứ tự sổ: theo thời gian chứng từ (không có thời gian xếp đầu), rồi Order, rồi Seq.</summary>
    public static List<DebtMovement> Sort(IEnumerable<DebtMovement> movements) =>
        movements
            .OrderBy(m => m.Date ?? DateTime.MinValue)
            .ThenBy(m => m.Order)
            .ThenBy(m => m.Seq)
            .ToList();
}
