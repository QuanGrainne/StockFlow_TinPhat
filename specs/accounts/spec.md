# SPEC — Quản lý tài khoản nhân viên

- **Module:** `accounts`  •  **Use Case:** UC-04 – UC-09
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Admin xem, tìm kiếm, tạo, sửa, kích hoạt và vô hiệu tài khoản nhân viên. Khi tạo tài khoản, Admin gán một hoặc nhiều vai trò và ít nhất một kho.

## 2. Scope

**Trong phạm vi**
- Xem danh sách (UC-05), tìm kiếm (UC-06)
- Tạo tài khoản (UC-07), sửa tài khoản (UC-08)
- Kích hoạt / vô hiệu tài khoản (UC-09)

**Ngoài phạm vi**
- Cấu hình quyền của vai trò (specs/roles-permissions)
- Ma trận phân quyền kho (specs/warehouse-access)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Admin | Xem: AUTH_READ. Ghi: [RequireAdmin] | Các vai trò khác không được ghi |

## 4. Preconditions and Postconditions

**Preconditions**
- Admin đã đăng nhập và có quyền quản lý tài khoản

**Postconditions**
- Thành công: thao tác được thực hiện và ghi audit
- Thất bại: báo lỗi, không áp dụng thay đổi

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-01 | Tên đăng nhập, mã nhân viên, email là duy nhất; chỉ tài khoản Active đăng nhập được. |
| BR-03 | Chỉ Admin quản lý tài khoản; mỗi tài khoản có ít nhất một vai trò và ít nhất một kho. |
| BR-05 | Chính sách mật khẩu; vô hiệu tài khoản làm mất các phiên của tài khoản. |
| BR-49 | Thay đổi tài khoản được ghi audit. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-ACC-01 | Hiển thị mã, họ tên, email, vai trò, kho được gán, trạng thái của từng tài khoản | Một phần | Chỉ hiện vai trò đầu tiên; mã nhân viên sinh từ ID (NV-NV{id}), không lưu; không phân trang ở server |
| FR-ACC-02 | Tìm theo từ khóa, lọc theo vai trò và trạng thái | Một phần | Có từ khóa và trạng thái; không lọc theo vai trò (lọc "phòng ban" sau khi tải) |
| FR-ACC-03 | Tạo tài khoản với mã NV, họ tên, email, điện thoại, tên đăng nhập, mật khẩu ban đầu, vai trò, kho; trạng thái Active | Một phần | Không bắt buộc kho; một vai trò; mật khẩu mặc định cố định khi bỏ trống; không cho tạo thêm tài khoản vai trò Admin |
| FR-ACC-04 | Sửa thông tin, vai trò, kho của tài khoản | Một phần | Thiếu danh sách kho trong request thì xóa hết kho của tài khoản; không có validator |
| FR-ACC-05 | Kích hoạt / vô hiệu sau khi xác nhận; vô hiệu thì mất mọi phiên | Có | Token cũ mất quyền ở request kế tiếp; tài khoản Admin gốc không khóa được; không ghi lý do |
| FR-ACC-06 | Ghi audit cho mọi thay đổi | Chưa có | — |

## 7. Non-functional Requirements

- **NFR-01.** Giao diện web cho máy tính, độ phân giải tối thiểu 1366×768; hỗ trợ Chrome, Edge, Firefox bản ổn định (SRS 4.1, 4.2.5).
- **NFR-02.** 95% yêu cầu thường hoàn thành trong 2 giây; thao tác giao dịch trả kết quả trong 3 giây (SRS 4.2.2).
- **NFR-03.** Mọi API phải kiểm tra quyền chức năng và quyền kho ở server; ẩn nút trên giao diện không được coi là phân quyền (SRS 4.2.4, BR-02).
- **NFR-04.** Giao dịch lỗi không được cập nhật dở dang; chỉ báo thành công khi transaction đã commit (SRS 4.2.3).
- **NFR-05.** Thay đổi nhạy cảm phải có nhật ký audit gồm người thực hiện, thời gian, thao tác, giá trị trước và sau (BR-49). **Existing:** hệ thống chưa có bảng audit.
- **NFR-06.** Thông báo hệ thống: SRS yêu cầu tiếng Anh theo mã MSG01–MSG65. **Existing:** toàn bộ thông báo bằng tiếng Việt. Cần nhóm chốt (xem Open Questions).

## 8. Validation Rules

| Trường | Quy tắc (Expected) | Hiện trạng FE / BE |
|---|---|---|
| Họ tên, tên đăng nhập, điện thoại, vai trò | Bắt buộc | BE: CreateStaffCommandValidator (khi tạo); khi sửa kiểm tra tay họ tên, điện thoại |
| Email | Đúng định dạng, duy nhất | BE: kiểm tra định dạng và trùng (phân biệt hoa thường) |
| Tên đăng nhập | Duy nhất | BE: kiểm tra trùng + unique index |
| Kho | Ít nhất 1 (BR-03) | Không kiểm tra |
| Mật khẩu ban đầu | Theo BR-05 | Không kiểm tra |

## 9. Main Flow

1. Admin mở Tài khoản nhân viên
2. Hệ thống hiển thị danh sách
3. Admin chọn thao tác (tìm, thêm, sửa, kích hoạt / vô hiệu)
4. Hệ thống kiểm tra và xử lý
5. Hệ thống lưu, ghi audit, hiển thị kết quả

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A4.2 Tìm kiếm | Nhập từ khóa hoặc chọn bộ lọc; hiển thị tài khoản khớp |
| A4.3 Thêm tài khoản | Nhập thông tin, chọn vai trò và kho, lưu; tài khoản ở trạng thái Active |
| A4.4 Sửa tài khoản | Chọn tài khoản, sửa, lưu |
| A4.5 Kích hoạt / vô hiệu | Xác nhận, có thể nhập lý do; cập nhật trạng thái |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E4.1 | Thiếu thông tin, email sai, chưa chọn vai trò hoặc kho | MSG01, MSG12; không lưu |
| E4.2 | Trùng tên đăng nhập, mã NV hoặc email | MSG09; không lưu |
| E4.3 | Không có kết quả tìm kiếm | MSG62; danh sách rỗng |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/staff | AUTH_READ | Danh sách, tìm kiếm | Có |
| POST | /api/staff | RequireAdmin | Tạo tài khoản | Có |
| PUT | /api/staff/{id} | RequireAdmin | Sửa tài khoản | Có |
| PUT/PATCH | /api/staff/{id}/toggle-status | RequireAdmin | Kích hoạt / vô hiệu | Có |
| POST | /api/staff/{id}/reset-password | RequireAdmin | Đặt lại mật khẩu (ngoài SRS) | Ngoài tài liệu |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| sec_users | Tài khoản | Thiếu cột mã nhân viên |
| jnc_user_roles | Vai trò của tài khoản | Thiết kế N–N nhưng code ghi 1 dòng |
| jnc_user_warehouse_access | Kho được gán | Có |

## 14. Acceptance Criteria

- **AC-ACC-01.** Tạo tài khoản hợp lệ thì tài khoản đăng nhập được với đúng quyền và kho.
- **AC-ACC-02.** Tạo tài khoản không chọn kho hoặc vai trò bị từ chối.
- **AC-ACC-03.** Trùng tên đăng nhập hoặc email bị từ chối.
- **AC-ACC-04.** Vô hiệu tài khoản thì người đó không đăng nhập được và phiên hiện tại mất quyền.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-ACC-01 | Tạo tài khoản đủ thông tin | Tài khoản Active, đăng nhập được | Integration, System |
| TS-ACC-02 | Tạo tài khoản thiếu kho | Bị từ chối theo BR-03 (hiện tại: vẫn tạo được) | System |
| TS-ACC-03 | Trùng tên đăng nhập, trùng email | Báo trùng, không lưu | Unit |
| TS-ACC-04 | Sửa tài khoản không gửi danh sách kho | Giữ nguyên kho (hiện tại: xóa hết kho) | Integration |
| TS-ACC-05 | Vô hiệu rồi kích hoạt lại | Đăng nhập bị chặn rồi được phép lại | Integration |
| TS-ACC-06 | Nhân viên thường gọi API tạo tài khoản | HTTP 403 | Integration |

## 16. Dependencies and Constraints

- specs/roles-permissions (danh sách vai trò)
- specs/warehouse-access (danh sách kho đang hoạt động)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Không bắt buộc kho khi tạo; sửa tài khoản có thể xóa hết kho (trái BR-03).
2. Mỗi tài khoản chỉ có một vai trò (trái UC-14, BR-02).
3. Không có chính sách mật khẩu; mật khẩu mặc định cố định; API đặt lại mật khẩu trả mật khẩu dạng rõ.
4. Mã nhân viên không được lưu nên không kiểm tra trùng được.
5. Tạo tài khoản lưu hai lần không nằm trong transaction.
6. Khớp vai trò và kho bằng chuỗi gắn cứng trong handler.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Admin/Commands/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Admin/Queries/GetStaffListQuery.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/StaffController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/admin/screens/StaffAccountsScreen.tsx`
- `StockFlow_Frontend/src/features/admin/services/staffService.ts`
