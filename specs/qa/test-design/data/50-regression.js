// Regression: ca tái hiện cho từng nghi vấn (N-xx) phát hiện khi đọc code ở Phase 1–2.
// Nghi vấn chưa phải lỗi: chỉ thành lỗi (10_DEFECT_REPORT) khi đã chạy và tái hiện được.
'use strict';
const T = (id, mod, pri, name, req, o = {}) => ({ id, mod, type: 'Regression', pri, name, req, status: 'Not Run', ...o });

// Danh sách nghi vấn dùng chung cho mọi file
const SUSPECTS = [
  ['N-01', 'High', 'Sửa nhân viên không gửi danh sách kho thì mất hết quyền kho', 'UC-08', 'UpdateStaffCommand.cs:163', 'API-ACC-003'],
  ['N-02', 'High', 'Nhận chuyển kho nhiều hơn số đã xuất không bị chặn', 'UC-38', 'ReceiveTransferCommand.cs:63, 99', 'IT-TRF-003'],
  ['N-03', 'Critical', 'Hai người bán cùng lúc có thể bán vượt tồn (không khoá tồn kho)', 'UC-35', 'CreatePosOrderCommand, InventoryLedger: không FOR UPDATE / concurrency token', 'IT-CONC-001'],
  ['N-04', 'High', 'POS chỉ kiểm và trừ một dòng tồn mỗi hàng (hàng nhiều lô)', 'UC-35', 'CreatePosOrderCommand.cs:307', 'IT-SAL-011'],
  ['N-05', 'High', 'Chống trùng hoá đơn bằng ClientRequestId kiểm rồi ghi, không ràng buộc unique', 'UC-23', 'CreatePosOrderCommand.cs:102', 'IT-CONC-002'],
  ['N-06', 'Medium', 'Lệnh của kế hoạch đã đóng vẫn tăng được số lượng (S-01) – có thể đã hết', 'UC-96', '08-spec-code-review.md S-01', 'API-PLN-004'],
  ['N-07', 'High', 'Quyền mặc định lệch vai trò trong Report 3: Warehouse thiếu PURCHASE_UPDATE, FIN_CREATE; Sales thiếu SALES_DELETE; Production huỷ được kế hoạch', 'UC-22, UC-30, UC-85, UC-96', 'PermissionConstants.GetDefaultPermissionCodes', 'API-BKG-005, API-PO-002, API-SUP-001, API-PLN-003'],
  ['N-08', 'Medium', 'Huỷ được phiếu chuyển kho đã nhận (trái A37.2)', 'UC-37', 'TrxStockTransfer.Status.cs CanCancel', 'UT-STS-003, API-TRF-001'],
  ['N-09', 'Medium', '10 endpoint chỉ cần đăng nhập, không khai quyền', 'NFR-SEC-01', '01b_API_INVENTORY.md', 'API-SEC-005'],
  ['N-10', 'Medium', 'Nhập hàng không ghi số lô, hạn dùng (BR-27)', 'UC-31', 'PurchaseItemMapper.cs:61', 'API-GR-002'],
  ['N-11', 'Medium', 'Không có nhật ký kiểm toán (BR-49)', 'BR-49', 'Không có bảng audit', 'ST-NFR-008'],
  ['N-12', 'Low', 'Không sinh mã QR thanh toán', 'UC-26', 'PosScreen.tsx:1768', 'ST-SAL-004'],
  ['N-13', 'Medium', 'Không có báo cáo và dashboard quản lý', 'UC-86 – UC-90', 'Không có API báo cáo', 'API-FIN-001, API-FIN-002'],
  ['N-14', 'Medium', 'Không có kỳ hạn nợ / quá hạn (BR-18) – chưa xác minh', 'UC-66', 'Chưa thấy trong code', 'RT-N14'],
  ['N-15', 'Low', 'Nhận chuyển kho cộng vào dòng tồn không lô (mất thông tin lô)', 'UC-37', 'TransferStockOps.cs:93', 'RT-N15'],
  ['N-16', 'Low', 'Đăng xuất không thu hồi token phía server', 'UC-02', 'Frontend chỉ xoá localStorage', 'API-SEC-009'],
];

const tests = [
  T('RT-N01', 'ACC', 'High', 'Tái hiện N-01: sửa nhân viên giữ nguyên quyền kho', ['UC-08', 'BR-04'], { steps: ['Chạy API-ACC-003 trước và sau khi sửa'], exp: ['Sau sửa: đạt; chạy lại API-ACC-*, IT-SEC-001'], tech: ['RISK'] }),
  T('RT-N02', 'TRF', 'High', 'Tái hiện N-02: nhận vượt số xuất bị chặn', ['UC-38', 'BR-40'], { steps: ['Chạy IT-TRF-003'], exp: ['Sau sửa: đạt; chạy lại IT-TRF-*, API-TRF-001, ST-TRF-001'], tech: ['RISK'] }),
  T('RT-N03', 'POS', 'Critical', 'Tái hiện N-03: bán đồng thời không vượt tồn', ['UC-35', 'BR-16', 'NFR-REL-01'], { steps: ['Chạy IT-CONC-001 20 lần'], exp: ['Không lần nào tồn âm khi không cho bán âm; chạy lại IT-SAL-*, IT-CONC-003, ST-SAL-001'], tech: ['RISK', 'CONC'] }),
  T('RT-N04', 'POS', 'High', 'Tái hiện N-04: bán hàng nhiều lô', ['UC-35', 'BR-16'], { steps: ['Chạy IT-SAL-011'], exp: ['Sau sửa: đạt; chạy lại IT-SAL-*, IT-PRO-001'], tech: ['RISK'] }),
  T('RT-N05', 'POS', 'High', 'Tái hiện N-05: thanh toán trùng đồng thời', ['UC-23', 'NFR-REL-03'], { steps: ['Chạy IT-CONC-002 20 lần'], exp: ['Luôn chỉ 1 hoá đơn'], tech: ['RISK', 'CONC'] }),
  T('RT-N07', 'SEC', 'High', 'Tái hiện N-07: quyền mặc định theo vai trò của Report 3', ['BR-02', 'UC-22', 'UC-30', 'UC-85', 'UC-96'], { steps: ['Chạy API-BKG-005, API-PO-002, API-SUP-001, API-PLN-003'], exp: ['Sau khi nhóm chốt ma trận quyền: đạt; chạy lại API-SEC-003'], tech: ['RISK', 'SEC'] }),
  T('RT-N08', 'TRF', 'Medium', 'Tái hiện N-08: không huỷ phiếu chuyển đã nhận', ['UC-37', 'BR-40'], { steps: ['Chạy UT-STS-003, API-TRF-001 ca 4'], exp: ['Sau sửa: đạt'], tech: ['RISK'] }),
  T('RT-N14', 'CRD', 'Medium', 'Xác minh N-14: kỳ hạn nợ và nợ quá hạn', ['UC-29', 'UC-66', 'BR-18'], {
    pre: 'Khách có kỳ hạn 30 ngày; hoá đơn xuất 31 ngày trước còn nợ', steps: ['Mở công nợ khách'], exp: ['Hiện ngày đến hạn = ngày xuất + 30, đánh dấu quá hạn'], tech: ['EP'] }),
  T('RT-N15', 'TRF', 'Low', 'Xác minh N-15: lô sau khi chuyển kho', ['UC-37', 'BR-40'], {
    pre: 'TP1 lô L1 tại K001', steps: ['Chuyển TP1 sang K002', 'Xem tồn theo lô tại K002'], exp: ['Ghi nhận lô có được giữ hay không (tài liệu chưa quy định); báo nhóm'], tech: ['EG'] }),
  T('RT-SUITE-01', 'SEC', 'High', 'Bộ hồi quy theo module (chạy khi sửa module tương ứng)', ['NFR-REL-01'], {
    steps: ['Chọn bộ theo bảng "Bộ hồi quy" trong 03_TEST_STRATEGY.md'], exp: ['Mọi ca trong bộ đạt hoặc có lý do'], tech: ['RISK'] }),
];

module.exports = tests;
module.exports.SUSPECTS = SUSPECTS;
