// In / xuất Excel phiếu kiểm kho
import * as XLSX from 'xlsx';
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import type { StocktakeDetail, StocktakeStatus } from '../types';

export const STOCKTAKE_STATUS_LABEL: Record<StocktakeStatus, string> = {
  DRAFT: 'Phiếu tạm',
  BALANCED: 'Đã cân bằng kho',
  CANCELLED: 'Đã hủy',
};

/** In phiếu kiểm kho (A4, dữ liệu StockFlow). */
export function printStocktake(detail: StocktakeDetail): void {
  const s = detail.summary;
  const signedQty = (n: number) => (n > 0 ? `+${printQty(n)}` : printQty(n));
  const rows = detail.items
    .map(
      (it, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(it.unit ? `${it.productName} (${it.unit})` : it.productName)}</td>
        <td class="r">${printQty(it.systemQty)}</td>
        <td class="r">${printQty(it.actualQty)}</td>
        <td class="r">${signedQty(it.discrepancy)}</td>
        <td class="r">${printMoney(it.discrepancyValue)}</td>
      </tr>`
    )
    .join('');

  printHtml(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8" /><title>StockFlow - Hàng hóa - Kiểm kho</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; margin: 0; }
  h1 { text-align: center; font-size: 18px; margin: 4px 0; }
  .sub { text-align: center; font-size: 11px; line-height: 1.5; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; margin: 16px 0 8px; line-height: 1.55; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th, table.items td { border: 1px solid #000; padding: 2px 4px; }
  table.items th { text-align: center; }
  .c { text-align: center; } .r { text-align: right; }
  .note { margin-top: 6px; font-style: italic; }
  table.sum { margin: 10px 0 0 auto; width: 55%; border-collapse: collapse; }
  table.sum td { padding: 2px 4px; }
  .sign { display: flex; justify-content: space-around; margin-top: 24px; font-weight: bold; text-align: center; }
  .sign small { display: block; font-weight: normal; font-style: italic; font-size: 11px; margin-top: 2px; }
</style></head>
<body>
  <h1>PHIẾU KIỂM KHO</h1>
  <div class="sub"><b>Mã phiếu: ${escapeHtml(s.stocktakeCode)}</b></div>

  <div class="info">
    <div>Chi nhánh kiểm: ${escapeHtml(s.warehouseName)}</div>
    <div>Trạng thái: ${STOCKTAKE_STATUS_LABEL[s.status] ?? s.status}</div>
    <div>Người tạo: ${escapeHtml(s.createdByName)}</div>
    <div>Ngày tạo: ${printDateTime(s.stocktakeDate)}</div>
    <div>Người cân bằng: ${escapeHtml(s.balancedByName)}</div>
    <div>Ngày cân bằng: ${printDateTime(s.balancedDate)}</div>
  </div>

  <table class="items">
    <thead><tr>
      <th style="width:36px">STT</th><th style="width:90px">Mã hàng</th><th>Tên hàng</th>
      <th style="width:64px">Tồn kho</th><th style="width:72px">Kiểm thực tế</th>
      <th style="width:60px">SL lệch</th><th style="width:90px">Giá trị lệch</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note">Ghi chú: ${escapeHtml(s.notes)}</div>

  <table class="sum">
    <tr><td>Tổng thực tế (${printQty(s.totalActualQty)}):</td><td class="r">${printMoney(s.totalActualValue)}</td></tr>
    <tr><td>Tổng lệch tăng (${printQty(s.increaseQty)}):</td><td class="r">${printMoney(s.increaseValue)}</td></tr>
    <tr><td>Tổng lệch giảm (${printQty(s.decreaseQty)}):</td><td class="r">${printMoney(s.decreaseValue)}</td></tr>
    <tr><td><b>Tổng chênh lệch (${signedQty(s.totalDiscrepancyQty)}):</b></td><td class="r"><b>${printMoney(s.totalDiscrepancyValue)}</b></td></tr>
  </table>

  <div class="sign">
    <div>Người kiểm<small>(Ký, họ tên)</small></div>
    <div>Người lập<small>(Ký, họ tên)</small></div>
  </div>
</body></html>`);
}

export function exportStocktakeExcel(detail: StocktakeDetail): void {
  const s = detail.summary;
  const aoa: (string | number)[][] = [
    ['PHIẾU KIỂM KHO'],
    ['Mã phiếu', s.stocktakeCode],
    ['Kho kiểm', s.warehouseName],
    ['Người tạo', s.createdByName],
    ['Trạng thái', STOCKTAKE_STATUS_LABEL[s.status] ?? s.status],
    [],
    ['STT', 'Mã hàng', 'Tên hàng', 'ĐVT', 'Tồn kho', 'Thực tế', 'SL lệch', 'Giá trị lệch'],
    ...detail.items.map((it, i) => [i + 1, it.productCode, it.productName, it.unit, it.systemQty, it.actualQty, it.discrepancy, it.discrepancyValue]),
    [],
    ['Tổng thực tế', s.totalActualQty, s.totalActualValue],
    ['Tổng lệch tăng', s.increaseQty, s.increaseValue],
    ['Tổng lệch giảm', s.decreaseQty, s.decreaseValue],
    ['Tổng chênh lệch', s.totalDiscrepancyQty, s.totalDiscrepancyValue],
    ['Ghi chú', s.notes ?? ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, s.stocktakeCode.slice(0, 31));
  XLSX.writeFile(wb, `KiemKho_${s.stocktakeCode}.xlsx`);
}
