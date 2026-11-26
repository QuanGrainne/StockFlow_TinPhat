# E2E Coverage Matrix – Report 5.3 System Test

- Nguồn: `docs/Report5.3_System_Test.xlsx` (29 sheet UC, 210 TC SYS-*) và 36 NEW TEST CASE trong `docs/Report5.3_System_Test_NEW_draft.xlsx` (5 sheet NEW, được duyệt 23/11/2026, chưa gộp vào file gốc).
- Nhánh `feature/e2e-test`, tạo ngày 23/11/2026 từ `feature/integration-test` (commit fad89d9). Pilot 23/11/2026 (7 TC), đợt 1 = sheet No 1–10 (64 TC, chạy 23/11/2026), đợt 2 = sheet No 11–20 (59 TC) và đợt 3 = sheet No 21–29 (87 TC) (chạy 25/11/2026), đợt 4 = 5 sheet NEW No 30–34 (37 TC, chạy 26/11/2026) đã triển khai và chạy – đủ 210 TC gốc và 37 TC NEW (xem E2E_PILOT_REPORT.md, E2E_EXECUTION_REPORT.md).
- Không đổi Description / Expected Result gốc. Cột "Đánh giá" là kết quả review, không phải kết quả chạy.

## Chú giải

| Mã | Ý nghĩa |
|---|---|
| A | Phù hợp E2E (UI → API → DB) |
| B | Thiên về hành vi giao diện; vẫn viết trong bộ E2E nhưng nhẹ (không kiểm DB sâu) |
| C | Phù hợp Integration hơn; E2E chỉ kiểm phần giao diện, phần còn lại tham chiếu Report 5.2 |
| D | Kiểm ở nhiều cấp: đã có ca tương ứng trong Report 5.2, E2E kiểm lại qua giao diện |
| E | Chưa đủ thông tin để viết điều kiện kiểm |
| NA | Chức năng chưa có trong code → `test.skip` kèm lý do, tính N/A |
| OK | Expected rõ, khớp code |
| SPEC_CODE_MISMATCH | Description (SRS) khác Expected (code / quyết định nhóm). Kiểm theo Expected, ghi khác biệt |
| ORACLE_PROPOSED | Expected mơ hồ; đã đề xuất điều kiện kiểm cụ thể từ SPEC + code, chờ duyệt |
| NEEDS_CLARIFICATION | Chưa đủ căn cứ (thiếu nội dung thông báo, tiền đề không dựng được...) |
| KNOWN_DEFECT:DEF-IT-xx | Dự kiến Fail vì lỗi đã biết từ Report 5.2; để Fail thật, không dùng `test.fail()` |
| P1 / P2 / P3 | P1: pilot và luồng tiền / tồn / quyền; P2: kiểm tra nghiệp vụ và validation; P3: xem, lọc, huỷ form |

## Tổng hợp

- 210 TC gốc. Loại: A 125 · NA 52 · D 27 · B 4 · C 1 · E 1.
- Ưu tiên: P2 117 · — 52 · P1 24 · P3 17.
- Đánh giá (một TC có thể nhiều nhãn): OK 115 · NOT_IMPLEMENTED 52 · SPEC_CODE_MISMATCH 30 · ORACLE_PROPOSED 13 · NEEDS_CLARIFICATION 9 · KNOWN_DEFECT 4.
- NEW TEST CASE: 37 ca ở 5 sheet NEW (36 ca duyệt 23/11/2026 + SYS-TRF-N05 thêm 25/11/2026 từ DEF-E2E-01).
- Đợt 4 (26/11/2026): đã triển khai và chạy đủ 37 ca NEW – lượt chính thức 24 Passed, 13 Failed (SYS-TRF-N04 không ổn định, Round 1 ghi Failed → 23 / 14).

## 210 TC gốc

### UC-01 Login

- Trang: /login · API: POST /api/auth/login
- Bảng: sec_users, jnc_user_roles, jnc_user_warehouse_access · Tài khoản: sales01 / tài khoản bị khóa
- File dự kiến: `tests/authentication/uc-01-login.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-LOG-01 | Main | a user with a valid username and password is logged in and lands on the dashboard of the rol… | A | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-LOG-02 | A1.1 | an account holding several roles receives the combined permissions and a menu with the funct… | A | P3 | SPEC_CODE_MISMATCH | Mô tả: nhiều vai trò; Expected: đúng 1 vai trò (code 1 vai trò/tài khoản). | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-LOG-03 | E1.1 | a wrong username or password shows an error that does not reveal which field is wrong and th… | A | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-LOG-04 | E1.2 | a deactivated account cannot log in and an inactive account message is shown. | D | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |

### UC-02 Logout

- Trang: Header → /login · API: (client) + GET bất kỳ → 401
- Bảng: — · Tài khoản: sales01
- File dự kiến: `tests/authentication/uc-02-logout.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-OUT-01 | Main | clicking Logout ends the session and returns to the login screen, and protected pages can no… | A | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-OUT-02 | A2.1 | the login screen is shown at the next action after the session has expired. | A | P2 | OK | Giả lập hết hạn: xoá stockflow_token ở cả sessionStorage và localStorage rồi bấm menu; không chờ hết hạn thật. | Đã triển khai (đợt 1) | Passed (23/11) |

### UC-03 Change Password

- Trang: Header → Đổi mật khẩu · API: POST /api/auth/change-password, POST /api/auth/login
- Bảng: sec_users · Tài khoản: e2e.pwd (tạo qua API)
- File dự kiến: `tests/authentication/uc-03-change-password.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-PWD-01 | Main | a valid current and new password updates the password and invalidates the other sessions of … | A | P2 | SPEC_CODE_MISMATCH | Mô tả có "huỷ phiên khác" nhưng code không làm; Expected chỉ kiểm đổi được mật khẩu. Dùng tài khoản riêng e2e.pwd. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-PWD-02 | A3.1 | clicking Cancel closes the form without changing the password. | B | P3 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-PWD-03 | E3.1 | a wrong current password shows an error and the password is not changed. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-PWD-04 | E3.2 | a new password that breaks the policy or does not match the confirmation is rejected. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH + UI_BUG DEF-E2E-07 |

### UC-04 Manage Accounts

- Trang: /staff · API: GET/POST/PUT /api/staff, PATCH /api/staff/{id}/toggle-status, POST /api/staff/{id}/reset-password
- Bảng: sec_users, jnc_user_roles, jnc_user_warehouse_access · Tài khoản: admin
- File dự kiến: `tests/admin/uc-04-manage-accounts.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-ACC-01 | Main | Employee Accounts opens the account list and every account operation is reachable and shows … | A | P2 | ORACLE_PROPOSED, NEEDS_CLARIFICATION | Đề xuất: danh sách tải (GET /api/staff 200); Thêm → "Đã thêm nhân viên mới <tên>"; Sửa → "Đã cập nhật thông tin nhân viên <tên>"; Khóa → "Đã khóa tài khoản <tên>". Đặt lại mật khẩu dùng confirm() gốc; thông báo thành công chưa xác định. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-02 | A4.1 | the list shows code, full name, email, roles, assigned warehouses and status of each account… | A | P3 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – UI_BUG DEF-E2E-02 |
| SYS-ACC-03 | A4.2 | keyword, role and status filters return only the matching accounts. | A | P3 | OK | SPEC FR-ACC-02: chưa lọc theo vai trò ở server (lọc "phòng ban" phía client) — ghi hành vi thực tế. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-04 | E4.3 | a search without matches shows 'No matching records were found' and an empty list. | A | P3 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-05 | A4.3 | an account created with valid data, a role and at least one warehouse is Active and can log in. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-06 | E4.1 | a missing required field or an invalid email is highlighted and the account is not saved. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |
| SYS-ACC-07 | E4.1 | an account without a role or without a warehouse cannot be saved. | A | P2 | SPEC_CODE_MISMATCH | Mô tả: không lưu khi thiếu kho; Expected: lưu được (quyết định nhóm 10/11). | Đã triển khai (đợt 1) | Failed (23/11) – UI_BUG DEF-E2E-03 + SPEC_CODE_MISMATCH |
| SYS-ACC-08 | E4.2 | a duplicate username, employee code or email shows a duplicate error and the account is not … | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-09 | A4.4 | edited information, role and warehouse are saved and applied to the account. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-10 | E4.1, E4.2 | invalid or duplicate data on edit is rejected and the original account stays unchanged. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-11 | A4.5 | deactivating after confirmation blocks login and ends the access of the existing session at … | D | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ACC-12 | A4.5 | activating a deactivated account restores login. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |

### UC-10 Roles and Permissions

- Trang: /roles, /roles/permissions · API: /api/roles, /api/roles/feature-matrix, /api/roles/{code}/permissions
- Bảng: sec_roles, jnc_role_permissions, jnc_user_roles · Tài khoản: admin + người dùng thử
- File dự kiến: `tests/admin/uc-10-roles-and-permissions.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-ROL-01 | Main | Roles & Permissions lists roles with the number of users and every operation is reachable. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ROL-02 | A10.1 | selecting a role shows its functions grouped by module. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ROL-03 | A10.2 | a new role can be created and an existing role can be renamed. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ROL-04 | E10.1 | a duplicate role code or name shows a duplicate error and the role is not saved. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – BUSINESS_LOGIC_BUG DEF-E2E-04 |
| SYS-ROL-05 | A10.3 | ticking and unticking functions in the matrix takes effect on the user's next request. | D | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ROL-06 | E10.2 | removing all permissions of the built-in Admin role is rejected and the configuration is unc… | D | P2 | SPEC_CODE_MISMATCH, ORACLE_PROPOSED | Mô tả: từ chối, giữ nguyên cấu hình; Expected: Admin vẫn toàn quyền (FR-ROLE-04). Đề xuất: sau khi lưu ma trận rỗng, Admin vẫn mở /staff và lưu được; ghi lại màn hình có chặn lưu hay không. | Đã triển khai (đợt 1) | Failed (23/11) – AUTHORIZATION_BUG DEF-E2E-05 |
| SYS-ROL-07 | A10.4 | roles can be added to and removed from an account. | A | P2 | SPEC_CODE_MISMATCH | Code 1 vai trò/tài khoản. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-ROL-08 | E10.2 | an account cannot be left without any role. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |

### UC-15 Warehouse Access

- Trang: /roles/warehouses · API: GET/PUT /api/warehouse-permissions
- Bảng: jnc_user_warehouse_access · Tài khoản: admin + e2e.wh.k001
- File dự kiến: `tests/admin/uc-15-warehouse-access.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-WHA-01 | Main | Warehouse Access shows the account-warehouse matrix and saving shows a success message. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-WHA-02 | BR-04 | a non-admin user sees and processes only documents of assigned warehouses on every business … | D | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-WHA-03 | A15.1 | filtering by warehouse or searching an account shows the assigned warehouses. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-WHA-04 | A15.2 | selecting, deselecting and Select All are saved and take effect on the user's next request. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |
| SYS-WHA-05 | E15.1 | saving with no warehouse selected shows that at least one warehouse is required. | A | P2 | SPEC_CODE_MISMATCH | Mô tả (SRS E15.1): báo lỗi; Expected: lưu được (quyết định nhóm). Liên quan DEF-IT-04 (tài khoản không kho thấy mọi phiếu nhập) → NEW-XCT-02. | Đã triển khai (đợt 1) | Passed (23/11) |

### UC-18 Pending Orders

- Trang: /sales-booking, /pos (tab Đặt hàng) · API: /api/sales-bookings
- Bảng: trx_orders (BOOKING), dtl_order_items, trx_inventory_balances · Tài khoản: sales01
- File dự kiến: `tests/sales/uc-18-pending-orders.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-BKG-01 | Main | Pending Orders opens the list and create, update and cancel are reachable. | A | P2 | OK | Code: Pending Order = Sales Booking (DRAFT); Expected đã viết theo code. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-BKG-02 | A18.1 | an order saved with customer, channel and products has status Pending, shows the credit info… | A | P1 | OK | Thông tin tín dụng hiển thị ở POS, không ở form đặt hàng. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-BKG-03 | A18.1 | unit price and unit are filled from master data and the unit price can be adjusted. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-BKG-04 | E18.1 | a missing customer, no product line, quantity of 0 or less, or a negative unit price is reje… | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |
| SYS-BKG-05 | A18.2 | searching by order code, customer or phone and filtering by status show the matching orders … | A | P3 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-BKG-06 | A18.3 | products, quantities and prices of a Pending order can be changed and saved. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-BKG-07 | E18.2 | a Consolidated or Canceled order cannot be edited. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |
| SYS-BKG-08 | A18.4 | cancelling after confirmation with a reason changes the order to Canceled. | A | P2 | ORACLE_PROPOSED, NEEDS_CLARIFICATION | Đề xuất: đơn DRAFT có cọc → CANCELLED; chọn "giữ tiền" thì thành tiền khách trả trước, chọn "hoàn tiền" thì có phiếu chi hoàn; tồn không đổi. Trường lý do hủy: chưa thấy trong code — cần xác nhận. | Đã triển khai (đợt 1) | Failed (23/11) – AUTHORIZATION_BUG DEF-E2E-06 |
| SYS-BKG-09 | E18.2 | a Consolidated or Canceled order cannot be cancelled. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |

### UC-23 Consolidate Orders

- Trang: /sales-booking, /pos · API: /api/sales-bookings/merge, POST /api/orders/pos, /api/credit-requests, /api/payments/payos (giả lập)
- Bảng: trx_orders, trx_financial_transactions, trx_credit_limit_requests, trx_payos_payments · Tài khoản: sales01 + manager01
- File dự kiến: `tests/sales/uc-23-consolidate-orders.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-CON-01 | Main | confirming records the payment, changes the orders to Consolidated and creates a stock issue… | NA | — | NOT_IMPLEMENTED | Not implemented in c60ea62 (no consolidation / stock issue request). | test.skip (lý do) | N/A – test.skip |
| SYS-CON-02 | Main | only warehouses assigned to the user can be selected as the issuing warehouse. | NA | — | NOT_IMPLEMENTED | Not implemented in c60ea62. | test.skip (lý do) | N/A – test.skip |
| SYS-CON-03 | A23.1 | only Pending orders of the selected customer are listed and quantities are aggregated with t… | A | P2 | SPEC_CODE_MISMATCH | Mô tả: gộp số lượng theo đơn nguồn; Expected: tạo đơn mới, đơn nguồn bị huỷ (Merge Bookings). | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-CON-04 | E23.1 | orders of different customers cannot be consolidated. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |
| SYS-CON-05 | A23.2 | a cash or bank transfer payment from 0 to the total value is recorded with its bank reference. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-CON-06 | E23.2 | a negative amount, an amount above the total or a bank transfer without reference is rejected. | NA | — | NOT_IMPLEMENTED | Not implemented in c60ea62. | test.skip (lý do) | N/A – test.skip |
| SYS-CON-07 | A23.2 | Generate QR shows a code with the amount and transaction code. | A | P2 | OK | payOS giả lập bằng page.route; không dùng khoá thật. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-CON-08 | A23.3 | exceeding the limit lets the user request approval with a reason and the transaction waits f… | D | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-CON-09 | A23.3 | after approval the Sales Accountant can reopen the transaction and create the stock issue re… | D | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-CON-10 | A23.3 | after rejection the reason is shown and the orders return to Pending. | D | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-CON-11 | E23.3 | no stock issue request is created while the limit is exceeded without an approved exception. | D | P1 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |

### UC-28 Return Request

- Trang: /sales-returns, /pos (tab Trả hàng) · API: /api/sales-returns
- Bảng: trx_return_requests, dtl_return_request_items, trx_inventory_* · Tài khoản: sales01
- File dự kiến: `tests/sales/uc-28-return-request.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-RRQ-01 | Main | a submitted request with items, quantities and reason is Waiting for Receipt and visible to … | A | P1 | SPEC_CODE_MISMATCH | Mô tả: Waiting for Receipt; Expected: COMPLETED, cộng tồn ngay. | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-RRQ-02 | A28.1 | a request Waiting for Receipt can be edited. | NA | — | NOT_IMPLEMENTED | Not implemented (no request status). | test.skip (lý do) | N/A – test.skip |
| SYS-RRQ-03 | A28.2 | a request Waiting for Receipt can be cancelled. | A | P2 | SPEC_CODE_MISMATCH | Mô tả: huỷ yêu cầu đang chờ; Expected: huỷ phiếu đã hoàn thành, đảo tồn và nợ. | Đã triển khai (đợt 1) | Failed (23/11) – AUTHORIZATION_BUG DEF-E2E-06 |
| SYS-RRQ-04 | E28.1 | a stock issue that does not exist or belongs to another customer is rejected. | A | P2 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |
| SYS-RRQ-05 | E28.2 | a return quantity of 0 or less, or above the eligible quantity, is rejected. | A | P2 | OK |  | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |
| SYS-RRQ-06 | E28.3 | a request without a reason or item is highlighted and not created. | A | P2 | ORACLE_PROPOSED | Đề xuất: lưu không có hàng → "Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0." và không có dòng mới trong trx_return_requests. Lý do không bắt buộc (SPEC FR-RET-02 Một phần) → ghi SPEC_CODE_MISMATCH phần lý do. | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |

### UC-29 Customer Debt

- Trang: /customers · API: GET /api/customers/{id}, GET /api/settings/debt-warning
- Bảng: mst_business_partners, trx_financial_transactions · Tài khoản: sales01
- File dự kiến: `tests/sales/uc-29-customer-debt.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-DEB-01 | Main | the screen shows outstanding debt, credit limit, available credit and overdue amount, and a … | A | P2 | ORACLE_PROPOSED, SPEC_CODE_MISMATCH | Đề xuất: dư nợ, hạn mức, tín dụng còn lại trên màn khớp DB; nợ quá hạn chưa có (SPEC FR-CRD-01 Một phần) → ghi phần thiếu. | Đã triển khai (đợt 1) | Failed (23/11) – SPEC_CODE_MISMATCH |
| SYS-DEB-02 | A29.1 | a collection note with contact date, result and promised date is saved. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-DEB-03 | E29.1 | a filter without matches shows 'No matching records were found'. | B | P3 | OK |  | Đã triển khai (đợt 1) | Passed (23/11) |

### UC-30 Purchase Orders

- Trang: /purchase-orders, /purchase-orders/create · API: /api/purchase-orders
- Bảng: trx_purchase_orders, dtl_purchase_order_items · Tài khoản: whstaff01
- File dự kiến: `tests/purchasing/uc-30-purchase-orders.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-POR-01 | A30.1 | filtering by status, supplier and date works and a purchase order shows its items and receiv… | A | P3 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-POR-02 | A30.2 | a purchase order saved as Draft calculates line amounts and the total net value. | A | P1 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-POR-03 | A30.2 | Send to Supplier saves the purchase order for receiving. | A | P1 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-POR-04 | A30.3 | a Draft purchase order can be changed and saved. | A | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – AUTHORIZATION_BUG DEF-E2E-08 |
| SYS-POR-05 | A30.4 | a purchase order without a receipt can be cancelled after confirmation with a reason. | A | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – AUTHORIZATION_BUG DEF-E2E-08 + SPEC_CODE_MISMATCH |
| SYS-POR-06 | E30.1 | a missing supplier, no item, quantity of 0 or less, or a negative unit price is rejected. | A | P2 | ORACLE_PROPOSED, NEEDS_CLARIFICATION | Đề xuất theo code: "Phiếu đặt hàng nhập phải có ít nhất 1 mặt hàng.", "Số lượng đặt phải lớn hơn 0.", "Đơn giá không được âm." Thông báo thiếu nhà cung cấp chưa thấy ở backend (có thể chặn ở form) — cần xác nhận. | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-POR-07 | E30.2 | a purchase order that is not Draft cannot be updated. | A | P2 | OK | Code cho sửa phiếu ORDERED chưa nhập; Expected kiểm phiếu đã có phiếu nhập → khớp code. | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-POR-08 | E30.2 | a purchase order that already has a receipt cannot be cancelled. | A | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |

### UC-31 Goods Receipt

- Trang: /purchase-orders (Nhập hàng), /purchases, /purchase-returns · API: POST /api/purchase-orders/{id}/receive, /api/purchases, /api/purchase-returns
- Bảng: trx_goods_receipts, dtl_goods_receipt_items, trx_inventory_balances, trx_inventory_transactions, mst_inventory_lots · Tài khoản: whstaff01 / e2e.wh.k002
- File dự kiến: `tests/purchasing/uc-31-goods-receipt.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-GRN-01 | Main | confirming a full receipt adds stock, recalculates MAC, increases supplier payable and compl… | A | P1 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-GRN-02 | Main | a partial receipt sets the purchase order to Partially Received and the next receipt loads t… | A | P1 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-GRN-03 | Main | a lot-tracked product is received with its lot number, expiry date and storage location. | A | P2 | NEEDS_CLARIFICATION | Form nhập (/purchases) có số lô; chưa thấy trường hạn dùng/vị trí và cờ "theo dõi lô" trên hàng hóa (SPEC FR-GR-02 Một phần, BR-27). Đề xuất: kiểm mst_inventory_lots + lot_id ở trx_inventory_balances; phần hạn dùng chờ xác nhận. | Đã triển khai (đợt 2) | Failed (25/11/2026) – NOT_IMPLEMENTED |
| SYS-GRN-04 | A31.3 | Cancel before confirming discards the entry and inventory is unchanged. | B | P3 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-GRN-05 | E31.1 | a purchase order that does not exist or is Draft, Completed or Canceled cannot be received. | A | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-GRN-06 | E31.2 | a cumulative accepted quantity above the ordered quantity is rejected. | A | P2 | ORACLE_PROPOSED, NEEDS_CLARIFICATION | SPEC FR-GR-03 "Chặn lũy kế vượt số đặt" = Chưa có; code không kiểm. Đề xuất: phiếu nhập không được tạo, lũy kế ≤ số đặt (dự kiến Fail – NOT_IMPLEMENTED). Nội dung MSG33 không có trong SPEC — cần xác nhận. | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-GRN-07 | E31.3 | a negative quantity or a missing lot or expiry for a lot-tracked product is highlighted and … | A | P2 | OK | Mô tả có thiếu lô/hạn dùng; Expected chỉ kiểm số âm → kiểm theo Expected. | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-GRN-08 | E31.3 | a user without access to the warehouse cannot confirm the receipt. | D | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-GRN-09 | E31.4 | a receipt covering an item in an active stocktake cannot be confirmed. | NA | — | NOT_IMPLEMENTED | Stocktake lock not applied to goods receipts in c60ea62. | test.skip (lý do) | N/A – test.skip |
| SYS-GRN-10 | A31.1 | defective and missing quantities with a reason are recorded separately and excluded from acc… | A | P2 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-GRN-11 | A31.2 | quantities marked Returned to Supplier are added to neither inventory nor payable. | A | P2 | SPEC_CODE_MISMATCH | Mô tả: không cộng tồn/không cộng nợ; Expected: tồn và công nợ giảm (phiếu Trả hàng nhập riêng). | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-GRN-12 | A31.2 | Reject Delivery with a reason saves the receipt as Rejected and inventory is unchanged. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |

### UC-34 Inbound Costs

- Trang: — · API: —
- Bảng: — · Tài khoản: —
- File dự kiến: `tests/purchasing/uc-34-inbound-costs.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-LCS-01 | Main | costs allocated By Value are saved and the MAC of the affected products is recalculated. | NA | — | NOT_IMPLEMENTED | Not implemented (landed cost). | test.skip (lý do) | N/A – test.skip |
| SYS-LCS-02 | Main | costs allocated By Quantity are distributed by received quantity. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-LCS-03 | A34.1 | changing an amount or the method before confirming recalculates the allocation. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-LCS-04 | E34.1 | an amount of 0 or less, a missing cost type or a receipt without accepted quantity is rejected. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |

### UC-35 Sales Stock Issue

- Trang: — · API: —
- Bảng: — · Tài khoản: —
- File dự kiến: `tests/sales/uc-35-sales-stock-issue.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-SIS-01 | Main | confirming deducts stock by actual quantities, increases customer receivable and completes t… | NA | — | NOT_IMPLEMENTED | Not implemented (POS deducts stock directly). | test.skip (lý do) | N/A – test.skip |
| SYS-SIS-02 | E35.1 | an actual quantity that is negative, above the request or above available stock is rejected. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-SIS-03 | E35.2 | an issue covering an item in an active stocktake cannot be confirmed. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-SIS-04 | A35.1 | a lower quantity sets Partially Fulfilled and creates a Pending order for the remainder. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |

### UC-37 Stock Transfer

- Trang: /transfers, /transfers/create · API: /api/transfers, /complete, /receive, /cancel
- Bảng: trx_stock_transfers, dtl_stock_transfer_items, trx_inventory_balances, trx_inventory_transactions · Tài khoản: e2e.wh.k001 + e2e.wh.k002
- File dự kiến: `tests/inventory/uc-37-stock-transfer.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-TRF-01 | Main | dispatch deducts source stock and sets In Transit, and receipt by the destination user adds … | D | P1 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-TRF-02 | A37.2 | a transfer can be cancelled before dispatch and stock is unchanged. | A | P2 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-TRF-03 | E37.1 | the same source and destination warehouse is rejected. | A | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-TRF-04 | E37.1 | a user without access to the source warehouse cannot save or dispatch, and one without desti… | D | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-TRF-05 | E37.2 | a dispatched quantity above available stock is rejected. | D | P2 | SPEC_CODE_MISMATCH | Mô tả (SRS E37.2): từ chối; Expected: cảnh báo, xác nhận thì xuất được, tồn nguồn có thể âm (quyết định nhóm 10/11). | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-TRF-06 | E37.2 | a received quantity above the dispatched quantity is rejected. | D | P2 | KNOWN_DEFECT:DEF-IT-02, ORACLE_PROPOSED | Đề xuất: phiếu không chuyển RECEIVED, tồn kho nhận không đổi. Nội dung MSG46 không có trong SPEC. | Đã triển khai (đợt 2) | Failed (25/11/2026) – BUSINESS_LOGIC_BUG KNOWN_DEFECT DEF-IT-02 |
| SYS-TRF-07 | E37.3 | a transfer covering an item in an active stocktake cannot be confirmed. | NA | — | NOT_IMPLEMENTED | Stocktake lock not applied to transfers in c60ea62. | test.skip (lý do) | N/A – test.skip |
| SYS-TRF-08 | A37.1 | a received quantity below dispatched requires an explanation, records the discrepancy and co… | D | P1 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |

### UC-39 Stocktake

- Trang: /stocktakes, /stocktakes/create · API: /api/stocktakes, PATCH /complete, PATCH /cancel
- Bảng: trx_stocktakes, dtl_stocktake_items, trx_inventory_balances, trx_inventory_transactions · Tài khoản: whstaff01
- File dự kiến: `tests/inventory/uc-39-stocktake.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-STK-01 | Main | counted quantities calculate the variance per line and submitting sends the stocktake for ap… | D | P1 | SPEC_CODE_MISMATCH | Mô tả: gửi duyệt; Expected: BALANCED ngay, không qua Manager. | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-STK-02 | Main | items in scope are suspended from inbound and outbound transactions until the Manager decides. | D | P1 | SPEC_CODE_MISMATCH, KNOWN_DEFECT:DEF-IT-08 | Expected ý 2 (chặn nhập/chuyển/POS) dự kiến Fail: StocktakeGuard chỉ ở xuất hủy và sản xuất. | Đã triển khai (đợt 2) | Failed (25/11/2026) – BUSINESS_LOGIC_BUG KNOWN_DEFECT DEF-IT-08 |
| SYS-STK-03 | A39.2 | a recount returns the stocktake to Counting and it can be submitted again. | NA | — | NOT_IMPLEMENTED | Not implemented (no approval step). | test.skip (lý do) | N/A – test.skip |
| SYS-STK-04 | A39.3 | a stocktake cancelled before submission is Canceled and its items are released. | A | P2 | OK | Quyết định nhóm: huỷ được cả phiếu BALANCED → NEW-STK-01. | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-STK-05 | E39.1 | a missing or negative count, or a variance line without a reason, is highlighted and cannot … | A | P2 | SPEC_CODE_MISMATCH | Mô tả có "dòng chênh lệch thiếu lý do"; code không bắt buộc (DEF-IT-07). Expected chỉ kiểm số âm. | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-STK-06 | A39.1 | the selected reason and note are saved with the variance line for approval. | A | P2 | SPEC_CODE_MISMATCH | Không có bước duyệt. | Đã triển khai (đợt 2) | Passed (25/11/2026) |

### UC-41 Customer Returns

- Trang: /sales-returns · API: /api/sales-returns, /refunds
- Bảng: trx_return_requests, trx_financial_transactions, trx_inventory_* · Tài khoản: sales01
- File dự kiến: `tests/sales/uc-41-customer-returns.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-CRT-01 | Main | confirming updates inventory, reduces customer debt at the original price and completes the … | A | P2 | SPEC_CODE_MISMATCH | Mô tả: chờ nhận hàng; Expected: cộng tồn ngay, không kiểm định. | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-CRT-02 | A41.2 | completing a repair moves the item to available inventory or Waiting for Disposal. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-CRT-03 | A41.3 | a return from a customer without debt is marked Refund Due. | A | P2 | ORACLE_PROPOSED, NEEDS_CLARIFICATION | Code: tiền trả khách nhập trên phiếu trả (≤ tổng; khách lẻ phải trả đủ). Đề xuất: khách không nợ trả hàng với tiền trả = giá trị → có phiếu chi, dư nợ không âm. Trường hợp tiền trả = 0 (dư nợ âm hay không) cần xác nhận. | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-CRT-04 | E41.1 | a received quantity that is negative or above the request, or an uncategorized item, is reje… | A | P2 | OK | Code khác SRS (không có số nhận/phân loại); Expected theo BR-19. | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-CRT-05 | A41.1 | Restock adds the item to available inventory. | NA | — | NOT_IMPLEMENTED | Not implemented (no categorisation). | test.skip (lý do) | N/A – test.skip |
| SYS-CRT-06 | A41.1 | Repair records the item Under Repair and not available for sale. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-CRT-07 | A41.1 | Scrap records the item Waiting for Disposal and includes it in a disposal note. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |

### UC-43 Inventory Disposal

- Trang: /disposals, /disposals/create · API: /api/disposals
- Bảng: trx_inventory_disposals, dtl_inventory_disposal_items, trx_inventory_* · Tài khoản: whstaff01
- File dự kiến: `tests/inventory/uc-43-inventory-disposal.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-DSP-01 | Main | a submitted note is Waiting for Approval and inventory is unchanged until the Manager decides. | A | P1 | SPEC_CODE_MISMATCH | Mô tả: chờ duyệt; Expected: COMPLETED, trừ tồn ngay. | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-DSP-02 | A43.1 | a note can be edited or cancelled before approval. | A | P2 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-DSP-03 | E43.1 | a quantity of 0 or less, or above available quantity, is rejected. | A | P2 | OK |  | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-DSP-04 | E43.2 | an empty disposal reason prompts for the reason and the note is not submitted. | A | P2 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |

### UC-44 Production Orders

- Trang: /production · API: GET /api/production/orders, /{id}
- Bảng: trx_production_orders, dtl_production_order_items · Tài khoản: prodstaff01
- File dự kiến: `tests/production/uc-44-production-orders.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-PRO-01 | Main | orders can be searched and the detail shows materials and finished goods receipts without co… | A | P2 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-PRO-02 | A44.1 | the user can return to the list and open another order. | B | P3 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-PRO-03 | E44.1 | an order that does not exist or was canceled shows an error. | C | P2 | OK | Không có URL chi tiết lệnh; phần "id không tồn tại" kiểm bằng API (MSG16 "Không tìm thấy lệnh sản xuất hoặc lệnh không còn khả dụng."), phần lệnh đã huỷ kiểm trên UI. | Đã triển khai (đợt 2) | Passed (25/11/2026) |

### UC-45 Material Requirement

- Trang: /production (chi tiết) · API: GET /api/production/orders/{id}, /requirement-preview
- Bảng: trx_production_material_requirements, trx_inventory_balances · Tài khoản: prodstaff01
- File dự kiến: `tests/production/uc-45-material-requirement.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MRQ-01 | Main | required, issued, shortage and available quantities are shown for each material. | A | P2 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-MRQ-02 | A45.1 | selecting another warehouse shows its available stock. | A | P2 | OK |  | Đã triển khai (đợt 2) | Passed (25/11/2026) |
| SYS-MRQ-03 | E45.1 | an error is shown when the order or its BOM cannot be found. | E | P2 | NEEDS_CLARIFICATION | Tiền đề không dựng được qua UI: BOM đã dùng cho lệnh không xoá được (BR-06). Đề xuất thay bằng lệnh không tồn tại → MSG16 — cần bạn duyệt. | Đã triển khai (đợt 2) | Failed (25/11/2026) – SPEC_CODE_MISMATCH / NEEDS_CLARIFICATION |

### UC-46 Material Stock Issue

- Trang: /production/material-issues · API: POST /api/production/material-issues
- Bảng: trx_stock_issues, dtl_stock_issue_items, trx_inventory_* · Tài khoản: prodstaff01
- File dự kiến: `tests/production/uc-46-material-stock-issue.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MIS-01 | Main | confirming deducts inventory, updates issued and shortage quantities, and the first issue se… | A | P1 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MIS-02 | E46.1 | an order code that does not exist or is Completed or Canceled is rejected. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MIS-03 | E46.2 | a negative quantity or one above available stock is rejected. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MIS-04 | E46.3 | an issue covering a material in an active stocktake cannot be confirmed. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MIS-05 | A46.1 | a supplementary issue is recorded under the same order and updates the totals. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MIS-06 | E46.2 | a reason is mandatory when the cumulative issue exceeds the requirement. | A | P2 | SPEC_CODE_MISMATCH | Mô tả: bắt buộc lý do; Expected: từ chối khi vượt nhu cầu BOM. | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MIS-07 | A46.2 | a lower actual quantity is recorded and the remaining shortage is kept for a later issue. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |

### UC-49 Finished Goods Receipt

- Trang: /production/finished-goods · API: POST /api/production/finished-goods-receipts (+/check), POST /api/production/orders/{id}/approve
- Bảng: trx_finished_goods_receipts, trx_production_orders, trx_inventory_* · Tài khoản: prodstaff01
- File dự kiến: `tests/production/uc-49-finished-goods-receipt.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-FGR-01 | Main | confirming adds accepted quantity to inventory and updates the order progress. | A | P1 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-FGR-02 | Main | the order is Completed when the cumulative received quantity equals the planned quantity. | A | P2 | KNOWN_DEFECT:DEF-IT-06 | Duyệt hoàn thành nhưng lệnh vẫn IN_PROGRESS (5.2). | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-FGR-03 | A49.2 | a material usage warning requires a note and flags the receipt for the Manager. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-FGR-04 | E49.1 | a cumulative quantity above the plan is rejected. | A | P2 | SPEC_CODE_MISMATCH, KNOWN_DEFECT:DEF-IT-05 | Mô tả: từ chối; Expected: hỏi xác nhận rồi lưu. DEF-IT-05: sau xác nhận vẫn bị chặn vì NVL chỉ đủ kế hoạch. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-FGR-05 | E49.2 | a quantity of 0 or less, a missing lot or no warehouse access is rejected. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-FGR-06 | A49.1 | defective quantities with a reason are recorded and not added to sellable inventory. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |

### UC-51 Master Data

- Trang: /products, /customers, /suppliers, /warehouses, /bom, /price-books · API: /api/products, /api/customers, /api/suppliers, /api/warehouses, /api/production/boms
- Bảng: mst_products, mst_unit_conversions, mst_business_partners, trx_credit_limit_histories, mst_warehouses, mst_boms, dtl_bom_items · Tài khoản: manager01
- File dự kiến: `tests/master-data/uc-51-master-data.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MST-01 | Main | each master data area opens and saved changes show their result. | A | P3 | ORACLE_PROPOSED, NEEDS_CLARIFICATION | Đề xuất: chỉ kiểm mở được 6 màn (API 200, bảng hiển thị); phần "lưu" đã có ở MST-02..20 — cần bạn đồng ý thu hẹp. | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-02 | A51.1 | a product with code, name, type, category, base unit, selling price, reorder point and lot t… | A | P2 | ORACLE_PROPOSED, SPEC_CODE_MISMATCH | Kiểm mã, tên, nhóm, đơn vị, giá, điểm đặt hàng lại. Chưa thấy trường "theo dõi lô" (BR-27) → ghi phần thiếu. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-03 | E51.1 | missing required fields or invalid values are rejected. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-04 | E51.2 | a duplicate product code is rejected. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-05 | E51.3 | deleting a product used by transactions is refused and deactivation is offered. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-06 | A51.7 | a deactivated product stays in history and is hidden from new transactions. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-07 | A51.2 | units and conversion factors of a product are saved. | A | P2 | SPEC_CODE_MISMATCH | Quy đổi chỉ trong form hàng hóa. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-08 | E51.1 | a conversion factor of 0 or less is rejected. | A | P2 | ORACLE_PROPOSED, NEEDS_CLARIFICATION | Không thấy kiểm hệ số ≤ 0 ở backend. Đề xuất: không lưu được và không có dòng mst_unit_conversions hệ số ≤ 0 (dự kiến Fail). Nội dung thông báo cần xác nhận. | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-09 | A51.3 | a customer is created and updated with code, name, type, contact and payment term. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-10 | A51.3 | a supplier is created and updated with code, name, type, contact and payment term. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-11 | E51.2 | a duplicate partner code is rejected. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-12 | E51.3 | deleting a partner used by transactions is refused and deactivation is offered. | A | P2 | SPEC_CODE_MISMATCH | Mô tả: từ chối xoá; Expected: ngừng hoạt động thay vì xoá. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-13 | A51.4 | a new credit limit is saved and current debt is displayed. | D | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-14 | E51.1 | a negative credit limit is rejected. | D | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-15 | A51.5 | a warehouse is created and updated. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-16 | A51.5 | storage locations can be created and updated. | NA | — | NOT_IMPLEMENTED | Not implemented (location master). | test.skip (lý do) | N/A – test.skip |
| SYS-MST-17 | E51.3 | deleting a warehouse used by transactions is refused and deactivation is offered. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MST-18 | A51.6 | a BOM version with materials, standard quantity and wastage rate is saved. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-19 | A51.6 | activating a version makes the previous active version inactive. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MST-20 | E51.1 | a BOM without material is rejected. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |

### UC-58 Production

- Trang: /production · API: /api/production/orders (+/cancel, /close), /api/production/boms
- Bảng: trx_production_orders, trx_production_material_requirements · Tài khoản: manager01
- File dự kiến: `tests/production/uc-58-production.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MPR-01 | Main | Production shows orders with progress and material status. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MPR-02 | A58.1 | a new order shows the active BOM and material requirement, and is saved as Not Started. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MPR-03 | A58.1 | a Not Started order can be updated and an order without material issue can be cancelled. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MPR-04 | A58.1 | an In Progress order can be closed early with a reason. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MPR-05 | E58.1 | a finished good without an active BOM cannot be ordered. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MPR-06 | E58.2 | planned quantity of 0 or less, a past deadline or a disallowed status change is rejected. | A | P2 | ORACLE_PROPOSED | Theo code: hạn quá khứ → "Hạn hoàn thành không được trước ngày hôm nay." (ProductionOrderRules.ValidateDeadline); huỷ sau xuất NVL → thông báo trong Expected. | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MPR-07 | A58.2 | required, issued and shortage quantities and supplementary issues with reasons are shown. | A | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MPR-08 | A58.3 | receipts, defective quantities and material usage warnings are shown. | A | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH / NEEDS_CLARIFICATION |

### UC-62 Sales and Credit

- Trang: /orders, /sales-booking, /approvals · API: /api/orders, /api/credit-requests (+/approve, /reject)
- Bảng: trx_credit_limit_requests, trx_credit_limit_histories, mst_business_partners · Tài khoản: manager01 + e2e.manager2 + sales01
- File dự kiến: `tests/sales/uc-62-sales-and-credit.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MSC-01 | Main | Sales & Credit shows sales KPIs, pending credit requests and fulfillment status. | NA | — | NOT_IMPLEMENTED | No overview screen; credit requests are on /approvals. | test.skip (lý do) | N/A – test.skip |
| SYS-MSC-02 | A62.1 | pending and consolidated orders are shown by customer, value and status. | A | P3 | SPEC_CODE_MISMATCH | Xem ở màn Hóa đơn và Đặt hàng. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MSC-03 | A62.2 | Approve this transaction records approver and time and notifies the Sales Accountant. | D | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MSC-04 | A62.2 | Approve new limit updates the credit limit of the customer. | D | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MSC-05 | A62.2 | Reject with a reason notifies the Sales Accountant. | D | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MSC-06 | E62.1 | a rejection without a reason or a new limit below the current limit is rejected. | D | P2 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MSC-07 | E62.2 | a request already decided or canceled shows a message and refreshes the list. | A | P2 | OK | Hai Manager = hai browser context (manager01 + e2e.manager2). | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-MSC-08 | A62.3 | requested and issued quantities are shown with partially fulfilled issues and new pending or… | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MSC-09 | A62.4 | receivable, overdue amount, days overdue and collection notes are shown. | NA | — | NOT_IMPLEMENTED | Not implemented (only debt warning settings). | test.skip (lý do) | N/A – test.skip |

### UC-67 Purchasing and Receiving

- Trang: /purchase-orders, /suppliers · API: /api/purchase-orders, /api/suppliers/{id}
- Bảng: trx_purchase_orders, trx_goods_receipts, trx_financial_transactions · Tài khoản: manager01
- File dự kiến: `tests/purchasing/uc-67-purchasing-and-receiving.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MPU-01 | Main | Purchasing & Receiving shows the purchasing summary and each view. | NA | — | NOT_IMPLEMENTED | No overview screen. | test.skip (lý do) | N/A – test.skip |
| SYS-MPU-02 | E67.1 | an error is shown when the information cannot be retrieved. | NA | — | NOT_IMPLEMENTED | No overview screen. | test.skip (lý do) | N/A – test.skip |
| SYS-MPU-03 | A67.1 | ordered, received and remaining quantities and their receipts are shown. | A | P3 | SPEC_CODE_MISMATCH | Ở màn Đặt hàng nhập. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MPU-04 | A67.2 | defective, missing and supplier-returned quantities with reasons and rejected deliveries are… | NA | — | NOT_IMPLEMENTED | No tracking view. | test.skip (lý do) | N/A – test.skip |
| SYS-MPU-05 | A67.3 | landed costs per receipt, allocation and MAC before and after are shown. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MPU-06 | A67.4 | the payable balance of each supplier and the payment vouchers are shown. | A | P3 | SPEC_CODE_MISMATCH | Ở màn Nhà cung cấp. | Đã triển khai (đợt 3) | Passed (25/11/2026) |

### UC-72 Manage Inventory

- Trang: /transfers · API: /api/transfers
- Bảng: trx_stock_transfers · Tài khoản: manager01
- File dự kiến: `tests/inventory/uc-72-manage-inventory.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MIN-01 | Main | Inventory shows the summary, alerts and pending approvals. | NA | — | NOT_IMPLEMENTED | No overview screen. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-02 | A72.1 | quantity, MAC and value per product per warehouse are shown with filters. | NA | — | NOT_IMPLEMENTED | Not implemented as a report (/inventory redirects to /dashboard). | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-03 | A72.2 | transfers by status and recorded discrepancies with explanation are shown. | A | P3 | SPEC_CODE_MISMATCH | Ở màn Chuyển hàng. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MIN-04 | A72.3 | Approve adjusts inventory to counted quantities and releases the items. | NA | — | NOT_IMPLEMENTED | Not implemented (stocktake balanced directly). | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-05 | A72.3 | Reject leaves inventory unchanged and releases the items. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-06 | A72.3 | Request Recount returns the stocktake to Counting. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-07 | E72.1 | a rejection or recount without a note is rejected. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-08 | E72.2 | a stocktake already decided shows a message and no change is made. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-09 | A72.4 | Approve reduces inventory and completes the note. | NA | — | NOT_IMPLEMENTED | Not implemented (disposal completed directly). | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-10 | A72.4 | Reject leaves inventory unchanged. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-11 | E72.1 | a rejection without a note is rejected. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-12 | E72.2 | a note already decided shows a message and no change is made. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-13 | A72.5 | items at or below the reorder point are shown. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MIN-14 | A72.6 | lots expiring within the configured days or already expired are shown. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |

### UC-79 Manage Returns

- Trang: /sales-returns · API: /api/sales-returns
- Bảng: trx_return_requests · Tài khoản: manager01
- File dự kiến: `tests/sales/uc-79-manage-returns.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-MRT-01 | Main | Returns shows return requests and their status. | NA | — | NOT_IMPLEMENTED | No overview screen. | test.skip (lý do) | N/A – test.skip |
| SYS-MRT-02 | E79.1 | an error is shown when the information cannot be retrieved. | NA | — | NOT_IMPLEMENTED | No overview screen. | test.skip (lý do) | N/A – test.skip |
| SYS-MRT-03 | A79.1 | requests are shown by status with reason and customer. | A | P3 | SPEC_CODE_MISMATCH | Ở màn Trả hàng. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-MRT-04 | A79.2 | returned quantities by category and items Under Repair or Waiting for Disposal are shown. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-MRT-05 | A79.3 | the debt reduction of each return and returns marked Refund Due are shown. | A | P3 | SPEC_CODE_MISMATCH | Ở màn Trả hàng. | Đã triển khai (đợt 3) | Passed (25/11/2026) |

### UC-83 Finance and Reports

- Trang: /customers, /suppliers (Thu tiền / Thanh toán) · API: POST /api/customers/{id}/payments, POST /api/suppliers/{id}/payments
- Bảng: trx_financial_transactions, mst_business_partners · Tài khoản: manager01 / sales01
- File dự kiến: `tests/finance/uc-83-finance-and-reports.spec.ts`

| TC | Luồng | Nội dung (rút gọn) | Loại | Ưu tiên | Đánh giá | Ghi chú | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-FIN-01 | Main | Finance & Reports lists the available functions. | NA | — | NOT_IMPLEMENTED | Not implemented (/reports redirects to /dashboard). | test.skip (lý do) | N/A – test.skip |
| SYS-FIN-02 | E83.2 | an error is shown when report data cannot be retrieved. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-FIN-03 | A83.1 | a receipt voucher with amount, method and reference is saved and reduces customer debt. | D | P1 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-FIN-04 | E83.1 | an amount of 0 or less, a missing partner or an amount above the debt is rejected. | D | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-FIN-05 | A83.2 | a payment voucher to a supplier is saved and reduces the payable. | D | P1 | OK |  | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-FIN-06 | A83.2 | a payment voucher for a customer marked Refund Due reduces the refund due. | A | P2 | SPEC_CODE_MISMATCH | Hoàn tiền từ phiếu trả hàng, không có trạng thái Refund Due. | Đã triển khai (đợt 3) | Passed (25/11/2026) |
| SYS-FIN-07 | E83.1 | an amount of 0 or less, a missing partner or an amount above the payable is rejected. | D | P2 | OK |  | Đã triển khai (đợt 3) | Failed (25/11/2026) – SPEC_CODE_MISMATCH |
| SYS-FIN-08 | A83.3 | receivables and payables with aging are shown for the selected period and partner type. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-FIN-09 | A83.4 | opening, in, out and closing quantity and value are shown for the period and warehouse. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-FIN-10 | A83.5 | revenue from issued goods, cost of goods sold at MAC and gross profit are shown. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-FIN-11 | A83.6 | purchase cost, landed cost and production material cost are shown. | NA | — | NOT_IMPLEMENTED | Not implemented. | test.skip (lý do) | N/A – test.skip |
| SYS-FIN-12 | A83.7 | the dashboard shows KPIs and pending approvals. | NA | — | NOT_IMPLEMENTED | Only the Admin dashboard (staff, roles, warehouses) exists. | test.skip (lý do) | N/A – test.skip |

## NEW TEST CASE

### NEW POS and Invoices (NEW)

- File: `tests/new/new-pos-and-invoices.spec.ts`

| TC | Nhóm | Luồng | Nội dung (rút gọn) | Ưu tiên | Đánh giá | Căn cứ | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-POS-N01 | 1 | Main | a cash sale on POS creates an invoice, deducts stock of the selling branch and writes a stoc… | P1 (pilot) | NEW | Route /pos, POST /api/orders/pos; SPEC sales-stock-issue (Case A); Report 5.2 'POS Cash Sale and Stock Ledger'. Pilot case. | Đã triển khai (pilot, chạy lại đợt 4) | Passed 5/5 lượt (23/11); Passed (26/11/2026) |
| SYS-POS-N02 | 1 | Main | a sale on debt within the credit limit increases the customer's debt by the unpaid amount. | P1 | NEW | POST /api/orders/pos; BR-12; Report 5.2 'POS Debt Sale and Credit Limit'. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-POS-N03 | 1 | E | a walk-in customer must pay the full amount. | P2 | NEW | PosScreen checkout check; backend rule PAY-009. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-POS-N04 | 1 | E | a quantity above stock is refused when negative stock sale is not allowed. | P2 | NEW | PosScreen checkout check; CreatePosOrderCommand AllowNegativeStockSale; Report 5.2 'POS Stock Policy and Reserved'. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-POS-N05 | 1 | E | stock reserved by open bookings cannot be sold when selling reserved stock is not allowed. | P2 | NEW | CreatePosOrderCommand AllowSellingReservedStock (BR-08); Report 5.2 'POS Stock Policy and Reserved'. Exact UI wording (dialog or message) to be recorded at the first run. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-POS-N06 | 1 | E | clicking THANH TOÁN twice in quick succession creates only one invoice. | P2 | NEW | CreatePosOrderCommand 3-second duplicate guard (PAY-016). | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-POS-N07 | 2 | Main | a booking opened on POS is invoiced, its deposit is deducted and the booking becomes Finished. | P1 | NEW | PosScreen booking flow; Report 5.2 'Booking to Delivery Invoice' (INT-SBK-13-01 UI part). | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-POS-N08 | 2 | A | delivering only part of a booking creates a pending booking for the remaining quantity. | P2 | NEW | POST /api/orders/pos result remainderBookingCode; SPEC pending-orders BR-09 (Case A). | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-ORD-N01 | 3 | Main | Hóa đơn lists invoices, searches by code and customer, filters by status and opens the detail. | P2 | NEW | Routes /orders, /orders/[id]; GET /api/orders, /api/orders/{id}. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-ORD-N02 | 3 | Main | the printed invoice shows lines, totals and the payment QR code. | P2 | NEW | InvoicePreviewModal / invoiceUtils; Report 5.2 INT-POS-08-02 UI part. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH (bản in không có QR) |
| SYS-ORD-N03 | 3 | A | cancelling an invoice restores stock and reverses debt, and an invoice with an active return… | P2 | NEW | POST /api/orders/{id}/cancel; CancelOrder messages. | Đã triển khai (đợt 4) | Passed (26/11/2026) |

### NEW Purchasing (NEW)

- File: `tests/new/new-purchasing.spec.ts`

| TC | Nhóm | Luồng | Nội dung (rút gọn) | Ưu tiên | Đánh giá | Căn cứ | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-PUR-N01 | 5 | Main | a direct receipt saved as draft does not change stock, and completing it adds stock, MAC and… | P1 | NEW | POST /api/purchases, PATCH /api/purchases/{id}/complete; Report 5.2 'Goods Receipt Draft, Complete'. | Đã triển khai (đợt 4) | Failed (26/11/2026) – KNOWN_DEFECT DEF-E2E-08 (PURCHASE_UPDATE) |
| SYS-PUR-N02 | 5 | A | cancelling a completed receipt reverses stock and payable, and a receipt with a supplier ret… | P2 | NEW | PATCH /api/purchases/{id}/cancel; Purchases messages. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-PUR-N03 | 6 | Main | a supplier return from a completed receipt reduces stock and payable and cannot exceed the r… | P2 | NEW | POST /api/purchase-returns; PurchaseReturns messages; Report 5.2 'Supplier Return and Refund'. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH (ô SL trả tự giới hạn) |
| SYS-PUR-N04 | 6 | A | a refund from the supplier is recorded on a completed return only. | P2 | NEW | POST /api/purchase-returns/{id}/refunds. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH (phiếu tạm không có nút Thanh toán) |

### NEW Inventory (NEW)

- File: `tests/new/new-inventory.spec.ts`

| TC | Nhóm | Luồng | Nội dung (rút gọn) | Ưu tiên | Đánh giá | Căn cứ | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-TRF-N01 | 7 | A | cancelling an In Transit transfer restores source stock. | P2 | NEW | POST /api/transfers/{id}/cancel; team decision in SYS-TRF-02 note; Report 5.2 'Cancel Transfer By Status'. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-TRF-N02 | 7 | A | cancelling a Received transfer reverses both warehouses and only a user managing the destina… | P2 | NEW | POST /api/transfers/{id}/cancel; Transfers messages. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-TRF-N03 | 7 | E | a negative received quantity is rejected. | P2 | KNOWN_DEFECT:DEF-IT-03 | BR-40; Report 5.2 DEF-IT-03 (code turns a negative quantity into 0). Expected to fail: KNOWN_DEFECT DEF-IT-03. | Đã triển khai (đợt 4) | Failed (26/11/2026) – KNOWN_DEFECT DEF-IT-03 |
| SYS-TRF-N04 | 7 | E | two users confirming receipt of the same transfer at the same time add stock only once. | P1 | KNOWN_DEFECT:DEF-IT-01 | Report 5.2 DEF-IT-01 (Critical). Expected to fail: KNOWN_DEFECT DEF-IT-01. | Đã triển khai (đợt 4) | Không ổn định – KNOWN_DEFECT DEF-IT-01: tái hiện 8/11 lần (lượt f chính thức Passed, lượt 1920 Failed); Round 1 ghi Failed (26/11/2026) |
| SYS-TRF-N05 | 7 | A | the destination user can confirm receipt with the default receipt time when the transfer was dispatched in the same minute. | P2 | KNOWN_DEFECT:DEF-E2E-01 | Thêm 25/11/2026 từ pilot (DEF-E2E-01): giờ nhận mặc định cắt giây nên bằng giờ chuyển. Expected to fail cho tới khi sửa DEF-E2E-01. | Đã triển khai (đợt 4) | Failed (26/11/2026) – KNOWN_DEFECT DEF-E2E-01 |
| SYS-STK-N01 | 8 | A | cancelling a Balanced stocktake reverses the adjustment. | P2 | NEW | PATCH /api/stocktakes/{id}/cancel; team decision in SYS-STK-04 note; Report 5.2 'Cancel Balanced Stocktake'. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-INV-N01 | 9 | Main | a stock adjustment on a product updates stock and the stock card, and invalid adjustments ar… | P2 | NEW | POST /api/products/{id}/stock-adjustments; Report 5.2 'Product Stock Adjustment'. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH (UI chặn ý 2, 3) |
| SYS-INV-N02 | 9 | Main | the stock card lists every movement of a product with its document and running balance. | P2 | NEW | GET /api/products/{id}/stock-card; StockCardDocumentModal. | Đã triển khai (đợt 4) | Passed (26/11/2026) |

### NEW Master Data and Settings (NEW)

- File: `tests/new/new-master-data-and-settings.spec.ts`

| TC | Nhóm | Luồng | Nội dung (rút gọn) | Ưu tiên | Đánh giá | Căn cứ | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-PRD-N01 | 9 | Main | importing a valid Excel file creates the products. | P2 | NEW | POST /api/products/import; GoodsImportModal; Report 5.2 'Product Import from Excel' (INT-PRD-02 UI part). | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-PRD-N02 | 9 | E | a file with invalid rows reports each invalid row and does not create them. | P2 | NEEDS_CLARIFICATION | POST /api/products/import. Whether valid rows of the same file are imported is NEEDS_CLARIFICATION. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH + NEEDS_CLARIFICATION (dòng thiếu tên không bị báo) |
| SYS-PRB-N01 | 10 | Main | a price book with a formula computes prices from the source price book. | P2 | NEW | POST /api/price-books, POST /api/price-books/{id}/apply-formula; Report 5.2 'Price Book and Formula Applied'. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH (ô tên required) |
| SYS-PRB-N02 | 10 | Main | selecting a price book on POS applies its prices to the cart. | P2 | NEW | PosScreen price book selection; Report 5.2 INT-PRB-03-05 UI part. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-SET-N01 | 4 | Main | changing the document code prefix and rule applies to the next document, and invalid or unau… | P2 | NEW | GET/PUT /api/settings/orders; Report 5.2 'Order Settings Affect Sales'. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH (ô tiền tố maxLength 10) |
| SYS-SET-N02 | 4 | A | allowing negative stock sale lets POS sell above stock. | P2 | NEW | MstOrderSetting AllowNegativeStockSale; CreatePosOrderCommand. | Đã triển khai (đợt 4) | Passed (26/11/2026) |

### NEW Cross-cutting (NEW)

- File: `tests/new/new-cross-cutting.spec.ts`

| TC | Nhóm | Luồng | Nội dung (rút gọn) | Ưu tiên | Đánh giá | Căn cứ | Triển khai | Thực thi |
|---|---|---|---|---|---|---|---|---|
| SYS-XCT-N01 | 12 | E | a user without a function cannot open it by URL and does not see it in the menu. | P1 | NEW | FeatureGuard / AppLayout NoAccess; Report 5.2 INT-ADM-40-03 UI part. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-XCT-N02 | 12 | E | an account without any warehouse sees no warehouse documents. | P1 | KNOWN_DEFECT:DEF-IT-04 | BR-04; Report 5.2 DEF-IT-04 (GetPurchasesQuery returns all receipts). Expected to fail on Nhập hàng: KNOWN_DEFECT DEF-IT-04. | Đã triển khai (đợt 4) | Failed (26/11/2026) – KNOWN_DEFECT DEF-IT-04 (Nhập hàng) |
| SYS-XCT-N03 | 13 | E | opening a protected URL in a browser that has never logged in redirects to the login screen. | P2 | NEW | client.ts 401 handling; Report 5.2 INT-AUT-37-05. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-XCT-N04 | 13 | A | two tabs keep their own accounts. | P2 | NEW | lib/auth/tabSession.ts; Report 5.2 INT-AUT-37-06. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-XCT-N05 | 14 | A | changing the working branch in the header switches lists and POS stock and is kept after rel… | P2 | NEW | lib/warehouse/useActiveWarehouse.ts. | Đã triển khai (đợt 4) | Failed (26/11/2026) – SPEC_CODE_MISMATCH (Chuyển hàng không lọc theo chi nhánh header) |
| SYS-XCT-N06 | 15 | E | an error message instead of a blank page when the API is unavailable, and recovery when it r… | P2 | NEW | Login page and apiClient error handling; replaces the 'stop the API' part of SYS-MPU-02 / SYS-MRT-02 / SYS-FIN-02 (N/A). | Đã triển khai (đợt 4) | Failed (26/11/2026) – DEF-E2E-09 (Hàng hóa không báo lỗi khi API ngừng) |
| SYS-XCT-N07 | 16 | Main | money and dates use the Vietnamese format. | P2 | NEW | toLocaleString('vi-VN'); lib/utils/date.ts formatDateTimeVN. | Đã triển khai (đợt 4) | Passed (26/11/2026) |
| SYS-XCT-N08 | 16 | Main | the main screens fit 1366x768 without horizontal page scroll. | P2 | NEW | Test environment of Report 5.3 (1366x768 and 1920x1080). | Đã triển khai (đợt 4) | Passed (26/11/2026) |
