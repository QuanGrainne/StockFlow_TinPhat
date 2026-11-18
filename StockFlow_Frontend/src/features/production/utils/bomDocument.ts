// Xuất file Excel và in một định mức sản phẩm (nút "Xuất file" / "In" trong phần chi tiết của màn Định mức sản phẩm).
// Mẫu in A4 cùng kiểu phiếu đặt hàng nhập; không có giá (BR-39).

import * as XLSX from 'xlsx';
import { escapeHtml, printDateTime, printHtml } from '@/lib/print/printHtml';
import type { BomDetail } from '../types';
import { fmtNorm, fmtPercent } from './productionFormat';

const statusLabel = (d: BomDetail) => (d.summary.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng');

/** Xuất các nguyên vật liệu của một định mức ra file Excel. */
export function exportBomDetailToXLSX(d: BomDetail): void {
  const s = d.summary;
  const rows = d.items.map((it, i) => ({
    STT: i + 1,
    'Mã nguyên vật liệu': it.materialCode,
    'Tên nguyên vật liệu': it.materialName,
    'Đơn vị tính': it.unitName,
    [`Định mức cho 1 ${s.unitName || 'đơn vị'} thành phẩm`]: it.quantity,
    'Hao hụt (%)': it.wastageRate,
    'Định mức sau hao hụt': it.totalPerUnit,
  }));
  // Phần đầu: thông tin định mức; bảng nguyên vật liệu bắt đầu từ dòng 6
  const ws = XLSX.utils.aoa_to_sheet([
    ['Mã định mức', s.bomCode],
    ['Thành phẩm', `${s.productCode} - ${s.productName}`],
    ['Phiên bản', s.version],
    ['Trạng thái', statusLabel(d)],
  ]);
  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A6' });
  const wb = XLSX.utils.book_new();
  // Tên sheet Excel tối đa 31 ký tự, không chứa : \ / ? * [ ]
  XLSX.utils.book_append_sheet(wb, ws, s.bomCode.replace(/[:\\/?*[\]]/g, '-').slice(0, 31) || 'DinhMuc');
  XLSX.writeFile(wb, `DinhMuc_${s.bomCode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function buildBomHtml(d: BomDetail): string {
  const s = d.summary;
  const rows = d.items
    .map(
      (it, idx) => `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(it.materialCode)}</td>
        <td>${escapeHtml(it.materialName)}</td>
        <td class="c">${escapeHtml(it.unitName)}</td>
        <td class="r">${fmtNorm(it.quantity)}</td>
        <td class="r">${fmtPercent(it.wastageRate)}</td>
        <td class="r">${fmtNorm(it.totalPerUnit)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>StockFlow - Sản xuất - Định mức sản phẩm</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; margin: 0; }
  h1 { text-align: center; font-size: 18px; margin: 4px 0 4px; }
  .sub { text-align: center; font-size: 11px; line-height: 1.5; }
  .info { margin: 18px 0 8px; line-height: 1.55; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th, table.items td { border: 1px solid #000; padding: 2px 4px; }
  table.items th { font-weight: bold; text-align: center; }
  .c { text-align: center; }
  .r { text-align: right; }
  .note { margin-top: 10px; white-space: pre-line; }
  .sign { display: flex; justify-content: space-around; margin-top: 24px; font-weight: bold; text-align: center; }
  .sign small { display: block; font-weight: normal; font-style: italic; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
  <h1>ĐỊNH MỨC SẢN PHẨM</h1>
  <div class="sub"><b>Mã định mức: ${escapeHtml(s.bomCode)}</b><br /><i>Ngày tạo: ${printDateTime(s.createdAt)}</i></div>

  <div class="info">
    Thành phẩm: ${escapeHtml(s.productCode)} - ${escapeHtml(s.productName)}<br />
    Đơn vị tính thành phẩm: ${escapeHtml(s.unitName)}<br />
    Phiên bản: ${escapeHtml(s.version)}<br />
    Trạng thái: ${statusLabel(d)}
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:110px">Mã nguyên vật liệu</th>
        <th>Tên nguyên vật liệu</th>
        <th style="width:70px">Đơn vị tính</th>
        <th style="width:100px">Định mức cho 1 đơn vị thành phẩm</th>
        <th style="width:60px">Hao hụt</th>
        <th style="width:90px">Định mức sau hao hụt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="note">Ghi chú kỹ thuật: ${escapeHtml(s.description)}</div>

  <div class="sign">
    <div>Người duyệt<small>(Ký, họ tên)</small></div>
    <div>Người lập<small>(Ký, họ tên)</small></div>
  </div>
</body>
</html>`;
}

/** Mở hộp thoại in của trình duyệt với định mức sản phẩm. */
export function printBom(d: BomDetail): void {
  printHtml(buildBomHtml(d));
}
