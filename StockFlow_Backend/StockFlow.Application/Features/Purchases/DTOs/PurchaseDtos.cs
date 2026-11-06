using System;
using System.Collections.Generic;

namespace StockFlow.Application.Features.Purchases.DTOs;

public record PurchaseItemDto(
    int GrItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal TotalPrice,
    int? LotId,
    string? LotNumber
);

public record PurchaseListDto(
    int GrId,
    string GrCode,
    string? ExternalPoNumber,
    int WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    DateTime? ReceivedDate,
    string Status,
    int ReceivedBy,
    string ReceivedByName,
    int TotalItemsCount,
    decimal TotalQuantity,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal DebtAmount,
    string? Notes
);

public record PurchaseDetailDto(
    int GrId,
    string GrCode,
    string? ExternalPoNumber,
    int WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string? PartnerPhone,
    string? PartnerAddress,
    decimal PartnerCurrentPayable,
    DateTime? ReceivedDate,
    string Status,
    int ReceivedBy,
    string ReceivedByName,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal DebtAmount,
    string? PaymentMethod,
    string? Notes,
    List<PurchaseItemDto> Items,
    decimal TotalGoodsAmount = 0,   // Tổng tiền hàng (trước giảm giá phiếu)
    decimal DiscountAmount = 0,     // Giảm giá phiếu
    List<PurchasePaymentDto>? Payments = null,
    List<PurchaseReturnSummaryDto>? Returns = null,
    decimal ReturnOffsetAmount = 0  // Trả hàng nhập được trừ vào công nợ của phiếu này
);

/// <summary>Lịch sử trả hàng của phiếu nhập (các phiếu trả hàng nhập THN lập từ phiếu này).</summary>
public record PurchaseReturnSummaryDto(
    int PurchaseReturnId,
    string ReturnCode,
    DateTime? ReturnDate,
    string CreatedByName,
    decimal TotalAmount,
    string Status
);

/// <summary>Lịch sử thanh toán của phiếu nhập (trả lúc nhập + các phiếu chi PC phân bổ vào phiếu).</summary>
public record PurchasePaymentDto(
    string Code,
    DateTime? PaymentDate,
    string CreatedByName,
    string PaymentMethod,
    string Status,
    decimal Amount
);

public record CreatePurchaseItemRequest(
    int ProductId,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountPercent = 0,
    int? LotId = null,
    string? LotNumber = null
);

public record CreatePurchaseRequest(
    int? WarehouseId,
    int PartnerId,
    string? ExternalPoNumber,
    DateTime? ReceivedDate,
    string Status, // "DRAFT" hoặc "COMPLETED"
    decimal PaidAmount,
    string? PaymentMethod, // "CASH", "BANK_TRANSFER"
    string? Notes,
    List<CreatePurchaseItemRequest> Items,
    string? PurchaseCode = null,
    decimal DiscountAmount = 0, // Giảm giá toàn phiếu (VND)
    int? PurchaseOrderId = null // Nhập hàng theo phiếu đặt hàng nhập
);

public record UpdatePurchaseRequest(
    int PartnerId,
    string? ExternalPoNumber,
    DateTime? ReceivedDate,
    string? Notes,
    List<CreatePurchaseItemRequest> Items,
    decimal DiscountAmount = 0 // Giảm giá toàn phiếu (VND)
);

public record CompletePurchaseRequest(
    decimal PaidAmount = 0,
    string? PaymentMethod = "CASH"
);

public record CancelPurchaseRequest(
    string? Reason = null
);
