# SPEC — Theo dõi tồn kho và cảnh báo

- **Module:** `inventory-monitoring`  •  **Use Case:** UC-72 – UC-74, UC-77, UC-78
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Manager xem tồn kho trên nhiều kho, theo dõi chuyển kho và xem cảnh báo điểm đặt hàng lại, cảnh báo hạn dùng. Việc duyệt kiểm kê và duyệt hủy hàng nằm ở specs/stocktake và specs/inventory-disposal.

## 2. Scope

**Trong phạm vi**
- Màn tổng hợp tồn kho (UC-72)
- Tồn nhiều kho (UC-73)
- Theo dõi chuyển kho (UC-74)
- Cảnh báo điểm đặt hàng lại (UC-77), hạn dùng (UC-78)

**Ngoài phạm vi**
- Duyệt kiểm kê (UC-75), duyệt hủy hàng (UC-76)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Manager | Quyền theo dõi tồn kho | Code: GOODS_READ, STOCK_READ; bị giới hạn theo kho được gán |

## 4. Preconditions and Postconditions

**Preconditions**
- Manager đã đăng nhập và có quyền

**Postconditions**
- Thông tin được hiển thị

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-04 | Chỉ xem kho được gán (kể cả Manager). |
| BR-40, BR-41 | Quy tắc chuyển kho và chênh lệch. |
| BR-48 | Cảnh báo khi tồn ≤ điểm đặt hàng lại; cảnh báo lô sắp hết hạn trong số ngày cấu hình hoặc đã hết hạn. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-INV-01 | Màn tổng hợp: tồn kho, cảnh báo, việc chờ duyệt | Chưa có | Route /inventory chưa có nội dung |
| FR-INV-02 | Số lượng, MAC, giá trị theo hàng và kho, có bộ lọc | Một phần | Tồn theo kho hiển thị trong Danh mục hàng hóa và thẻ kho từng hàng |
| FR-INV-03 | Chuyển kho theo trạng thái và chênh lệch kèm giải trình | Một phần | Xem qua màn Chuyển hàng; không có báo cáo chênh lệch |
| FR-INV-04 | Danh sách hàng tồn ≤ điểm đặt hàng lại | Chưa có | Chỉ lưu reorder_point; API hàng hóa có tham số lowStockOnly (chưa xác minh) |
| FR-INV-05 | Danh sách lô sắp / đã hết hạn | Chưa có | — |

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
| Số ngày cảnh báo hạn dùng | Cấu hình được | Chưa có |

## 9. Main Flow

1. Manager mở Tồn kho
2. Hệ thống hiển thị tổng hợp, cảnh báo, việc chờ duyệt
3. Chọn chế độ xem
4. Hệ thống hiển thị kết quả

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A72.1 | Tồn nhiều kho |
| A72.2 | Theo dõi chuyển kho |
| A72.5 | Cảnh báo điểm đặt hàng lại |
| A72.6 | Cảnh báo hạn dùng |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| — | Không lấy được dữ liệu | MSG65 |
| — | Có hàng chạm điểm đặt hàng lại / lô sắp hết hạn | MSG63, MSG64 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/products?warehouseId=… | GOODS_READ | Hàng hóa kèm tồn theo kho | Một phần |
| GET | /api/products/{id}/stock-card | GOODS_READ | Thẻ kho của hàng | Một phần |
| GET | /api/transfers | STOCK_READ | Danh sách chuyển kho | Một phần |
| — | Cảnh báo điểm đặt hàng lại, hạn dùng | — | UC-77, UC-78 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_inventory_balances | Tồn theo kho, vị trí, hàng, lô; giá vốn | Có |
| trx_inventory_transactions | Thẻ kho | Có |
| mst_products.reorder_point | Điểm đặt hàng lại | Có |
| mst_inventory_lots | Hạn dùng | Có bảng |

## 14. Acceptance Criteria

- **AC-INV-01.** Tồn hiển thị khớp tổng các giao dịch đã xác nhận.
- **AC-INV-02.** Manager chỉ thấy kho được gán.
- **AC-INV-03.** Hàng có tồn bằng điểm đặt hàng lại xuất hiện trong cảnh báo.
- **AC-INV-04.** Lô hết hạn hoặc sắp hết hạn xuất hiện trong cảnh báo.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-INV-01 | Sau nhập, bán, trả, chuyển, kiểm kê: so tồn với thẻ kho | Khớp | Integration |
| TS-INV-02 | Manager không được gán kho X xem tồn kho X | Không thấy | Integration |
| TS-INV-03 | Tồn chạm điểm đặt hàng lại | Có cảnh báo (chưa kiểm thử được) | System |
| TS-INV-04 | Lô sắp hết hạn | Có cảnh báo (chưa kiểm thử được) | System |

## 16. Dependencies and Constraints

- specs/stock-transfer
- specs/goods-receipt (lô, hạn dùng)
- specs/master-data (điểm đặt hàng lại)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Không có màn tổng hợp cho Manager; UC-77, UC-78 chưa triển khai.
2. Hạn dùng không được thu thập khi nhập nên chưa thể cảnh báo.
3. Giá vốn cấp sản phẩm khác giá vốn theo kho; cần chốt giá trị tồn tính theo giá nào.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Products/Queries/GetProductsQuery.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Products/Queries/GetProductStockCardQuery.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Transfers/Queries/GetTransfersQuery.cs`

**Frontend**
- `StockFlow_Frontend/src/features/products/screens/GoodsCatalogScreen.tsx`
- `StockFlow_Frontend/src/features/transfers/screens/TransfersScreen.tsx`
- `StockFlow_Frontend/src/app/(dashboard)/inventory`
