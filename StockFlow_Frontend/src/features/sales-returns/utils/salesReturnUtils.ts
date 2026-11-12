// src/features/sales-returns/utils/salesReturnUtils.ts
// Nhãn trạng thái + xuất Excel / in phiếu Trả hàng

import * as XLSX from 'xlsx';
import { formatDateTimeVN } from '@/lib/utils/date';
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import type { SalesReturnDetail, SalesReturnListItem, SalesReturnStatus } from '../types';

export const RETURN_STATUS: Record<SalesReturnStatus, { label: string; cls: string }> = {
  COMPLETED: { label: 'Đã trả', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

export const RETURN_STATUS_OPTIONS: SalesReturnStatus[] = ['COMPLETED', 'CANCELLED'];
/** Mặc định như KiotViet: ẩn phiếu đã hủy */
export const RETURN_DEFAULT_STATUSES: SalesReturnStatus[] = ['COMPLETED'];

export const PAY_METHOD_LABEL: Record<string, string> = { CASH: 'Tiền mặt', VIETQR: 'Chuyển khoản' };

export const formatVnd = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');

const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

export function exportReturnsToXLSX(rows: SalesReturnListItem[]) {
  if (rows.length === 0) return;
  const data = rows.map((r, i) => ({
    STT: i + 1,
    'Mã trả hàng': r.returnCode,
    'Mã hóa đơn': r.invoiceCode || 'Trả nhanh',
    'Thời gian': formatDateTimeVN(r.returnDate),
    'Người tạo': r.createdByName,
    'Mã KH': r.partnerCode,
    'Khách hàng': r.partnerName,
    'Chi nhánh': r.warehouseName,
    'SL trả': r.totalQuantity,
    'Tổng tiền hàng': r.totalGoodsAmount,
    'Cần trả khách': r.totalAmount,
    'Đã trả khách': r.refundAmount,
    'Trạng thái': RETURN_STATUS[r.status]?.label ?? r.status,
    'Ghi chú': r.notes || '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'TraHang');
  XLSX.writeFile(wb, `DanhSachTraHang_${stamp()}.xlsx`);
}

export function exportReturnDetailToXLSX(r: SalesReturnDetail) {
  const data = r.items.map((it, i) => ({
    STT: i + 1,
    'Mã hàng': it.productCode,
    'Tên hàng': it.productName,
    ĐVT: it.unit,
    'SL trả': it.quantity,
    'Giá bán': it.salePrice,
    'Giá nhập lại': it.returnPrice,
    'Thành tiền': it.lineTotal,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), r.returnCode);
  XLSX.writeFile(wb, `TraHang_${r.returnCode}_${stamp()}.xlsx`);
}

/** In phiếu trả hàng A4 */
export function printSalesReturn(r: SalesReturnDetail, notes: string) {
  const rows = r.items
    .map(
      (it, idx) => `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(`${it.productName} (${it.unit})`)}</td>
        <td class="r">${printQty(it.quantity)}</td>
        <td class="r">${printMoney(it.returnPrice)}</td>
        <td class="r">${printMoney(it.lineTotal)}</td>
      </tr>`
    )
    .join('');
  printHtml(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8" /><title>StockFlow - Bán hàng - Trả hàng</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; margin: 0; }
  h1 { text-align: center; font-size: 18px; margin: 4px 0; }
  .sub { text-align: center; font-size: 11px; line-height: 1.5; }
  .info { margin: 18px 0 8px; line-height: 1.55; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th, table.items td { border: 1px solid #000; padding: 2px 4px; }
  .c { text-align: center; } .r { text-align: right; }
  table.sum { margin: 6px 0 0 auto; width: 60%; border-collapse: collapse; }
  table.sum td { padding: 2px 4px; }
  .sign { display: flex; justify-content: space-around; margin-top: 24px; font-weight: bold; text-align: center; }
  .sign small { display: block; font-weight: normal; font-style: italic; font-size: 11px; }
</style></head>
<body>
  <h1>PHIẾU TRẢ HÀNG</h1>
  <div class="sub"><b>Mã phiếu: ${escapeHtml(r.returnCode)}</b><br /><i>Ngày trả: ${printDateTime(r.returnDate)}</i></div>
  <div class="info">
    Chi nhánh: ${escapeHtml(r.warehouseName)}<br />
    Người tạo: ${escapeHtml(r.createdByName)}<br />
    Khách hàng: ${escapeHtml(r.partnerName)} (${escapeHtml(r.partnerCode)})<br />
    Hóa đơn: ${escapeHtml(r.invoiceCode || 'Trả nhanh (không có hóa đơn)')}
  </div>
  <table class="items"><thead><tr>
    <th style="width:36px">STT</th><th style="width:90px">Mã hàng</th><th>Tên hàng</th>
    <th style="width:60px">SL trả</th><th style="width:90px">Giá nhập lại</th><th style="width:90px">Thành tiền</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <table class="sum">
    <tr><td>Tổng tiền hàng trả:</td><td class="r">${printMoney(r.totalGoodsAmount)}</td></tr>
    <tr><td>Giảm giá phiếu trả:</td><td class="r">${printMoney(r.discountAmount)}</td></tr>
    <tr><td>Phí trả hàng:</td><td class="r">${printMoney(r.returnFee)}</td></tr>
    <tr><td><b>Cần trả khách:</b></td><td class="r"><b>${printMoney(r.totalAmount)}</b></td></tr>
    <tr><td>Đã trả khách:</td><td class="r">${printMoney(r.refundAmount)}</td></tr>
  </table>
  <div style="margin-top:8px">Ghi chú: ${escapeHtml(notes)}</div>
  <div class="sign"><div>Khách hàng<small>(Ký, họ tên)</small></div><div>Người lập<small>(Ký, họ tên)</small></div></div>
</body></html>`);
}
