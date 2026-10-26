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
    List<PurchaseItemDto> Items
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
    List<CreatePurchaseItemRequest> Items
);

public record UpdatePurchaseRequest(
    int PartnerId,
    string? ExternalPoNumber,
    DateTime? ReceivedDate,
    string? Notes,
    List<CreatePurchaseItemRequest> Items
);

public record CompletePurchaseRequest(
    decimal PaidAmount = 0,
    string? PaymentMethod = "CASH"
);

public record CancelPurchaseRequest(
    string? Reason = null
);
