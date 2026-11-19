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
    string? LotNumber,
    decimal DefectQuantity = 0, // SL lỗi khi nhận hàng: không vào tồn kho, không tính tiền trả NCC
    decimal DefectReturnedQty = 0 // SL lỗi đã trả NCC ở các phiếu trả hàng lỗi đã hoàn thành
);

/// <summary>
/// Cách tính giá vốn bình quân gia quyền của 1 dòng phiếu nhập đã hoàn thành (lấy từ thẻ kho):
/// Giá vốn sau = (Tồn trước × Giá vốn trước + SL nhập × Giá nhập) / (Tồn trước + SL nhập).
/// </summary>
public record PurchaseCostingDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    decimal QtyBefore,
    decimal CostBefore,
    decimal QtyIn,
    decimal PriceIn,
    decimal QtyAfter,
    decimal CostAfter
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
    decimal ReturnOffsetAmount = 0, // Trả hàng nhập được trừ vào công nợ của phiếu này
    List<PurchaseCostingDto>? Costing = null // Cách tính giá vốn BQ gia quyền (chỉ phiếu đã hoàn thành)
);

/// <summary>Lịch sử trả hàng của phiếu nhập (các phiếu trả hàng nhập THN lập từ phiếu này).</summary>
public record PurchaseReturnSummaryDto(
    int PurchaseReturnId,
    string ReturnCode,
    DateTime? ReturnDate,
    string CreatedByName,
    decimal TotalAmount,
    string Status,
    // STOCK | DEFECT (trả hàng lỗi)
    string ReturnType = "STOCK"
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
    string? LotNumber = null,
    decimal DefectQuantity = 0 // SL lỗi: Quantity là SL đạt (vào kho, tính tiền); SL thực nhận = Quantity + DefectQuantity
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
