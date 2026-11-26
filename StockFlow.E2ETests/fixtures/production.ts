// Arrange lệnh sản xuất qua API bằng Admin: định mức (BOM) → kế hoạch → gửi duyệt → duyệt → lập lệnh từ kế hoạch.
// Chỉ dựng tiền đề cho UC-44 / UC-45 (và khoá kiểm kho SYS-STK-02); thao tác đang kiểm làm qua UI.
import type { ApiSession } from './api';
import { WAREHOUSES, type WarehouseCode } from './accounts';

export interface ProductionOrderRef {
  orderId: number;
  orderCode: string;
  planId: number;
  bomId: number;
}

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export interface ApprovedPlanRef {
  planId: number;
  planCode: string;
  bomId: number;
}

/** Kế hoạch sản xuất đã duyệt (chưa lập lệnh) cho thành phẩm fgId; dùng lại định mức đang áp dụng nếu đã có */
export async function arrangeApprovedPlan(
  admin: ApiSession,
  opts: { uid: string; fgId: number; materials: { id: number; norm: number }[]; qty: number; wh: WarehouseCode }
): Promise<ApprovedPlanRef> {
  const existing = await admin.get<{ bomId: number; isActive?: boolean | null }[]>(`/api/production/boms?productId=${opts.fgId}`);
  const active = existing.find((b) => b.isActive !== false);
  const bom = active
    ? { summary: { bomId: active.bomId } }
    : await admin.post<{ summary: { bomId: number } }>('/api/production/boms', {
        productId: opts.fgId,
        version: '1.0',
        items: opts.materials.map((m) => ({ materialId: m.id, quantity: m.norm, wastageRate: 0 })),
        activate: true,
      });
  const today = new Date();
  const end = new Date(today.getTime() + 30 * 86_400_000);
  const warehouseId = WAREHOUSES[opts.wh].id;
  const plan = await admin.post<{ summary: { productionPlanId: number; planCode: string } }>('/api/production/plans', {
    planName: `KH E2E ${opts.uid}`,
    periodStart: isoDate(today),
    periodEnd: isoDate(end),
    items: [{ productId: opts.fgId, plannedQuantity: opts.qty * 5, plannedStartDate: isoDate(today), plannedEndDate: isoDate(end), warehouseId }],
    warehouseId,
  });
  const planId = plan.summary.productionPlanId;
  await admin.post(`/api/production/plans/${planId}/submit`);
  await admin.post(`/api/production/plans/${planId}/approve`);
  return { planId, planCode: plan.summary.planCode, bomId: bom.summary.bomId };
}

/** Lệnh sản xuất cho thành phẩm fgId với các NVL (định mức / 1 đơn vị), kho xuất NVL = wh */
export async function arrangeProductionOrder(
  admin: ApiSession,
  opts: { uid: string; fgId: number; materials: { id: number; norm: number }[]; qty: number; wh: WarehouseCode }
): Promise<ProductionOrderRef> {
  const plan = await arrangeApprovedPlan(admin, opts);
  const order = await admin.post<{ summary: { productionOrderId: number; code: string } }>(`/api/production/plans/${plan.planId}/orders`, {
    productId: opts.fgId,
    plannedQuantity: opts.qty,
    deadline: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    warehouseId: WAREHOUSES[opts.wh].id,
    confirmShortage: true,
    clientRequestId: `e2e-${opts.uid}`,
  });
  return { orderId: order.summary.productionOrderId, orderCode: order.summary.code, planId: plan.planId, bomId: plan.bomId };
}

export async function cancelProductionOrder(admin: ApiSession, orderId: number): Promise<void> {
  await admin.post(`/api/production/orders/${orderId}/cancel`);
}

interface OrderDetailDto {
  summary: { items?: { productionOrderItemId: number }[] | null };
  materials: { requirementId: number; materialId: number; requiredQty: number }[];
}

/** Xuất NVL cho lệnh (theo requirementId của NVL đầu tiên) – dựng số "Đã xuất" */
export async function issueMaterial(
  admin: ApiSession,
  orderId: number,
  wh: WarehouseCode,
  qty: number,
  opts: { supplementary?: boolean; reason?: string } = {}
): Promise<void> {
  const d = await admin.get<OrderDetailDto>(`/api/production/orders/${orderId}?warehouseId=${WAREHOUSES[wh].id}`);
  await admin.post('/api/production/material-issues', {
    productionOrderId: orderId,
    warehouseId: WAREHOUSES[wh].id,
    isSupplementary: opts.supplementary ?? false,
    reason: opts.reason ?? null,
    items: [{ requirementId: d.materials[0].requirementId, quantity: qty }],
  });
}

/** Manager duyệt hoàn thành: hệ thống tự sinh phiếu nhập thành phẩm rồi đóng lệnh */
export async function approveCompletion(
  admin: ApiSession,
  orderId: number,
  wh: WarehouseCode,
  accepted: number,
  opts: { defect?: number; defectReason?: string; confirmExceed?: boolean } = {}
): Promise<void> {
  const d = await admin.get<OrderDetailDto>(`/api/production/orders/${orderId}?warehouseId=${WAREHOUSES[wh].id}`);
  await admin.post(`/api/production/orders/${orderId}/approve`, {
    warehouseId: WAREHOUSES[wh].id,
    locationId: null,
    lotNumber: null,
    productionDate: null,
    notes: 'E2E arrange',
    reviewNote: 'E2E arrange',
    lines: [{ productionOrderItemId: d.summary.items?.[0]?.productionOrderItemId ?? null, acceptedQuantity: accepted, defectQuantity: opts.defect ?? 0, defectReason: opts.defectReason ?? null }],
    confirmExceedPlan: opts.confirmExceed ?? false,
  });
}
