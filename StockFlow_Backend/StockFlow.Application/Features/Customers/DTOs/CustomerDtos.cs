namespace StockFlow.Application.Features.Customers.DTOs;

/// <summary>
/// DTO đại diện cho một Khách hàng trong danh sách.
/// </summary>
public record CustomerDto(
    string Id,
    int PartnerId,
    string Code,
    string Name,
    string Type,
    string? Phone,
    string? Email,
    string? Address,
    decimal CreditLimit,
    decimal CurrentDebt,
    decimal CurrentPayable,
    string Status,
    bool IsOverCreditLimit
);

/// <summary>
/// DTO thống kê các chỉ số KPI Khách hàng.
/// </summary>
public record CustomerStatsDto(
    int TotalCustomers,
    int NewThisMonth,
    int ActiveCustomers,
    decimal ActivePercentage,
    int InactiveCustomers,
    decimal TotalDebt,
    int DebtCustomersCount,
    int OverdueCount,
    decimal TotalCreditLimit,
    decimal CreditUsagePercent
);

/// <summary>
/// DTO đơn hàng gần đây của Khách hàng.
/// </summary>
public record CustomerRecentOrderDto(
    int OrderId,
    string OrderCode,
    DateTime? OrderDate,
    decimal TotalAmount,
    string? Status
);

/// <summary>
/// DTO thông tin chi tiết đầy đủ hồ sơ Khách hàng.
/// </summary>
public record CustomerDetailDto(
    string Id,
    int PartnerId,
    string Code,
    string Name,
    string Type,
    string? Phone,
    string? Email,
    string? Address,
    decimal CreditLimit,
    decimal CurrentDebt,
    decimal CurrentPayable,
    string Status,
    bool IsOverCreditLimit,
    List<CustomerRecentOrderDto> RecentOrders
);

/// <summary>
/// Request tạo mới khách hàng.
/// </summary>
public class CreateCustomerRequest
{
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal? CreditLimit { get; set; }
    public string? Status { get; set; }
}

/// <summary>
/// Request cập nhật khách hàng.
/// </summary>
public class UpdateCustomerRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal? CreditLimit { get; set; }
    public decimal? CurrentDebt { get; set; }
    public string? Status { get; set; }
}

/// <summary>
/// Request cập nhật trạng thái hàng loạt.
/// </summary>
public class BatchCustomerStatusRequest
{
    public List<int> PartnerIds { get; set; } = new();
    public string Status { get; set; } = "ACTIVE";
}
