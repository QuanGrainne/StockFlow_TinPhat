namespace StockFlow.Application.Features.PurchaseReturns.DTOs;

/// <summary>Dòng hàng gửi lên khi tạo / sửa phiếu trả hàng nhập.</summary>
public record PurchaseReturnItemRequest(
    int ProductId,
    decimal Quantity,
    decimal ReturnPrice,
    int? GrItemId = null);

/// <summary>Tạo / cập nhật phiếu trả hàng nhập. Status: DRAFT (lưu tạm) | COMPLETED (hoàn thành).</summary>
public record SavePurchaseReturnRequest(
    int PartnerId,
    List<PurchaseReturnItemRequest> Items,
    int? WarehouseId = null,
    int? GrId = null,
    string? ReturnCode = null,
    DateTime? ReturnDate = null,
    string Status = "DRAFT",
    decimal DiscountAmount = 0,
    decimal RefundAmount = 0,
    string? PaymentMethod = null,
    string? Notes = null);

public record PurchaseReturnItemDto(
    int PrItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    decimal Quantity,
    decimal ImportPrice,
    decimal ReturnPrice,
    decimal TotalPrice,
    int? GrItemId);

public record PurchaseReturnListDto(
    int PurchaseReturnId,
    string ReturnCode,
    DateTime? ReturnDate,
    int? GrId,
    string? GrCode,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    decimal TotalGoodsAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    decimal RefundAmount,
    string Status,
    string CreatedByName,
    string? Notes,
    // Phần "tính vào công nợ" đã được trừ vào số còn nợ của phiếu nhập gốc
    decimal OffsetAmount = 0);

public record PurchaseReturnDetailDto(
    int PurchaseReturnId,
    string ReturnCode,
    DateTime? ReturnDate,
    int? GrId,
    string? GrCode,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string? PartnerPhone,
    string? PartnerAddress,
    decimal PartnerCurrentPayable,
    decimal TotalGoodsAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    decimal RefundAmount,
    string? PaymentMethod,
    string Status,
    int CreatedBy,
    string CreatedByName,
    string? Notes,
    List<PurchaseReturnItemDto> Items,
    List<PurchaseReturnPaymentDto>? Payments = null,
    // Phần "tính vào công nợ" đã được trừ vào số còn nợ của phiếu nhập gốc
    decimal OffsetAmount = 0);

/// <summary>Lịch sử thanh toán (tiền NCC trả lại) của phiếu trả hàng nhập.</summary>
public record PurchaseReturnPaymentDto(
    string Code,
    DateTime? PaymentDate,
    string CreatedByName,
    string PaymentMethod,
    string Status,
    decimal Amount);

/// <summary>Nhà cung cấp trả tiền cho phiếu trả hàng nhập (lập phiếu thu PT...).</summary>
public record CreateSupplierRefundRequest(
    decimal Amount,
    string? PaymentMethod = null,
    DateTime? PaymentDate = null,
    string? Notes = null);

/// <summary>Dòng hàng của phiếu nhập gốc kèm số lượng còn được trả.</summary>
public record ReturnSourceItemDto(
    int GrItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    string? ImageUrl,
    decimal ReceivedQty,
    decimal ReturnedQty,
    decimal RemainingQty,
    decimal ImportPrice,
    decimal CurrentStock,
    // Giá vốn thực của dòng = Giá nhập sau khi phân bổ giảm giá cả phiếu nhập (UnitLandedCost)
    decimal LandedCost = 0);

/// <summary>Dữ liệu phiếu nhập dùng để lập phiếu trả hàng nhập.</summary>
public record ReturnSourceDto(
    int GrId,
    string GrCode,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    decimal PartnerCurrentPayable,
    List<ReturnSourceItemDto> Items);
