// src/features/sales-bookings/utils/salesBookingUtils.ts
// Nhãn trạng thái và xuất Excel Đơn đặt hàng

import * as XLSX from 'xlsx';
import { formatDateTimeVN } from '@/lib/utils/date';
import type { SalesBookingDetail, SalesBookingListItem, SalesBookingStatus } from '../types';

export const BOOKING_STATUS: Record<SalesBookingStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
  FINISHED: { label: 'Hoàn thành', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

export const BOOKING_STATUS_OPTIONS: SalesBookingStatus[] = ['DRAFT', 'FINISHED', 'CANCELLED'];

/** Mặc định như KiotViet: ẩn đơn đã hủy */
export const BOOKING_DEFAULT_STATUSES: SalesBookingStatus[] = ['DRAFT', 'FINISHED'];

/** Đơn còn tạo hóa đơn được (Phiếu tạm) */
export const isBookingOpen = (s: SalesBookingStatus) => s === 'DRAFT';

export const PAY_METHOD_LABEL: Record<string, string> = { CASH: 'Tiền mặt', VIETQR: 'Chuyển khoản' };

const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

export function exportBookingsToXLSX(rows: SalesBookingListItem[]) {
  if (rows.length === 0) return;
  const data = rows.map((r, i) => ({
    STT: i + 1,
    'Mã đặt hàng': r.orderCode,
    'Thời gian': formatDateTimeVN(r.orderDate),
    'Ngày giao': r.deliveryDate ? formatDateTimeVN(r.deliveryDate) : '',
    'Mã KH': r.partnerCode,
    'Khách hàng': r.partnerName,
    'Điện thoại': r.partnerPhone || '',
    'Chi nhánh': r.warehouseName,
    'SL đặt': r.totalQuantity,
    'SL đã giao': r.deliveredQuantity,
    'Khách cần trả': r.totalAmount,
    'Khách đã trả': r.customerPaidAmount,
    'Trạng thái': BOOKING_STATUS[r.status]?.label ?? r.status,
    'Người tạo': r.createdByName,
    'Ghi chú': r.notes || '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'DatHang');
  XLSX.writeFile(wb, `DanhSachDatHang_${stamp()}.xlsx`);
}

export function exportBookingDetailToXLSX(b: SalesBookingDetail) {
  const data = b.items.map((it, i) => ({
    STT: i + 1,
    'Mã hàng': it.productCode,
    'Tên hàng': it.productName,
    ĐVT: it.unit,
    'SL đặt': it.quantity,
    'SL đã giao': it.deliveredQuantity,
    'Còn lại': Math.max(0, it.quantity - it.deliveredQuantity),
    'Đơn giá': it.originalPrice,
    'Giá bán': it.unitPrice,
    'Thành tiền': it.lineTotal,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), b.orderCode);
  XLSX.writeFile(wb, `DatHang_${b.orderCode}_${stamp()}.xlsx`);
}
