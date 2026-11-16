// src/features/credit-requests/utils/creditRequestDocs.ts
// Xuất file Excel và In phiếu yêu cầu duyệt hạn mức công nợ (A4, cùng kiểu phiếu xuất hủy / chuyển hàng).

import * as XLSX from 'xlsx';
import { escapeHtml, printDateTime, printHtml, printMoney } from '@/lib/print/printHtml';
import type { CreditRequest } from '../types';
import { APPROVAL_TYPE_LABEL, CREDIT_STATUS, exceedOverLimit } from './creditRequestUtils';

const code = (r: CreditRequest) => r.requestCode ?? `#${r.requestId}`;
const customer = (r: CreditRequest) => [r.partnerCode, r.partnerName].filter(Boolean).join(' - ');

/** Các dòng "nhãn – giá trị" dùng chung cho file Excel và bản in */
function infoRows(r: CreditRequest): [string, string | number][] {
  const rows: [string, string | number][] = [
    ['Mã yêu cầu', code(r)],
    ['Khách hàng', customer(r)],
    ['Trạng thái', CREDIT_STATUS[r.status].label],
    ['Người gửi', r.requestedByName ?? ''],
    ['Thời gian gửi', printDateTime(r.requestDate)],
    ['Lý do', r.reason ?? ''],
    ['Dư nợ hiện tại', r.currentDebt],
    ['Hạn mức hiện tại', r.currentCreditLimit],
    ['Hạn mức lúc gửi', r.limitAtRequest ?? ''],
    ['Hạn mức đề xuất', r.requestedLimit ?? ''],
    ['Vượt hạn mức hiện tại', exceedOverLimit(r)],
  ];
  if (r.status !== 'PENDING') {
    if (r.approvalType) rows.push(['Loại duyệt', APPROVAL_TYPE_LABEL[r.approvalType]]);
    if (r.approvedLimit != null) rows.push(['Mức duyệt', r.approvedLimit]);
    rows.push(['Người xử lý', r.approvedByName ?? '']);
    rows.push(['Thời gian xử lý', printDateTime(r.approvalDate)]);
    rows.push([r.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú duyệt', r.approvalNotes ?? '']);
  }
  return rows;
}

/** Xuất file 1 yêu cầu */
export function exportCreditRequestExcel(r: CreditRequest): void {
  const ws = XLSX.utils.aoa_to_sheet(infoRows(r));
  ws['!cols'] = [{ wch: 24 }, { wch: 48 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'YeuCauHanMuc');
  XLSX.writeFile(wb, `YeuCauHanMuc_${code(r)}.xlsx`);
}

/** Xuất file danh sách yêu cầu đang lọc */
export function exportCreditRequestListExcel(rows: CreditRequest[]): void {
  const data = rows.map((r) => ({
    'Mã yêu cầu': code(r),
    'Mã khách hàng': r.partnerCode ?? '',
    'Tên khách hàng': r.partnerName ?? '',
    'Dư nợ hiện tại': r.currentDebt,
    'Hạn mức hiện tại': r.currentCreditLimit,
    'Hạn mức đề xuất': r.requestedLimit ?? '',
    'Mức duyệt': r.approvedLimit ?? '',
    'Người gửi': r.requestedByName ?? '',
    'Thời gian gửi': printDateTime(r.requestDate),
    'Trạng thái': CREDIT_STATUS[r.status].label,
    'Người xử lý': r.approvedByName ?? '',
    'Thời gian xử lý': printDateTime(r.approvalDate),
    'Lý do': r.reason ?? '',
    'Ghi chú / Lý do từ chối': r.approvalNotes ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'YeuCauHanMuc');
  XLSX.writeFile(wb, `DanhSachYeuCauHanMuc_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** In phiếu yêu cầu duyệt hạn mức khổ A4 */
export function printCreditRequest(r: CreditRequest): void {
  const money = (n: number | null | undefined) => (n == null ? '' : `${printMoney(n)} đ`);
  const decided = r.status !== 'PENDING';

  printHtml(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(code(r))}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13.5px; color: #000; margin: 0; }
  .head { display: flex; justify-content: space-between; }
  h1 { text-align: center; font-size: 22px; margin: 14px 0 4px; }
  .sub { text-align: center; font-style: italic; margin-bottom: 12px; }
  table.grid { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.grid td { border: 1px solid #000; padding: 5px 7px; }
  table.grid td.l { width: 32%; }
  .r { text-align: right; }
  h3 { font-size: 15px; margin: 16px 0 4px; }
  .sign { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; min-height: 110px; }
  .sign div { flex: 1; } .sign i { font-size: 12.5px; }
</style></head><body>
  <div class="head">
    <div><b>CÔNG TY TNHH TÍN PHÁT</b></div>
    <div>Số: <b>${escapeHtml(code(r))}</b></div>
  </div>
  <h1>PHIẾU YÊU CẦU DUYỆT HẠN MỨC CÔNG NỢ</h1>
  <div class="sub">Ngày gửi ${escapeHtml(printDateTime(r.requestDate))} — ${escapeHtml(CREDIT_STATUS[r.status].label)}</div>

  <h3>Thông tin yêu cầu</h3>
  <table class="grid">
    <tr><td class="l">Khách hàng</td><td><b>${escapeHtml(customer(r))}</b></td></tr>
    <tr><td class="l">Người gửi</td><td>${escapeHtml(r.requestedByName ?? '')}</td></tr>
    <tr><td class="l">Dư nợ hiện tại</td><td class="r">${money(r.currentDebt)}</td></tr>
    <tr><td class="l">Hạn mức hiện tại</td><td class="r">${money(r.currentCreditLimit)}</td></tr>
    <tr><td class="l">Hạn mức lúc gửi</td><td class="r">${money(r.limitAtRequest)}</td></tr>
    <tr><td class="l">Hạn mức đề xuất</td><td class="r"><b>${money(r.requestedLimit)}</b></td></tr>
    <tr><td class="l">Vượt hạn mức hiện tại</td><td class="r">${money(exceedOverLimit(r))}</td></tr>
    <tr><td class="l">Lý do</td><td>${escapeHtml(r.reason ?? '')}</td></tr>
  </table>

  ${
    decided
      ? `<h3>Kết quả xử lý</h3>
  <table class="grid">
    ${r.approvalType ? `<tr><td class="l">Loại duyệt</td><td>${escapeHtml(APPROVAL_TYPE_LABEL[r.approvalType])}</td></tr>` : ''}
    ${r.approvedLimit != null ? `<tr><td class="l">Mức duyệt</td><td class="r"><b>${money(r.approvedLimit)}</b></td></tr>` : ''}
    <tr><td class="l">Người xử lý</td><td>${escapeHtml(r.approvedByName ?? '')}</td></tr>
    <tr><td class="l">Thời gian xử lý</td><td>${escapeHtml(printDateTime(r.approvalDate))}</td></tr>
    <tr><td class="l">${r.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú'}</td><td>${escapeHtml(r.approvalNotes ?? '')}</td></tr>
  </table>`
      : ''
  }

  <div class="sign">
    <div><b>Người đề nghị</b><br/><i>(Ký, họ tên)</i></div>
    <div><b>Kế toán trưởng</b><br/><i>(Ký, họ tên)</i></div>
  </div>
</body></html>`);
}
