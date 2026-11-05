namespace StockFlow.Application.Features.Customers.DTOs;

/// <summary>
/// Một Khách hàng trong danh sách (kèm tổng bán, người tạo, chi nhánh tạo).
/// TotalSales: tổng tiền các hóa đơn đã hoàn thành (trong khoảng thời gian lọc nếu có).
/// TotalSalesNetReturns: tổng bán trừ trả hàng (chưa có nghiệp vụ khách trả hàng → bằng TotalSales).
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
    bool IsOverCreditLimit,
    string? Phone2 = null,
    string? Gender = null,
    DateTime? BirthDate = null,
    string? Facebook = null,
    string? Notes = null,
    DateTime? CreatedAt = null,
    string? CreatedByName = null,
    int? CreatedWarehouseId = null,
    string? CreatedWarehouseName = null,
    decimal TotalSales = 0,
    decimal TotalSalesNetReturns = 0,
    DateTime? LastTransactionDate = null
);

/// <summary>DTO thống kê các chỉ số KPI Khách hàng.</summary>
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

/// <summary>Một hóa đơn trong tab "Lịch sử bán/trả hàng".</summary>
public record CustomerRecentOrderDto(
    int OrderId,
    string OrderCode,
    DateTime? OrderDate,
    decimal TotalAmount,
    string? Status,
    string? SellerName = null,
    string? WarehouseName = null
);

/// <summary>
/// Một dòng sổ "Nợ cần thu từ khách": bán hàng (+), thanh toán (−), số dư lũy kế sau giao dịch.
/// Type: SALE | PAYMENT.
/// </summary>
public record CustomerDebtLedgerEntryDto(
    string Code,
    DateTime? Date,
    string Type,
    string TypeLabel,
    int? ReferenceId,
    decimal Amount,
    decimal BalanceAfter
);

/// <summary>Chi tiết hồ sơ Khách hàng.</summary>
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
    List<CustomerRecentOrderDto> RecentOrders,
    string? Phone2 = null,
    string? Gender = null,
    DateTime? BirthDate = null,
    string? Facebook = null,
    string? Notes = null,
    DateTime? CreatedAt = null,
    string? CreatedByName = null,
    int? CreatedWarehouseId = null,
    string? CreatedWarehouseName = null,
    decimal TotalSales = 0,
    decimal TotalSalesNetReturns = 0,
    List<CustomerDebtLedgerEntryDto>? DebtLedger = null
);

/// <summary>Request tạo mới khách hàng.</summary>
public class CreateCustomerRequest
{
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Phone2 { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Gender { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Facebook { get; set; }
    public string? Notes { get; set; }
    public decimal? CreditLimit { get; set; }
    public string? Status { get; set; }
    /// <summary>Chi nhánh đang làm việc lúc tạo (Chi nhánh tạo)</summary>
    public int? CreatedWarehouseId { get; set; }
}

/// <summary>Request cập nhật khách hàng.</summary>
public class UpdateCustomerRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Phone2 { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Gender { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Facebook { get; set; }
    public string? Notes { get; set; }
    public decimal? CreditLimit { get; set; }
    public decimal? CurrentDebt { get; set; }
    public string? Status { get; set; }
}

/// <summary>Request cập nhật trạng thái hàng loạt.</summary>
public class BatchCustomerStatusRequest
{
    public List<int> PartnerIds { get; set; } = new();
    public string Status { get; set; } = "ACTIVE";
}
