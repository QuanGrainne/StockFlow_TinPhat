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
    int ReviewFlagCount
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
    bool FromBom
);

public record MaterialIssueItemDto(
    int RequirementId,
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal Quantity
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
    List<FinishedGoodsReceiptDto> Receipts
);

public record SaveProductionOrderRequest(
    int ProductId,
    decimal PlannedQuantity,
    DateTime? Deadline,
    string? Workshop,
    string? Notes
);

public record CloseProductionOrderRequest(string? Reason);

public record AdjustMaterialNormLine(
    /// <summary>Dòng nhu cầu đang có; null = thêm NVL mới vào lệnh</summary>
    int? RequirementId,
    int MaterialId,
    decimal NormPerUnit,
    decimal WastageRate,
    /// <summary>Bỏ NVL khỏi lệnh (chỉ khi chưa xuất, BR-52)</summary>
    bool Remove
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
    string? ReviewNote
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
    decimal? AvailableQty
);

public record WarehouseLocationDto(int LocationId, string? LocationCode, string? LocationName);
