// src/features/suppliers/utils/exportExcel.ts
// Tiện ích xuất dữ liệu Nhà cung cấp ra định dạng chuẩn Excel (.xlsx)

import * as XLSX from 'xlsx';
import { Supplier } from '../types';

/**
 * Xuất danh sách nhà cung cấp ra file Microsoft Excel (.xlsx) chuẩn
 * @param suppliers Danh sách nhà cung cấp cần xuất
 * @param filename Tên file tải về (mặc định kèm timestamp)
 * @param warehouseName Tên kho lọc (nếu có để bổ sung cột công nợ theo kho)
 */
export function exportSuppliersToXLSX(
  suppliers: Supplier[],
  filename?: string,
  warehouseName?: string
) {
  if (!suppliers || suppliers.length === 0) {
    return;
  }

  const exportDate = new Date();
  const dateStr = `${exportDate.getFullYear()}${(exportDate.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${exportDate.getDate().toString().padStart(2, '0')}_${exportDate
    .getHours()
    .toString()
    .padStart(2, '0')}${exportDate.getMinutes().toString().padStart(2, '0')}`;

  const finalFileName =
    filename || `danh_sach_nha_cung_cap_${dateStr}.xlsx`;

  const data = suppliers.map((s, index) => {
    const row: Record<string, string | number> = {
      'STT': index + 1,
      'Mã NCC': s.code,
      'Tên nhà cung cấp': s.name,
      'Số điện thoại': s.phone || '',
      'Email': s.email || '',
      'Địa chỉ': s.address || '',
      'Hạn mức nợ (VNĐ)': s.creditLimit || 0,
      'Tổng nợ phải trả (VNĐ)': s.currentPayable || 0,
    };

    if (warehouseName) {
      row[`Nợ tại ${warehouseName} (VNĐ)`] = s.branchPayable ?? 0;
    }

    row['Trạng thái'] = s.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch';
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Căn chỉnh độ rộng cột thẩm mỹ
  const cols = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã NCC
    { wch: 38 }, // Tên NCC
    { wch: 16 }, // SĐT
    { wch: 25 }, // Email
    { wch: 40 }, // Địa chỉ
    { wch: 20 }, // Hạn mức
    { wch: 24 }, // Tổng nợ
  ];

  if (warehouseName) {
    cols.push({ wch: 24 }); // Nợ chi nhánh
  }
  cols.push({ wch: 18 }); // Trạng thái

  worksheet['!cols'] = cols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách NCC');
  XLSX.writeFile(workbook, finalFileName);
}
