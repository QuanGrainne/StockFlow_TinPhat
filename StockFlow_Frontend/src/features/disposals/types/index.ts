// src/features/disposals/types/index.ts
// Kiểu dữ liệu Xuất hủy — khớp DTO backend Features/Disposals/DTOs/DisposalDtos.cs

/** DRAFT = Phiếu tạm (chưa trừ tồn) · COMPLETED = Hoàn thành (đã trừ tồn kho) · CANCELLED = Đã hủy */
export type DisposalStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

export interface DisposalSummary {
  disposalId: number;
  disposalCode: string;
  warehouseId: number;
  warehouseName: string;
  disposalDate?: string | null;
  status: DisposalStatus;
  /** Ghi chú / lý do xuất hủy */
  reason?: string | null;
  createdBy?: number | null;
  createdByName: string;
  createdByPhone?: string | null;
  /** Người xuất hủy */
  processedBy: number;
  processedByName: string;
  processedByPhone?: string | null;
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
  /** Phiếu đã xuất kho: giá vốn lúc hủy (thẻ kho) · Phiếu tạm: giá vốn hiện tại */
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
  status: 'DRAFT' | 'COMPLETED';
  items: { productId: number; quantity: number; reason: string | null }[];
  /** ISO; để trống = bây giờ */
  disposalDate?: string | null;
  /** Người xuất hủy; để trống = người đang đăng nhập */
  processedBy?: number | null;
}

/** "Lưu" ở chi tiết phiếu */
export interface UpdateDisposalInfoPayload {
  processedBy: number;
  /** Chỉ đổi được khi phiếu còn là Phiếu tạm */
  disposalDate: string | null;
  reason: string | null;
}

export interface DisposalStaffOption {
  userId: number;
  fullName: string;
}

export const DISPOSAL_STATUS_LABEL: Record<DisposalStatus, string> = {
  DRAFT: 'Phiếu tạm',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};
