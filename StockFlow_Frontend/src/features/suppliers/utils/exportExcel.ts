// src/features/suppliers/utils/exportExcel.ts
// Tiện ích xuất dữ liệu Nhà cung cấp ra định dạng chuẩn Excel (.xlsx)

import * as XLSX from 'xlsx';
import { Supplier, SupplierRecentReceipt, SupplierDebtLedgerEntry } from '../types';
import { formatDateTimeVN } from '@/features/transfers/utils/dateUtils';

const RECEIPT_STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Đã nhập hàng',
  DRAFT: 'Phiếu tạm',
  CANCELLED: 'Đã hủy',
};

function writeSheet(rows: Record<string, string | number>[], cols: number[], sheetName: string, fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = cols.map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

/** Xuất tab "Lịch sử nhập/trả hàng" của một nhà cung cấp */
export function exportSupplierReceiptsToXLSX(supplier: Supplier, receipts: SupplierRecentReceipt[]) {
  const rows = receipts.map((r) => ({
    'Mã phiếu': r.receiptNumber,
    'Thời gian': formatDateTimeVN(r.receiptDate),
    'Người tạo': r.createdByName || '',
    'Chi nhánh': r.warehouseName || '',
    'Tổng cộng': r.totalAmount,
    'Trạng thái': RECEIPT_STATUS_LABEL[(r.status || 'COMPLETED').toUpperCase()] ?? r.status ?? '',
  }));
  writeSheet(rows, [16, 18, 24, 24, 16, 14], 'Lịch sử nhập hàng', `lich_su_nhap_hang_${supplier.code}.xlsx`);
}

/** Xuất tab "Nợ cần trả nhà cung cấp" (sổ công nợ) của một nhà cung cấp */
export function exportSupplierLedgerToXLSX(supplier: Supplier, ledger: SupplierDebtLedgerEntry[]) {
  const rows = ledger.map((l) => ({
    'Mã phiếu': l.code,
    'Thời gian': l.date ? formatDateTimeVN(l.date) : '',
    'Loại': l.typeLabel,
    'Giá trị': l.amount,
    'Nợ cần trả nhà cung cấp': l.balanceAfter,
  }));
  writeSheet(rows, [16, 18, 22, 16, 24], 'Nợ cần trả NCC', `cong_no_${supplier.code}.xlsx`);
}

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
      'Tổng tiền mua (VNĐ)': s.totalPurchased || 0,
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
    { wch: 22 }, // Tổng tiền mua
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
