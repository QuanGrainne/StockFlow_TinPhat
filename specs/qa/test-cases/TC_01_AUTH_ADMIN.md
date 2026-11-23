# Test case – Xác thực, tài khoản, vai trò, quyền kho, bảo mật

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- **Số test case:** 43.
- Ma trận truy vết: [02_REQUIREMENT_TRACEABILITY_MATRIX.md](../reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md). Chiến lược: [03_TEST_STRATEGY.md](../reports/03_TEST_STRATEGY.md).

## Danh sách

| ID | Tên | Module | Loại | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| [UT-VAL-007](#ut-val-007) | CreateStaffCommandValidator: chính sách mật khẩu | Tài khoản | Unit | High | Not Run |
| [UT-VAL-008](#ut-val-008) | ChangePasswordCommandValidator: mật khẩu mới trùng mật khẩu cũ, không khớp xác nhận | Xác thực | Unit | High | Not Run |
| [IT-SEC-001](#it-sec-001) | Cô lập kho trong handler cho mọi nghiệp vụ kho | Bảo mật & phân quyền | Integration | Critical | Not Run |
| [IT-SEC-002](#it-sec-002) | Đổi ma trận quyền có hiệu lực ngay ở request kế tiếp | Bảo mật & phân quyền | Integration | High | Not Run |
| [IT-SEC-003](#it-sec-003) | Khoá tài khoản thì mất quyền ở request kế tiếp | Bảo mật & phân quyền | Integration | Critical | Not Run |
| [IT-SEC-004](#it-sec-004) | Mật khẩu lưu dạng băm có salt | Bảo mật & phân quyền | Integration | High | Not Run |
| [API-SEC-001](#api-sec-001) | Mọi endpoint (trừ login, health) trả 401 khi không có token | Bảo mật & phân quyền | API | Critical | Not Run |
| [API-SEC-002](#api-sec-002) | Token sai chữ ký, hết hạn, sai issuer bị từ chối | Bảo mật & phân quyền | API | Critical | Not Run |
| [API-SEC-003](#api-sec-003) | Ma trận quyền: vai trò thiếu quyền của endpoint nhận 403 | Bảo mật & phân quyền | API | Critical | Not Run |
| [API-SEC-004](#api-sec-004) | Tắt chức năng menu (feature) của vai trò thì API tương ứng trả 403 | Bảo mật & phân quyền | API | High | Not Run |
| [API-SEC-005](#api-sec-005) | Endpoint chỉ cần đăng nhập không lộ cấu hình và kho cho vai trò không liên quan | Bảo mật & phân quyền | API | High | Not Run |
| [API-SEC-006](#api-sec-006) | IDOR: xem chứng từ của kho không được gán | Bảo mật & phân quyền | API | Critical | Not Run |
| [API-SEC-007](#api-sec-007) | Production Accountant không thấy giá mua, giá vốn, MAC, giá bán | Bảo mật & phân quyền | API | High | Not Run |
| [API-SEC-008](#api-sec-008) | Chuỗi SQL injection / XSS trong tìm kiếm và tên | Bảo mật & phân quyền | API | High | Not Run |
| [API-SEC-009](#api-sec-009) | Dùng lại token sau khi đăng xuất | Xác thực | API | Medium | Not Run |
| [API-AUTH-001](#api-auth-001) | Đăng nhập bằng username, email, mã nhân viên | Xác thực | API | Critical | Not Run |
| [API-AUTH-002](#api-auth-002) | Sai mật khẩu, tài khoản không tồn tại, tài khoản khoá | Xác thực | API | Critical | Not Run |
| [API-AUTH-003](#api-auth-003) | Đổi mật khẩu: sai mật khẩu hiện tại, mật khẩu mới không hợp lệ, thành công | Xác thực | API | High | Not Run |
| [API-AUTH-004](#api-auth-004) | Khách hàng và nhà cung cấp không có tài khoản trong StockFlow | Xác thực | API | Medium | Not Run |
| [API-ACC-005](#api-acc-005) | Xem và tìm tài khoản theo tên, mã nhân viên, email, vai trò, trạng thái | Tài khoản | API | Medium | Not Run |
| [API-ROLE-003](#api-role-003) | Xem vai trò, quyền của vai trò và gán vai trò cho tài khoản | Vai trò & quyền | API | High | Not Run |
| [API-WHA-002](#api-wha-002) | Xem quyền kho theo kho và theo nhân viên | Quyền kho | API | Medium | Not Run |
| [API-ACC-001](#api-acc-001) | Tạo nhân viên trùng username, email, mã nhân viên | Tài khoản | API | High | Not Run |
| [API-ACC-002](#api-acc-002) | Không tạo được tài khoản vai trò Admin; thiếu trường bắt buộc | Tài khoản | API | High | Not Run |
| [API-ACC-003](#api-acc-003) | Sửa nhân viên không gửi danh sách kho thì giữ nguyên quyền kho | Tài khoản | API | Critical | Not Run |
| [API-ACC-004](#api-acc-004) | Khoá / mở khoá và đặt lại mật khẩu nhân viên | Tài khoản | API | High | Not Run |
| [API-ROLE-001](#api-role-001) | Tạo vai trò trùng tên / mã; sửa hoặc xoá vai trò mặc định, vai trò đang được dùng | Vai trò & quyền | API | High | Not Run |
| [API-ROLE-002](#api-role-002) | Chỉ Admin cấu hình vai trò, quyền, quyền kho, kho | Vai trò & quyền | API | High | Not Run |
| [API-WHA-001](#api-wha-001) | Gán quyền kho cho nhân viên; mã kho trùng | Quyền kho | API | High | Not Run |
| [ST-AUTH-001](#st-auth-001) | Đăng nhập, sai mật khẩu, tài khoản khoá, đăng xuất, token hết hạn | Xác thực | System | Critical | Not Run |
| [ST-AUTH-002](#st-auth-002) | Đổi mật khẩu trên giao diện | Xác thực | System | High | Not Run |
| [ST-RBAC-001](#st-rbac-001) | Admin: menu và màn hình theo bảng 3.1.6 | Bảo mật & phân quyền | System | Critical | Not Run |
| [ST-RBAC-002](#st-rbac-002) | Manager: menu theo bảng 3.1.6, không có màn quản trị | Bảo mật & phân quyền | System | Critical | Not Run |
| [ST-RBAC-003](#st-rbac-003) | Sales Accountant: chỉ bán hàng, đặt hàng, khách hàng, trả hàng | Bảo mật & phân quyền | System | Critical | Not Run |
| [ST-RBAC-004](#st-rbac-004) | Warehouse Accountant: mua hàng, nhập hàng, chuyển kho, kiểm kê, huỷ hàng, phiếu chi NCC | Bảo mật & phân quyền | System | Critical | Not Run |
| [ST-RBAC-005](#st-rbac-005) | Production Accountant: lệnh, xuất NVL, nhập TP, kế hoạch, MRP; không thấy giá | Bảo mật & phân quyền | System | Critical | Not Run |
| [ST-RBAC-006](#st-rbac-006) | Cô lập kho trên giao diện: người dùng chỉ có K001 | Bảo mật & phân quyền | System | Critical | Not Run |
| [ST-NFR-006](#st-nfr-006) | Chạy trên Chrome, Edge, Firefox bản ổn định | Bảo mật & phân quyền | System | Medium | Not Run |
| [ST-NFR-007](#st-nfr-007) | Sao lưu và khôi phục database | Bảo mật & phân quyền | System | Medium | Not Run |
| [ST-NFR-008](#st-nfr-008) | Nhật ký kiểm toán cho thao tác nhạy cảm | Bảo mật & phân quyền | System | Medium | Blocked |
| [RT-N01](#rt-n01) | Tái hiện N-01: sửa nhân viên giữ nguyên quyền kho | Tài khoản | Regression | High | Not Run |
| [RT-N07](#rt-n07) | Tái hiện N-07: quyền mặc định theo vai trò của Report 3 | Bảo mật & phân quyền | Regression | High | Not Run |
| [RT-SUITE-01](#rt-suite-01) | Bộ hồi quy theo module (chạy khi sửa module tương ứng) | Bảo mật & phân quyền | Regression | High | Not Run |

## Xác thực

### UT-VAL-008

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-008 |
| Test Name | ChangePasswordCommandValidator: mật khẩu mới trùng mật khẩu cũ, không khớp xác nhận |
| Module | Xác thực |
| Requirement ID | BR-05 |
| Use Case ID | UC-03 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Validate mật khẩu mới = mật khẩu cũ<br>2. Validate xác nhận khác mật khẩu mới |
| Expected Result | • Lỗi MSG07 cho cả hai |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-009

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-009 |
| Test Name | Dùng lại token sau khi đăng xuất |
| Module | Xác thực |
| Requirement ID | NFR-SEC-04 |
| Use Case ID | UC-02 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Bảo mật |
| API liên quan | GET /api/auth/me |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng xuất trên giao diện<br>2. Gọi API bằng token cũ |
| Expected Result | • Theo UC-02 phiên phải kết thúc: 401 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-16: đăng xuất chỉ xoá token ở trình duyệt; JWT còn hạn vẫn dùng được. |

### API-AUTH-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-AUTH-001 |
| Test Name | Đăng nhập bằng username, email, mã nhân viên |
| Module | Xác thực |
| Requirement ID | BR-01 |
| Use Case ID | UC-01 |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/auth/login |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng nhập lần lượt bằng 3 định danh của cùng tài khoản |
| Expected Result | • 200 kèm token; /api/auth/me trả đúng vai trò và kho |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-AUTH-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-AUTH-002 |
| Test Name | Sai mật khẩu, tài khoản không tồn tại, tài khoản khoá |
| Module | Xác thực |
| Requirement ID | BR-01 |
| Use Case ID | UC-01 |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Kiểm thử âm, Bảo mật |
| API liên quan | POST /api/auth/login |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Sai mật khẩu<br>2. Username không tồn tại<br>3. Tài khoản bị khoá |
| Expected Result | • Hai ca đầu cùng một thông báo MSG02 (không nói trường nào sai)<br>• Tài khoản khoá: MSG03 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-AUTH-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-AUTH-003 |
| Test Name | Đổi mật khẩu: sai mật khẩu hiện tại, mật khẩu mới không hợp lệ, thành công |
| Module | Xác thực |
| Requirement ID | BR-05 |
| Use Case ID | UC-03 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/auth/change-password |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Sai mật khẩu hiện tại<br>2. Mật khẩu mới 7 ký tự<br>3. Hợp lệ<br>4. Đăng nhập bằng mật khẩu mới |
| Expected Result | • MSG06<br>• MSG07<br>• 200<br>• Đăng nhập được; mật khẩu cũ không còn dùng được |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-AUTH-004

| Trường | Nội dung |
|---|---|
| Test Case ID | API-AUTH-004 |
| Test Name | Khách hàng và nhà cung cấp không có tài khoản trong StockFlow |
| Module | Xác thực |
| Requirement ID | BR-07 |
| Use Case ID | UC-01 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/auth/login; POST /api/customers |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo khách hàng có email<br>2. Đăng nhập bằng email / mã khách hàng đó |
| Expected Result | • MSG02; không có cách tạo tài khoản đăng nhập cho đối tác |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-AUTH-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-AUTH-001 |
| Test Name | Đăng nhập, sai mật khẩu, tài khoản khoá, đăng xuất, token hết hạn |
| Module | Xác thực |
| Requirement ID | BR-01, BR-05, NFR-SEC-04 |
| Use Case ID | UC-01, UC-02 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương, Kiểm thử âm |
| API liên quan | — |
| Preconditions | Frontend chạy với NEXT_PUBLIC_DEV_AUTO_LOGIN=false |
| Test Data | — |
| Test Steps | 1. Đăng nhập đúng<br>2. Đăng xuất<br>3. Đăng nhập sai mật khẩu<br>4. Đăng nhập tài khoản bị khoá<br>5. Sửa token trong localStorage thành token hết hạn rồi tải lại trang |
| Expected Result | • Vào màn hình đầu tiên của vai trò<br>• Về /login<br>• MSG02<br>• MSG03<br>• Về /login, phiên cũ bị xoá |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-AUTH-002

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-AUTH-002 |
| Test Name | Đổi mật khẩu trên giao diện |
| Module | Xác thực |
| Requirement ID | BR-05 |
| Use Case ID | UC-03 |
| Test Type | System |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Mở Đổi mật khẩu<br>2. Nhập sai mật khẩu hiện tại<br>3. Nhập đúng, mật khẩu mới hợp lệ<br>4. Đăng xuất, đăng nhập lại |
| Expected Result | • MSG06<br>• Thông báo thành công<br>• Đăng nhập bằng mật khẩu mới |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Tài khoản

### UT-VAL-007

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-007 |
| Test Name | CreateStaffCommandValidator: chính sách mật khẩu |
| Module | Tài khoản |
| Requirement ID | BR-05 |
| Use Case ID | UC-07 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên, Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | 7 ký tự đủ loại; 8 ký tự thiếu ký tự đặc biệt; 8 ký tự đủ loại (Aa1@aaaa) |
| Test Steps | 1. Validate từng mật khẩu |
| Expected Result | • Hai mật khẩu đầu lỗi<br>• Mật khẩu thứ ba đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Cần đọc validator để xác nhận chính sách BR-05 đã được kiểm ở backend. |

### API-ACC-005

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ACC-005 |
| Test Name | Xem và tìm tài khoản theo tên, mã nhân viên, email, vai trò, trạng thái |
| Module | Tài khoản |
| Requirement ID | — |
| Use Case ID | UC-04, UC-05, UC-06 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | GET /api/staff |
| Preconditions | — |
| Test Data | 12 tài khoản, 5 vai trò, 2 bị khoá |
| Test Steps | 1. Lấy danh sách<br>2. Tìm theo một phần tên<br>3. Lọc theo vai trò, trạng thái |
| Expected Result | • Đủ 12 tài khoản kèm vai trò, kho<br>• Kết quả tìm / lọc đúng |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Audit 13/11 ghi chưa lọc theo vai trò; cần xác nhận. |

### API-ACC-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ACC-001 |
| Test Name | Tạo nhân viên trùng username, email, mã nhân viên |
| Module | Tài khoản |
| Requirement ID | BR-06 |
| Use Case ID | UC-07 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/staff |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo với từng trường trùng |
| Expected Result | • MSG09 cho từng trường hợp |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-ACC-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ACC-002 |
| Test Name | Không tạo được tài khoản vai trò Admin; thiếu trường bắt buộc |
| Module | Tài khoản |
| Requirement ID | BR-03 |
| Use Case ID | UC-07 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/staff |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo với vai trò Admin<br>2. Thiếu email / email sai định dạng |
| Expected Result | • MSG01 (E4.2) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-ACC-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ACC-003 |
| Test Name | Sửa nhân viên không gửi danh sách kho thì giữ nguyên quyền kho |
| Module | Tài khoản |
| Requirement ID | BR-04 |
| Use Case ID | UC-08 |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Đoán lỗi |
| API liên quan | PUT /api/staff/{id} |
| Preconditions | sales01 có K001, K002 |
| Test Data | — |
| Test Steps | 1. Sửa số điện thoại, request không có AssignedWarehouses<br>2. Đọc quyền kho |
| Expected Result | • Vẫn K001, K002 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-01: UpdateStaffCommand.cs:163 xoá hết quyền kho. |

### API-ACC-004

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ACC-004 |
| Test Name | Khoá / mở khoá và đặt lại mật khẩu nhân viên |
| Module | Tài khoản |
| Requirement ID | BR-01, BR-05 |
| Use Case ID | UC-09 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | PUT /api/staff/{id}/toggle-status; POST /api/staff/{id}/reset-password |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Khoá<br>2. Đăng nhập<br>3. Mở khoá, đặt lại mật khẩu<br>4. Đăng nhập bằng mật khẩu mới |
| Expected Result | • Khi khoá: MSG03<br>• Sau mở khoá: đăng nhập được |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-N01

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N01 |
| Test Name | Tái hiện N-01: sửa nhân viên giữ nguyên quyền kho |
| Module | Tài khoản |
| Requirement ID | BR-04 |
| Use Case ID | UC-08 |
| Test Type | Regression |
| Priority | High |
| Kỹ thuật | Theo rủi ro |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy API-ACC-003 trước và sau khi sửa |
| Expected Result | • Sau sửa: đạt; chạy lại API-ACC-*, IT-SEC-001 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Vai trò & quyền

### API-ROLE-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ROLE-003 |
| Test Name | Xem vai trò, quyền của vai trò và gán vai trò cho tài khoản |
| Module | Vai trò & quyền |
| Requirement ID | BR-03 |
| Use Case ID | UC-11, UC-13, UC-14 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Chuyển trạng thái |
| API liên quan | GET /api/roles; GET /api/roles/{roleCode}/permissions; GET /api/roles/feature-matrix; PUT /api/staff/{id} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Lấy danh sách vai trò và số tài khoản<br>2. Xem quyền vai trò WarehouseStaff<br>3. Đổi vai trò của whstaff01 sang SalesStaff<br>4. whstaff01 gọi API mua hàng và bán hàng |
| Expected Result | • Mỗi tài khoản đúng một vai trò<br>• Sau khi đổi: mất quyền mua hàng, có quyền bán hàng ở request kế tiếp |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-ROLE-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ROLE-001 |
| Test Name | Tạo vai trò trùng tên / mã; sửa hoặc xoá vai trò mặc định, vai trò đang được dùng |
| Module | Vai trò & quyền |
| Requirement ID | BR-03 |
| Use Case ID | UC-12 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/roles; PUT /api/roles/{roleIdOrCode}; DELETE /api/roles/{roleIdOrCode} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo trùng<br>2. Xoá vai trò Manager<br>3. Xoá vai trò tuỳ chỉnh đang gán cho nhân viên |
| Expected Result | • MSG09<br>• MSG14<br>• MSG14 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-ROLE-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-ROLE-002 |
| Test Name | Chỉ Admin cấu hình vai trò, quyền, quyền kho, kho |
| Module | Vai trò & quyền |
| Requirement ID | BR-03 |
| Use Case ID | — |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | PUT /api/roles/{roleCode}/permissions; PUT /api/warehousepermissions/{userId}; POST /api/warehouses; PUT /api/warehouses/{id} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. manager01 gọi từng endpoint |
| Expected Result | • 403 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Quyền kho

### API-WHA-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-WHA-002 |
| Test Name | Xem quyền kho theo kho và theo nhân viên |
| Module | Quyền kho |
| Requirement ID | — |
| Use Case ID | UC-16 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | GET /api/warehousepermissions; GET /api/warehousepermissions/facilities |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Admin lọc theo K001<br>2. Tìm nhân viên |
| Expected Result | • Danh sách nhân viên có quyền K001 đúng dữ liệu jnc_user_warehouse_access |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-WHA-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-WHA-001 |
| Test Name | Gán quyền kho cho nhân viên; mã kho trùng |
| Module | Quyền kho |
| Requirement ID | BR-03, BR-06 |
| Use Case ID | UC-15, UC-17 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Kiểm thử âm |
| API liên quan | PUT /api/warehousepermissions/{userId}; POST /api/warehouses |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gán K001, K003 cho whstaff01<br>2. Tạo kho trùng mã K001 |
| Expected Result | • GET /api/warehouses/my-warehouses của whstaff01 trả đúng K001, K003<br>• MSG09 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Bảo mật & phân quyền

### IT-SEC-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SEC-001 |
| Test Name | Cô lập kho trong handler cho mọi nghiệp vụ kho |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-04, NFR-SEC-01, FLOW-07 |
| Use Case ID | — |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Bảng quyết định |
| API liên quan | POST /api/purchases; POST /api/orders/pos; POST /api/transfers; POST /api/stocktakes; POST /api/disposals; POST /api/sales-returns; POST /api/production/material-issues; POST /api/production/finished-goods-receipts; POST /api/production/mrp/runs |
| Preconditions | U1 chỉ có quyền K001 (đủ quyền chức năng) |
| Test Data | — |
| Test Steps | 1. Gửi từng nghiệp vụ với kho K002 |
| Expected Result | • Mỗi lệnh bị từ chối MSG04; không bản ghi nào được tạo |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SEC-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SEC-002 |
| Test Name | Đổi ma trận quyền có hiệu lực ngay ở request kế tiếp |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, NFR-SEC-02 |
| Use Case ID | UC-13 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | PUT /api/roles/{roleCode}/permissions |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Bỏ SALES_CREATE của vai trò SalesStaff<br>2. sales01 gọi tạo hoá đơn bằng token cũ |
| Expected Result | • 403, không cần đăng nhập lại |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SEC-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SEC-003 |
| Test Name | Khoá tài khoản thì mất quyền ở request kế tiếp |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-05, NFR-SEC-04 |
| Use Case ID | UC-09 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | PUT /api/staff/{id}/toggle-status |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Admin khoá sales01<br>2. sales01 gọi API bằng token còn hạn |
| Expected Result | • 401 / 403; frontend về trang đăng nhập |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SEC-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SEC-004 |
| Test Name | Mật khẩu lưu dạng băm có salt |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-05, NFR-SEC-03 |
| Use Case ID | — |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đoán lỗi |
| API liên quan | POST /api/staff |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo nhân viên<br>2. Đọc sec_users.password_hash |
| Expected Result | • Chuỗi BCrypt ($2a$/$2b$), khác nhau cho hai tài khoản cùng mật khẩu |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-001 |
| Test Name | Mọi endpoint (trừ login, health) trả 401 khi không có token |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, NFR-SEC-01 |
| Use Case ID | — |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Bảo mật, Bảng quyết định |
| API liên quan | Toàn bộ endpoint (01b) |
| Preconditions | — |
| Test Data | 198 endpoint đọc từ 01b_API_INVENTORY.md |
| Test Steps | 1. Gọi từng endpoint không kèm Authorization |
| Expected Result | • 401 kèm { message }; không lộ dữ liệu |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-002 |
| Test Name | Token sai chữ ký, hết hạn, sai issuer bị từ chối |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-05, NFR-SEC-04 |
| Use Case ID | — |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Bảo mật, Kiểm thử âm |
| API liên quan | GET /api/auth/me; GET /api/orders |
| Preconditions | — |
| Test Data | Token sửa 1 ký tự; token hết hạn; token ký bằng khoá khác |
| Test Steps | 1. Gọi API với từng token |
| Expected Result | • 401 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-003 |
| Test Name | Ma trận quyền: vai trò thiếu quyền của endpoint nhận 403 |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, BR-03, NFR-SEC-01 |
| Use Case ID | — |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Bảo mật, Bảng quyết định |
| API liên quan | Toàn bộ endpoint (01b) |
| Preconditions | — |
| Test Data | Mỗi endpoint có [RequirePermission] / [RequireAdmin] × 5 tài khoản seed (admin, manager01, sales01, whstaff01, prodstaff01) theo quyền mặc định |
| Test Steps | 1. Sinh bảng mong đợi từ PermissionConstants.GetDefaultPermissionCodes<br>2. Gọi từng cặp (endpoint, vai trò) |
| Expected Result | • Vai trò có quyền: không 401 / 403<br>• Vai trò không có quyền: 403 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-004

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-004 |
| Test Name | Tắt chức năng menu (feature) của vai trò thì API tương ứng trả 403 |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, NFR-SEC-02 |
| Use Case ID | UC-13 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | PUT /api/roles/feature-matrix; POST /api/orders/pos; POST /api/production/mrp/runs |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Bỏ feat-pos của SalesStaff<br>2. sales01 tạo hoá đơn POS<br>3. Bỏ feat-production-mrp của Manager, manager01 chạy MRP |
| Expected Result | • Cả hai 403 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-005

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-005 |
| Test Name | Endpoint chỉ cần đăng nhập không lộ cấu hình và kho cho vai trò không liên quan |
| Module | Bảo mật & phân quyền |
| Requirement ID | NFR-SEC-01, NFR-SEC-05 |
| Use Case ID | UC-97 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | GET /api/order-settings; GET /api/warehouses; GET /api/warehouses/{id}; GET /api/suppliers/warehouses; GET /api/warehousepermissions/facilities |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. prodstaff01 gọi từng endpoint |
| Expected Result | • Chỉ nhận dữ liệu thuộc kho được gán; cấu hình chỉ Admin / Manager xem (UC-97) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-09: 10 endpoint không khai [RequirePermission]. |

### API-SEC-006

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-006 |
| Test Name | IDOR: xem chứng từ của kho không được gán |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-04, NFR-SEC-01, FLOW-07 |
| Use Case ID | — |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Bảo mật |
| API liên quan | GET /api/purchases/{id}; GET /api/transfers/{id}; GET /api/stocktakes/{id:int}; GET /api/disposals/{id:int}; GET /api/orders/{id}; GET /api/sales-returns/{id:int}; GET /api/production/orders/{id:int}; GET /api/production/mrp/runs/{id:int} |
| Preconditions | U1 chỉ có K001; chứng từ X thuộc K002 |
| Test Data | — |
| Test Steps | 1. U1 gọi chi tiết X theo id |
| Expected Result | • 403 hoặc 404; không trả dữ liệu X |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-007

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-007 |
| Test Name | Production Accountant không thấy giá mua, giá vốn, MAC, giá bán |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-39, NFR-SEC-05 |
| Use Case ID | — |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | GET /api/products; GET /api/products/{id}; GET /api/production/orders/{id:int}; GET /api/production/lookups/products |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. prodstaff01 gọi từng endpoint<br>2. Tìm các trường giá trong JSON |
| Expected Result | • Không có hoặc rỗng các trường giá, giá vốn, MAC |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-008

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-008 |
| Test Name | Chuỗi SQL injection / XSS trong tìm kiếm và tên |
| Module | Bảo mật & phân quyền |
| Requirement ID | NFR-SEC-01 |
| Use Case ID | — |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật, Đoán lỗi |
| API liên quan | GET /api/products; GET /api/customers; POST /api/customers |
| Preconditions | — |
| Test Data | ' OR 1=1 --; <script>alert(1)</script>; 5.000 ký tự |
| Test Steps | 1. Tìm kiếm với từng chuỗi<br>2. Tạo khách hàng tên chứa <script> |
| Expected Result | • Không 500; tìm kiếm trả kết quả đúng nghĩa chữ<br>• Tên lưu nguyên văn, giao diện hiển thị dạng chữ |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-RBAC-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-RBAC-001 |
| Test Name | Admin: menu và màn hình theo bảng 3.1.6 |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, BR-03, FLOW-07 |
| Use Case ID | UC-04, UC-05, UC-06, UC-10, UC-11, UC-14, UC-15, UC-16 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Bảo mật |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng nhập admin<br>2. Đối chiếu menu với cột Administrator của bảng 3.1.6<br>3. Tạo nhân viên, vai trò, gán quyền kho |
| Expected Result | • Menu khớp bảng; mọi thao tác quản trị thành công |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-RBAC-002

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-RBAC-002 |
| Test Name | Manager: menu theo bảng 3.1.6, không có màn quản trị |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, BR-03, FLOW-07 |
| Use Case ID | — |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Bảo mật |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng nhập manager01<br>2. Đối chiếu menu<br>3. Gõ thẳng URL /staff, /roles |
| Expected Result | • Menu khớp bảng; URL quản trị bị chặn |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-RBAC-003

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-RBAC-003 |
| Test Name | Sales Accountant: chỉ bán hàng, đặt hàng, khách hàng, trả hàng |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, FLOW-07 |
| Use Case ID | — |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Bảo mật |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng nhập sales01<br>2. Đối chiếu menu<br>3. Gõ thẳng URL /purchases, /production, /stocktakes |
| Expected Result | • Menu khớp cột Sales; URL khác bị chặn |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-RBAC-004

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-RBAC-004 |
| Test Name | Warehouse Accountant: mua hàng, nhập hàng, chuyển kho, kiểm kê, huỷ hàng, phiếu chi NCC |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, FLOW-07 |
| Use Case ID | — |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Bảo mật |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng nhập whstaff01<br>2. Đối chiếu menu<br>3. Thực hiện: sửa đơn đặt, ghi phiếu chi NCC |
| Expected Result | • Menu khớp cột Warehouse Accountant<br>• Thao tác thành công (xem API-PO-002, API-SUP-001) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-RBAC-005

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-RBAC-005 |
| Test Name | Production Accountant: lệnh, xuất NVL, nhập TP, kế hoạch, MRP; không thấy giá |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02, BR-39, FLOW-07 |
| Use Case ID | — |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Bảo mật |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng nhập prodstaff01<br>2. Đối chiếu menu<br>3. Mở chi tiết lệnh, danh mục hàng |
| Expected Result | • Menu khớp cột Production Accountant<br>• Không có cột giá / giá vốn trên mọi màn |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-RBAC-006

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-RBAC-006 |
| Test Name | Cô lập kho trên giao diện: người dùng chỉ có K001 |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-04, NFR-SEC-01, FLOW-07 |
| Use Case ID | — |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Bảo mật |
| API liên quan | — |
| Preconditions | whstaff01 chỉ có K001; dữ liệu ở cả K001 và K002 |
| Test Data | — |
| Test Steps | 1. Mở bộ chọn kho làm việc<br>2. Mở danh sách phiếu nhập, chuyển kho, kiểm kê, huỷ hàng, tồn kho |
| Expected Result | • Bộ chọn chỉ có K001<br>• Không thấy chứng từ, tồn của K002 (trừ phiếu chuyển đến K001) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-NFR-006

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-006 |
| Test Name | Chạy trên Chrome, Edge, Firefox bản ổn định |
| Module | Bảo mật & phân quyền |
| Requirement ID | NFR-COMP-01 |
| Use Case ID | — |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy lại ST-SAL-001 và ST-PUR-001 trên từng trình duyệt |
| Expected Result | • Không lỗi hiển thị / chức năng |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-NFR-007

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-007 |
| Test Name | Sao lưu và khôi phục database |
| Module | Bảo mật & phân quyền |
| Requirement ID | NFR-REL-04 |
| Use Case ID | — |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Sao lưu database thử<br>2. Khôi phục vào database mới<br>3. Đối chiếu số dòng các bảng chính |
| Expected Result | • Khôi phục đầy đủ |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Cần quy trình sao lưu của bản triển khai (deploy/compose.yml chưa có). |

### ST-NFR-008

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-008 |
| Test Name | Nhật ký kiểm toán cho thao tác nhạy cảm |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-49, NFR-SEC-06 |
| Use Case ID | — |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đổi quyền, quyền kho, hạn mức, điều chỉnh tồn; xem nhật ký |
| Expected Result | • Có người, thời gian, thao tác, giá trị trước / sau |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | Chưa có bảng / chức năng audit (nghi vấn N-11). |

### RT-N07

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N07 |
| Test Name | Tái hiện N-07: quyền mặc định theo vai trò của Report 3 |
| Module | Bảo mật & phân quyền |
| Requirement ID | BR-02 |
| Use Case ID | UC-22, UC-30, UC-85, UC-96 |
| Test Type | Regression |
| Priority | High |
| Kỹ thuật | Theo rủi ro, Bảo mật |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy API-BKG-005, API-PO-002, API-SUP-001, API-PLN-003 |
| Expected Result | • Sau khi nhóm chốt ma trận quyền: đạt; chạy lại API-SEC-003 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-SUITE-01

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-SUITE-01 |
| Test Name | Bộ hồi quy theo module (chạy khi sửa module tương ứng) |
| Module | Bảo mật & phân quyền |
| Requirement ID | NFR-REL-01 |
| Use Case ID | — |
| Test Type | Regression |
| Priority | High |
| Kỹ thuật | Theo rủi ro |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chọn bộ theo bảng "Bộ hồi quy" trong 03_TEST_STRATEGY.md |
| Expected Result | • Mọi ca trong bộ đạt hoặc có lý do |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |
