// src/features/orders/utils/invoiceUtils.ts
// Tiện ích dùng chung cho màn Hóa đơn: nhãn phương thức thanh toán, định dạng ngày giờ, xuất Excel.

import * as XLSX from 'xlsx';
import type { OrderDetail, OrderListItem } from '../types';
import { customerService } from '@/features/customers/services/customerService';
import { escapeHtml, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import { readVietnameseMoney } from '@/lib/print/vietnameseCurrency';

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

const isWalkIn = (order: OrderDetail) =>
  !order.customer?.partnerId || (order.customer.partnerCode || '').toUpperCase() === 'KH00000';

/**
 * Nợ cũ của khách ngay trước hóa đơn này: lấy từ sổ công nợ (dòng SALE của hóa đơn → dư nợ trước = dư nợ sau − phát sinh).
 * Không tìm thấy thì ước lượng = công nợ hiện tại − phần còn nợ của hóa đơn + phần tiền thừa đã trừ nợ cũ.
 */
async function loadOldDebt(order: OrderDetail, debtPaid: number): Promise<number> {
  const fallback = (order.customer?.currentDebt || 0) - (order.outstandingAmount || 0) + debtPaid;
  try {
    const detail = await customerService.getCustomerById(order.customer.partnerId);
    const sale = (detail.debtLedger ?? []).find((l) => l.type === 'SALE' && Number(l.referenceId) === order.orderId);
    return sale ? sale.balanceAfter - sale.amount : fallback;
  } catch {
    return fallback;
  }
}

/** In hóa đơn theo mẫu "PHIẾU XUẤT KHO" khổ A4 của Tín Phát (iframe ẩn, chỉ in đúng phiếu) */
export async function printInvoice(order: OrderDetail): Promise<void> {
  const walkIn = isWalkIn(order);
  // Khách trả thừa, chọn "Tính vào công nợ": các phiếu thu trả nợ cũ gắn hóa đơn cũ (TTHD...) / phiếu PT...
  // không nằm trong "Đã trả" của hóa đơn này → cộng riêng (máy chủ trả về trong excessDebtPayments)
  const debtPaid = walkIn ? 0 : (order.excessDebtPayments ?? []).reduce((s, p) => s + p.amount, 0);
  const oldDebt = walkIn ? 0 : await loadOldDebt(order, debtPaid);
  const goodsTotal = order.items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const outstanding = order.outstandingAmount || 0;
  // Khách đã trả = trả cho hóa đơn + phần trả thừa trừ vào nợ cũ; Tổng nợ = nợ cũ + còn nợ của hóa đơn − phần trả nợ cũ
  const customerPaid = (order.paidAmount || 0) + debtPaid;
  const totalDebt = oldDebt + outstanding - debtPaid;

  const d = order.orderDate ? new Date(order.orderDate) : new Date();
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  const discountText = (it: OrderDetail['items'][number]) => {
    const perUnit = (it.originalPrice || 0) - (it.unitPrice || 0);
    if (perUnit <= 0) return '';
    return it.discountType === 'PERCENT' && it.discountValue > 0 ? `${printQty(it.discountValue)}%` : printMoney(perUnit);
  };

  const itemRows = order.items.map(
    (it, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${escapeHtml(it.productCode)}</td>
      <td>${escapeHtml(it.productName)}</td>
      <td class="c">${escapeHtml(it.unitName)}</td>
      <td class="r">${printQty(it.quantity)}</td>
      <td class="r">${printMoney(it.originalPrice || it.unitPrice)}</td>
      <td class="r">${discountText(it)}</td>
      <td class="r">${printMoney(it.lineTotal)}</td>
    </tr>`
  );

  const sumRow = (label: string, value: number, bold = false) =>
    `<tr class="sum${bold ? ' b' : ''}"><td colspan="7" class="r">${label}</td><td class="r">${printMoney(value)}</td></tr>`;

  const summary = [
    sumRow('Tổng cộng tiền hàng', goodsTotal, true),
    order.orderDiscountAmount > 0 ? sumRow('Chiết khấu hóa đơn', order.orderDiscountAmount) : '',
    customerPaid > 0 ? sumRow('Khách đã trả', customerPaid) : '',
    walkIn ? sumRow('Còn phải thanh toán', outstanding, true) : sumRow('Nợ cũ', oldDebt),
    walkIn ? '' : sumRow('Tổng nợ', totalDebt, true),
    `<tr class="sum"><td colspan="8"><i>Tổng số tiền (Viết bằng chữ):</i> <b>${escapeHtml(
      readVietnameseMoney(walkIn ? outstanding : totalDebt)
    )}</b></td></tr>`,
  ].join('');

  const customer = order.customer;
  const customerName = walkIn ? 'Khách lẻ' : customer?.partnerName || '';
  const seller = order.salesRepName || order.createdByName || '';

  printHtml(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(order.orderCode)}</title>
<style>
  @page { size: A4; margin: 12mm 12mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13.5px; color: #000; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .company b { font-size: 14px; }
  .code { text-align: right; font-size: 12.5px; }
  h1 { text-align: center; font-size: 22px; margin: 14px 0 2px; letter-spacing: .5px; }
  .date { text-align: center; font-style: italic; margin-bottom: 12px; }
  .info { width: 100%; margin-bottom: 8px; }
  .info td { padding: 2px 0; vertical-align: top; }
  .info .lbl { white-space: nowrap; width: 1%; padding-right: 6px; }
  .dots { border-bottom: 1px dotted #000; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th, table.items td { border: 1px solid #000; padding: 4px 5px; }
  table.items th { font-weight: bold; text-align: center; }
  table.items tr.sum.b td { font-weight: bold; }
  .c { text-align: center; } .r { text-align: right; }
  .lines p { margin: 6px 0; }
  .note { font-style: italic; margin-top: 6px; }
  .sign { display: flex; justify-content: space-between; margin-top: 18px; text-align: center; }
  .sign div { flex: 1; } .sign b { display: block; } .sign i { font-size: 12.5px; }
  .sign { min-height: 110px; }
</style></head><body>
  <div class="head">
    <div class="company">
      <b>CÔNG TY TNHH TÍN PHÁT</b><br/>
      Địa chỉ: ${escapeHtml(order.warehouseName || '')}
    </div>
    <div class="code">Số: <b>${escapeHtml(order.orderCode)}</b></div>
  </div>
  <h1>PHIẾU XUẤT KHO</h1>
  <div class="date">Ngày ${day} Tháng ${month} Năm ${year}</div>
  <table class="info">
    <tr>
      <td class="lbl">Tên khách hàng:</td><td class="dots"><b>${escapeHtml(customerName)}</b></td>
      <td class="lbl" style="padding-left:16px">SĐT:</td><td class="dots" style="width:28%">${escapeHtml(customer?.phone || '')}</td>
    </tr>
    <tr><td class="lbl">Địa chỉ:</td><td class="dots" colspan="3">${escapeHtml(customer?.address || '')}</td></tr>
    <tr><td class="lbl">Nhân viên BH:</td><td class="dots" colspan="3">${escapeHtml(seller)}</td></tr>
  </table>
  <table class="items">
    <thead><tr>
      <th style="width:5%">STT</th><th style="width:12%">Mã hàng</th><th>Tên hàng hoá</th><th style="width:7%">ĐVT</th>
      <th style="width:7%">SL</th><th style="width:12%">Đơn giá</th><th style="width:8%">CK</th><th style="width:14%">Thành tiền</th>
    </tr></thead>
    <tbody>${itemRows.join('')}${summary}</tbody>
  </table>
  <div class="lines">
    <p>Số tiền phải thanh toán (viết bằng chữ): ......................................................................................................................</p>
    <p>Số chứng từ gốc kèm theo: ....................................................................................................................................</p>
  </div>
  <div class="note">(Lưu ý: Công ty chỉ giải quyết khiếu nại hàng thừa, thiếu trong vòng 05 ngày tính từ thời điểm khách nhận hàng)</div>
  <div class="sign">
    <div><b>Nhân viên bán hàng</b><i>(Ký, họ tên)</i></div>
    <div><b>Nhân viên kho</b><i>(Ký, họ tên)</i></div>
    <div><b>Nhân viên vận chuyển</b><i>(Ký, họ tên)</i></div>
    <div><b>Khách hàng</b><i>(Ký, họ tên)</i></div>
  </div>
</body></html>`);
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
