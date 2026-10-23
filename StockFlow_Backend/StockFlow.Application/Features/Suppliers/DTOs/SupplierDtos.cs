namespace StockFlow.Application.Features.Suppliers.DTOs;

/// <summary>
/// DTO đại diện cho một Nhà cung cấp trong danh sách.
/// </summary>
public record SupplierDto(
    string Id,
    int PartnerId,
    string Code,
    string Name,
    string Type,
    string? Phone,
    string? Email,
    string? Address,
    decimal CreditLimit,
    decimal CurrentPayable,
    decimal CurrentDebt,
    string Status
);

/// <summary>
/// DTO thể hiện chứng từ nhập kho gần đây từ Nhà cung cấp.
/// </summary>
public record SupplierRecentReceiptDto(
    int ReceiptId,
    string ReceiptNumber,
    DateTime? ReceiptDate,
    string? WarehouseName,
    decimal TotalAmount,
    string? Status
);

/// <summary>
/// DTO chi tiết đầy đủ thông tin hồ sơ và các giao dịch nhập hàng của Nhà cung cấp.
/// </summary>
public record SupplierDetailDto(
    string Id,
    int PartnerId,
    string Code,
    string Name,
    string Type,
    string? Phone,
    string? Email,
    string? Address,
    decimal CreditLimit,
    decimal CurrentPayable,
    decimal CurrentDebt,
    string Status,
    int TotalReceiptsCount,
    decimal TotalPurchasedAmount,
    List<SupplierRecentReceiptDto> RecentReceipts
);

/// <summary>
/// Request payload khi tạo mới Nhà cung cấp.
/// </summary>
public class CreateSupplierRequest
{
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal? CreditLimit { get; set; }
    public decimal? InitialPayable { get; set; }
}

/// <summary>
/// Request payload khi cập nhật thông tin Nhà cung cấp.
/// </summary>
public class UpdateSupplierRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal? CreditLimit { get; set; }
    public decimal? CurrentPayable { get; set; }
    public bool? IsActive { get; set; }
}
