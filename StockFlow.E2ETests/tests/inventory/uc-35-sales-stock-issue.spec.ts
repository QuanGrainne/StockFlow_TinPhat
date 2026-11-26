// Report 5.3 – sheet "UC-35 Sales Stock Issue" (SYS-SIS-01..04). Cả 4 ca N/A: POS trừ tồn trực tiếp, không có bước xuất kho bán hàng.
import { test, traceTc } from '../../fixtures/test';

const SHEET = 'UC-35 Sales Stock Issue';
const CASES: [string, string][] = [
  ['SYS-SIS-01', 'Xác nhận xuất kho bán hàng: trừ tồn, tăng công nợ khách'],
  ['SYS-SIS-02', 'SL thực xuất âm, vượt yêu cầu hoặc vượt tồn bị từ chối'],
  ['SYS-SIS-03', 'Hàng đang kiểm kho: không xác nhận được phiếu xuất'],
  ['SYS-SIS-04', 'Xuất thiếu: Partially Fulfilled và tạo đơn chờ phần còn lại'],
];

test.describe(SHEET, () => {
  for (const [tc, title] of CASES) {
    test(`${tc} – ${title}`, async ({}, testInfo) => {
      traceTc(testInfo, tc, SHEET);
      test.skip(true, 'N/A – Chưa có chức năng (Note: POS trừ tồn trực tiếp, không có phiếu yêu cầu xuất kho)');
    });
  }
});
