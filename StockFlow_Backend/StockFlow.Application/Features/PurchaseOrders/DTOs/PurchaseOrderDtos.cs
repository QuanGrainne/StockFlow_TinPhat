namespace StockFlow.Application.Features.PurchaseOrders.DTOs;

public record PurchaseOrderItemRequest(int ProductId, decimal Quantity, decimal UnitPrice, decimal DiscountPercent = 0);

/// <summary>Tạo phiếu đặt hàng nhập. Status: DRAFT (lưu tạm) | ORDERED (đặt hàng).</summary>
public record CreatePurchaseOrderRequest(
    int? WarehouseId,
    int PartnerId,
    DateTime? OrderDate,
    string Status,
    string? Notes,
    List<PurchaseOrderItemRequest> Items,
    string? PoCode = null,
    decimal DiscountAmount = 0
);

public record UpdatePurchaseOrderRequest(
    int PartnerId,
    DateTime? OrderDate,
    string Status,
    string? Notes,
    List<PurchaseOrderItemRequest> Items,
    decimal DiscountAmount = 0
);

/// <summary>Sửa ghi chú phiếu (được sửa ở mọi trạng thái trừ Đã hủy).</summary>
public record UpdatePurchaseOrderNotesRequest(string? Notes);

/// <summary>Gộp các phiếu cùng NCC, cùng kho thành 1 phiếu mới; phiếu gốc chuyển Đã hủy.</summary>
public record MergePurchaseOrdersRequest(List<int> PoIds);

public record PurchaseOrderListDto(
    int PoId,
    string PoCode,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    DateTime? OrderDate,
    string Status,
    string CreatedByName,
    decimal TotalOrderedQty,
    decimal TotalReceivedQty,
    decimal TotalAmount,
    string? Notes
);

/// <summary>
/// Dòng đối chiếu: số lượng đặt ↔ số lượng thực nhập (từ các phiếu nhập đã hoàn thành).
/// Hàng nhập ngoài phiếu đặt có OrderedQty = 0.
/// </summary>
public record PurchaseOrderItemDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    decimal OrderedQty,
    decimal ReceivedQty,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal LineTotal
);

public record PurchaseOrderReceiptDto(
    int GrId,
    string GrCode,
    DateTime? ReceivedDate,
    string ReceivedByName,
    decimal TotalQuantity,
    string Status
);

public record PurchaseOrderDetailDto(
    int PoId,
    string PoCode,
    int WarehouseId,
    string WarehouseName,
    int PartnerId,
    string PartnerCode,
    string PartnerName,
    string? PartnerPhone,
    DateTime? OrderDate,
    string Status,
    string CreatedByName,
    decimal TotalGoodsAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    string? Notes,
    List<PurchaseOrderItemDto> Items,
    List<PurchaseOrderReceiptDto> Receipts,
    string? PartnerAddress = null,
    int? MergedIntoPoId = null,
    string? MergedIntoCode = null,
    List<string>? MergedFromCodes = null,
    decimal PaidAmount = 0  // Đã trả NCC cho các phiếu nhập theo phiếu đặt (kể cả phiếu chi trả thêm sau)
);
