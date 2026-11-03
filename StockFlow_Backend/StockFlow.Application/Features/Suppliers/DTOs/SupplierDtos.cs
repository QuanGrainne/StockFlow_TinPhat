namespace StockFlow.Application.Features.Suppliers.DTOs;

/// <summary>
/// DTO đại diện cho một Nhà cung cấp trong danh sách.
/// </summary>
public record WarehouseDebtBreakdownDto(
    int WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    decimal TotalPurchasedAmount,
    decimal BranchPayableAmount,
    int ReceiptsCount
);

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
    string Status,
    decimal TotalPurchased = 0m,
    decimal? BranchPayable = null,
    int? BranchReceiptsCount = null
);

/// <summary>
/// DTO thể hiện chứng từ nhập kho gần đây từ Nhà cung cấp.
/// </summary>
public record SupplierRecentReceiptDto(
    int ReceiptId,
    string ReceiptNumber,
    DateTime? ReceiptDate,
    int? WarehouseId,
    string? WarehouseName,
    decimal TotalAmount,
    string? Status,
    string? CreatedByName = null,
    string Type = "GOODS_RECEIPT"   // GOODS_RECEIPT (phiếu nhập) | PURCHASE_RETURN (phiếu trả hàng nhập)
);

/// <summary>
/// Một dòng trong sổ "Nợ cần trả nhà cung cấp": phiếu nhập làm tăng nợ, thanh toán làm giảm nợ.
/// </summary>
public record SupplierDebtLedgerEntryDto(
    string Code,
    DateTime? Date,
    string Type,          // GOODS_RECEIPT | PAYMENT | OPENING
    string TypeLabel,     // Nhập hàng | Thanh toán | Nợ đầu kỳ
    int? ReferenceId,
    decimal Amount,       // + tăng nợ, - giảm nợ
    decimal BalanceAfter  // Nợ cần trả NCC sau giao dịch
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
    List<SupplierRecentReceiptDto> RecentReceipts,
    List<WarehouseDebtBreakdownDto> WarehouseBreakdown,
    List<SupplierDebtLedgerEntryDto>? DebtLedger = null,
    DateTime? CreatedAt = null,
    string? CreatedByName = null,
    List<SupplierOpenReceiptDto>? OpenReceipts = null
);

/// <summary>Phiếu nhập (COMPLETED) còn nợ — dùng để phân bổ khi tạo phiếu chi thanh toán NCC.</summary>
public record SupplierOpenReceiptDto(
    int ReceiptId,
    string ReceiptNumber,
    DateTime? ReceiptDate,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal RemainingAmount
);

public record SupplierPaymentAllocationRequest(int ReceiptId, decimal Amount);

/// <summary>Tạo phiếu chi thanh toán nợ cho nhà cung cấp.</summary>
public record CreateSupplierPaymentRequest(
    decimal Amount,
    DateTime? PaymentDate,
    string? PaymentMethod,
    string? Notes,
    List<SupplierPaymentAllocationRequest>? Allocations
);

public record SupplierPaymentResultDto(
    string VoucherCode,
    decimal Amount,
    decimal AllocatedAmount,
    decimal RemainingPayable
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
