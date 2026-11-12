// In đơn đặt hàng khổ A4 theo mẫu giấy "ĐƠN ĐẶT HÀNG" của Tín Phát:
// khung viền, đầu phiếu (công ty + chi nhánh), Kính gửi khách, bảng hàng, Tổng cộng / Chiết khấu /
// Thành tiền sau chiết khấu, số tiền bằng chữ, ngày lập.
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import { readVietnameseMoney } from '@/lib/print/vietnameseCurrency';
import type { SalesBookingDetail } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function buildSalesBookingHtml(b: SalesBookingDetail, notes: string): string {
  const goodsTotal = b.items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const deposit = b.customerPaidAmount || b.paidAmount || 0;
  const remaining = Math.max(0, b.totalAmount - deposit);

  const d = b.orderDate ? new Date(b.orderDate) : new Date();
  const dateText = `Ngày ${pad(d.getDate())} tháng ${pad(d.getMonth() + 1)} năm ${d.getFullYear()}`;
  const discountLabel =
    b.discountType === 'PERCENT' && b.discountValue > 0 ? `Chiết khấu (${printQty(b.discountValue)}%)` : 'Chiết khấu';

  const rows = b.items
    .map(
      (it, idx) => `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(it.productName)}<span class="code"> (${escapeHtml(it.productCode)})</span></td>
        <td class="c">${escapeHtml(it.unit)}</td>
        <td class="r">${printQty(it.quantity)}</td>
        <td class="r">${printMoney(it.unitPrice)}</td>
        <td class="r">${printMoney(it.lineTotal)}</td>
      </tr>`
    )
    .join('');

  const sumRow = (label: string, value: number, bold = false) =>
    `<tr class="sum${bold ? ' b' : ''}"><td colspan="5" class="c">${label}</td><td class="r">${printMoney(value)}</td></tr>`;

  const info: string[] = [];
  if (b.partnerPhone) info.push(`Điện thoại: ${escapeHtml(b.partnerPhone)}`);
  if (b.partnerAddress) info.push(`Địa chỉ: ${escapeHtml(b.partnerAddress)}`);
  if (b.deliveryDate) info.push(`Dự kiến giao: ${escapeHtml(printDateTime(b.deliveryDate))}`);

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(b.orderCode)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 15px; color: #000; margin: 0; }
  .frame { border: 1.5px solid #000; padding: 10px 16px 18px; }
  .company { text-align: center; font-size: 19px; font-weight: bold; }
  .addr { text-align: center; font-size: 13px; margin-top: 2px; }
  .codeno { text-align: right; font-size: 13px; margin-top: 4px; }
  h1 { text-align: center; font-size: 24px; margin: 14px 0 12px; }
  .to { margin-bottom: 4px; }
  .to u { font-weight: bold; font-style: italic; margin-right: 18px; }
  .to b { font-weight: bold; }
  .extra { font-size: 13.5px; margin: 0 0 8px 88px; line-height: 1.5; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th, table.items td { border: 1px solid #000; padding: 3px 6px; }
  table.items th { font-weight: bold; text-align: center; }
  table.items tr.sum td { font-weight: bold; }
  .code { font-size: 12px; color: #333; }
  .c { text-align: center; } .r { text-align: right; }
  .words { margin-top: 12px; }
  .words b { margin-right: 22px; }
  .words i { font-weight: bold; }
  .note { margin-top: 8px; font-size: 13.5px; }
  .date { text-align: right; margin-top: 12px; padding-right: 20px; }
</style>
</head>
<body>
  <div class="frame">
    <div class="company">CÔNG TY TNHH TÍN PHÁT</div>
    <div class="addr">${escapeHtml(b.warehouseName)}</div>
    <div class="codeno">Số: <b>${escapeHtml(b.orderCode)}</b></div>
    <h1>ĐƠN ĐẶT HÀNG</h1>
    <div class="to"><u>Kính gửi:</u> <b>${escapeHtml(b.partnerName)}</b></div>
    ${info.length ? `<div class="extra">${info.join('<br />')}</div>` : ''}

    <table class="items">
      <thead>
        <tr>
          <th style="width:46px">STT</th>
          <th>Tên, quy cách, chủng loại hàng hóa, dịch vụ</th>
          <th style="width:70px">Đơn vị tính</th>
          <th style="width:80px">Số lượng</th>
          <th style="width:95px">Đơn giá</th>
          <th style="width:115px">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${sumRow('Tổng cộng', goodsTotal, true)}
        ${sumRow(discountLabel, b.discountAmount || 0, true)}
        ${sumRow('Thành tiền sau chiết khấu', b.totalAmount, true)}
        ${deposit > 0 ? sumRow('Khách đã đặt cọc', deposit) + sumRow('Còn phải thanh toán', remaining, true) : ''}
      </tbody>
    </table>

    <div class="words"><b>Số tiền bằng chữ:</b> <i>${escapeHtml(readVietnameseMoney(b.totalAmount).replace(/\.$/, ''))} ./.</i></div>
    ${notes ? `<div class="note">Ghi chú: ${escapeHtml(notes)}</div>` : ''}
    <div class="date">${dateText}</div>
  </div>
</body>
</html>`;
}

/** Mở hộp thoại in của trình duyệt với đơn đặt hàng. */
export function printSalesBooking(b: SalesBookingDetail, notes: string): void {
  printHtml(buildSalesBookingHtml(b, notes));
}
