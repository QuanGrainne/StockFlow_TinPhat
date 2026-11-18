// src/features/production/types/index.ts
// Kiểu dữ liệu module Sản xuất (khớp DTO backend Features/Production). Không có trường giá (BR-39).

// ─── BOM / định mức NVL (UC-57) ───────────────────────────────────────────────

export interface BomSummary {
  bomId: number;
  bomCode: string;
  version: string;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  isActive: boolean;
  materialCount: number;
  createdAt: string | null;
  description: string | null;
  /** Đã có lệnh sản xuất dùng BOM này (không sửa / xoá được) */
  isUsed: boolean;
}

export interface BomItem {
  bomItemId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  quantity: number;
  wastageRate: number;
  totalPerUnit: number;
}

export interface BomDetail {
  summary: BomSummary;
  items: BomItem[];
}

export interface SaveBomPayload {
  productId: number;
  bomCode?: string | null;
  version?: string | null;
  description?: string | null;
  items: { materialId: number; quantity: number; wastageRate: number }[];
  activate: boolean;
}

// ─── Lệnh sản xuất (UC-44, UC-58/59) ──────────────────────────────────────────

export type ProductionOrderStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ProductionOrderProductItem {
  productionOrderItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  bomId: number;
  bomCode: string;
  bomVersion: string;
  plannedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  progressPercent: number;
  notes: string | null;
}

export interface ProductionOrderSummary {
  productionOrderId: number;
  code: string;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  bomId: number;
  bomCode: string;
  bomVersion: string;
  plannedQuantity: number;
  receivedQuantity: number;
  defectQuantity: number;
  progressPercent: number;
  createdDate: string | null;
  deadline: string | null;
  workshop: string | null;
  status: ProductionOrderStatus;
  createdByName: string;
  /** FULL = đã xuất đủ NVL; SHORTAGE = còn NVL thiếu */
  materialStatus: 'FULL' | 'SHORTAGE';
  shortageLineCount: number;
  /** Số phiếu nhập thành phẩm cần Manager xem xét (BR-37) */
  reviewFlagCount: number;
  /** Đã lập đủ phiếu xuất NVL */
  isFullyIssued?: boolean;
  /** Đã lập đủ phiếu nhập thành phẩm */
  isFullyReceived?: boolean;
  /** Danh sách thành phẩm trong lệnh (1..N) */
  items?: ProductionOrderProductItem[];
  /** Kế hoạch sản xuất sinh ra lệnh (null = lệnh lập trực tiếp) */
  productionPlanId?: number | null;
  productionPlanCode?: string | null;
}

export interface ProductionMaterial {
  requirementId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  normPerUnit: number;
  wastageRate: number;
  requiredQty: number;
  issuedQty: number;
  shortageQty: number;
  /** Tồn tại kho đang xem (null nếu chưa chọn kho / không có quyền kho) */
  availableQty: number | null;
  isAdjusted: boolean;
  adjustReason: string | null;
  adjustedByName: string | null;
  adjustedAt: string | null;
  fromBom: boolean;
  productionOrderItemId?: number | null;
  finishedProductId?: number | null;
  finishedProductCode?: string | null;
  finishedProductName?: string | null;
}

export interface MaterialIssueItem {
  requirementId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  quantity: number;
  finishedProductCode?: string | null;
  finishedProductName?: string | null;
}

export interface MaterialIssue {
  stockIssueId: number;
  issueCode: string;
  issueDate: string | null;
  productionOrderId: number;
  productionOrderCode: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  isSupplementary: boolean;
  reason: string | null;
  createdByName: string;
  totalQuantity: number;
  items: MaterialIssueItem[];
}

export interface FinishedGoodsReceipt {
  fgrId: number;
  fgrCode: string;
  receivedDate: string | null;
  productionOrderId: number;
  productionOrderCode: string;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  warehouseId: number;
  warehouseName: string;
  locationName: string | null;
  lotNumber: string | null;
  productionDate: string | null;
  acceptedQuantity: number;
  defectQuantity: number;
  defectReason: string | null;
  needsReview: boolean;
  reviewNote: string | null;
  notes: string | null;
  receivedByName: string;
}

export interface ProductionOrderDetail {
  summary: ProductionOrderSummary;
  notes: string | null;
  availabilityWarehouseId: number | null;
  materials: ProductionMaterial[];
  issues: MaterialIssue[];
  receipts: FinishedGoodsReceipt[];
}

export interface SaveProductionOrderItemInput {
  productId: number;
  plannedQuantity: number;
  notes?: string | null;
}

/** Lệnh sản xuất bắt buộc đúng công thức BOM đang áp dụng (không gửi định mức tự chỉnh / NVL ngoài BOM). */
export interface SaveProductionOrderPayload {
  productId: number;
  plannedQuantity: number;
  /** yyyy-MM-dd */
  deadline: string | null;
  workshop: string | null;
  notes: string | null;
  items?: SaveProductionOrderItemInput[] | null;
  /** Kho làm việc để kiểm tra thiếu NVL (BR-31) */
  warehouseId?: number | null;
  adjustReason?: string | null;
  /** Mã yêu cầu chống tạo trùng — chỉ dùng khi lập lệnh từ kế hoạch */
  clientRequestId?: string | null;
}

export interface AdjustNormLine {
  requirementId: number | null;
  materialId: number;
  normPerUnit: number;
  wastageRate: number;
  remove: boolean;
  productionOrderItemId?: number | null;
}

export interface RequirementPreviewItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  normPerUnit: number;
  wastageRate: number;
  requiredQty: number;
  availableQty: number | null;
  shortageQty: number | null;
}

export interface RequirementPreview {
  productId: number;
  bomId: number;
  bomCode: string;
  bomVersion: string;
  materials: RequirementPreviewItem[];
}

// ─── Xuất NVL / nhập thành phẩm (UC-46, UC-49) ────────────────────────────────

export interface CreateMaterialIssuePayload {
  productionOrderId: number;
  warehouseId: number;
  isSupplementary: boolean;
  reason: string | null;
  items: { requirementId: number; quantity: number }[];
}

export interface CreateFinishedGoodsReceiptPayload {
  productionOrderId: number;
  warehouseId: number;
  locationId: number | null;
  acceptedQuantity: number;
  defectQuantity: number;
  defectReason: string | null;
  lotNumber: string;
  /** yyyy-MM-dd */
  productionDate: string | null;
  notes: string | null;
  reviewNote: string | null;
  productionOrderItemId?: number | null;
  productId?: number | null;
  confirmExceedPlan?: boolean;
}

/** Duyệt hoàn thành lệnh: SL thực tế từng thành phẩm → hệ thống tự sinh phiếu nhập thành phẩm rồi đóng lệnh */
export interface ApproveProductionOrderLine {
  productionOrderItemId: number | null;
  acceptedQuantity: number;
  defectQuantity: number;
  defectReason: string | null;
}

export interface ApproveProductionOrderPayload {
  warehouseId: number;
  locationId: number | null;
  lotNumber: string | null;
  /** yyyy-MM-dd */
  productionDate: string | null;
  notes: string | null;
  reviewNote: string | null;
  lines: ApproveProductionOrderLine[];
  confirmExceedPlan?: boolean;
  /** Vị trí lưu kho chọn từ trường "Vị trí" của danh mục Hàng hóa (không bắt buộc) */
  locationName?: string | null;
}

export interface MaterialUsageWarning {
  materialCode: string;
  materialName: string;
  unitName: string;
  neededQty: number;
  issuedQty: number;
}

export interface FinishedGoodsCheck {
  plannedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  warnings: MaterialUsageWarning[];
}

// ─── Tra cứu ──────────────────────────────────────────────────────────────────

export interface ProductionProductLookup {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  productType: string | null;
  hasActiveBom: boolean;
  availableQty: number | null;
}

// ─── Bộ lọc danh sách ─────────────────────────────────────────────────────────

export interface ProductionListFilter {
  statuses: string[];
  timeRange: string;
  dateFrom?: string;
  dateTo?: string;
  /** Lọc kho (danh sách phiếu xuất / nhập); rỗng = mọi kho được phân quyền */
  warehouseIds: number[];
  /** Chỉ phiếu / lệnh cần Manager xem xét (BR-37) */
  needsReviewOnly: boolean;
}

// ─── Kế hoạch sản xuất (UC-PP-01..06) ────────────────────────────────────────
export * from './productionPlan';
export * from './mrp';

