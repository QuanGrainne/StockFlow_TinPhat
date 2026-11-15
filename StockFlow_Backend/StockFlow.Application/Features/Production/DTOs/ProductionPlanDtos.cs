namespace StockFlow.Application.Features.Production.DTOs;

// ─── Kế hoạch sản xuất (UC-PP-01..06, mã tạm, chưa có trong Report 3) ─────────────

/// <summary>Một dòng trong danh sách kế hoạch (UC-PP-01).</summary>
public record ProductionPlanSummaryDto(
    int ProductionPlanId,
    string PlanCode,
    string PlanName,
    DateTime PlanDate,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    string Status,
    int CreatedBy,
    string CreatedByName,
    int? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovalDate,
    int ItemCount,
    decimal TotalPlannedQuantity,
    /// <summary>Tổng số đã lập lệnh (không tính lệnh đã hủy, BR-PP-10)</summary>
    decimal TotalOrderedQuantity,
    /// <summary>Tỷ lệ đã lập lệnh (%), tối đa 100</summary>
    decimal OrderedPercent,
    /// <summary>Số lệnh còn hiệu lực (không tính lệnh đã hủy)</summary>
    int OrderCount,
    /// <summary>Lần ghi gần nhất; client gửi lại khi sửa để phát hiện sửa đồng thời (Q-V5)</summary>
    DateTime? UpdatedAt = null,
    string? UpdatedByName = null
);

/// <summary>Dòng kế hoạch kèm tiến độ (BR-PP-10, BR-PP-11).</summary>
public record ProductionPlanItemDto(
    int ProductionPlanItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    bool HasActiveBom,
    decimal PlannedQuantity,
    DateOnly PlannedStartDate,
    DateOnly PlannedEndDate,
    int? WarehouseId,
    string? WarehouseName,
    string? Notes,
    /// <summary>Số đã lập lệnh (lệnh chưa hủy)</summary>
    decimal OrderedQuantity,
    /// <summary>Số còn lại = kế hoạch − đã lập lệnh, không âm</summary>
    decimal RemainingQuantity,
    /// <summary>Số thành phẩm đã nhập kho theo các lệnh của kế hoạch</summary>
    decimal ReceivedQuantity
);

/// <summary>Lệnh sản xuất thuộc kế hoạch (kể cả lệnh đã hủy, để tra cứu).</summary>
public record ProductionPlanOrderDto(
    int ProductionOrderId,
    string ProductionOrderCode,
    string Status,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Workshop,
    decimal PlannedQuantity,
    decimal ActualQuantity,
    string CreatedByName,
    List<ProductionPlanOrderItemDto> Items
);

public record ProductionPlanOrderItemDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    decimal PlannedQuantity,
    decimal ActualQuantity
);

/// <summary>Thao tác người dùng hiện tại được làm với kế hoạch (backend tính theo trạng thái và chức năng được cấp).</summary>
public record ProductionPlanActionsDto(
    bool CanEdit,
    /// <summary>True khi chỉ được sửa hạn chế (kế hoạch Đã duyệt, BR-PP-13)</summary>
    bool IsLimitedEdit,
    bool CanSubmit,
    bool CanApprove,
    bool CanReject,
    bool CanCancel,
    bool CanClose,
    bool CanCreateOrder
);

public record ProductionPlanDetailDto(
    ProductionPlanSummaryDto Summary,
    string? Notes,
    List<ProductionPlanItemDto> Items,
    List<ProductionPlanOrderDto> Orders,
    ProductionPlanActionsDto Actions
);

// ─── Request ────────────────────────────────────────────────────────────────

/// <summary>
/// Dòng kế hoạch gửi lên khi lập / sửa. Dòng được nhận diện theo thành phẩm (mỗi thành phẩm một dòng, BR-PP-06).
/// Ngày để kiểu cho phép rỗng để validator bắt được trường bị thiếu (V-01); thiếu thì không lưu.
/// </summary>
public record SaveProductionPlanItemInput(
    int ProductId,
    decimal PlannedQuantity,
    DateOnly? PlannedStartDate,
    DateOnly? PlannedEndDate,
    int? WarehouseId,
    string? Notes
);

public record SaveProductionPlanRequest(
    string PlanName,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd,
    string? Notes,
    List<SaveProductionPlanItemInput> Items,
    /// <summary>
    /// Khi sửa: giá trị UpdatedAt của bản client đang xem. Khác bản trong DB nghĩa là đã có người sửa trước → từ chối (Q-V5).
    /// Bỏ trống thì không kiểm (giữ tương thích).
    /// </summary>
    DateTime? ExpectedUpdatedAt = null
);

/// <summary>Lý do từ chối / hủy (bắt buộc).</summary>
public record ProductionPlanReasonRequest(string? Reason);

// ─── Nhu cầu NVL dự kiến (UC-PP-03) ─────────────────────────────────────────────

public record PlanMaterialRequirementLineDto(
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    /// <summary>Nhu cầu theo tổng số kế hoạch</summary>
    decimal RequiredQty,
    /// <summary>Nhu cầu theo số còn lại chưa lập lệnh</summary>
    decimal RemainingRequiredQty,
    /// <summary>Tồn thực tế tại kho đã chọn (null khi chưa chọn kho); chưa trừ phần các lệnh đang mở sẽ dùng (Q8)</summary>
    decimal? AvailableQty,
    decimal? ShortageQty,
    decimal? RemainingShortageQty
);

public record PlanProductWithoutBomDto(int ProductId, string ProductCode, string ProductName);

public record PlanMaterialRequirementsDto(
    int? WarehouseId,
    List<PlanMaterialRequirementLineDto> Materials,
    /// <summary>Thành phẩm chưa có BOM đang áp dụng: không tính vào nhu cầu</summary>
    List<PlanProductWithoutBomDto> ProductsWithoutBom,
    int ShortageCount,
    int RemainingShortageCount
);

public record PreviewPlanMaterialItemInput(int ProductId, decimal PlannedQuantity);

public record PreviewPlanMaterialRequirementsRequest(int? WarehouseId, List<PreviewPlanMaterialItemInput> Items);
