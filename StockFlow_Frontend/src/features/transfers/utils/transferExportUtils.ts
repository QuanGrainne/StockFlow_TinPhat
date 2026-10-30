// src/features/transfers/utils/transferExportUtils.ts
import * as XLSX from 'xlsx';
import { TransferDetail, TransferItem, TransferRecord } from '../types';
import { WarehouseFacility } from '@/features/roles/types';
import { formatDateTimeVN } from './dateUtils';

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
 * In phiếu chuyển hàng chuẩn khổ giấy A4 theo tiêu đề "StockFlow - Kho hàng - Chuyển hàng"
 */
export function printTransferSlip(
  detail: TransferDetail,
  warehouses?: WarehouseFacility[]
): void {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Tìm địa chỉ kho chuyển (nguồn) thực tế
    const sourceWh = warehouses?.find(
      (w) =>
        w.warehouseId === detail.sourceWarehouseId ||
        w.name.toLowerCase() === detail.sourceWarehouseName.toLowerCase() ||
        w.code.toLowerCase() === detail.sourceWarehouseCode.toLowerCase()
    );
    const addressDisplay = sourceWh?.address || 'Số 18 Đường Dệt May, Gia Lâm, Hà Nội';

    // Xử lý tách ghi chú chuyển hàng và ghi chú nhận hàng nếu có
    let transferNotes = detail.notes || '';
    let receiveNotes = '';
    if (transferNotes.includes('[Nhận hàng]:')) {
      const parts = transferNotes.split('[Nhận hàng]:');
      transferNotes = parts[0].replace(/\|\s*$/, '').trim();
      receiveNotes = parts[1].trim();
    }

    const formattedTransferDate = formatDateTimeVN(detail.transferDate);

    const rowsHtml = (detail.items || [])
      .map((item: TransferItem, idx: number) => {
        const unitStr = item.unitName ? ` (${item.unitName})` : '';
        const receivedQtyStr =
          detail.status === 'RECEIVED' &&
          item.receivedQuantity !== null &&
          item.receivedQuantity !== undefined
            ? item.receivedQuantity
            : '';
        const priceStr = (item.transferPrice || 0).toLocaleString('vi-VN');

        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${item.productCode || ''}</td>
            <td>${item.productName || ''}${unitStr}</td>
            <td style="text-align: right;">${item.transferQuantity}</td>
            <td style="text-align: right;">${receivedQtyStr}</td>
            <td style="text-align: right;">${priceStr}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>StockFlow - Kho hàng - Chuyển hàng</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            font-size: 13px;
            color: #000;
            margin: 0;
            padding: 24px;
            background: #fff;
            line-height: 1.4;
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
          }
          .company-info {
            font-size: 13px;
            line-height: 1.5;
          }
          .company-name {
            font-weight: 700;
            text-transform: uppercase;
          }
          .system-title {
            font-size: 13px;
            color: #333;
            font-weight: 600;
          }
          .title-section {
            text-align: center;
            margin-bottom: 24px;
          }
          .main-title {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .transfer-code {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .transfer-date {
            font-size: 13px;
            font-style: italic;
          }
          .meta-section {
            margin-bottom: 16px;
            font-size: 13px;
            line-height: 1.7;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 16px;
          }
          table.data-table th, table.data-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            font-size: 13px;
          }
          table.data-table th {
            font-weight: bold;
            text-align: center;
            background-color: #fff;
          }
          .notes-section {
            margin-top: 14px;
            margin-bottom: 30px;
            font-size: 13px;
            line-height: 1.8;
          }
          .signatures-section {
            display: flex;
            justify-content: space-around;
            text-align: center;
            margin-top: 24px;
            page-break-inside: avoid;
          }
          .signature-title {
            font-weight: bold;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header-top">
          <div class="company-info">
            <div class="company-name">ctytnhhsanxuattinphat</div>
            <div>Địa chỉ: ${addressDisplay}</div>
            <div>SĐT: +84913268079</div>
          </div>
          <div class="system-title">
            StockFlow - Kho hàng - Chuyển hàng
          </div>
        </div>

        <div class="title-section">
          <div class="main-title">PHIẾU CHUYỂN HÀNG</div>
          <div class="transfer-code">Mã phiếu: ${detail.code}</div>
          <div class="transfer-date">Ngày chuyển: ${formattedTransferDate}</div>
        </div>

        <div class="meta-section">
          <div>Chi nhánh chuyển: ${detail.sourceWarehouseName}</div>
          <div>Người chuyển: ${detail.createdBy || ''}</div>
          <div>Chi nhánh nhận: ${detail.destWarehouseName}</div>
          <div>Người nhận: ${detail.receivedBy || ''}</div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px;">STT</th>
              <th style="width: 120px;">Mã hàng</th>
              <th>Tên hàng</th>
              <th style="width: 90px;">SL chuyển</th>
              <th style="width: 90px;">SL nhận</th>
              <th style="width: 100px;">Giá chuyển</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="notes-section">
          <div>Ghi chú chi nhánh chuyển: ${transferNotes || '—'}</div>
          <div>Ghi chú chi nhánh nhận: ${receiveNotes || '—'}</div>
        </div>

        <div class="signatures-section">
          <div class="signature-title">Người chuyển</div>
          <div class="signature-title">Người nhận</div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  } catch (err) {
    console.error('Lỗi khi in phiếu chuyển hàng:', err);
  }
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
