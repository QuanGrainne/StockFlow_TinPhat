// src/features/sales-returns/utils/salesReturnUtils.ts
// Nhãn trạng thái / tình trạng hàng của phiếu Trả hàng

import type { ReturnCondition, SalesReturnStatus } from '../types';

export const RETURN_STATUS: Record<SalesReturnStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Đang xử lý', cls: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
  COMPLETED: { label: 'Đã trả', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

export const RETURN_STATUS_OPTIONS: SalesReturnStatus[] = ['DRAFT', 'COMPLETED', 'CANCELLED'];
/** Mặc định như KiotViet: ẩn phiếu đã hủy */
export const RETURN_DEFAULT_STATUSES: SalesReturnStatus[] = ['DRAFT', 'COMPLETED'];

export const RETURN_CONDITION: Record<ReturnCondition, { label: string; hint: string }> = {
  GOOD: { label: 'Hàng tốt', hint: 'Nhập lại kho để bán tiếp' },
  DEFECTIVE: { label: 'Hàng lỗi', hint: 'Không nhập kho bán, chờ xử lý' },
};

export const formatVnd = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');
