// src/features/suppliers/utils/importExcel.ts
// Đọc file Excel (.xlsx/.xls/.csv) danh sách Nhà cung cấp để import.
// Nhận đúng định dạng của file "Xuất file" (exportSuppliersToXLSX) nên có thể xuất ra → sửa → nhập lại.

import * as XLSX from 'xlsx';
import { CreateSupplierPayload } from '../types';

/** Các tên cột được chấp nhận cho từng trường (so khớp không phân biệt hoa thường, bỏ khoảng trắng thừa). */
const COLUMN_ALIASES: Record<keyof Pick<CreateSupplierPayload, 'code' | 'name' | 'phone' | 'email' | 'address'>, string[]> = {
  code: ['mã ncc', 'mã nhà cung cấp', 'ma ncc', 'code'],
  name: ['tên nhà cung cấp', 'tên ncc', 'ten nha cung cap', 'name'],
  phone: ['số điện thoại', 'điện thoại', 'sđt', 'phone'],
  email: ['email'],
  address: ['địa chỉ', 'dia chi', 'address'],
};

export interface ParsedSupplierRow {
  /** Số dòng trong file Excel (tính cả dòng tiêu đề) để báo lỗi */
  rowNumber: number;
  payload: CreateSupplierPayload;
}

export interface ParseSuppliersResult {
  rows: ParsedSupplierRow[];
  /** Dòng bị bỏ qua vì thiếu tên nhà cung cấp */
  skippedNoName: number[];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export async function parseSuppliersFromExcel(file: File): Promise<ParseSuppliersResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('File không có dữ liệu.');

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (records.length === 0) throw new Error('File không có dòng dữ liệu nào.');

  // Ánh xạ tiêu đề cột thực tế → trường
  const headers = Object.keys(records[0]);
  const columnOf = (field: keyof typeof COLUMN_ALIASES) =>
    headers.find((h) => COLUMN_ALIASES[field].includes(normalize(h)));

  const nameCol = columnOf('name');
  if (!nameCol) {
    throw new Error('Không tìm thấy cột "Tên nhà cung cấp" trong file.');
  }
  const codeCol = columnOf('code');
  const phoneCol = columnOf('phone');
  const emailCol = columnOf('email');
  const addressCol = columnOf('address');

  const cell = (rec: Record<string, unknown>, col?: string) =>
    col ? String(rec[col] ?? '').trim() : '';

  const rows: ParsedSupplierRow[] = [];
  const skippedNoName: number[] = [];

  records.forEach((rec, index) => {
    const rowNumber = index + 2; // +1 tiêu đề, +1 vì Excel đánh số từ 1
    const name = cell(rec, nameCol);
    if (!name) {
      skippedNoName.push(rowNumber);
      return;
    }
    rows.push({
      rowNumber,
      payload: {
        code: cell(rec, codeCol) || undefined,
        name,
        phone: cell(rec, phoneCol).replace(/\D/g, '') || undefined,
        email: cell(rec, emailCol) || undefined,
        address: cell(rec, addressCol) || undefined,
      },
    });
  });

  return { rows, skippedNoName };
}
