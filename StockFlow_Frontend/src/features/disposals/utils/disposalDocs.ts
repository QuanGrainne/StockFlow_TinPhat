// src/features/disposals/utils/disposalDocs.ts
// Xuất file Excel và In phiếu xuất hủy (A4, cùng kiểu phiếu kiểm kho / phiếu nhập)

import * as XLSX from 'xlsx';
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import { DISPOSAL_STATUS_LABEL, type DisposalDetail, type DisposalSummary } from '../types';

/** Xuất file 1 phiếu: thông tin phiếu + danh sách hàng hủy */
export function exportDisposalExcel(detail: DisposalDetail): void {
  const s = detail.summary;
  const header = [
    ['Mã xuất hủy', s.disposalCode],
    ['Chi nhánh', s.warehouseName],
    ['Ngày xuất hủy', printDateTime(s.disposalDate)],
    ['Người tạo', s.createdByName],
    ['Người xuất hủy', s.processedByName],
    ['Trạng thái', DISPOSAL_STATUS_LABEL[s.status] ?? s.status],
    ['Ghi chú', s.reason ?? ''],
    [],
    ['STT', 'Mã hàng', 'Tên hàng', 'ĐVT', 'SL hủy', 'Giá vốn', 'Giá trị hủy'],
  ];
  const lines = detail.items.map((it, i) => [i + 1, it.productCode, it.productName, it.unit, it.quantity, it.unitCost, it.value]);
  const footer = [[], ['', '', 'Tổng', '', s.totalQuantity, '', s.totalValue]];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...lines, ...footer]);
  ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'XuatHuy');
  XLSX.writeFile(wb, `PhieuXuatHuy_${s.disposalCode}.xlsx`);
}

/** Xuất file danh sách phiếu đang lọc */
export function exportDisposalListExcel(rows: DisposalSummary[]): void {
  const data = rows.map((r) => ({
    'Mã xuất hủy': r.disposalCode,
    'Tổng giá trị hủy': r.totalValue,
    'Thời gian': printDateTime(r.disposalDate),
    'Chi nhánh': r.warehouseName,
    'Ghi chú': r.reason ?? '',
    'Trạng thái': DISPOSAL_STATUS_LABEL[r.status] ?? r.status,
    'Tổng SL hủy': r.totalQuantity,
    'Người tạo': r.createdByName,
    'Người xuất hủy': r.processedByName,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'XuatHuy');
  XLSX.writeFile(wb, `DanhSachXuatHuy_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** In phiếu xuất hủy khổ A4 */
export function printDisposal(detail: DisposalDetail): void {
  const s = detail.summary;
  const rows = detail.items
    .map(
      (it, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(it.productName)}</td>
        <td class="c">${escapeHtml(it.unit)}</td>
        <td class="r">${printQty(it.quantity)}</td>
        <td class="r">${printMoney(it.unitCost)}</td>
        <td class="r">${printMoney(it.value)}</td>
      </tr>`
    )
    .join('');

  printHtml(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(s.disposalCode)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13.5px; color: #000; margin: 0; }
  .head { display: flex; justify-content: space-between; }
  h1 { text-align: center; font-size: 22px; margin: 14px 0 4px; }
  .sub { text-align: center; font-style: italic; margin-bottom: 12px; }
  .info td { padding: 2px 12px 2px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
  table.items th, table.items td { border: 1px solid #000; padding: 4px 5px; }
  table.items th { text-align: center; }
  .c { text-align: center; } .r { text-align: right; }
  tr.sum td { font-weight: bold; }
  .note { margin-top: 10px; }
  .sign { display: flex; justify-content: space-between; margin-top: 24px; text-align: center; min-height: 110px; }
  .sign div { flex: 1; } .sign i { font-size: 12.5px; }
</style></head><body>
  <div class="head">
    <div><b>CÔNG TY TNHH TÍN PHÁT</b><br/>Chi nhánh: ${escapeHtml(s.warehouseName)}</div>
    <div>Số: <b>${escapeHtml(s.disposalCode)}</b></div>
  </div>
  <h1>PHIẾU XUẤT HỦY</h1>
  <div class="sub">Ngày ${escapeHtml(printDateTime(s.disposalDate))} — ${escapeHtml(DISPOSAL_STATUS_LABEL[s.status] ?? s.status)}</div>
  <table class="info">
    <tr><td>Người tạo:</td><td><b>${escapeHtml(s.createdByName)}</b></td><td>Người xuất hủy:</td><td><b>${escapeHtml(s.processedByName)}</b></td></tr>
  </table>
  <table class="items">
    <thead><tr><th style="width:5%">STT</th><th style="width:14%">Mã hàng</th><th>Tên hàng</th><th style="width:7%">ĐVT</th>
      <th style="width:10%">SL hủy</th><th style="width:13%">Giá vốn</th><th style="width:15%">Giá trị hủy</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="sum"><td colspan="4" class="r">Tổng cộng</td><td class="r">${printQty(s.totalQuantity)}</td><td></td><td class="r">${printMoney(s.totalValue)}</td></tr>
    </tbody>
  </table>
  <div class="note"><i>Lý do xuất hủy:</i> ${escapeHtml(s.reason ?? '')}</div>
  <div class="sign">
    <div><b>Người lập phiếu</b><br/><i>(Ký, họ tên)</i></div>
    <div><b>Người xuất hủy</b><br/><i>(Ký, họ tên)</i></div>
    <div><b>Kế toán trưởng</b><br/><i>(Ký, họ tên)</i></div>
  </div>
</body></html>`);
}
