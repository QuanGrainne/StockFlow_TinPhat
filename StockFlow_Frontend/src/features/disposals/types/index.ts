// src/features/disposals/types/index.ts
// Kiểu dữ liệu Xuất hủy — khớp DTO backend Features/Disposals/DTOs/DisposalDtos.cs

/** DRAFT = Phiếu tạm (chưa trừ tồn) · COMPLETED = Hoàn thành (đã trừ tồn kho) */
export type DisposalStatus = 'DRAFT' | 'COMPLETED';

export interface DisposalSummary {
  disposalId: number;
  disposalCode: string;
  warehouseId: number;
  warehouseName: string;
  disposalDate?: string | null;
  status: DisposalStatus;
  reason?: string | null;
  processedBy: number;
  processedByName: string;
  itemCount: number;
  totalQuantity: number;
  /** Tổng giá trị hủy = Σ SL hủy × giá vốn */
  totalValue: number;
}

export interface DisposalItem {
  disposalItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  /** Phiếu hoàn thành: giá vốn lúc hủy (thẻ kho) · Phiếu tạm: giá vốn hiện tại */
  unitCost: number;
  value: number;
  reason?: string | null;
}

export interface DisposalDetail {
  summary: DisposalSummary;
  items: DisposalItem[];
}

export interface SaveDisposalPayload {
  warehouseId: number;
  /** Để trống → hệ thống tự sinh XH000001 */
  disposalCode: string | null;
  reason: string | null;
  status: DisposalStatus;
  items: { productId: number; quantity: number; reason: string | null }[];
}

export const DISPOSAL_STATUS_LABEL: Record<DisposalStatus, string> = {
  DRAFT: 'Phiếu tạm',
  COMPLETED: 'Hoàn thành',
};
