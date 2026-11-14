namespace StockFlow.Application.Features.SalesReturns.DTOs;

public record SalesReturnListDto(
    int ReturnId,
    string ReturnCode,
    DateTime? ReturnDate,
    int InvoiceId,
    string InvoiceCode,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string CreatedByName,
    decimal TotalQuantity,
    decimal TotalGoodsAmount,
    decimal TotalAmount,
    decimal RefundAmount,
    string Status,
    string? Notes);

public record SalesReturnItemDto(
    int ReturnItemId,
    int OrderItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    decimal Quantity,
    decimal SalePrice,
    decimal ReturnPrice,
    decimal LineTotal);

public record SalesReturnDetailDto(
    int ReturnId,
    string ReturnCode,
    DateTime? ReturnDate,
    int InvoiceId,
    string InvoiceCode,
    DateTime? InvoiceDate,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string CreatedByName,
    string Status,
    decimal TotalGoodsAmount,
    decimal DiscountAmount,
    decimal ReturnFee,
    decimal TotalAmount,
    decimal RefundAmount,
    string? PaymentMethod,
    string? Notes,
    List<SalesReturnItemDto> Items,
    // Phiếu chi trả tiền khách của phiếu trả (lúc trả hàng + trả thêm sau)
    List<SalesReturnRefundDto>? Refunds = null);

public record SalesReturnRefundDto(
    string Code,
    DateTime? Date,
    string? PaymentMethod,
    decimal Amount,
    string CreatedByName,
    string Status,
    string? Notes);

/// <summary>Dòng hàng của hóa đơn gốc để trả (BR-19: SL còn được trả = đã mua − đã trả ở phiếu trả khác)</summary>
public record SalesReturnSourceItemDto(
    int OrderItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    int UnitId,
    string? ImageUrl,
    decimal SoldQuantity,
    decimal ReturnedQuantity,
    decimal RemainingQuantity,
    decimal SalePrice);

public record SalesReturnSourceDto(
    int InvoiceId,
    string InvoiceCode,
    DateTime? InvoiceDate,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string? PartnerPhone,
    decimal PartnerDebt,
    bool IsWalkIn,
    string SellerName,
    List<SalesReturnSourceItemDto> Items,
    /// <summary>Tổng tiền hàng của hóa đơn (trước giảm giá hóa đơn) — cơ sở phân bổ giảm giá cho hàng trả</summary>
    decimal InvoiceSubTotal = 0,
    /// <summary>Giảm giá tổng hóa đơn</summary>
    decimal InvoiceDiscount = 0);

public class SalesReturnLineRequest
{
    public int OrderItemId { get; set; }
    /// <summary>Trả nhanh (không có hóa đơn): hàng hóa được trả</summary>
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    /// <summary>Giá nhập lại (tiền trả khách / 1 đơn vị)</summary>
    public decimal ReturnPrice { get; set; }
}

public class CreateSalesReturnRequest
{
    /// <summary>Hóa đơn gốc; 0 = Trả nhanh (dùng PartnerId, WarehouseId, ProductId của từng dòng)</summary>
    public int InvoiceId { get; set; }
    /// <summary>Trả nhanh: khách hàng (0 = Khách lẻ)</summary>
    public int PartnerId { get; set; }
    /// <summary>Trả nhanh: chi nhánh nhận hàng trả</summary>
    public int WarehouseId { get; set; }
    public DateTime? ReturnDate { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ReturnFee { get; set; }
    /// <summary>Tiền trả khách ngay; phần còn lại trừ vào công nợ khách</summary>
    public decimal RefundAmount { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public string? Notes { get; set; }
    public List<SalesReturnLineRequest> Items { get; set; } = new();
}

/// <summary>Trả thêm tiền cho khách sau khi đã tạo phiếu trả (lúc trả hàng chưa trả đủ)</summary>
public class AddSalesReturnRefundRequest
{
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public DateTime? RefundDate { get; set; }
    public string? Notes { get; set; }
}

public record SalesReturnResultDto(int ReturnId, string ReturnCode, decimal TotalAmount, decimal RefundAmount);
