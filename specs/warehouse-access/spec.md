# SPEC — Phân quyền kho và cô lập dữ liệu theo kho

- **Module:** `warehouse-access`  •  **Use Case:** UC-15 – UC-17
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Admin xem và gán kho cho từng tài khoản. Người dùng chỉ xem và xử lý dữ liệu của các kho được gán (cô lập dữ liệu).

## 2. Scope

**Trong phạm vi**
- Xem ma trận tài khoản – kho (UC-16)
- Gán kho cho tài khoản (UC-17)
- Quy tắc cô lập dữ liệu áp dụng cho mọi module nghiệp vụ (BR-04)

**Ngoài phạm vi**
- Tạo, sửa kho (specs/master-data)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Admin | Xem: AUTH_READ. Ghi: [RequireAdmin] |  |
| Mọi vai trò khác | Bị giới hạn theo kho được gán | SRS: áp dụng cả Manager. Code: Admin thấy mọi kho |

## 4. Preconditions and Postconditions

**Preconditions**
- Admin đã đăng nhập; có ít nhất một kho đang hoạt động

**Postconditions**
- Thành công: phân quyền kho có hiệu lực từ request kế tiếp
- Thất bại: phân quyền cũ giữ nguyên

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-03 | Chỉ Admin gán kho; mỗi tài khoản có ít nhất một kho. |
| BR-04 | Người dùng chỉ xem và xử lý dữ liệu kho (tồn, nhập, xuất, chuyển, kiểm kê, trả hàng, hủy hàng) của kho được gán. Áp dụng mọi vai trò, kể cả Manager. |
| BR-49 | Thay đổi phân quyền kho được ghi audit. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-WHA-01 | Hiển thị ma trận tài khoản – kho, lọc theo kho, tìm tài khoản | Một phần | Có API và màn hình; chưa đọc chi tiết handler truy vấn |
| FR-WHA-02 | Gán / bỏ gán kho, có Chọn tất cả | Có | UpdateWarehouseAccessCommand; có hiệu lực ngay |
| FR-WHA-03 | Từ chối lưu khi không chọn kho nào (E15.1) | Chưa có | Cho phép bỏ hết kho |
| FR-WHA-04 | Mọi truy vấn và lệnh nghiệp vụ lọc theo kho được gán | Một phần | Lệnh ghi kiểm tra đủ. Chi tiết, hủy, sửa ghi chú hóa đơn đã vá (commit trên dev). Còn hở: danh sách hóa đơn, danh sách phiếu nhập cho người chưa có kho |
| FR-WHA-05 | Ghi audit | Chưa có | — |

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
| Danh sách kho | Ít nhất 1 | Không kiểm tra |
| Kho được gán | Phải đang hoạt động | Chỉ kiểm tra kho tồn tại |

## 9. Main Flow

1. Admin mở Phân quyền kho
2. Hệ thống hiển thị ma trận tài khoản – kho
3. Admin chọn tài khoản và bấm Gán kho
4. Hệ thống kiểm tra và lưu
5. Hệ thống ghi audit, báo thành công

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A15.1 Xem | Lọc theo kho hoặc tìm tài khoản |
| A15.2 Gán | Tick / bỏ tick kho, Chọn tất cả, Lưu |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E15.1 | Không chọn kho nào | Báo cần ít nhất một kho; không lưu |
| — | Người dùng thao tác dữ liệu kho không được gán | MSG04; không thay đổi dữ liệu |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/warehousepermissions | AUTH_READ | Ma trận tài khoản – kho | Có |
| PUT | /api/warehousepermissions/{userId} | RequireAdmin | Gán kho | Có |
| GET | /api/warehouses/my-warehouses | Đã đăng nhập | Kho của người dùng hiện tại | Có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| jnc_user_warehouse_access | Tài khoản – kho | Có |
| mst_warehouses | Kho | Có |
| trx_orders.warehouse_id và các bảng chứng từ | Căn cứ lọc theo kho | Có |

## 14. Acceptance Criteria

- **AC-WHA-01.** Bỏ gán một kho thì người dùng không còn thấy chứng từ của kho đó ở request kế tiếp.
- **AC-WHA-02.** Người dùng kho A không xem, sửa, hủy được chứng từ kho B, kể cả gọi API trực tiếp.
- **AC-WHA-03.** Không lưu được khi không chọn kho nào.
- **AC-WHA-04.** Người chưa được gán kho nào không thấy chứng từ nào.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-WHA-01 | NV kho A xem, sửa ghi chú, hủy hóa đơn kho B | Bị chặn (đã chạy thử trên bản vá: đạt) | Integration |
| TS-WHA-02 | NV chưa có kho xem chi tiết hóa đơn, danh sách phiếu nhập | Bị chặn (danh sách phiếu nhập hiện còn lọt) | Integration |
| TS-WHA-03 | Token Admin cũ sau khi bị hạ quyền xem danh sách hóa đơn | Chỉ thấy kho được gán (hiện còn lọt) | Integration |
| TS-WHA-04 | Gán rỗng danh sách kho | Bị từ chối (hiện tại: lưu được) | System |
| TS-WHA-05 | Chuyển kho: xuất cần quyền kho xuất, nhận cần quyền kho nhận | Đúng quyền mới thao tác được | Integration |

## 16. Dependencies and Constraints

- ICurrentUserService.HasWarehouseAccessAsync / GetAuthorizedWarehouseIdsAsync
- Mọi module nghiệp vụ có chứng từ theo kho
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Cho phép bỏ hết kho của tài khoản (trái BR-03, E15.1).
2. BR-04 áp dụng mọi vai trò, nhưng code và SDD cho Admin thấy mọi kho. Cần chốt Admin có phải ngoại lệ.
3. Danh sách hóa đơn (GetPosOrdersQuery) và một số truy vấn hàng hóa dùng cờ Admin lấy từ token cũ.
4. Danh sách phiếu nhập hiển thị tất cả khi người dùng chưa có kho.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/WarehousePermissions/Commands/UpdateWarehouseAccessCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/WarehousePermissions/Queries/*.cs`
- `StockFlow_Backend/StockFlow.Infrastructure/Services/CurrentUserService.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Orders/Helpers/OrderWarehouseAccess.cs`

**Frontend**
- `StockFlow_Frontend/src/features/admin/screens/WarehousePermissionsScreen.tsx`
- `StockFlow_Frontend/src/lib/warehouse/useActiveWarehouse.ts`
