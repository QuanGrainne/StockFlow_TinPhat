namespace StockFlow.Application.Features.Customers.DTOs;

/// <summary>Manager điều chỉnh hạn mức một khách.</summary>
public class UpdateCustomerCreditLimitRequest
{
    public decimal NewLimit { get; set; }
    public string? Reason { get; set; }
}

/// <summary>Manager điều chỉnh hạn mức nhiều khách.</summary>
public class BatchUpdateCustomerCreditLimitRequest
{
    public List<int> PartnerIds { get; set; } = new();
    /// <summary>SET (đặt bằng Value) | PERCENT (tăng/giảm Value %) | RESET_DEFAULT (đưa về hạn mức mặc định)</summary>
    public string Mode { get; set; } = CreditLimitBatchModes.Set;
    public decimal Value { get; set; }
    public string? Reason { get; set; }
}

public static class CreditLimitBatchModes
{
    public const string Set = "SET";
    public const string Percent = "PERCENT";
    public const string ResetDefault = "RESET_DEFAULT";

    public static bool IsValid(string? mode) => mode is Set or Percent or ResetDefault;
}

public record CreditLimitChangeDto(
    int PartnerId,
    string? PartnerCode,
    string? PartnerName,
    decimal OldLimit,
    decimal NewLimit,
    decimal CurrentDebt);

public record CreditLimitSkipDto(
    int PartnerId,
    string? PartnerCode,
    string? PartnerName,
    decimal CurrentLimit,
    decimal ProposedLimit,
    decimal CurrentDebt,
    string Reason);

public record BatchCreditLimitResultDto(
    List<CreditLimitChangeDto> Updated,
    List<CreditLimitSkipDto> Skipped);

public record CreditLimitHistoryDto(
    long HistoryId,
    DateTime ChangedAt,
    decimal OldLimit,
    decimal NewLimit,
    string Source,
    string? Reason,
    int? RequestId,
    string? RequestCode,
    string? ChangedByName);
