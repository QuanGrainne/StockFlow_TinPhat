// src/features/production/types/productionPlan.ts
// Kiểu dữ liệu Kế hoạch sản xuất (UC-PP-01..06), khớp DTO backend ProductionPlanDtos.cs.
// Ngày kỳ / dòng kế hoạch là DateOnly phía backend → chuỗi yyyy-MM-dd.

export type ProductionPlanStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'CANCELLED';

export interface ProductionPlanSummary {
  productionPlanId: number;
  planCode: string;
  planName: string;
  planDate: string;
  periodStart: string;
  periodEnd: string;
  status: ProductionPlanStatus;
  createdBy: number;
  createdByName: string;
  approvedBy: number | null;
  approvedByName: string | null;
  approvalDate: string | null;
  itemCount: number;
  totalPlannedQuantity: number;
  /** Tổng số đã lập lệnh (không tính lệnh đã hủy) */
  totalOrderedQuantity: number;
  orderedPercent: number;
  /** Số lệnh còn hiệu lực */
  orderCount: number;
  /** Lần ghi gần nhất — gửi lại khi sửa để backend phát hiện sửa đồng thời */
  updatedAt?: string | null;
  updatedByName?: string | null;
}

export interface ProductionPlanItem {
  productionPlanItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  hasActiveBom: boolean;
  plannedQuantity: number;
  plannedStartDate: string;
  plannedEndDate: string;
  warehouseId: number | null;
  warehouseName: string | null;
  notes: string | null;
  orderedQuantity: number;
  remainingQuantity: number;
  receivedQuantity: number;
}

export interface ProductionPlanOrderItem {
  productId: number;
  productCode: string;
  productName: string;
  plannedQuantity: number;
  actualQuantity: number;
}

export interface ProductionPlanOrder {
  productionOrderId: number;
  productionOrderCode: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startDate: string | null;
  endDate: string | null;
  workshop: string | null;
  plannedQuantity: number;
  actualQuantity: number;
  createdByName: string;
  items: ProductionPlanOrderItem[];
}

/** Thao tác người dùng được làm — backend tính, frontend chỉ đọc */
export interface ProductionPlanActions {
  canEdit: boolean;
  /** Kế hoạch đã duyệt: chỉ sửa số lượng, ngày, kho nhận, ghi chú, thêm dòng */
  isLimitedEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canClose: boolean;
  canCreateOrder: boolean;
}

export interface ProductionPlanDetail {
  summary: ProductionPlanSummary;
  notes: string | null;
  items: ProductionPlanItem[];
  orders: ProductionPlanOrder[];
  actions: ProductionPlanActions;
}

export interface SaveProductionPlanItemInput {
  productId: number;
  plannedQuantity: number;
  /** yyyy-MM-dd */
  plannedStartDate: string;
  /** yyyy-MM-dd */
  plannedEndDate: string;
  warehouseId: number | null;
  notes: string | null;
}

export interface SaveProductionPlanPayload {
  planName: string;
  periodStart: string;
  periodEnd: string;
  notes: string | null;
  items: SaveProductionPlanItemInput[];
  /** Khi sửa: summary.updatedAt của bản đang xem (khác bản trong DB thì backend từ chối) */
  expectedUpdatedAt?: string | null;
}

export interface PlanMaterialRequirementLine {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  requiredQty: number;
  remainingRequiredQty: number;
  availableQty: number | null;
  shortageQty: number | null;
  remainingShortageQty: number | null;
}

export interface PlanMaterialRequirements {
  warehouseId: number | null;
  materials: PlanMaterialRequirementLine[];
  productsWithoutBom: { productId: number; productCode: string; productName: string }[];
  shortageCount: number;
  remainingShortageCount: number;
}

export interface ProductionPlanListParams {
  statuses?: string[];
  fromDate?: string;
  toDate?: string;
  search?: string;
}
