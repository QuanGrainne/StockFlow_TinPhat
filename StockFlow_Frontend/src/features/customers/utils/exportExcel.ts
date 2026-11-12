// src/features/customers/utils/exportExcel.ts
// Xuất danh sách khách hàng ra file Excel .xlsx (Đã tinh gọn)

import * as XLSX from 'xlsx';
import { Customer } from '../types';

export function exportCustomersToXLSX(customers: Customer[], filename?: string) {
  if (!customers || customers.length === 0) return;

  const exportDate = new Date();
  const dateStr = `${exportDate.getFullYear()}${(exportDate.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${exportDate.getDate().toString().padStart(2, '0')}_${exportDate
    .getHours()
    .toString()
    .padStart(2, '0')}${exportDate.getMinutes().toString().padStart(2, '0')}`;

  const finalFileName = filename || `danh_sach_khach_hang_tinphat_${dateStr}.xlsx`;

  const data = customers.map((c, index) => ({
    STT: index + 1,
    'Mã KH': c.code,
    'Tên khách hàng': c.name,
    'Số điện thoại': c.phone || '',
    Email: c.email || '',
    'Địa chỉ': c.address || '',
    'Hạn mức tín dụng (VNĐ)': c.creditLimit || 0,
    'Dư nợ hiện tại (VNĐ)': c.currentDebt || 0,
    'Vượt hạn mức': c.isOverCreditLimit ? 'Có' : 'Không',
    'Trạng thái': c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa / Ngừng GD',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Khách Hàng');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã KH
    { wch: 35 }, // Tên KH
    { wch: 16 }, // Số điện thoại
    { wch: 25 }, // Email
    { wch: 35 }, // Địa chỉ
    { wch: 22 }, // Hạn mức
    { wch: 20 }, // Dư nợ
    { wch: 14 }, // Vượt hạn mức
    { wch: 18 }, // Trạng thái
  ];

  XLSX.writeFile(workbook, finalFileName);
}
