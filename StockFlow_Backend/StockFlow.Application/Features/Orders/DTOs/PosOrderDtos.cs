using System;
using System.Collections.Generic;

namespace StockFlow.Application.Features.Orders.DTOs;

public class PosOrderItemRequest
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public int UnitId { get; set; }
    public decimal OriginalPrice { get; set; }
    public decimal UnitPrice { get; set; }
    public string DiscountType { get; set; } = "AMOUNT"; // "PERCENT" hoặc "AMOUNT"
    public decimal DiscountPercent { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public class CreatePosOrderRequest
{
    public int PartnerId { get; set; }
    public int WarehouseId { get; set; } = 3; // Default Kho Tổng Gia Lâm (K001)
    public string PaymentMethod { get; set; } = "CASH"; // CASH, VIETQR, DEBT
    public decimal SubTotal { get; set; }
    public string DiscountType { get; set; } = "AMOUNT"; // "PERCENT" hoặc "AMOUNT"
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string ExcessAction { get; set; } = "RETURN_CASH"; // "RETURN_CASH" (trả tiền thừa) hoặc "RECORD_DEBT" (tính vào công nợ)
    public decimal VatAmount { get; set; }
    public decimal DeliveryFee { get; set; }
    public string DeliveryType { get; set; } = "COUNTER"; // COUNTER, TRUCK, GRAB
    public string? Notes { get; set; }
    public string Status { get; set; } = "COMPLETED"; // COMPLETED (thanh toán/xuất ngay), DRAFT (lưu tạm)
    public bool IssueStockNow { get; set; } = true;
    public string? ClientRequestId { get; set; } // Chống gửi trùng request (Idempotency)
    public DateTime? OrderDate { get; set; } // Ngày giao dịch (khi lock_transaction_time = false)
    public List<PosOrderItemRequest> Items { get; set; } = new();
}

public class PosOrderResultDto
{
    public int OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public int PartnerId { get; set; }
    public string PartnerName { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public string DiscountType { get; set; } = "AMOUNT";
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public decimal OutstandingAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public int? StockIssueId { get; set; }
    public string? StockIssueCode { get; set; }
    public decimal CustomerCurrentDebt { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class PosOrderSummaryDto
{
    public int OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public string PartnerName { get; set; } = string.Empty;
    public string PartnerPhone { get; set; } = string.Empty;
    public string PartnerCode { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal OutstandingAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? OrderDate { get; set; }
    public int TotalItems { get; set; }
    public int? WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public bool HasReturn { get; set; }
    public string? ReturnCode { get; set; }
    public string? Notes { get; set; }
}
