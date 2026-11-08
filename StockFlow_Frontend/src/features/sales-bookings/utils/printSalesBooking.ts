// In phiếu đặt hàng (mẫu A4 cùng kiểu Phiếu đặt hàng nhập, dữ liệu StockFlow).
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import type { SalesBookingDetail } from '../types';
import { BOOKING_STATUS } from './salesBookingUtils';

export function buildSalesBookingHtml(b: SalesBookingDetail, notes: string): string {
  const totalQty = b.items.reduce((s, it) => s + it.quantity, 0);
  const rows = b.items
    .map(
      (it, idx) => `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(it.unit ? `${it.productName} (${it.unit})` : it.productName)}</td>
        <td class="r">${printQty(it.quantity)}</td>
        <td class="r">${printMoney(it.originalPrice)}</td>
        <td class="r">${printMoney(Math.max(0, it.originalPrice - it.unitPrice))}</td>
        <td class="r">${printMoney(it.lineTotal)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>StockFlow - Bán hàng - Đặt hàng</title>
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
  table.sum { margin: 6px 0 0 auto; width: 60%; border-collapse: collapse; }
  table.sum td { padding: 2px 4px; }
  .note { margin-top: 8px; }
  .sign { display: flex; justify-content: space-around; margin-top: 24px; font-weight: bold; text-align: center; }
  .sign small { display: block; font-weight: normal; font-style: italic; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
  <h1>PHIẾU ĐẶT HÀNG</h1>
  <div class="sub"><b>Mã phiếu: ${escapeHtml(b.orderCode)}</b><br /><i>Ngày đặt: ${printDateTime(b.orderDate)}</i></div>

  <div class="info">
    Chi nhánh xử lý: ${escapeHtml(b.warehouseName)}<br />
    Người tạo: ${escapeHtml(b.createdByName)}<br />
    Khách hàng: ${escapeHtml(b.partnerName)} (${escapeHtml(b.partnerCode)})${b.partnerPhone ? ` - ĐT: ${escapeHtml(b.partnerPhone)}` : ''}<br />
    Địa chỉ: ${escapeHtml(b.partnerAddress)}<br />
    Dự kiến giao: ${b.deliveryDate ? printDateTime(b.deliveryDate) : ''}<br />
    Trạng thái: ${escapeHtml(BOOKING_STATUS[b.status]?.label ?? b.status)}
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:90px">Mã hàng</th>
        <th>Tên hàng</th>
        <th style="width:60px">SL đặt</th>
        <th style="width:80px">Đơn giá</th>
        <th style="width:72px">Giảm giá</th>
        <th style="width:90px">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="sum">
    <tr><td>Tổng số lượng:</td><td class="r">${printQty(totalQty)}</td></tr>
    <tr><td>Tổng tiền hàng:</td><td class="r">${printMoney(b.subTotal)}</td></tr>
    <tr><td>Giảm giá phiếu đặt:</td><td class="r">${printMoney(b.discountAmount)}</td></tr>
    <tr><td><b>Tổng cộng:</b></td><td class="r"><b>${printMoney(b.totalAmount)}</b></td></tr>
    <tr><td>Khách đã trả:</td><td class="r">${printMoney(b.paidAmount)}</td></tr>
    <tr><td><b>Còn phải trả:</b></td><td class="r"><b>${printMoney(Math.max(0, b.totalAmount - b.paidAmount))}</b></td></tr>
  </table>

  <div class="note">Ghi chú: ${escapeHtml(notes)}</div>

  <div class="sign">
    <div>Khách hàng<small>(Ký, họ tên)</small></div>
    <div>Người lập<small>(Ký, họ tên)</small></div>
  </div>
</body>
</html>`;
}

/** Mở hộp thoại in của trình duyệt với phiếu đặt hàng. */
export function printSalesBooking(b: SalesBookingDetail, notes: string): void {
  printHtml(buildSalesBookingHtml(b, notes));
}
