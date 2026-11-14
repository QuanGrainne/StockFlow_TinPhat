# SPEC — Xác thực: đăng nhập, đăng xuất, đổi mật khẩu

- **Module:** `auth`  •  **Use Case:** UC-01, UC-02, UC-03
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Nhân viên đăng nhập bằng tên đăng nhập và mật khẩu. Sau khi đăng nhập, hệ thống chỉ hiển thị các chức năng được cấp theo vai trò và dữ liệu của các kho được gán. Người dùng có thể đăng xuất và tự đổi mật khẩu.

## 2. Scope

**Trong phạm vi**
- Đăng nhập, nạp vai trò, quyền và kho được gán (UC-01)
- Đăng xuất, hết phiên do không hoạt động (UC-02)
- Tự đổi mật khẩu (UC-03)

**Ngoài phạm vi**
- Quên mật khẩu, đăng nhập bên thứ ba, xác thực hai lớp (SRS không mô tả)
- Tạo và khóa tài khoản (xem specs/accounts)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Admin, Manager, Sales Accountant, Warehouse Accountant, Production Accountant | Không cần quyền để đăng nhập; các API còn lại yêu cầu đã đăng nhập | Code và seed dùng tên vai trò Admin, Manager, SalesStaff, WarehouseStaff, ProductionStaff |

## 4. Preconditions and Postconditions

**Preconditions**
- Người dùng có tài khoản do Admin tạo (UC-01)
- Người dùng đã đăng nhập (UC-02, UC-03)

**Postconditions**
- Thành công: phiên được tạo, hiển thị trang chủ theo vai trò
- Thất bại: không đăng nhập, ở lại màn hình đăng nhập
- Đổi mật khẩu thành công: mật khẩu mới được lưu, các phiên khác của tài khoản bị vô hiệu

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-01 | Chỉ tài khoản Active được đăng nhập. Tên đăng nhập, mã nhân viên và email mỗi loại xác định đúng một tài khoản. |
| BR-02 | Mọi chức năng được kiểm soát bằng quyền; quyền hiệu lực là hợp quyền của mọi vai trò; kiểm tra ở server cho mỗi request. |
| BR-04 | Người dùng chỉ xem và xử lý dữ liệu của kho được gán. |
| BR-05 | Mật khẩu tối thiểu 8 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt; lưu dạng băm có salt. Phiên hết hạn sau thời gian không hoạt động cấu hình được; khóa tài khoản hoặc đổi mật khẩu làm mất hiệu lực các phiên khác. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-AUTH-01 | Đăng nhập bằng tên đăng nhập và mật khẩu; kiểm tra thông tin và trạng thái tài khoản | Có | LoginCommand: nhận thêm email và mã nhân viên dạng NV-NV{id} |
| FR-AUTH-02 | Sai thông tin: báo lỗi không tiết lộ trường nào sai (E1.1) | Có | Thông báo chung "Tên đăng nhập hoặc mật khẩu không chính xác" |
| FR-AUTH-03 | Tài khoản bị vô hiệu: báo tài khoản không hoạt động (E1.2) | Có | Chỉ báo sau khi mật khẩu đúng |
| FR-AUTH-04 | Nạp vai trò, quyền và kho được gán; tài khoản nhiều vai trò nhận hợp quyền (A1.1) | Một phần | Hợp quyền có trong UserPermissionService, nhưng mỗi tài khoản chỉ gán được 1 vai trò |
| FR-AUTH-05 | Đăng xuất làm mất hiệu lực phiên | Một phần | Chỉ xóa token ở trình duyệt; token vẫn hợp lệ ở server |
| FR-AUTH-06 | Tự hết phiên sau thời gian không hoạt động (A2.1) | Khác tài liệu | Token JWT cố định 7 ngày, không tính theo thời gian không hoạt động |
| FR-AUTH-07 | Đổi mật khẩu: kiểm tra mật khẩu hiện tại và chính sách mật khẩu | Chưa có | Không có API và màn hình |

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
| username, password | Bắt buộc | BE: LoginCommandValidator. FE: form đăng nhập |
| Mật khẩu mới | Theo BR-05, trùng với ô xác nhận | Chưa có |
| Số lần đăng nhập sai | SRS không quy định | Không giới hạn |

## 9. Main Flow

1. Người dùng mở màn hình đăng nhập, nhập tên đăng nhập và mật khẩu, bấm Đăng nhập
2. Hệ thống kiểm tra thông tin và trạng thái tài khoản
3. Hệ thống nạp vai trò, quyền, kho được gán
4. Hệ thống tạo phiên và hiển thị trang chủ theo vai trò

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A1.1 Nhiều vai trò | Hợp nhất quyền của mọi vai trò; hiển thị menu gồm chức năng của tất cả vai trò |
| A2.1 Hết phiên | Không hoạt động quá thời gian cấu hình thì phiên bị hủy; hiển thị màn hình đăng nhập ở thao tác kế tiếp |
| A3.1 Hủy đổi mật khẩu | Đóng form, không đổi mật khẩu |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E1.1 | Sai tên đăng nhập hoặc mật khẩu | MSG02; ở lại màn hình đăng nhập |
| E1.2 | Tài khoản bị vô hiệu | MSG03; không đăng nhập được |
| E3.1 | Sai mật khẩu hiện tại | MSG06; không đổi mật khẩu |
| E3.2 | Mật khẩu mới sai chính sách hoặc không khớp xác nhận | MSG07; không đổi mật khẩu |
| — | Token thiếu, sai hoặc hết hạn | HTTP 401; FE xóa phiên và về /login (MSG05) |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| POST | /api/auth/login | Không cần đăng nhập | Đăng nhập, trả token, vai trò, kho, quyền | Có |
| GET | /api/auth/me | Đã đăng nhập | Thông tin người dùng hiện tại | Có |
| GET | /api/auth/permissions | Đã đăng nhập | Danh sách mã quyền hiện tại | Có |
| — | Đăng xuất | — | SRS yêu cầu vô hiệu phiên | Chưa có |
| — | Đổi mật khẩu | — | UC-03 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| sec_users | Tài khoản, mật khẩu băm, trạng thái | Không có cột mã nhân viên; email không unique |
| jnc_user_roles, sec_roles | Vai trò của tài khoản | Có |
| jnc_role_permissions, sec_permissions | Quyền của vai trò | Có |
| jnc_user_warehouse_access | Kho được gán | Có |

## 14. Acceptance Criteria

- **AC-AUTH-01.** Đăng nhập đúng thì vào được trang chủ và chỉ thấy menu được cấp.
- **AC-AUTH-02.** Sai mật khẩu thì thấy thông báo chung, không biết trường nào sai.
- **AC-AUTH-03.** Tài khoản bị vô hiệu không đăng nhập được.
- **AC-AUTH-04.** Sau khi đăng xuất, không mở được trang cần đăng nhập.
- **AC-AUTH-05.** Đổi mật khẩu thành công thì mật khẩu cũ không đăng nhập được và các phiên khác bị thoát.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-AUTH-01 | Đăng nhập hợp lệ theo từng vai trò | Vào trang chủ đúng vai trò; menu đúng quyền | System |
| TS-AUTH-02 | Sai mật khẩu, sai tên đăng nhập | Cùng một thông báo; không tạo phiên | Unit, System |
| TS-AUTH-03 | Tài khoản bị khóa đăng nhập | Báo tài khoản không hoạt động | Unit |
| TS-AUTH-04 | Gọi API nghiệp vụ không có token, token sai, token hết hạn | HTTP 401 | Integration |
| TS-AUTH-05 | Khóa tài khoản khi người đó đang đăng nhập | Request kế tiếp bị từ chối | Integration |
| TS-AUTH-06 | Đổi mật khẩu sai mật khẩu cũ, mật khẩu yếu | Bị từ chối (chưa kiểm thử được vì chưa có code) | System |

## 16. Dependencies and Constraints

- JWT Bearer (Microsoft.AspNetCore.Authentication.JwtBearer 9.x), BCrypt
- Quyền đọc từ database mỗi request qua IUserPermissionService
- FE lưu token theo từng tab (lib/auth/tabSession)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. UC-03 Đổi mật khẩu chưa được triển khai.
2. Token sống 7 ngày, không thu hồi được; trái BR-05 (hết phiên theo thời gian không hoạt động, vô hiệu phiên khi khóa hoặc đổi mật khẩu). Việc khóa tài khoản đang được bù bằng kiểm tra quyền từ database.
3. Không có chính sách mật khẩu và không giới hạn số lần đăng nhập sai.
4. Đăng nhập bằng email và mã NV-NV{id} có trong code nhưng SRS không mô tả. Cần chốt giữ hay bỏ.
5. SRS dùng tên vai trò "Accountant", code dùng "Staff".

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Auth/Commands/LoginCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Auth/Queries/GetCurrentUserQuery.cs`
- `StockFlow_Backend/StockFlow.Infrastructure/Services/JwtTokenGenerator.cs`
- `StockFlow_Backend/StockFlow.Infrastructure/Services/UserPermissionService.cs`
- `StockFlow_Backend/StockFlow.API/Program.cs`

**Frontend**
- `StockFlow_Frontend/src/app/(auth)/login`
- `StockFlow_Frontend/src/lib/auth`
- `StockFlow_Frontend/src/lib/api/client.ts`
