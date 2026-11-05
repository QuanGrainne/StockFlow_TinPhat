// src/features/orders/utils/invoiceUtils.ts
// Tiện ích dùng chung cho màn Hóa đơn: nhãn phương thức thanh toán, định dạng ngày giờ, xuất Excel.

import * as XLSX from 'xlsx';
import type { OrderDetail, OrderListItem } from '../types';

/** Phương thức thanh toán được hỗ trợ tại quầy (đã bỏ Thẻ / Ví) */
export const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'VIETQR', label: 'Chuyển khoản' },
];

export function paymentMethodLabel(method?: string | null): string {
  switch ((method || '').toUpperCase()) {
    case 'CASH':
      return 'Tiền mặt';
    case 'VIETQR':
      return 'Chuyển khoản';
    case 'DEBT':
      return 'Ghi công nợ';
    default:
      return method || '—';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "01/11/2026 10:38" */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** yyyy-MM-dd theo giờ máy (không lệch múi giờ như toISOString) */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

const statusLabel = (s: string) => (s === 'CANCELLED' ? 'Đã hủy' : s === 'COMPLETED' ? 'Hoàn thành' : s);

/** Xuất danh sách hóa đơn ra file Excel */
export function exportInvoicesToXLSX(rows: OrderListItem[]) {
  if (rows.length === 0) return;
  const data = rows.map((o, i) => ({
    STT: i + 1,
    'Mã hóa đơn': o.orderCode,
    'Thời gian': formatDateTime(o.orderDate),
    'Mã trả hàng': o.returnCode || '',
    'Mã KH': o.partnerCode || '',
    'Khách hàng': o.partnerName,
    'Điện thoại': o.partnerPhone || '',
    'Chi nhánh': o.warehouseName,
    'Tổng tiền hàng': o.subTotal,
    'Giảm giá': o.discountAmount,
    'Khách cần trả': o.totalAmount,
    'Khách đã trả': o.paidAmount,
    'Còn nợ': o.outstandingAmount,
    'Phương thức': paymentMethodLabel(o.paymentMethod),
    'Trạng thái': statusLabel(o.status),
    'Ghi chú': o.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HoaDon');
  XLSX.writeFile(wb, `DanhSachHoaDon_${stamp()}.xlsx`);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** In hóa đơn khổ K80 trong cửa sổ riêng (không in cả trang quản lý) */
export function printInvoice(order: OrderDetail): boolean {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return false;
  const m = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);
  const rows = order.items
    .map(
      (it) => `<tr><td colspan="3">${escapeHtml(it.productName)}</td></tr>
        <tr><td>${m(it.quantity)} x ${m(it.unitPrice)}</td><td></td><td class="r">${m(it.lineTotal)}</td></tr>`
    )
    .join('');
  win.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(order.orderCode)}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;width:72mm;margin:0 auto;padding:8px}
    h1{font-size:15px;text-align:center;margin:4px 0}p{margin:2px 0}.c{text-align:center}.r{text-align:right}
    table{width:100%;border-collapse:collapse;margin:6px 0}td{padding:2px 0}hr{border:0;border-top:1px dashed #000}
    .t td{font-weight:bold}</style></head><body>
    <p class="c"><strong>CÔNG TY TNHH TÍN PHÁT</strong></p>
    <p class="c">${escapeHtml(order.warehouseName || '')}</p>
    <h1>HÓA ĐƠN BÁN HÀNG</h1>
    <p class="c">${escapeHtml(order.orderCode)} - ${escapeHtml(formatDateTime(order.orderDate))}</p>
    <p>Khách hàng: ${escapeHtml(order.customer?.partnerName || 'Khách lẻ')}</p>
    <p>Người bán: ${escapeHtml(order.salesRepName || order.createdByName || '')}</p>
    <hr><table>${rows}</table><hr>
    <table>
      <tr><td>Tổng tiền hàng</td><td class="r">${m(order.itemsTotalAmount || order.subTotal)}</td></tr>
      <tr><td>Giảm giá hóa đơn</td><td class="r">${m(order.orderDiscountAmount)}</td></tr>
      <tr class="t"><td>Khách cần trả</td><td class="r">${m(order.totalAmount)}</td></tr>
      <tr><td>Khách đã trả</td><td class="r">${m(order.paidAmount)}</td></tr>
    </table>
    <p class="c">Cảm ơn quý khách!</p>
    <script>window.onload=function(){window.print();}</script></body></html>`);
  win.document.close();
  return true;
}

/** Xuất chi tiết 1 hóa đơn (dòng hàng + tổng kết) ra file Excel */
export function exportInvoiceDetailToXLSX(order: OrderDetail) {
  const lines = order.items.map((it, i) => ({
    STT: i + 1,
    'Mã hàng': it.productCode,
    'Tên hàng': it.productName,
    ĐVT: it.unitName,
    'Số lượng': it.quantity,
    'Đơn giá': it.originalPrice || it.unitPrice,
    'Giảm giá': it.discountAmount,
    'Giá bán': it.unitPrice,
    'Thành tiền': it.lineTotal,
  }));
  const ws = XLSX.utils.json_to_sheet(lines);
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [],
      ['', 'Mã hóa đơn', order.orderCode],
      ['', 'Khách hàng', order.customer?.partnerName || 'Khách lẻ'],
      ['', 'Ngày bán', formatDateTime(order.orderDate)],
      ['', 'Tổng tiền hàng', order.itemsTotalAmount || order.subTotal],
      ['', 'Giảm giá hóa đơn', order.orderDiscountAmount || 0],
      ['', 'Khách cần trả', order.totalAmount],
      ['', 'Khách đã trả', order.paidAmount],
    ],
    { origin: -1 }
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ChiTiet');
  XLSX.writeFile(wb, `HoaDon_${order.orderCode}_${stamp()}.xlsx`);
}

/** Bỏ các thẻ hệ thống trong ghi chú ([Bảng giá: …], [Người bán: …], [REQ:…]) — chỉ giữ ghi chú người dùng nhập */
export function stripNoteTags(notes?: string | null): string {
  return (notes || '')
    .replace(/\[(Bảng giá|Người bán):[^\]]*\]/gi, '')
    .replace(/\[REQ:[^\]]*\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
