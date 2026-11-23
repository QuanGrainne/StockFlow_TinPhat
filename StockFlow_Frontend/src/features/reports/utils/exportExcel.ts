// src/features/reports/utils/exportExcel.ts
// Xuất báo cáo ra Excel bằng package xlsx sẵn có (số giữ dạng số để cộng / lọc trong Excel)

import * as XLSX from 'xlsx';

export type ExcelCell = string | number;

export interface ExcelColumn<T> {
  header: string;
  width: number;
  value: (row: T) => ExcelCell;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** dd/MM/yyyy từ yyyy-MM-dd */
export function excelDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Ghi một sheet: dòng tiêu đề báo cáo + kỳ, dòng trống, bảng dữ liệu (kèm dòng tổng nếu có).
 * fileBase không dấu, VD "BaoCaoDoanhThu".
 */
export function exportReportSheet<T>(options: {
  fileBase: string;
  sheetName: string;
  title: string;
  subtitle: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  totals?: T;
}): void {
  const { fileBase, sheetName, title, subtitle, columns, rows, totals } = options;
  const aoa: ExcelCell[][] = [
    [title],
    [subtitle],
    [],
    columns.map((c) => c.header),
    ...rows.map((r) => columns.map((c) => c.value(r))),
  ];
  if (totals) aoa.push(columns.map((c) => c.value(totals)));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map((c) => ({ wch: c.width }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${fileBase}_${stamp()}.xlsx`);
}
