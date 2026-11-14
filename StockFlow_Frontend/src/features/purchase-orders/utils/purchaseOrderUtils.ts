// src/features/purchase-orders/utils/purchaseOrderUtils.ts
// Nhãn trạng thái và xuất Excel Phiếu đặt hàng nhập

import * as XLSX from 'xlsx';
import { formatDateTimeVN } from '@/lib/utils/date';
import type { PurchaseOrderDetail, PurchaseOrderListItem, PurchaseOrderStatus } from '../types';

export const PO_STATUS: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
  ORDERED: { label: 'Đã đặt hàng', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' },
  PARTIAL: { label: 'Nhập một phần', cls: 'bg-[#f3e8ff] text-[#7c3aed] border-[#ddd6fe]' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

export const PO_STATUS_OPTIONS: PurchaseOrderStatus[] = ['DRAFT', 'ORDERED', 'PARTIAL', 'COMPLETED', 'CANCELLED'];

const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

export function exportPurchaseOrdersToXLSX(rows: PurchaseOrderListItem[]) {
  if (rows.length === 0) return;
  const data = rows.map((p, i) => ({
    STT: i + 1,
    'Mã đặt hàng nhập': p.poCode,
    'Thời gian': formatDateTimeVN(p.orderDate),
    'Mã NCC': p.partnerCode,
    'Nhà cung cấp': p.partnerName,
    'Chi nhánh': p.warehouseName,
    'SL đặt': p.totalOrderedQty,
    'SL đã nhập': p.totalReceivedQty,
    'Tổng tiền': p.totalAmount,
    'Trạng thái': PO_STATUS[p.status]?.label ?? p.status,
    'Người tạo': p.createdByName,
    'Ghi chú': p.notes || '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'DatHangNhap');
  XLSX.writeFile(wb, `DanhSachDatHangNhap_${stamp()}.xlsx`);
}

/** Xuất bảng đối chiếu số lượng đặt ↔ thực nhập của 1 phiếu */
export function exportPurchaseOrderDetailToXLSX(po: PurchaseOrderDetail) {
  const data = po.items.map((it, i) => ({
    STT: i + 1,
    'Mã hàng': it.productCode,
    'Tên hàng': it.productName,
    ĐVT: it.unit,
    'SL đặt': it.orderedQty,
    'SL đã nhập': it.receivedQty,
    'Chênh lệch': it.receivedQty - it.orderedQty,
    'Đơn giá': it.unitPrice,
    'Thành tiền': it.lineTotal,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), po.poCode);
  XLSX.writeFile(wb, `DatHangNhap_${po.poCode}_${stamp()}.xlsx`);
}
