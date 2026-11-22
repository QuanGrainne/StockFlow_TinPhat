// System / E2E test: Next.js + API + PostgreSQL thật, thao tác như người dùng (Playwright nếu Q1 được duyệt; chưa duyệt thì chạy tay theo kịch bản).
// Mỗi kịch bản kiểm trạng thái cuối trên giao diện, qua API và trong database.
'use strict';
const T = (id, mod, pri, name, req, o = {}) => ({ id, mod, type: 'System', pri, name, req, status: 'Not Run', ...o });
const UI_API_DB = 'Trạng thái cuối khớp giữa giao diện, API và database';

module.exports = [
  // ── Xác thực, phân quyền ──
  T('ST-AUTH-001', 'AUTH', 'Critical', 'Đăng nhập, sai mật khẩu, tài khoản khoá, đăng xuất, token hết hạn', ['UC-01', 'UC-02', 'BR-01', 'BR-05', 'NFR-SEC-04'], {
    pre: 'Frontend chạy với NEXT_PUBLIC_DEV_AUTO_LOGIN=false', steps: ['Đăng nhập đúng', 'Đăng xuất', 'Đăng nhập sai mật khẩu', 'Đăng nhập tài khoản bị khoá', 'Sửa token trong localStorage thành token hết hạn rồi tải lại trang'],
    exp: ['Vào màn hình đầu tiên của vai trò', 'Về /login', 'MSG02', 'MSG03', 'Về /login, phiên cũ bị xoá'], tech: ['EP', 'NEG'] }),
  T('ST-AUTH-002', 'AUTH', 'High', 'Đổi mật khẩu trên giao diện', ['UC-03', 'BR-05'], {
    steps: ['Mở Đổi mật khẩu', 'Nhập sai mật khẩu hiện tại', 'Nhập đúng, mật khẩu mới hợp lệ', 'Đăng xuất, đăng nhập lại'], exp: ['MSG06', 'Thông báo thành công', 'Đăng nhập bằng mật khẩu mới'], tech: ['EP'] }),
  T('ST-RBAC-001', 'SEC', 'Critical', 'Admin: menu và màn hình theo bảng 3.1.6', ['UC-04', 'UC-05', 'UC-06', 'UC-10', 'UC-11', 'UC-14', 'UC-15', 'UC-16', 'BR-02', 'BR-03', 'FLOW-07'], {
    steps: ['Đăng nhập admin', 'Đối chiếu menu với cột Administrator của bảng 3.1.6', 'Tạo nhân viên, vai trò, gán quyền kho'], exp: ['Menu khớp bảng; mọi thao tác quản trị thành công'], tech: ['SEC'] }),
  T('ST-RBAC-002', 'SEC', 'Critical', 'Manager: menu theo bảng 3.1.6, không có màn quản trị', ['BR-02', 'BR-03', 'FLOW-07'], {
    steps: ['Đăng nhập manager01', 'Đối chiếu menu', 'Gõ thẳng URL /staff, /roles'], exp: ['Menu khớp bảng; URL quản trị bị chặn'], tech: ['SEC'] }),
  T('ST-RBAC-003', 'SEC', 'Critical', 'Sales Accountant: chỉ bán hàng, đặt hàng, khách hàng, trả hàng', ['BR-02', 'FLOW-07'], {
    steps: ['Đăng nhập sales01', 'Đối chiếu menu', 'Gõ thẳng URL /purchases, /production, /stocktakes'], exp: ['Menu khớp cột Sales; URL khác bị chặn'], tech: ['SEC'] }),
  T('ST-RBAC-004', 'SEC', 'Critical', 'Warehouse Accountant: mua hàng, nhập hàng, chuyển kho, kiểm kê, huỷ hàng, phiếu chi NCC', ['BR-02', 'FLOW-07'], {
    steps: ['Đăng nhập whstaff01', 'Đối chiếu menu', 'Thực hiện: sửa đơn đặt, ghi phiếu chi NCC'], exp: ['Menu khớp cột Warehouse Accountant', 'Thao tác thành công (xem API-PO-002, API-SUP-001)'], tech: ['SEC'] }),
  T('ST-RBAC-005', 'SEC', 'Critical', 'Production Accountant: lệnh, xuất NVL, nhập TP, kế hoạch, MRP; không thấy giá', ['BR-02', 'BR-39', 'FLOW-07'], {
    steps: ['Đăng nhập prodstaff01', 'Đối chiếu menu', 'Mở chi tiết lệnh, danh mục hàng'], exp: ['Menu khớp cột Production Accountant', 'Không có cột giá / giá vốn trên mọi màn'], tech: ['SEC'] }),
  T('ST-RBAC-006', 'SEC', 'Critical', 'Cô lập kho trên giao diện: người dùng chỉ có K001', ['BR-04', 'NFR-SEC-01', 'FLOW-07'], {
    pre: 'whstaff01 chỉ có K001; dữ liệu ở cả K001 và K002', steps: ['Mở bộ chọn kho làm việc', 'Mở danh sách phiếu nhập, chuyển kho, kiểm kê, huỷ hàng, tồn kho'],
    exp: ['Bộ chọn chỉ có K001', 'Không thấy chứng từ, tồn của K002 (trừ phiếu chuyển đến K001)'], tech: ['SEC'] }),

  // ── Danh mục ──
  T('ST-MST-001', 'MST', 'High', 'Danh mục: nhóm hàng, hàng hoá (đơn vị quy đổi, thời gian giao, ảnh), khách hàng, NCC, kho, BOM', ['UC-51', 'UC-52', 'UC-53', 'UC-54', 'UC-56', 'UC-57', 'BR-06', 'BR-26', 'BR-30'], {
    steps: ['Tạo nhóm hàng', 'Tạo NVL có đơn vị quy đổi, thời gian giao 7 ngày, ảnh', 'Tạo thành phẩm và BOM, kích hoạt', 'Tạo khách hàng, NCC', 'Admin tạo kho', 'Sửa hàng hoá, ngừng kinh doanh'],
    exp: ['Dữ liệu lưu đúng; mã trùng bị chặn', UI_API_DB], tech: ['EP'] }),
  T('ST-MST-002', 'MST', 'Medium', 'Nhập hàng hoá từ Excel và điều chỉnh tồn một hàng', ['UC-99'], {
    steps: ['Nhập file mẫu 20 dòng', 'Điều chỉnh tồn H1 tại K001'], exp: ['MSG72 với số mới / cập nhật đúng', 'Tồn đổi; có phiếu kiểm kê BALANCED'], tech: ['EP'] }),

  // ── Mua hàng ──
  T('ST-PUR-001', 'PO', 'Critical', 'Mua hàng → nhập kho → tồn → giá vốn → công nợ NCC', ['UC-30', 'UC-31', 'UC-32', 'UC-67', 'UC-68', 'UC-70', 'UC-71', 'BR-22', 'BR-23', 'BR-24', 'BR-25', 'BR-29', 'FLOW-01'], {
    steps: ['Tạo NCC', 'Tạo đơn đặt H1 × 100, ngày giao dự kiến', 'Nhận 60 (2 lỗi), trả NCC một phần tiền', 'Nhận nốt 40', 'Xem tồn, MAC, công nợ NCC, thẻ kho'],
    exp: ['Đơn PARTIAL rồi COMPLETED', 'Tồn tăng 98; hàng lỗi không vào kho', 'MAC đúng BR-29', 'Công nợ NCC = giá trị đạt − đã trả', UI_API_DB], tech: ['ST'] }),
  T('ST-PUR-002', 'PR', 'High', 'Đặt hàng nhập → nhập → trả NCC → tồn → công nợ NCC', ['UC-33', 'UC-69', 'BR-24', 'BR-25', 'FLOW-06'], {
    steps: ['Từ phiếu nhập ở ST-PUR-001 tạo phiếu trả NCC 10', 'Ghi NCC hoàn tiền', 'Thử trả vượt SL đã nhận'], exp: ['Tồn −10; công nợ NCC giảm', 'Hoàn tiền ghi nhận', 'Trả vượt bị chặn', UI_API_DB], tech: ['BVA'] }),

  // ── Bán hàng ──
  T('ST-SAL-001', 'POS', 'Critical', 'Bán hàng hoàn chỉnh tại POS', ['UC-23', 'UC-25', 'UC-35', 'UC-63', 'BR-11', 'BR-12', 'BR-14', 'BR-15', 'BR-16', 'FLOW-02'], {
    steps: ['Đăng nhập sales01', 'Mở POS, tìm hàng (F3), chọn khách (F4)', 'Thêm 2 hàng, đổi số lượng', 'Kiểm giá theo bảng giá, chiết khấu, tổng', 'Thanh toán một phần tiền mặt', 'Hoàn tất', 'Mở hoá đơn, tồn, công nợ, thẻ kho'],
    exp: ['Giá, chiết khấu, tổng đúng', 'Hoá đơn COMPLETED; tồn trừ đúng; công nợ = phần chưa trả', UI_API_DB], tech: ['EP'] }),
  T('ST-SAL-002', 'BKG', 'Critical', 'Đặt hàng → gộp → xử lý hoá đơn giao một phần → giao nốt', ['UC-18', 'UC-19', 'UC-20', 'UC-23', 'UC-24', 'UC-36', 'UC-65', 'BR-08', 'BR-09', 'BR-10', 'BR-17'], {
    steps: ['Tạo 2 đơn đặt cùng khách cùng kho, trả trước một phần', 'Gộp', 'Xử lý thành hoá đơn giao 60%', 'Giao nốt'], exp: ['Đơn gộp; đơn nguồn huỷ', 'DELIVERING giữ phần còn lại; tiền trả trước trừ đúng', 'FINISHED', UI_API_DB], tech: ['ST'] }),
  T('ST-SAL-003', 'CRD', 'Critical', 'Bán chịu vượt hạn mức → yêu cầu tín dụng → Manager duyệt → hoàn tất', ['UC-27', 'UC-62', 'UC-64', 'BR-12', 'BR-13', 'BR-50', 'NFR-SEC-07'], {
    steps: ['sales01 bán chịu vượt hạn mức', 'Gửi yêu cầu tín dụng', 'manager01 duyệt ngoại lệ một lần', 'sales01 hoàn tất', 'Thử bán chịu vượt hạn mức lần nữa'], exp: ['Bị chặn, gợi ý gửi yêu cầu', 'Sau duyệt hoàn tất được', 'Lần sau bị chặn lại'], tech: ['DT'] }),
  T('ST-SAL-004', 'POS', 'Medium', 'Thanh toán chuyển khoản hiển thị mã QR đúng số tiền và mã giao dịch', ['UC-26', 'BR-14'], {
    steps: ['Chọn chuyển khoản tại POS'], exp: ['Hiện QR chứa đúng số tiền và mã giao dịch'], tech: ['EP'], status: 'Blocked', note: 'Chưa có chức năng (POS hiện "Chưa cấu hình tài khoản ngân hàng…").' }),
  T('ST-RET-001', 'RET', 'Critical', 'Hoá đơn → trả hàng một phần, trả lần hai, trả vượt → tồn, công nợ, hoàn tiền', ['UC-28', 'UC-41', 'UC-79', 'UC-80', 'UC-82', 'BR-19', 'BR-21', 'FLOW-05'], {
    steps: ['Trả 2 / 5 từ hoá đơn', 'Trả 3', 'Trả thêm 1', 'Hoàn tiền'], exp: ['Hai lần đầu thành công, tồn và công nợ đổi đúng', 'Lần 3: MSG31', 'Hoàn tiền ghi nhận; Manager xem được trên danh sách trả hàng', UI_API_DB], tech: ['BVA'] }),

  // ── Kho ──
  T('ST-TRF-001', 'TRF', 'Critical', 'Chuyển kho hai tài khoản: xuất ở kho nguồn, nhận thiếu có ghi chú ở kho đích', ['UC-37', 'UC-38', 'UC-74', 'BR-40', 'BR-41', 'BR-04', 'FLOW-04'], {
    pre: 'U1 có K001, U2 có K002', steps: ['U1 tạo, xuất phiếu 10', 'U2 thấy phiếu đến, nhận 9 không ghi chú', 'U2 nhận 9 có ghi chú', 'Manager xem theo dõi chuyển kho'],
    exp: ['K001 −10 khi xuất', 'MSG49', 'K002 +9; chênh lệch 1 hiện trên phiếu', UI_API_DB], tech: ['ST'] }),
  T('ST-INV-001', 'STK', 'High', 'Kiểm kê lưu tạm chặn nghiệp vụ, hoàn thành; huỷ hàng; đối chiếu tồn và thẻ kho', ['UC-39', 'UC-40', 'UC-43', 'UC-72', 'UC-73', 'BR-42', 'BR-43', 'BR-44'], {
    steps: ['Tạo kiểm kê nháp có NVL1', 'Thử xuất NVL1', 'Hoàn thành kiểm kê', 'Tạo phiếu huỷ hàng, hoàn thành', 'Đối chiếu tồn và thẻ kho'], exp: ['Xuất bị chặn MSG50', 'Tồn = SL đếm', 'Tồn trừ SL huỷ', UI_API_DB], tech: ['ST'] }),

  // ── Sản xuất, MRP ──
  T('ST-PRO-001', 'PRD', 'Critical', 'Kế hoạch → duyệt → lệnh → xuất NVL (có cấp bổ sung) → nhập thành phẩm (có lỗi)', ['UC-44', 'UC-45', 'UC-46', 'UC-47', 'UC-49', 'UC-50', 'UC-58', 'UC-60', 'UC-61', 'UC-93', 'UC-94', 'UC-95', 'BR-30', 'BR-31', 'BR-32', 'BR-34', 'BR-35', 'BR-36', 'BR-38', 'FLOW-03'], {
    steps: ['prodstaff01 lập kế hoạch, gửi duyệt', 'manager01 duyệt, lập lệnh', 'prodstaff01 xuất NVL, cấp bổ sung có lý do', 'Nhập thành phẩm: đạt + lỗi', 'Manager duyệt hoàn thành'],
    exp: ['Trạng thái kế hoạch và lệnh đúng BR-38', 'Nhu cầu, đã xuất, thiếu đúng', 'Thành phẩm đạt vào kho có lô; lỗi không vào tồn bán được', UI_API_DB], tech: ['ST'] }),
  T('ST-MRP-001', 'MRP', 'Critical', 'Kế hoạch → MRP → NVL thiếu → lập đơn đặt từ đề xuất → nhập → chạy lại MRP → xuất NVL → nhập TP', ['UC-100', 'UC-101', 'UC-102', 'UC-103', 'UC-104', 'UC-105', 'BR-MRP-01..09', 'BR-MRP-10..17', 'BR-MRP-18..22', 'BR-MRP-23..29', 'BR-MRP-30..33', 'FLOW-03'], {
    pre: 'NVL1 thời gian giao 7 ngày, NVL2 chưa khai báo; kế hoạch duyệt bắt đầu T+10',
    steps: ['Chạy MRP kỳ 30 ngày', 'Xem NVL thiếu, theo ngày / tuần, tồn dự phóng', 'Lập đơn đặt từ đề xuất, chọn NCC, lưu', 'Mở lại lần chạy', 'Nhập hàng, chạy lại MRP', 'Lập lệnh, xuất NVL, nhập TP'],
    exp: ['NVL1 Kịp đặt, NVL2 Chưa có thời gian giao', 'Đơn đặt điền sẵn mỗi NVL một dòng, SL làm tròn lên', 'Lần chạy cũ hiện cảnh báo lỗi thời (MSG78)', 'Lần chạy mới không còn thiếu', UI_API_DB], tech: ['ST'] }),

  // ── Tài chính, cài đặt ──
  T('ST-FIN-001', 'FIN', 'High', 'Phiếu thu, phiếu chi, điều chỉnh nợ, huỷ phiếu; số dư và lịch sử', ['UC-29', 'UC-66', 'UC-83', 'UC-84', 'UC-85', 'UC-98', 'BR-15', 'BR-25', 'BR-46'], {
    steps: ['Thu nợ khách phân bổ hoá đơn', 'Sửa ghi chú, huỷ phiếu thu', 'Chi NCC', 'Điều chỉnh nợ khách, huỷ điều chỉnh'], exp: ['Số dư khách / NCC khớp tổng chứng từ', 'Lịch sử công nợ đủ dòng', UI_API_DB], tech: ['ST'] }),
  T('ST-SET-001', 'SET', 'High', 'Cài đặt đơn hàng và cảnh báo công nợ có hiệu lực ngay', ['UC-97', 'BR-12', 'BR-16'], {
    steps: ['Tắt bán âm, bán vượt tồn ở POS', 'Bật bán âm, bán lại', 'Đổi tiền tố mã hoá đơn, tạo hoá đơn', 'Bật cho nợ vượt hạn mức'], exp: ['MSG28', 'Hoàn tất', 'Mã mới đúng tiền tố', 'Bán chịu vượt hạn mức hoàn tất'], tech: ['DT'] }),

  // ── Phi chức năng ──
  T('ST-NFR-001', 'PERF', 'Medium', 'Yêu cầu thường: 95% ≤ 2 giây', ['NFR-PERF-01'], {
    data: 'Bộ dữ liệu chuẩn (chốt ở Phase 8)', steps: ['Đo 200 lần các GET danh sách chính'], exp: ['p95 ≤ 2 giây (không tính độ trễ mạng của máy khách)'], tech: ['PERF'] }),
  T('ST-NFR-002', 'PERF', 'Medium', 'Giao dịch thường ≤ 3 giây', ['NFR-PERF-02'], {
    steps: ['Đo lưu đơn đặt, hoàn tất POS, hoàn thành phiếu nhập, xuất NVL, nhập TP, hoàn thành kiểm kê'], exp: ['Mỗi giao dịch ≤ 3 giây'], tech: ['PERF'] }),
  T('ST-NFR-003', 'PERF', 'Medium', 'Tìm kiếm ≤ 2 giây', ['NFR-PERF-03'], {
    steps: ['Tìm hàng hoá, đơn, khách hàng, tồn kho trên bộ dữ liệu chuẩn'], exp: ['≤ 2 giây'], tech: ['PERF'] }),
  T('ST-NFR-004', 'PERF', 'Low', 'Báo cáo ≤ 5 giây', ['NFR-PERF-04'], { steps: ['Mở báo cáo chuẩn'], exp: ['≤ 5 giây'], tech: ['PERF'], status: 'Blocked', note: 'Chưa có báo cáo (UC-86 – UC-90).' }),
  T('ST-NFR-005', 'PERF', 'Medium', '100 người dùng đăng nhập đồng thời', ['NFR-PERF-05'], {
    steps: ['Mô phỏng 100 phiên làm các thao tác đọc và giao dịch'], exp: ['Không lỗi chức năng; đạt NFR-PERF-01, 02'], tech: ['PERF', 'CONC'], status: 'Blocked', note: 'Cần công cụ tải (chờ duyệt cùng Q1).' }),
  T('ST-NFR-006', 'SEC', 'Medium', 'Chạy trên Chrome, Edge, Firefox bản ổn định', ['NFR-COMP-01'], {
    steps: ['Chạy lại ST-SAL-001 và ST-PUR-001 trên từng trình duyệt'], exp: ['Không lỗi hiển thị / chức năng'], tech: ['EP'] }),
  T('ST-NFR-007', 'SEC', 'Medium', 'Sao lưu và khôi phục database', ['NFR-REL-04'], {
    steps: ['Sao lưu database thử', 'Khôi phục vào database mới', 'Đối chiếu số dòng các bảng chính'], exp: ['Khôi phục đầy đủ'], tech: ['EP'], note: 'Cần quy trình sao lưu của bản triển khai (deploy/compose.yml chưa có).' }),
  T('ST-NFR-008', 'SEC', 'Medium', 'Nhật ký kiểm toán cho thao tác nhạy cảm', ['BR-49', 'NFR-SEC-06'], {
    steps: ['Đổi quyền, quyền kho, hạn mức, điều chỉnh tồn; xem nhật ký'], exp: ['Có người, thời gian, thao tác, giá trị trước / sau'], tech: ['EP'], status: 'Blocked', note: 'Chưa có bảng / chức năng audit (nghi vấn N-11).' }),
];
