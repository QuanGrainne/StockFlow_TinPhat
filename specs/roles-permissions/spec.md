# SPEC — Quản lý vai trò và phân quyền

- **Module:** `roles-permissions`  •  **Use Case:** UC-10 – UC-14
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`), đã điều chỉnh theo mô hình thực tế của nhóm (chốt Trường hợp A & phân quyền theo chức năng ngày 12/11/2026).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Admin xem vai trò, tạo hoặc sửa vai trò, bật tắt quyền thao tác theo module (`MODULE_ACTION`) và quyền theo chức năng giao diện (`FEAT_*`) của từng vai trò, rồi gán vai trò cho tài khoản. Một tài khoản có thể giữ nhiều vai trò; quyền hiệu lực là hợp quyền của các vai trò. Trong nghiệp vụ bán hàng, chức năng **Bán hàng (`feat-pos`)** và **Đặt hàng (`feat-sales-booking`)** được phân tách độc lập để kiểm soát ai được bán hóa đơn nhanh / thanh toán xuất kho và ai chỉ được lập / gộp đơn đặt hàng.

## 2. Scope

**Trong phạm vi**
- Xem vai trò (UC-11)
- Tạo / sửa vai trò (UC-12)
- Cấu hình quyền của vai trò (UC-13)
- Gán vai trò cho tài khoản (UC-14)

**Ngoài phạm vi**
- Phân quyền kho (specs/warehouse-access)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Admin | Xem: AUTH_READ. Ghi: [RequireAdmin] |  |

## 4. Preconditions and Postconditions

**Preconditions**
- Admin đã đăng nhập và có quyền quản lý vai trò

**Postconditions**
- Thành công: cấu hình có hiệu lực từ request kế tiếp của người dùng
- Thất bại: cấu hình cũ giữ nguyên

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-02 | RBAC kiểm tra ở server; quyền hiệu lực là hợp quyền của mọi vai trò. |
| BR-03 | Chỉ Admin quản lý vai trò, quyền, gán vai trò; mỗi tài khoản có ít nhất một vai trò. |
| BR-49 | Thay đổi vai trò và quyền được ghi audit. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-ROLE-01 | Hiển thị danh sách vai trò kèm số người dùng; xem chức năng của vai trò theo module | Một phần | Có API; chưa đọc chi tiết handler truy vấn |
| FR-ROLE-02 | Tạo / sửa vai trò với mã, tên, mô tả | Một phần | Chặn trùng tên; mã vai trò lưu trong cột mô tả dạng [CODE:..] và không kiểm tra trùng mã |
| FR-ROLE-03 | Cấu hình quyền theo module: Xem, Tạo, Sửa, Xóa/Hủy, Duyệt | Có | SaveRolePermissionsCommand; có hiệu lực ngay vì quyền đọc từ database |
| FR-ROLE-04 | Không cho gỡ hết quyền của vai trò Admin | Có | Admin luôn được cấp toàn quyền trong UserPermissionService dù ma trận bị sửa |
| FR-ROLE-05 | Gán nhiều vai trò cho một tài khoản, tối thiểu một | Khác tài liệu | Sửa tài khoản thay toàn bộ bằng đúng một vai trò |
| FR-ROLE-06 | Ghi audit | Chưa có | — |
| FR-ROLE-07 | Phân quyền theo chức năng (`FEAT_*`): tách biệt Bán hàng (`feat-pos`), Đặt hàng (`feat-sales-booking`), Hóa đơn (`feat-invoices`)... | Có | Lưu mã `FEAT_*` trong `sec_permissions`; backend chặn API bằng `[RequireFeature]` (VD: chỉ có `feat-pos` chỉ bán nhanh/xuất hóa đơn, chỉ có `feat-sales-booking` chỉ đặt/gộp đơn) |

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
| Mã vai trò, tên vai trò | Bắt buộc, duy nhất | BE: bắt buộc cả hai; chỉ kiểm tra trùng tên |
| Vai trò của tài khoản | Còn ít nhất một | Luôn đúng một vai trò |

## 9. Main Flow

1. Admin mở Vai trò & Phân quyền
2. Hệ thống hiển thị danh sách vai trò và số người dùng
3. Admin chọn thao tác
4. Hệ thống kiểm tra và lưu
5. Hệ thống ghi audit và hiển thị kết quả

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A10.2 Tạo / sửa vai trò | Nhập mã, tên, mô tả; lưu |
| A10.3 Cấu hình quyền | Mở ma trận quyền, tick / bỏ tick, lưu |
| A10.4 Gán vai trò | Chọn tài khoản, thêm / bớt vai trò, lưu |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E10.1 | Trùng mã hoặc tên vai trò | MSG09; không lưu |
| E10.2 | Thay đổi làm vai trò Admin mất hết quyền hoặc tài khoản không còn vai trò | MSG14; giữ cấu hình cũ |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/roles | AUTH_READ | Danh sách vai trò | Có |
| POST | /api/roles | RequireAdmin | Tạo vai trò | Có |
| PUT | /api/roles/{idOrCode} | RequireAdmin | Sửa vai trò | Có |
| DELETE | /api/roles/{idOrCode} | RequireAdmin | Xóa vai trò chưa gán cho ai (ngoài SRS) | Ngoài tài liệu |
| GET/PUT | /api/roles/{roleCode}/permissions | RequireAdmin | Ma trận quyền theo module | Có |
| GET/PUT | /api/roles/feature-matrix | RequireAdmin | Ma trận chức năng theo menu (`FEAT_*`) | Có |
| GET | /api/roles/my-features | Đã đăng nhập | Chức năng menu của người dùng | Có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| sec_roles | Vai trò | Không có cột mã vai trò |
| sec_permissions | Mã quyền MODULE_ACTION và mã chức năng FEAT_* | Có |
| jnc_role_permissions | Ma trận vai trò – quyền | Có |
| jnc_user_roles | Tài khoản – vai trò | Có |

## 14. Acceptance Criteria

- **AC-ROLE-01.** Bỏ tick một quyền thì người dùng thuộc vai trò đó bị từ chối ở request kế tiếp mà không cần đăng nhập lại.
- **AC-ROLE-02.** Trùng tên vai trò bị từ chối.
- **AC-ROLE-03.** Admin vẫn đủ quyền dù ma trận của vai trò Admin bị sửa.
- **AC-ROLE-04.** Tài khoản có hai vai trò dùng được chức năng của cả hai.
- **AC-ROLE-05.** Tài khoản chỉ có `feat-sales-booking` không gọi được API bán/thanh toán xuất hóa đơn (`feat-pos`) và ngược lại.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-ROLE-01 | Tạo vai trò mới, trùng tên | Tạo được; trùng thì báo lỗi | Unit |
| TS-ROLE-02 | Bỏ quyền SALES_CREATE của vai trò bán hàng khi người dùng đang đăng nhập | API bán hàng trả 403 ở request kế tiếp | Integration |
| TS-ROLE-03 | Gỡ hết quyền của vai trò Admin | Admin vẫn thao tác được | Integration |
| TS-ROLE-04 | Gán hai vai trò cho một tài khoản | Quyền là hợp của hai vai trò (hiện tại: không gán được) | System |
| TS-ROLE-05 | Người không phải Admin gọi API lưu ma trận | HTTP 403 | Integration |

## 16. Dependencies and Constraints

- IUserPermissionService đọc quyền mỗi request
- Ma trận chức năng (RequireFeature) chạy song song với RequirePermission
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. UC-14 chưa đúng: không gán được nhiều vai trò.
2. Mã vai trò lưu trong mô tả, không có ràng buộc duy nhất.
3. Vai trò chưa cấu hình ma trận dùng bộ quyền mặc định trong code (`PermissionConstants` / `FeatureConstants`).
4. Cần kiểm tra thêm UI: nút "Xử lý đơn hàng" trong chi tiết đơn đặt hàng (`SalesBookingExpandedRow.tsx`) hiện vẫn hiển thị với user chỉ có `feat-sales-booking`, dù khi bấm thanh toán qua `POST /api/orders/pos` sẽ bị backend chặn bởi `feat-pos`.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Roles/Commands/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Roles/Queries/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Roles/Common/PermissionConstants.cs`
- `StockFlow_Backend/StockFlow.API/Authorization/*.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/RolesController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/admin/screens/RoleCatalogScreen.tsx`
- `StockFlow_Frontend/src/features/admin/screens/PermissionMatrixScreen.tsx`
