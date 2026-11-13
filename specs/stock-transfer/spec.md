# SPEC — Chuyển kho

- **Module:** `stock-transfer`  •  **Use Case:** UC-37, UC-38
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Warehouse Accountant lập phiếu chuyển, xác nhận số thực xuất ở kho nguồn và số thực nhận ở kho đích. Phần thiếu được ghi là chênh lệch chuyển kho.

## 2. Scope

**Trong phạm vi**
- Lập phiếu, xuất chuyển, nhận hàng (UC-37)
- Ghi chênh lệch khi nhận thiếu (UC-38)
- Hủy trước khi xuất

**Ngoài phạm vi**
- Manager theo dõi chuyển kho (specs/inventory-monitoring)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Warehouse Accountant kho nguồn | STOCK_CREATE, STOCK_UPDATE | Quyền kho nguồn để tạo, sửa, xuất, hủy |
| Warehouse Accountant kho đích | STOCK_UPDATE | Quyền kho đích để nhận |

## 4. Preconditions and Postconditions

**Preconditions**
- Có quyền chuyển kho; xuất cần quyền kho nguồn, nhận cần quyền kho đích

**Postconditions**
- Tồn kho nguồn giảm theo số xuất; tồn kho đích tăng theo số nhận; phiếu Completed
- Thất bại: bước đó không được xác nhận

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-04 | Chỉ thao tác kho được gán. |
| BR-40 | Kho nguồn khác kho đích. Kho nguồn giảm theo số thực xuất khi xuất; kho đích tăng theo số thực nhận khi nhận. Số nhận ≤ số xuất. |
| BR-41 | Thiếu (xuất − nhận) phải ghi chênh lệch kèm giải trình của kho nguồn và báo Manager. |
| BR-42 | Đang kiểm kê thì không xác nhận chuyển. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-TRF-01 | Tạo phiếu: kho nguồn, kho đích, hàng và số lượng; lưu Pending Dispatch | Có | Trạng thái DRAFT |
| FR-TRF-02 | Nhập số thực xuất và bấm Xuất; trừ tồn nguồn; In Transit | Một phần | Số xuất luôn bằng số trên phiếu; ghi giá vốn lúc xuất |
| FR-TRF-03 | Chặn xuất vượt tồn khả dụng | Khác tài liệu | Cho xuất khi không đủ tồn (tồn nguồn có thể âm) |
| FR-TRF-04 | Kho đích nhập số thực nhận; cộng tồn đích; Completed | Có | Trạng thái RECEIVED; giá vốn mang theo hàng |
| FR-TRF-05 | Chặn số nhận vượt số xuất | Chưa có | Không kiểm tra |
| FR-TRF-06 | Nhận thiếu: nhập giải trình, ghi chênh lệch (số lượng, giá trị) cho Manager | Một phần | Bắt buộc ghi chú; không có bản ghi chênh lệch riêng |
| FR-TRF-07 | Hủy trước khi xuất | Khác tài liệu | Hủy được cả phiếu đang chuyển và đã nhận (hoàn tồn) |
| FR-TRF-08 | Chặn khi hàng đang kiểm kê | Chưa có | — |

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
| Kho | Nguồn ≠ đích; có quyền | BE: có |
| Số xuất | > 0, ≤ tồn khả dụng | Không chặn theo tồn |
| Số nhận | ≥ 0, ≤ số xuất | Chỉ chặn số âm |
| Giải trình | Bắt buộc khi nhận thiếu | BE: có |
| Thời gian nhận | SRS không mô tả | BE: phải sau thời gian xuất |

## 9. Main Flow

1. Bấm Tạo phiếu chuyển
2. Chọn kho nguồn, kho đích, thêm hàng và số lượng
3. Hệ thống lưu Pending Dispatch
4. Sau khi thủ kho nguồn đếm, nhập số thực xuất và bấm Xuất
5. Hệ thống trừ tồn nguồn, chuyển In Transit
6. Kho đích mở phiếu, nhập số thực nhận
7. Bấm Xác nhận nhận
8. Hệ thống cộng tồn đích, chuyển Completed

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A37.1 Chênh lệch | Số nhận < số xuất: nhập giải trình; ghi chênh lệch; hoàn tất |
| A37.2 Hủy | Trước khi xuất; chuyển Canceled |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E37.1 | Kho nguồn trùng kho đích hoặc không có quyền kho | MSG46; không lưu |
| E37.2 | Số xuất > tồn hoặc số nhận > số xuất | MSG46; không xác nhận |
| E37.3 | Hàng đang kiểm kê | MSG50 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/transfers | STOCK_READ | Danh sách (lọc theo kho được gán) | Có |
| GET | /api/transfers/{id} | STOCK_READ | Chi tiết | Có |
| GET | /api/transfers/products-for-transfer | STOCK_READ | Hàng và tồn để chọn | Có |
| POST | /api/transfers | STOCK_CREATE | Tạo phiếu | Có |
| PUT | /api/transfers/{id} | STOCK_UPDATE | Sửa phiếu tạm | Có |
| POST | /api/transfers/{id}/complete | STOCK_UPDATE | Xuất chuyển | Một phần |
| POST | /api/transfers/{id}/receive | STOCK_UPDATE | Nhận hàng | Một phần |
| POST | /api/transfers/{id}/cancel | STOCK_UPDATE | Hủy | Khác tài liệu |
| PUT | /api/transfers/{id}/notes | STOCK_UPDATE | Sửa ghi chú | Ngoài tài liệu |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_stock_transfers | Đầu phiếu: kho nguồn, kho đích, trạng thái, ghi chú nhận | Có |
| dtl_stock_transfer_items | Dòng: số chuyển, số xuất, số nhận, giá vốn, ghi chú | Có |
| trx_inventory_balances, trx_inventory_transactions | Tồn hai kho, thẻ kho (TRANSFER_OUT / TRANSFER_IN) | Có |

## 14. Acceptance Criteria

- **AC-TRF-01.** Xuất làm tồn nguồn giảm; nhận làm tồn đích tăng đúng số nhận.
- **AC-TRF-02.** Không nhận được nhiều hơn số đã xuất.
- **AC-TRF-03.** Nhận thiếu phải có giải trình và Manager thấy chênh lệch.
- **AC-TRF-04.** Người không có quyền kho đích không nhận được.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-TRF-01 | Chuyển đủ hai bước | Tồn hai kho và giá vốn đúng | Integration |
| TS-TRF-02 | Xuất vượt tồn | Bị từ chối (hiện tại: cho phép) | Integration |
| TS-TRF-03 | Nhận nhiều hơn số xuất | Bị từ chối (hiện tại: nhận) | Integration |
| TS-TRF-04 | Nhận thiếu không ghi chú | Bị từ chối | Unit |
| TS-TRF-05 | Hủy sau khi đã xuất | Bị từ chối theo SRS (hiện tại: hủy được, hoàn tồn) | Integration |
| TS-TRF-06 | Nhận hai lần cùng lúc | Chỉ cộng một lần (hiện tại: không có khóa) | Integration |
| TS-TRF-07 | Sai quyền kho ở từng bước | Bị chặn | Integration |

## 16. Dependencies and Constraints

- specs/warehouse-access
- IInventoryLedger qua TransferStockOps
- specs/stocktake
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Không chặn nhận vượt số xuất (trái BR-40): tạo tồn không có nguồn.
2. Cho xuất âm kho và cho hủy sau khi xuất / nhận (trái BR-40, A37.2).
3. Không nhập được số thực xuất khác số trên phiếu.
4. Không có bản ghi chênh lệch và báo cáo cho Manager (BR-41).
5. CLAUDE.md còn ghi theo mã cũ (UC-33, BR-39/40).

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Transfers/Commands/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Transfers/Helpers/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Transfers/Queries/*.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/TransfersController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/transfers/screens/*.tsx`
