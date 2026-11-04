// src/features/transfers/utils/transferExportUtils.ts
import * as XLSX from 'xlsx';
import { TransferDetail, TransferItem, TransferRecord } from '../types';
import { formatDateTimeVN } from './dateUtils';
import { escapeHtml, printDateTime, printHtml, printMoney, printQty } from '@/lib/print/printHtml';

/**
 * Xuất dữ liệu chi tiết phiếu chuyển hàng ra file Excel (.xlsx) chuẩn theo thiết kế
 * Khớp định dạng: ChiTietChuyenHang_{transferCode}_KV{timestamp}.xlsx
 */
export function exportTransferToExcel(detail: TransferDetail): void {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  const dateStr = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad3(now.getMilliseconds())}`;
  const fileName = `ChiTietChuyenHang_${detail.code}_KV${dateStr}.xlsx`;

  // 1. Tiêu đề các cột dữ liệu theo mẫu Excel
  const header = [
    'Mã hàng',
    'Tên hàng',
    'Đơn vị tính',
    'Số lượng chuyển',
    'Số lượng nhận',
    'Giá chuyển/nhận',
    'Thành tiền chuyển',
    'Thành tiền nhận',
  ];

  // 2. Dòng dữ liệu sản phẩm
  const dataRows = (detail.items || []).map((item: TransferItem) => {
    const transferQty = Number(item.transferQuantity) || 0;
    const receivedQty =
      detail.status === 'RECEIVED' ? Number(item.receivedQuantity ?? 0) : 0;
    const price = Number(item.transferPrice) || 0;
    const transferTotal = transferQty * price;
    const receivedTotal = receivedQty * price;

    return [
      item.productCode || '',
      item.productName || '',
      item.unitName || 'quả',
      transferQty,
      receivedQty,
      price,
      transferTotal,
      receivedTotal,
    ];
  });

  // 3. Các dòng tổng kết cuối bảng
  const totalItemsCount = detail.items?.length || 0;
  const totalTransferQty = (detail.items || []).reduce(
    (sum: number, it: TransferItem) => sum + (Number(it.transferQuantity) || 0),
    0
  );
  const totalTransferAmount = (detail.items || []).reduce(
    (sum: number, it: TransferItem) =>
      sum + (Number(it.transferQuantity) || 0) * (Number(it.transferPrice) || 0),
    0
  );

  const summaryRow1 = ['', '', '', '', '', 'Tổng số mặt hàng', '', totalItemsCount];
  const summaryRow2 = ['', '', '', '', '', 'Tổng SL chuyển', '', totalTransferQty];
  const summaryRow3 = ['', '', '', '', '', 'Tổng giá trị chuyển', '', totalTransferAmount];

  const sheetData = [header, ...dataRows, summaryRow1, summaryRow2, summaryRow3];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Cấu hình độ rộng các cột dễ nhìn
  worksheet['!cols'] = [
    { wch: 15 }, // Mã hàng
    { wch: 32 }, // Tên hàng
    { wch: 14 }, // Đơn vị tính
    { wch: 18 }, // Số lượng chuyển
    { wch: 18 }, // Số lượng nhận
    { wch: 18 }, // Giá chuyển/nhận
    { wch: 20 }, // Thành tiền chuyển
    { wch: 20 }, // Thành tiền nhận
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi tiết chuyển hàng');
  XLSX.writeFile(workbook, fileName);
}

/**
 * In phiếu chuyển hàng (A4, cùng kiểu với phiếu nhập / phiếu trả hàng nhập / phiếu kiểm kho).
 * Không in thông tin công ty: chỉ thông tin phiếu, 2 chi nhánh, bảng hàng, ghi chú, ký tên.
 */
export function printTransferSlip(detail: TransferDetail): void {
  // Ghi chú lưu chung 1 trường: tách phần ghi chú lúc nhận hàng "[Nhận hàng]: ..."
  let transferNotes = detail.notes || '';
  let receiveNotes = detail.receiveNotes || '';
  if (transferNotes.includes('[Nhận hàng]:')) {
    const parts = transferNotes.split('[Nhận hàng]:');
    transferNotes = parts[0].replace(/\|\s*$/, '').trim();
    receiveNotes = parts.slice(1).join(' ').trim();
  }

  const items: TransferItem[] = detail.items || [];
  const received = detail.status === 'RECEIVED';
  const totalQty = items.reduce((s, it) => s + (it.transferQuantity || 0), 0);
  const totalReceived = items.reduce((s, it) => s + (it.receivedQuantity ?? 0), 0);
  const totalValue = items.reduce((s, it) => s + (it.lineTotal || (it.transferQuantity || 0) * (it.transferPrice || 0)), 0);
  const statusLabel =
    detail.status === 'RECEIVED' ? 'Đã nhận' : detail.status === 'IN_TRANSIT' ? 'Đang chuyển' : detail.status === 'CANCELLED' ? 'Đã hủy' : 'Phiếu tạm';

  const rows = items
    .map(
      (it, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.productCode)}</td>
        <td>${escapeHtml(it.unitName ? `${it.productName} (${it.unitName})` : it.productName)}${
          it.notes ? `<br /><i style="font-size:11px">(${escapeHtml(it.notes)})</i>` : ''
        }${it.receiveNotes ? `<br /><i style="font-size:11px">(${escapeHtml(it.receiveNotes)})</i>` : ''}</td>
        <td class="r">${printQty(it.transferQuantity)}</td>
        <td class="r">${received && it.receivedQuantity !== null && it.receivedQuantity !== undefined ? printQty(it.receivedQuantity) : ''}</td>
        <td class="r">${printMoney(it.transferPrice)}</td>
        <td class="r">${printMoney(it.lineTotal || (it.transferQuantity || 0) * (it.transferPrice || 0))}</td>
      </tr>`
    )
    .join('');

  printHtml(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8" /><title>StockFlow - Hàng hóa - Chuyển hàng</title>
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
  table.sum { margin: 6px 0 0 auto; width: 55%; border-collapse: collapse; }
  table.sum td { padding: 2px 4px; }
  .note { margin-top: 8px; line-height: 1.6; }
  .sign { display: flex; justify-content: space-around; margin-top: 24px; font-weight: bold; text-align: center; }
  .sign small { display: block; font-weight: normal; font-style: italic; font-size: 11px; margin-top: 2px; }
</style></head>
<body>
  <h1>PHIẾU CHUYỂN HÀNG</h1>
  <div class="sub"><b>Mã phiếu: ${escapeHtml(detail.code)}</b><br /><i>Ngày chuyển: ${printDateTime(detail.transferDate)}</i></div>

  <div class="info">
    <div>Chi nhánh chuyển: ${escapeHtml(detail.sourceWarehouseName)}</div>
    <div>Trạng thái: ${statusLabel}</div>
    <div>Người chuyển: ${escapeHtml(detail.createdBy)}</div>
    <div>Ngày chuyển: ${printDateTime(detail.transferDate)}</div>
    <div>Chi nhánh nhận: ${escapeHtml(detail.destWarehouseName)}</div>
    <div>Ngày nhận: ${printDateTime(detail.receivedDate)}</div>
    <div>Người nhận: ${escapeHtml(detail.receivedBy)}</div>
  </div>

  <table class="items">
    <thead><tr>
      <th style="width:36px">STT</th><th style="width:90px">Mã hàng</th><th>Tên hàng</th>
      <th style="width:70px">SL chuyển</th><th style="width:70px">SL nhận</th>
      <th style="width:84px">Giá chuyển</th><th style="width:96px">Thành tiền</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="sum">
    <tr><td>Tổng số mặt hàng:</td><td class="r">${items.length}</td></tr>
    <tr><td>Tổng SL chuyển:</td><td class="r">${printQty(totalQty)}</td></tr>
    ${received ? `<tr><td>Tổng SL nhận:</td><td class="r">${printQty(totalReceived)}</td></tr>` : ''}
    <tr><td><b>Tổng giá trị chuyển:</b></td><td class="r"><b>${printMoney(totalValue)}</b></td></tr>
  </table>

  <div class="note">
    Ghi chú chi nhánh chuyển: ${escapeHtml(transferNotes)}<br />
    Ghi chú chi nhánh nhận: ${escapeHtml(receiveNotes)}
  </div>

  <div class="sign">
    <div>Người chuyển<small>(Ký, họ tên)</small></div>
    <div>Người nhận<small>(Ký, họ tên)</small></div>
  </div>
</body></html>`);
}

/**
 * Xuất danh sách các phiếu chuyển hàng trong bảng ra file Excel (.xlsx)
 */
export function exportTransfersListToExcel(transfers: TransferRecord[]): void {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const fileName = `DanhSachChuyenHang_KV${dateStr}.xlsx`;

  const header = [
    'Mã chuyển hàng',
    'Ngày chuyển',
    'Ngày nhận',
    'Từ chi nhánh',
    'Tới chi nhánh',
    'Tổng số lượng',
    'Tổng giá trị',
    'Trạng thái',
    'Tình trạng nhận hàng',
    'Ghi chú',
  ];

  const dataRows = (transfers || []).map((t: TransferRecord) => {
    const statusText =
      t.status === 'RECEIVED'
        ? 'Đã nhận'
        : t.status === 'IN_TRANSIT'
        ? 'Đang chuyển'
        : t.status === 'DRAFT'
        ? 'Phiếu tạm'
        : 'Đã hủy';

    const matchText =
      t.status === 'RECEIVED'
        ? t.isMatched === false
          ? 'Không khớp'
          : 'Khớp'
        : '';

    return [
      t.code || '',
      formatDateTimeVN(t.transferDate),
      t.receivedDate ? formatDateTimeVN(t.receivedDate) : '',
      t.sourceWarehouseName || '',
      t.destWarehouseName || '',
      t.totalQuantity || 0,
      t.totalAmount || 0,
      statusText,
      matchText,
      t.notes || '',
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...dataRows]);

  worksheet['!cols'] = [
    { wch: 18 }, // Mã
    { wch: 18 }, // Ngày chuyển
    { wch: 18 }, // Ngày nhận
    { wch: 22 }, // Từ chi nhánh
    { wch: 22 }, // Tới chi nhánh
    { wch: 15 }, // Tổng SL
    { wch: 18 }, // Tổng giá trị
    { wch: 15 }, // Trạng thái
    { wch: 15 }, // Tình trạng
    { wch: 30 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách chuyển hàng');
  XLSX.writeFile(workbook, fileName);
}
