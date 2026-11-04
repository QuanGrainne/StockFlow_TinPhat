using System;
using System.Collections.Generic;

namespace StockFlow.Application.Features.Orders.DTOs;

public class OrderDetailDto
{
    // A. Header đơn hàng
    public int OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public string OrderType { get; set; } = "INVOICE"; // "INVOICE" (Hóa đơn bán hàng) hoặc "BOOKING" (Đơn đặt hàng)
    public string DocumentType { get; set; } = "SALES_INVOICE"; // "SALES_INVOICE" (Hóa đơn bán hàng) hoặc "SALES_ORDER" (Đơn đặt hàng)
    public string Status { get; set; } = "COMPLETED"; // COMPLETED, PENDING, DRAFT, CANCELLED
    public string PaymentStatus { get; set; } = "PAID"; // PAID, PARTIAL, DEBT, UNPAID
    public DateTime? OrderDate { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string CreatedByUsername { get; set; } = string.Empty;
    public int? UpdatedById { get; set; }
    public string? UpdatedByName { get; set; }
    public int? WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public string SalesRepName { get; set; } = "Trần Minh Tuấn";
    public string? Notes { get; set; }
    public string? PriceBookName { get; set; }

    // B. Thông tin khách hàng
    public OrderCustomerDto Customer { get; set; } = new();

    // C. Danh sách sản phẩm
    public List<OrderItemDetailDto> Items { get; set; } = new();
    public decimal TotalQuantity { get; set; }
    public decimal ItemsTotalAmount { get; set; }
    public decimal ItemsDiscountAmount { get; set; }

    // D. Tổng kết giá trị đơn hàng
    public decimal SubTotal { get; set; } // Tổng tiền hàng trước chiết khấu toàn đơn
    public decimal ItemDiscountTotal { get; set; } // Tổng giảm giá cấp dòng sản phẩm
    public decimal SubTotalAfterItemDiscount { get; set; }
    public string OrderDiscountType { get; set; } = "AMOUNT";
    public decimal OrderDiscountValue { get; set; }
    public decimal OrderDiscountAmount { get; set; } // Chiết khấu toàn đơn
    public decimal DeliveryFee { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal OutstandingAmount { get; set; }

    // E. Lịch sử thanh toán
    public List<OrderPaymentTransactionDto> PaymentTransactions { get; set; } = new();

    // F. Thông tin xuất kho
    public List<OrderStockIssueDto> StockIssues { get; set; } = new();

    // G. Thông tin trả hàng
    public List<OrderReturnRequestDto> ReturnRequests { get; set; } = new();

    // H. Lịch sử xử lý đơn hàng (Timeline)
    public List<OrderTimelineEventDto> TimelineEvents { get; set; } = new();
}

public class OrderCustomerDto
{
    public int PartnerId { get; set; }
    public string PartnerCode { get; set; } = string.Empty;
    public string PartnerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string TaxCode { get; set; } = string.Empty;
    public string PartnerGroup { get; set; } = "Bán lẻ";
    public decimal CurrentDebt { get; set; }
    public decimal CreditLimit { get; set; }
}

public class OrderItemDetailDto
{
    public int OrderItemId { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? Barcode { get; set; }
    public int UnitId { get; set; }
    public string UnitName { get; set; } = "Cái";
    public decimal Quantity { get; set; }
    public decimal OriginalPrice { get; set; }
    public string DiscountType { get; set; } = "AMOUNT";
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string? WarehouseName { get; set; }
    public string? LotNumber { get; set; }
    public string? ExpiryDate { get; set; }
}

public class OrderPaymentTransactionDto
{
    public int TxId { get; set; }
    public string TxCode { get; set; } = string.Empty;
    public DateTime? TransactionDate { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public decimal Amount { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string Status { get; set; } = "COMPLETED";
    public string? Description { get; set; }
}

public class OrderStockIssueDto
{
    public int StockIssueId { get; set; }
    public string IssueCode { get; set; } = string.Empty;
    public string Status { get; set; } = "COMPLETED";
    public DateTime? IssueDate { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string ProcessedByName { get; set; } = string.Empty;
    public List<OrderStockIssueItemDto> Items { get; set; } = new();
}

public class OrderStockIssueItemDto
{
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal RequestedQty { get; set; }
    public decimal ActualIssuedQty { get; set; }
    public string? LotNumber { get; set; }
    public string? ExpiryDate { get; set; }
}

public class OrderReturnRequestDto
{
    public int ReturnRequestId { get; set; }
    public string ReturnCode { get; set; } = string.Empty;
    public DateTime? RequestDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public List<OrderReturnItemDto> Items { get; set; } = new();
}

public class OrderReturnItemDto
{
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class OrderTimelineEventDto
{
    public DateTime Timestamp { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string EventType { get; set; } = "INFO"; // CREATED, PAYMENT, ISSUE, RETURN, STATUS
}

