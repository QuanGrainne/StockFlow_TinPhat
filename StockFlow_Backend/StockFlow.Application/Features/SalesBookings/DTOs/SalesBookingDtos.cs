namespace StockFlow.Application.Features.SalesBookings.DTOs;

public record SalesBookingListDto(
    int OrderId,
    string OrderCode,
    DateTime? OrderDate,
    DateTime? DeliveryDate,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string? PartnerPhone,
    string Status,
    string CreatedByName,
    decimal TotalQuantity,
    decimal DeliveredQuantity,
    decimal TotalAmount,
    decimal PaidAmount,
    string? Notes,
    // Khách đã trả: tiền trả trước + tiền khách trả ở các hóa đơn giao hàng của đơn
    decimal CustomerPaidAmount = 0);

public record SalesBookingItemDto(
    int OrderItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    int UnitId,
    decimal Quantity,
    decimal DeliveredQuantity,
    decimal OriginalPrice,
    string DiscountType,
    decimal DiscountValue,
    decimal UnitPrice,
    decimal LineTotal);

/// <summary>Hóa đơn đã tạo từ đơn đặt hàng</summary>
public record SalesBookingInvoiceDto(
    int OrderId,
    string OrderCode,
    DateTime? OrderDate,
    string CreatedByName,
    decimal TotalAmount,
    decimal DepositAmount,
    string Status);

/// <summary>Phiếu thu của đơn: tiền khách trả trước + tiền thu ở các hóa đơn tạo từ đơn</summary>
public record SalesBookingPaymentDto(
    string Code,
    DateTime? Date,
    string? PaymentMethod,
    decimal Amount,
    string CreatedByName,
    string Status = "COMPLETED");

public record SalesBookingDetailDto(
    int OrderId,
    string OrderCode,
    DateTime? OrderDate,
    DateTime? DeliveryDate,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string? PartnerPhone,
    string? PartnerAddress,
    decimal PartnerDebt,
    decimal PartnerCreditLimit,
    string Status,
    string CreatedByName,
    decimal SubTotal,
    string DiscountType,
    decimal DiscountValue,
    decimal DiscountAmount,
    decimal TotalAmount,
    // Tổng tiền khách đã trả trước
    decimal PaidAmount,
    // Tiền trả trước chưa trừ vào hóa đơn nào
    decimal RemainingDeposit,
    string? Notes,
    int? MergedIntoId,
    string? MergedIntoCode,
    List<string> MergedFromCodes,
    List<SalesBookingItemDto> Items,
    List<SalesBookingInvoiceDto> Invoices,
    List<SalesBookingPaymentDto> Payments,
    // Khách đã trả: tiền trả trước + tiền khách trả ở các hóa đơn giao hàng của đơn
    decimal CustomerPaidAmount = 0);

public class SalesBookingLineRequest
{
    public int ProductId { get; set; }
    public int UnitId { get; set; }
    public decimal Quantity { get; set; }
    /// <summary>Đơn giá (theo bảng giá)</summary>
    public decimal OriginalPrice { get; set; }
    /// <summary>AMOUNT (VNĐ / 1 đơn vị) hoặc PERCENT</summary>
    public string DiscountType { get; set; } = "AMOUNT";
    public decimal DiscountValue { get; set; }
}

public class SaveSalesBookingRequest
{
    public int PartnerId { get; set; }
    public int WarehouseId { get; set; }
    /// <summary>Thời gian đặt (ISO); bỏ trống = giờ hiện tại</summary>
    public DateTime? OrderDate { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string DiscountType { get; set; } = "AMOUNT";
    public decimal DiscountValue { get; set; }
    /// <summary>Khách trả trước (tạo đơn) / khách trả thêm (sửa đơn)</summary>
    public decimal PaidAmount { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public string? Notes { get; set; }
    public List<SalesBookingLineRequest> Items { get; set; } = new();
}

public record SalesBookingSaveResultDto(int OrderId, string OrderCode, string Status, decimal TotalAmount, decimal PaidAmount);
