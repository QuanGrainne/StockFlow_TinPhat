namespace StockFlow.Application.Features.Production.DTOs;

// DTO module Sản xuất (UC-44–50, UC-57–61). Không có trường giá/giá vốn (BR-39).

// ─── BOM / định mức NVL (UC-57) ─────────────────────────────────────────────

public record BomSummaryDto(
    int BomId,
    string BomCode,
    string Version,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    bool IsActive,
    int MaterialCount,
    DateTime? CreatedAt,
    string? Description,
    /// <summary>Đã có lệnh sản xuất dùng BOM này (không sửa/xoá được, BR-06)</summary>
    bool IsUsed
);

public record BomItemDto(
    int BomItemId,
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal Quantity,
    decimal WastageRate,
    /// <summary>Định mức sau hao hụt cho 1 đơn vị thành phẩm</summary>
    decimal TotalPerUnit
);

public record BomDetailDto(BomSummaryDto Summary, List<BomItemDto> Items);

public record SaveBomItemRequest(int MaterialId, decimal Quantity, decimal WastageRate);

public record SaveBomRequest(
    int ProductId,
    string? BomCode,
    string? Version,
    string? Description,
    List<SaveBomItemRequest> Items,
    /// <summary>Lưu xong kích hoạt luôn (bản đang áp dụng cũ chuyển ngừng áp dụng)</summary>
    bool Activate
);

// ─── Lệnh sản xuất (UC-44, UC-58/59, UC-60, UC-61) ──────────────────────────

public record ProductionOrderProductItemDto(
    int ProductionOrderItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    int BomId,
    string BomCode,
    string BomVersion,
    decimal PlannedQuantity,
    decimal ReceivedQuantity,
    decimal RemainingQuantity,
    decimal ProgressPercent,
    string? Notes
);

public record ProductionOrderSummaryDto(
    int ProductionOrderId,
    string Code,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    int BomId,
    string BomCode,
    string BomVersion,
    decimal PlannedQuantity,
    decimal ReceivedQuantity,
    decimal DefectQuantity,
    decimal ProgressPercent,
    DateTime? CreatedDate,
    DateTime? Deadline,
    string? Workshop,
    string Status,
    string CreatedByName,
    /// <summary>FULL = đã xuất đủ NVL; SHORTAGE = còn NVL thiếu</summary>
    string MaterialStatus,
    int ShortageLineCount,
    /// <summary>Số phiếu nhập thành phẩm bị gắn cờ cần Manager xem xét (BR-37)</summary>
    int ReviewFlagCount,
    /// <summary>Đã lập đủ phiếu xuất NVL (mọi dòng nhu cầu đều đã xuất đủ)</summary>
    bool IsFullyIssued = false,
    /// <summary>Đã lập đủ phiếu nhập thành phẩm (mọi thành phẩm trong lệnh đều đã nhập đủ SL kế hoạch)</summary>
    bool IsFullyReceived = false,
    List<ProductionOrderProductItemDto>? Items = null,
    /// <summary>Kế hoạch sản xuất sinh ra lệnh (null = lệnh lập trực tiếp, Q4)</summary>
    int? ProductionPlanId = null,
    string? ProductionPlanCode = null,
    // Kho xuất NVL của kế hoạch sinh ra lệnh: có thì phiếu xuất NVL bắt buộc xuất tại kho này
    int? PlanWarehouseId = null,
    string? PlanWarehouseName = null
);

public record ProductionMaterialDto(
    int RequirementId,
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal NormPerUnit,
    decimal WastageRate,
    decimal RequiredQty,
    decimal IssuedQty,
    decimal ShortageQty,
    /// <summary>Tồn khả dụng tại kho đang xem (null khi chưa chọn kho / không có quyền kho)</summary>
    decimal? AvailableQty,
    bool IsAdjusted,
    string? AdjustReason,
    string? AdjustedByName,
    DateTime? AdjustedAt,
    bool FromBom,
    int? ProductionOrderItemId = null,
    int? FinishedProductId = null,
    string? FinishedProductCode = null,
    string? FinishedProductName = null
);

public record MaterialIssueItemDto(
    int RequirementId,
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal Quantity,
    string? FinishedProductCode = null,
    string? FinishedProductName = null
);

public record MaterialIssueDto(
    int StockIssueId,
    string IssueCode,
    DateTime? IssueDate,
    int ProductionOrderId,
    string ProductionOrderCode,
    string ProductName,
    int WarehouseId,
    string WarehouseName,
    bool IsSupplementary,
    string? Reason,
    string CreatedByName,
    decimal TotalQuantity,
    List<MaterialIssueItemDto> Items
);

public record FinishedGoodsReceiptDto(
    int FgrId,
    string FgrCode,
    DateTime? ReceivedDate,
    int ProductionOrderId,
    string ProductionOrderCode,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    int WarehouseId,
    string WarehouseName,
    string? LocationName,
    string? LotNumber,
    DateOnly? ProductionDate,
    decimal AcceptedQuantity,
    decimal DefectQuantity,
    string? DefectReason,
    bool NeedsReview,
    string? ReviewNote,
    string? Notes,
    string ReceivedByName
);

public record ProductionOrderDetailDto(
    ProductionOrderSummaryDto Summary,
    string? Notes,
    int? AvailabilityWarehouseId,
    List<ProductionMaterialDto> Materials,
    List<MaterialIssueDto> Issues,
    List<FinishedGoodsReceiptDto> Receipts,
    List<ProductionOrderProductItemDto>? Items = null
);

public record SaveProductionOrderMaterialInput(
    int MaterialId,
    decimal NormPerUnit,
    decimal WastageRate,
    int? SourceBomItemId = null
);

public record SaveProductionOrderItemInput(
    int ProductId,
    decimal PlannedQuantity,
    string? Notes = null,
    List<SaveProductionOrderMaterialInput>? CustomMaterials = null,
    string? AdjustReason = null
);

public record SaveProductionOrderRequest(
    int ProductId,
    decimal PlannedQuantity,
    DateTime? Deadline,
    string? Workshop,
    string? Notes,
    List<SaveProductionOrderItemInput>? Items = null,
    /// <summary>Không còn dùng khi lập / sửa lệnh: lệnh bắt buộc theo đúng BOM (gửi lên sẽ bị từ chối)</summary>
    List<SaveProductionOrderMaterialInput>? CustomMaterials = null,
    string? AdjustReason = null,
    /// <summary>Kho NVL để kiểm tra tồn theo BOM (kho làm việc); để trống = không kiểm tra</summary>
    int? WarehouseId = null,
    /// <summary>Đã xác nhận vẫn lưu lệnh khi thiếu NVL (cảnh báo được ghi vào ghi chú lệnh)</summary>
    bool ConfirmShortage = false,
    /// <summary>Mã yêu cầu do client sinh, chống tạo trùng. Chỉ dùng khi lập lệnh từ kế hoạch (Q-V6); lập lệnh trực tiếp bỏ qua.</summary>
    string? ClientRequestId = null
);

public record CloseProductionOrderRequest(string? Reason);

/// <summary>SL thực tế của 1 thành phẩm khi Duyệt hoàn thành (ProductionOrderItemId null = lệnh cũ 1 thành phẩm)</summary>
public record ApproveProductionOrderLine(
    int? ProductionOrderItemId,
    decimal AcceptedQuantity,
    decimal DefectQuantity,
    string? DefectReason);

/// <summary>
/// Duyệt hoàn thành lệnh sản xuất: hệ thống tự sinh phiếu nhập thành phẩm cho từng thành phẩm có SL &gt; 0
/// vào kho thành phẩm đã chọn rồi đóng lệnh. LotNumber để trống → dùng mã lệnh.
/// </summary>
public record ApproveProductionOrderRequest(
    int WarehouseId,
    int? LocationId,
    string? LotNumber,
    DateOnly? ProductionDate,
    string? Notes,
    /// <summary>Ghi chú bắt buộc khi có cảnh báo dùng NVL (BR-37)</summary>
    string? ReviewNote,
    List<ApproveProductionOrderLine> Lines,
    /// <summary>Đã xác nhận nhập vượt SL kế hoạch</summary>
    bool ConfirmExceedPlan = false,
    /// <summary>Vị trí lưu kho chọn từ trường "Vị trí" của danh mục Hàng hóa (không bắt buộc)</summary>
    string? LocationName = null);

public record AdjustMaterialNormLine(
    /// <summary>Dòng nhu cầu đang có; null = thêm NVL mới vào lệnh</summary>
    int? RequirementId,
    int MaterialId,
    decimal NormPerUnit,
    decimal WastageRate,
    /// <summary>Bỏ NVL khỏi lệnh (chỉ khi chưa xuất, BR-52)</summary>
    bool Remove,
    int? ProductionOrderItemId = null
);

public record AdjustMaterialNormRequest(string? Reason, List<AdjustMaterialNormLine> Lines);

public record RequirementPreviewItemDto(
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal NormPerUnit,
    decimal WastageRate,
    decimal RequiredQty,
    decimal? AvailableQty,
    decimal? ShortageQty
);

public record RequirementPreviewDto(
    int ProductId,
    int BomId,
    string BomCode,
    string BomVersion,
    List<RequirementPreviewItemDto> Materials
);

// ─── Xuất NVL sản xuất (UC-46/47/48) ────────────────────────────────────────

public record CreateMaterialIssueItemRequest(int RequirementId, decimal Quantity);

public record CreateMaterialIssueRequest(
    int ProductionOrderId,
    int WarehouseId,
    bool IsSupplementary,
    string? Reason,
    List<CreateMaterialIssueItemRequest> Items
);

// ─── Nhập thành phẩm (UC-49/50) ─────────────────────────────────────────────

public record CreateFinishedGoodsReceiptRequest(
    int ProductionOrderId,
    int WarehouseId,
    int? LocationId,
    decimal AcceptedQuantity,
    decimal DefectQuantity,
    string? DefectReason,
    string? LotNumber,
    DateOnly? ProductionDate,
    string? Notes,
    /// <summary>Ghi chú bắt buộc khi có cảnh báo dùng NVL (BR-37, MSG43)</summary>
    string? ReviewNote,
    int? ProductionOrderItemId = null,
    /// <summary>Cho phép lưu phiếu nhập khi số lượng vượt kế hoạch (xác nhận Có trên popup cảnh báo)</summary>
    bool ConfirmExceedPlan = false
);

public record MaterialUsageWarningDto(
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal NeededQty,
    decimal IssuedQty
);

public record FinishedGoodsCheckDto(
    decimal PlannedQuantity,
    decimal ReceivedQuantity,
    decimal RemainingQuantity,
    List<MaterialUsageWarningDto> Warnings
);

// ─── Tra cứu dùng trong form sản xuất ───────────────────────────────────────

public record ProductionProductLookupDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    string? ProductType,
    bool HasActiveBom,
    decimal? AvailableQty,
    // Ảnh hàng hóa (đường dẫn /api/uploads/...) để hiện trong ô tìm của form sản xuất
    string? ImageUrl = null
);

