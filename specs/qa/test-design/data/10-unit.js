// Unit test: thành phần thuần, không database (Domain/Services, chuyển trạng thái, validator, bộ sinh mã).
// Kết quả mong đợi theo Report 3 (bản 19/11/2026); chỗ tài liệu không quy định thì ghi "theo code" trong note.
'use strict';
const T = (id, mod, pri, name, req, o = {}) => ({ id, mod, type: 'Unit', pri, name, req, status: 'Not Run', ...o });

module.exports = [
  // ── Giá vốn bình quân (CostingPolicy.CalculateMovingAverageCost) ──
  T('UT-COST-001', 'GR', 'Critical', 'MAC khi kho chưa có hàng bằng đơn giá nhập (làm tròn 2 số)', ['BR-29'], {
    data: 'Tồn 0, MAC 0, nhập 10 × 123,456', steps: ['Gọi CalculateMovingAverageCost(0, 0, 10, 123.456)'],
    exp: ['Trả 123,46'], tech: ['EP', 'BVA'] }),
  T('UT-COST-002', 'GR', 'Critical', 'MAC bình quân gia quyền khi đã có tồn', ['BR-29'], {
    data: 'Tồn 10 × 100, nhập 10 × 200', steps: ['Gọi CalculateMovingAverageCost(10, 100, 10, 200)'],
    exp: ['Trả 150,00 = (10×100 + 10×200) / 20'], tech: ['EP'] }),
  T('UT-COST-003', 'GR', 'High', 'Nhập số lượng 0 không đổi MAC', ['BR-29'], {
    data: 'Tồn 10 × 100, nhập 0 × 200', steps: ['Gọi CalculateMovingAverageCost(10, 100, 0, 200)'],
    exp: ['Trả 100 (giữ nguyên)'], tech: ['BVA'] }),
  T('UT-COST-004', 'GR', 'High', 'Tồn âm trước khi nhập: MAC lấy đơn giá nhập', ['BR-29'], {
    data: 'Tồn −5 × 100, nhập 10 × 200', steps: ['Gọi CalculateMovingAverageCost(-5, 100, 10, 200)'],
    exp: ['Trả 200'], tech: ['BVA', 'EG'], note: 'Tài liệu không quy định trường hợp tồn âm; mong đợi theo code (CostingPolicy). Cần nhóm xác nhận.' }),
  T('UT-COST-005', 'GR', 'Medium', 'Làm tròn half-up 2 chữ số', ['BR-29'], {
    data: 'Tồn 1 × 0,005, nhập 1 × 0,005', steps: ['Gọi CalculateMovingAverageCost(1, 0.005, 1, 0.005)'],
    exp: ['Trả 0,01 (MidpointRounding.AwayFromZero)'], tech: ['BVA'] }),

  // ── Chính sách sản xuất (ProductionPolicy) ──
  T('UT-PRD-001', 'PRD', 'Critical', 'Nhu cầu NVL = SL × định mức × (1 + hao hụt%)', ['BR-31'], {
    data: 'SL 100, định mức 2,5, hao hụt 3,5%', steps: ['Gọi CalculateRequirement(100, 2.5, 3.5)'],
    exp: ['Trả 258,75'], tech: ['EP'] }),
  T('UT-PRD-002', 'PRD', 'High', 'Nhu cầu NVL với hao hụt 0%', ['BR-31'], {
    data: 'SL 100, định mức 2,5, hao hụt 0', steps: ['Gọi CalculateRequirement(100, 2.5, 0)'], exp: ['Trả 250,00'], tech: ['BVA'] }),
  T('UT-PRD-003', 'PRD', 'Medium', 'Làm tròn nhu cầu half-up 2 chữ số ở bước cuối', ['BR-31'], {
    data: 'SL 3, định mức 0,3333, hao hụt 0', steps: ['Gọi CalculateRequirement(3, 0.3333, 0)'], exp: ['Trả 1,00 (0,9999 làm tròn)'], tech: ['BVA'] }),
  T('UT-PRD-004', 'PRD', 'High', 'Nhu cầu vượt giới hạn lưu trữ bị từ chối', ['BR-31'], {
    data: 'SL 10^16, định mức 10', steps: ['Gọi TryCalculateRequirement(1e16, 10, 0, out r)'],
    exp: ['Trả false (vượt MaxStoredQuantity 9.999.999.999.999.999,99)'], tech: ['BVA', 'EG'] }),
  T('UT-PRD-005', 'PRD', 'High', 'Số còn thiếu = nhu cầu − đã xuất, tối thiểu 0', ['BR-32'], {
    data: '(10, 4) và (10, 12)', steps: ['Gọi CalculateShortage(10, 4)', 'Gọi CalculateShortage(10, 12)'],
    exp: ['Trả 6', 'Trả 0'], tech: ['EP', 'BVA'] }),
  T('UT-PRD-006', 'PRD', 'High', 'NVL cần cho số thành phẩm đã nhận', ['BR-37'], {
    data: 'Nhu cầu 25 kg cho 50 lốc, đã nhận 30 lốc', steps: ['Gọi MaterialNeededFor(25, 50, 30)'], exp: ['Trả 15'], tech: ['EP'] }),
  T('UT-PRD-007', 'PRD', 'High', 'Số thành phẩm sản xuất được từ NVL đã xuất, làm tròn xuống', ['BR-37'], {
    data: 'SL kế hoạch 50, nhu cầu 25, đã xuất 15; và nhu cầu 30, đã xuất 10', steps: ['Gọi ProducibleFromIssued cho hai bộ dữ liệu'],
    exp: ['Trả 30', 'Trả 16,66 (không làm tròn lên 16,67)'], tech: ['EP', 'BVA'] }),
  T('UT-PRD-008', 'PRD', 'Medium', 'Định mức tính ngược từ tổng nhu cầu (4 chữ số)', ['BR-31', 'BR-51'], {
    data: 'SL 100, nhu cầu 258,75, hao hụt 3,5%', steps: ['Gọi CalculateNormFromRequirement(100, 258.75, 3.5)'], exp: ['Trả 2,5000'], tech: ['EP'] }),

  // ── Bộ có sẵn (chuyển vào project test ở Phase 3, không viết lại) ──
  T('UT-MRP-001', 'MRP', 'Critical', 'Bộ unit MrpPolicy có sẵn: MU-01..38 (công thức theo thời gian, phân bổ, gom kỳ, làm tròn mua)', ['UC-100', 'UC-101', 'UC-104', 'BR-MRP-01..09', 'BR-MRP-10..17', 'BR-MRP-18..22', 'BR-MRP-23..29'], {
    steps: ['dotnet run --project specs/mrp/unit-tests -c Release'], exp: ['38/38 đạt'], tech: ['EP', 'BVA', 'DT'],
    note: 'Có sẵn trong specs/mrp/unit-tests; lần chạy gần nhất 18/11/2026: 38/38. Phase 3 chuyển sang xUnit nếu Q1 được duyệt.' }),
  T('UT-PLN-001', 'PLN', 'High', 'Bộ unit kế hoạch sản xuất có sẵn (79 ca)', ['UC-92', 'UC-93', 'UC-94', 'UC-95', 'UC-96', 'BR-PP-01..08', 'BR-PP-09..15', 'BR-PP-16..21', 'BR-PP-22..24'], {
    steps: ['dotnet run --project specs/production-planning-implementation/unit-tests -c Release'], exp: ['79/79 đạt'], tech: ['EP', 'BVA', 'ST'],
    note: 'Có sẵn; theo 04-testing-report.md lần chạy 15/11/2026: 79/79.' }),

  // ── Chuyển trạng thái (State Transition Testing) ──
  T('UT-STS-001', 'TRF', 'Critical', 'Phiếu chuyển kho DRAFT: được sửa, xuất, huỷ; chưa được nhận', ['UC-37', 'BR-40'], {
    pre: 'TrxStockTransfer.Status = DRAFT', steps: ['Kiểm CanEdit, CanIssue, CanReceive, CanCancel', 'Gọi MarkInTransit'],
    exp: ['CanEdit = CanIssue = CanCancel = true; CanReceive = false', 'Status = IN_TRANSIT'], tech: ['ST'] }),
  T('UT-STS-002', 'TRF', 'Critical', 'Phiếu chuyển kho IN_TRANSIT: được nhận, huỷ; không sửa, không xuất lại', ['UC-37', 'BR-40'], {
    pre: 'Status = IN_TRANSIT', steps: ['Kiểm CanEdit, CanIssue, CanReceive, CanCancel', 'Gọi MarkReceived'],
    exp: ['CanReceive = CanCancel = true; CanEdit = CanIssue = false', 'Status = RECEIVED'], tech: ['ST'] }),
  T('UT-STS-003', 'TRF', 'High', 'Phiếu chuyển kho RECEIVED không được huỷ', ['UC-37', 'BR-40'], {
    pre: 'Status = RECEIVED', steps: ['Kiểm CanCancel'], exp: ['CanCancel = false (A37.2: chỉ huỷ phiếu Draft hoặc In Transit)'], tech: ['ST', 'NEG'],
    note: 'Dự đoán Failed: code cho CanCancel = true khi RECEIVED (TrxStockTransfer.Status.cs). Nghi vấn N-08.' }),
  T('UT-STS-004', 'DSP', 'High', 'Phiếu huỷ hàng: DRAFT sửa được; COMPLETED chỉ sửa thông tin, huỷ được; CANCELLED không thao tác', ['UC-43', 'BR-44'], {
    steps: ['Lần lượt đặt Status = DRAFT, COMPLETED, CANCELLED và kiểm CanEdit, CanEditInfo, CanCancel'],
    exp: ['DRAFT: cả ba true', 'COMPLETED: CanEdit false, CanEditInfo true, CanCancel true', 'CANCELLED: cả ba false'], tech: ['ST', 'DT'] }),
  T('UT-STS-005', 'PRD', 'Critical', 'Lệnh sản xuất: bảng trạng thái cho phép thao tác', ['UC-58', 'BR-38'], {
    steps: ['Với NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED kiểm CanCancel, CanClose, CanIssueMaterial, CanReceiveFinishedGoods, CanApproveCompletion, CanAdjustNorm'],
    exp: ['NOT_STARTED: huỷ, xuất NVL, điều chỉnh định mức', 'IN_PROGRESS: đóng, xuất NVL, nhập TP, duyệt hoàn thành, điều chỉnh định mức', 'COMPLETED / CANCELLED: không thao tác nào'],
    tech: ['ST', 'DT'] }),
  T('UT-STS-006', 'PLN', 'Critical', 'Kế hoạch sản xuất: bảng trạng thái cho phép thao tác', ['UC-92', 'BR-PP-09..15', 'BR-PP-22..24'], {
    steps: ['Với DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CLOSED, CANCELLED kiểm CanEditAll, CanSubmit, CanApprove, CanReject, CanClose, CanCancel, CanCreateOrder'],
    exp: ['DRAFT / REJECTED: sửa toàn bộ, gửi duyệt, huỷ', 'PENDING_APPROVAL: duyệt, từ chối, huỷ', 'APPROVED: sửa giới hạn, đóng, huỷ, lập lệnh', 'CLOSED / CANCELLED: không thao tác nào'],
    tech: ['ST', 'DT'] }),
  T('UT-STS-007', 'CRD', 'High', 'Yêu cầu tín dụng chỉ duyệt / từ chối khi PENDING', ['UC-64', 'BR-13', 'BR-50'], {
    steps: ['Với PENDING, APPROVED, REJECTED kiểm CanApprove, CanReject', 'Gọi MarkApproved("ONE_TIME", 0) và MarkApproved("NEW_LIMIT", 50.000.000)'],
    exp: ['Chỉ PENDING trả true', 'Status = APPROVED, lưu loại duyệt và hạn mức được duyệt'], tech: ['ST'] }),

  // ── Validator (FluentValidation, chạy qua ValidationBehavior) ──
  T('UT-VAL-001', 'MRP', 'High', 'RunMrpCommandValidator: biên ngày cuối kỳ', ['UC-101', 'BR-MRP-30..33'], {
    data: 'Hôm nay T: T−1, T, T+366, T+367', steps: ['Validate từng giá trị PeriodEnd với 1 kho'],
    exp: ['T−1 lỗi MSG76', 'T đạt', 'T+366 đạt', 'T+367 lỗi MSG76'], tech: ['BVA'] }),
  T('UT-VAL-002', 'MRP', 'High', 'RunMrpCommandValidator: số kho 0, 1, 20, 21', ['UC-101', 'BR-MRP-30..33'], {
    steps: ['Validate WarehouseIds với 0, 1, 20, 21 phần tử'], exp: ['0 và 21 lỗi MSG77', '1 và 20 đạt'], tech: ['BVA'] }),
  T('UT-VAL-003', 'MST', 'High', 'Thời gian giao hàng của hàng hoá: biên 0 – 365', ['UC-52', 'BR-MRP-30..33'], {
    data: '−1, 0, 365, 366, rỗng', steps: ['Gọi kiểm tra ProductLeadTime với từng giá trị'],
    exp: ['−1 và 366 lỗi MSG80', '0, 365, rỗng đạt'], tech: ['BVA'] }),
  T('UT-VAL-004', 'PO', 'High', 'Ngày giao dự kiến không trước ngày đặt', ['UC-30', 'BR-MRP-30..33'], {
    data: 'Ngày đặt D: D−1, D, D+30, rỗng', steps: ['Gọi PurchaseOrderHelper.ValidateExpectedDate'],
    exp: ['D−1 lỗi MSG81', 'D, D+30, rỗng đạt'], tech: ['BVA'] }),
  T('UT-VAL-005', 'POS', 'High', 'CreatePosOrderCommandValidator: dòng hàng, số lượng, tiền khách trả', ['UC-23', 'BR-14', 'BR-16'], {
    data: 'Không dòng hàng; SL 0; SL −1; tiền trả âm', steps: ['Validate từng request'], exp: ['Mỗi request trả lỗi VALIDATION_FAILED (MSG01)'], tech: ['EP', 'NEG'] }),
  T('UT-VAL-006', 'BKG', 'High', 'SaveSalesBookingCommandValidator: khách hàng, kho, dòng hàng', ['UC-19', 'BR-08'], {
    data: 'Thiếu khách; thiếu kho; SL 0', steps: ['Validate từng request'], exp: ['Lỗi MSG01 cho từng trường hợp (E18.2)'], tech: ['EP', 'NEG'] }),
  T('UT-VAL-007', 'ACC', 'High', 'CreateStaffCommandValidator: chính sách mật khẩu', ['UC-07', 'BR-05'], {
    data: '7 ký tự đủ loại; 8 ký tự thiếu ký tự đặc biệt; 8 ký tự đủ loại (Aa1@aaaa)', steps: ['Validate từng mật khẩu'],
    exp: ['Hai mật khẩu đầu lỗi', 'Mật khẩu thứ ba đạt'], tech: ['BVA', 'EP'],
    note: 'Cần đọc validator để xác nhận chính sách BR-05 đã được kiểm ở backend.' }),
  T('UT-VAL-008', 'AUTH', 'High', 'ChangePasswordCommandValidator: mật khẩu mới trùng mật khẩu cũ, không khớp xác nhận', ['UC-03', 'BR-05'], {
    steps: ['Validate mật khẩu mới = mật khẩu cũ', 'Validate xác nhận khác mật khẩu mới'], exp: ['Lỗi MSG07 cho cả hai'], tech: ['NEG'] }),
  T('UT-VAL-009', 'CRD', 'High', 'RejectCreditRequestCommandValidator: từ chối phải có lý do', ['UC-64', 'BR-50'], {
    data: 'Lý do rỗng, khoảng trắng, có nội dung', steps: ['Validate'], exp: ['Rỗng và khoảng trắng lỗi MSG40', 'Có nội dung đạt'], tech: ['EP', 'NEG'] }),
  T('UT-VAL-010', 'DSP', 'High', 'CreateDisposalCommandValidator: số lượng, lý do khi hoàn thành', ['UC-43', 'BR-44'], {
    data: 'SL 0; hoàn thành không lý do; lưu tạm không lý do', steps: ['Validate từng request'],
    exp: ['SL 0 lỗi', 'Hoàn thành không lý do lỗi MSG40', 'Lưu tạm không lý do đạt'], tech: ['EP', 'DT'] }),
  T('UT-VAL-011', 'PRD', 'High', 'AdjustMaterialNormCommandValidator: lý do bắt buộc, nhu cầu mới không thấp hơn đã xuất', ['UC-59', 'BR-51', 'BR-52'], {
    steps: ['Validate điều chỉnh không lý do', 'Validate nhu cầu mới < đã xuất'], exp: ['Cả hai bị từ chối'], tech: ['NEG', 'BVA'] }),
  T('UT-VAL-012', 'FIN', 'High', 'Validator điều chỉnh công nợ: giá trị mới bằng hiện tại, thời gian tương lai, mô tả > 500 ký tự', ['UC-98'], {
    steps: ['Validate AdjustCustomerDebtCommand và AdjustSupplierDebtCommand với từng trường hợp'], exp: ['Mỗi trường hợp lỗi MSG71 (E98.1)'], tech: ['BVA', 'NEG'] }),
  T('UT-VAL-013', 'PB', 'Medium', 'CreatePriceBookCommandValidator: ngày hiệu lực bắt đầu sau ngày kết thúc', ['UC-91'], {
    steps: ['Validate bảng giá có From > To'], exp: ['Lỗi MSG68 (E91.1)'], tech: ['BVA'] }),

  // ── Sinh mã chứng từ ──
  T('UT-CODE-001', 'SET', 'High', 'Định dạng mã chứng từ theo quy tắc SEQUENTIAL / DATETIME / RANDOM', ['UC-97', 'BR-06'], {
    data: 'Tiền tố HD, số thứ tự 7', steps: ['Định dạng mã với từng quy tắc'],
    exp: ['SEQUENTIAL: HD + số có đệm 0', 'DATETIME: HD + thời điểm', 'RANDOM: HD + chuỗi ngẫu nhiên; độ dài đúng cấu hình'], tech: ['EP'],
    note: 'Phần định dạng thuần nằm trong TransactionCodeGenerator (Infrastructure); sequence kiểm ở IT-SET-001.' }),
];
