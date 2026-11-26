// Report 5.3 – sheet "UC-34 Inbound Costs" (SYS-LCS-01..04). Cả 4 ca N/A: chưa có chức năng phân bổ chi phí nhập (landed cost).
import { test, traceTc } from '../../fixtures/test';

const SHEET = 'UC-34 Inbound Costs';
const CASES: [string, string][] = [
  ['SYS-LCS-01', 'Phân bổ chi phí theo giá trị, tính lại giá vốn'],
  ['SYS-LCS-02', 'Phân bổ chi phí theo số lượng nhận'],
  ['SYS-LCS-03', 'Đổi số tiền / cách phân bổ trước khi xác nhận'],
  ['SYS-LCS-04', 'Số tiền ≤ 0, thiếu loại chi phí, phiếu không có SL đạt bị từ chối'],
];

test.describe(SHEET, () => {
  for (const [tc, title] of CASES) {
    test(`${tc} – ${title}`, async ({}, testInfo) => {
      traceTc(testInfo, tc, SHEET);
      test.skip(true, 'N/A – Chưa có chức năng phân bổ chi phí nhập (Note: Not implemented)');
    });
  }
});
