// In phiếu trả hàng nhập (mẫu A4 theo KiotViet, dữ liệu StockFlow).
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';
import type { PurchaseReturnDetail } from '../types';

export function buildPurchaseReturnHtml(detail: PurchaseReturnDetail): string {
  const items = detail.items ?? [];
  const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const totalGoods = detail.totalGoodsAmount ?? items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const discount = detail.discountAmount ?? 0;
  const total = detail.totalAmount ?? Math.max(0, totalGoods - discount);
  const refunded = detail.refundAmount ?? 0;
  const offset = detail.offsetAmount ?? 0;
  const remaining = detail.status === 'CANCELLED' ? 0 : Math.max(0, total - refunded - offset);
  const statusLabel =
    detail.status === 'COMPLETED' ? 'Đã trả hàng' : detail.status === 'DRAFT' ? 'Phiếu tạm' : 'Đã hủy';

  const rows = items
    .map((it, idx) => {
      const name = it.unit ? `${it.productName} (${it.unit})` : it.productName;
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(name)}</td>
        <td class="r">${printQty(it.quantity)}</td>
        <td class="r">${printMoney(it.importPrice)}</td>
        <td class="r">${printMoney(it.returnPrice)}</td>
        <td class="r">${printMoney(it.totalPrice)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>StockFlow - Mua hàng - Trả hàng nhập</title>
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
  table.sum tr.strong td { font-weight: bold; }
  .note { margin-top: 8px; }
  .sign { display: flex; justify-content: space-around; margin-top: 24px; font-weight: bold; text-align: center; }
  .sign small { display: block; font-weight: normal; font-style: italic; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
  <h1>TRẢ HÀNG NHẬP</h1>
  <div class="sub">
    <b>Mã phiếu: ${escapeHtml(detail.returnCode)}</b><br />
    ${detail.grCode ? `<b>Mã nhập hàng: ${escapeHtml(detail.grCode)}</b><br />` : ''}
    <i>Ngày: ${printDateTime(detail.returnDate)}</i>
  </div>

  <div class="info">
    Kho trả hàng: ${escapeHtml(detail.warehouseName)}<br />
    Người tạo: ${escapeHtml(detail.createdByName)}<br />
    Nhà cung cấp: ${escapeHtml(detail.partnerName)}${detail.partnerCode ? ` (${escapeHtml(detail.partnerCode)})` : ''}<br />
    Điện thoại: ${escapeHtml(detail.partnerPhone)}<br />
    Địa chỉ: ${escapeHtml(detail.partnerAddress)}<br />
    Trạng thái: ${statusLabel}
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:90px">Mã hàng</th>
        <th>Tên hàng</th>
        <th style="width:56px">SL</th>
        <th style="width:84px">Giá nhập</th>
        <th style="width:84px">Giá trả lại</th>
        <th style="width:96px">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="note">Ghi chú: ${escapeHtml(detail.notes)}</div>

  <table class="sum">
    <tr><td>Tổng số lượng:</td><td class="r">${printQty(totalQty)}</td></tr>
    <tr><td>Tổng số mặt hàng:</td><td class="r">${items.length}</td></tr>
    <tr><td>Tổng tiền hàng trả:</td><td class="r">${printMoney(totalGoods)}</td></tr>
    <tr><td>Giảm giá:</td><td class="r">${printMoney(discount)}</td></tr>
    <tr><td>Tổng cộng:</td><td class="r">${printMoney(total)}</td></tr>
    <tr><td>Tiền NCC đã trả:</td><td class="r">${printMoney(refunded)}</td></tr>
    ${offset > 0 ? `<tr><td>Trừ vào công nợ phiếu nhập:</td><td class="r">${printMoney(offset)}</td></tr>` : ''}
    <tr class="strong"><td>NCC cần trả:</td><td class="r">${printMoney(remaining)}</td></tr>
  </table>

  <div class="sign">
    <div>Nhà cung cấp<small>(Ký, họ tên)</small></div>
    <div>Người lập<small>(Ký, họ tên)</small></div>
  </div>
</body>
</html>`;
}

/** Mở hộp thoại in phiếu trả hàng nhập. */
export function printPurchaseReturn(detail: PurchaseReturnDetail): void {
  printHtml(buildPurchaseReturnHtml(detail));
}
