// In phiếu đặt hàng nhập (mẫu A4 cùng kiểu Phiếu nhập hàng, dữ liệu StockFlow).
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import type { PurchaseOrderDetail } from '../types';
import { PO_STATUS } from './purchaseOrderUtils';

export function buildPurchaseOrderHtml(po: PurchaseOrderDetail, notes: string): string {
  // Phiếu in gửi NCC: chỉ các dòng đã đặt (bỏ hàng nhập ngoài phiếu)
  const items = po.items.filter((it) => it.orderedQty > 0);
  const totalQty = items.reduce((sum, it) => sum + it.orderedQty, 0);
  const totalReceived = items.reduce((sum, it) => sum + it.receivedQty, 0);

  const rows = items
    .map((it, idx) => {
      const unitDiscount = it.unitPrice * (it.discountPercent / 100);
      const name = it.unit ? `${it.productName} (${it.unit})` : it.productName;
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(name)}</td>
        <td class="r">${printMoney(it.unitPrice)}</td>
        <td class="r">${printQty(it.orderedQty)}</td>
        <td class="r">${printQty(it.receivedQty)}</td>
        <td class="r">${printMoney(unitDiscount)}</td>
        <td class="r">${printMoney(it.lineTotal)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>StockFlow - Mua hàng - Đặt hàng nhập</title>
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
  <h1>PHIẾU ĐẶT HÀNG NHẬP</h1>
  <div class="sub"><b>Mã phiếu: ${escapeHtml(po.poCode)}</b><br /><i>Ngày: ${printDateTime(po.orderDate)}</i></div>

  <div class="info">
    Kho nhận hàng: ${escapeHtml(po.warehouseName)}<br />
    Người tạo: ${escapeHtml(po.createdByName)}<br />
    Nhà cung cấp: ${escapeHtml(po.partnerName)}<br />
    Địa chỉ: ${escapeHtml(po.partnerAddress)}<br />
    Trạng thái: ${escapeHtml(PO_STATUS[po.status]?.label ?? po.status)}
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:90px">Mã hàng</th>
        <th>Tên hàng</th>
        <th style="width:76px">Đơn giá</th>
        <th style="width:56px">SL đặt</th>
        <th style="width:60px">SL đã nhập</th>
        <th style="width:72px">Chiết khấu</th>
        <th style="width:86px">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="sum">
    <tr><td>Tổng số lượng đặt:</td><td class="r">${printQty(totalQty)}</td></tr>
    <tr><td>Tổng số lượng đã nhập:</td><td class="r">${printQty(totalReceived)}</td></tr>
    <tr><td>Tổng tiền hàng:</td><td class="r">${printMoney(po.totalGoodsAmount)}</td></tr>
    <tr><td>Chiết khấu phiếu:</td><td class="r">${printMoney(po.discountAmount)}</td></tr>
    <tr><td>Tiền đã trả NCC:</td><td class="r">${printMoney(po.paidAmount)}</td></tr>
    <tr><td><b>Tổng cộng:</b></td><td class="r"><b>${printMoney(Math.max(0, po.totalAmount - po.paidAmount))}</b></td></tr>
  </table>

  <div class="note">Ghi chú: ${escapeHtml(notes)}</div>

  <div class="sign">
    <div>Nhà cung cấp<small>(Ký, họ tên)</small></div>
    <div>Người lập<small>(Ký, họ tên)</small></div>
  </div>
</body>
</html>`;
}

/** Mở hộp thoại in của trình duyệt với phiếu đặt hàng nhập. */
export function printPurchaseOrder(po: PurchaseOrderDetail, notes: string): void {
  printHtml(buildPurchaseOrderHtml(po, notes));
}
