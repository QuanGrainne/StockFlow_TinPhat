// src/features/customers/utils/exportExcel.ts
// Xuất Excel: danh sách khách hàng, lịch sử bán hàng và sổ nợ cần thu của 1 khách

import * as XLSX from 'xlsx';
import { Customer, CustomerDebtLedgerEntry, CustomerRecentOrder } from '../types';

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

const fmtDateTime = (v?: string | null) => {
  if (!v) return '';
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : v;
};

const fmtDate = (v?: string | null) => {
  if (!v) return '';
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

export const GENDER_LABEL: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ' };

export function exportCustomersToXLSX(customers: Customer[], filename?: string) {
  if (!customers || customers.length === 0) return;
  const data = customers.map((c, index) => ({
    STT: index + 1,
    'Mã khách hàng': c.code,
    'Tên khách hàng': c.name,
    'Điện thoại': c.phone || '',
    'Điện thoại 2': c.phone2 || '',
    Email: c.email || '',
    'Địa chỉ': c.address || '',
    'Giới tính': c.gender ? GENDER_LABEL[c.gender] : '',
    'Sinh nhật': fmtDate(c.birthDate),
    'Chi nhánh tạo': c.createdWarehouseName || '',
    'Ngày tạo': fmtDate(c.createdAt),
    'Nợ hiện tại': c.currentDebt || 0,
    'Tổng bán': c.totalSales || 0,
    'Tổng bán trừ trả hàng': c.totalSalesNetReturns || 0,
    'Hạn mức nợ': c.creditLimit || 0,
    'Trạng thái': c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [6, 14, 30, 14, 14, 24, 32, 10, 12, 20, 12, 14, 14, 18, 14, 16].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Khách hàng');
  XLSX.writeFile(wb, filename || `DanhSachKhachHang_${stamp()}.xlsx`);
}

export function exportCustomerOrdersToXLSX(customer: Customer, orders: CustomerRecentOrder[]) {
  if (orders.length === 0) return;
  const data = orders.map((o) => ({
    'Mã hóa đơn': o.orderCode,
    'Thời gian': fmtDateTime(o.orderDate),
    'Người bán': o.sellerName || '',
    'Chi nhánh': o.warehouseName || '',
    'Tổng cộng': o.totalAmount,
    'Trạng thái': o.status || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [16, 18, 22, 22, 14, 14].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử bán hàng');
  XLSX.writeFile(wb, `LichSuBanHang_${customer.code}_${stamp()}.xlsx`);
}

export function exportCustomerLedgerToXLSX(customer: Customer, ledger: CustomerDebtLedgerEntry[]) {
  if (ledger.length === 0) return;
  const data = ledger.map((l) => ({
    'Mã phiếu': l.code,
    'Thời gian': fmtDateTime(l.date),
    Loại: l.typeLabel,
    'Giá trị': l.amount,
    'Dư nợ khách hàng': l.balanceAfter,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [18, 18, 16, 14, 18].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nợ cần thu');
  XLSX.writeFile(wb, `CongNoKhachHang_${customer.code}_${stamp()}.xlsx`);
}
