// In phiếu nhập hàng (mẫu A4 theo KiotViet, dữ liệu StockFlow).
// Dựng HTML riêng trong iframe ẩn rồi gọi hộp thoại in của trình duyệt → chỉ in đúng phiếu, không in giao diện.
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import type { PurchaseDetail } from '../types';

const money = printMoney;
const qtyFmt = printQty;
const formatDateTime = printDateTime;

export function buildPurchaseReceiptHtml(detail: PurchaseDetail): string {
  const items = detail.items ?? [];
  const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const totalGoods = detail.totalGoodsAmount ?? items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const orderDiscount = detail.discountAmount ?? 0;
  const payable = detail.totalAmount ?? Math.max(0, totalGoods - orderDiscount);

  const rows = items
    .map((it, idx) => {
      // Chiết khấu hiển thị theo tiền trên 1 đơn vị (giống KiotViet)
      const unitDiscount = (it.unitPrice || 0) * ((it.discountPercent || 0) / 100);
      const name = it.unit ? `${it.productName} (${it.unit})` : it.productName;
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(name)}</td>
        <td class="r">${money(it.unitPrice)}</td>
        <td class="r">${qtyFmt(it.quantity)}</td>
        <td class="r">${money(unitDiscount)}</td>
        <td class="r">${money(it.totalPrice)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>StockFlow - Mua hàng - Nhập hàng</title>
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
  table.sum { margin: 6px 0 0 auto; width: 68%; border-collapse: collapse; }
  table.sum td { padding: 2px 4px; }
  .note { margin-top: 8px; }
  .sign { display: flex; justify-content: space-around; margin-top: 24px; font-weight: bold; text-align: center; }
  .sign small { display: block; font-weight: normal; font-style: italic; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
  <h1>PHIẾU NHẬP HÀNG</h1>
  <div class="sub"><b>Mã phiếu: ${escapeHtml(detail.grCode)}</b><br /><i>Ngày: ${formatDateTime(detail.receivedDate)}</i></div>

  <div class="info">
    Kho nhập: ${escapeHtml(detail.warehouseName)}<br />
    Người tạo: ${escapeHtml(detail.receivedByName)}<br />
    Nhà cung cấp: ${escapeHtml(detail.partnerName)}<br />
    Địa chỉ: ${escapeHtml(detail.partnerAddress)}
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:90px">Mã hàng</th>
        <th>Tên hàng</th>
        <th style="width:80px">Đơn giá</th>
        <th style="width:70px">Số lượng</th>
        <th style="width:80px">Chiết khấu</th>
        <th style="width:90px">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="sum">
    <tr><td>Tổng số lượng hàng:</td><td class="r">${qtyFmt(totalQty)}</td></tr>
    <tr><td>Tổng tiền hàng:</td><td class="r">${money(totalGoods)}</td></tr>
    <tr><td>Chiết khấu hóa đơn:</td><td class="r">${money(orderDiscount)}</td></tr>
    <tr><td>Tiền cần trả NCC:</td><td class="r">${money(payable)}</td></tr>
  </table>

  <div class="note">Ghi chú: ${escapeHtml(detail.notes)}</div>

  <div class="sign">
    <div>Nhà cung cấp<small>(Ký, họ tên)</small></div>
    <div>Người lập<small>(Ký, họ tên)</small></div>
  </div>
</body>
</html>`;
}

/** Mở hộp thoại in của trình duyệt với phiếu nhập. */
export function printPurchaseReceipt(detail: PurchaseDetail): void {
  printHtml(buildPurchaseReceiptHtml(detail));
}
