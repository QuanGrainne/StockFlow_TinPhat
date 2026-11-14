# SPEC — Quản lý đơn mua hàng

- **Module:** `purchase-orders`  •  **Use Case:** UC-30
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Warehouse Accountant tạo, xem, sửa, gửi và hủy đơn mua hàng (PO). PO là căn cứ để nhận hàng từ nhà cung cấp. Trong code, chức năng mang tên "Đặt hàng nhập".

## 2. Scope

**Trong phạm vi**
- Xem và lọc PO
- Tạo PO (lưu nháp hoặc gửi nhà cung cấp)
- Sửa PO nháp
- Hủy PO chưa có phiếu nhập

**Ngoài phạm vi**
- Nhận hàng theo PO (specs/goods-receipt)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Warehouse Accountant | PURCHASE_READ, PURCHASE_CREATE, PURCHASE_UPDATE | Phải có quyền kho nhận |

## 4. Preconditions and Postconditions

**Preconditions**
- Đã đăng nhập, có quyền PO
- Nhà cung cấp và hàng hóa có trong danh mục

**Postconditions**
- Thành công: PO được lưu, gửi, sửa hoặc hủy
- Thất bại: PO không đổi

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-06 | Mã PO duy nhất. |
| BR-22 | PO phải có nhà cung cấp và ít nhất một dòng số lượng > 0, đơn giá ≥ 0. Chỉ sửa PO Draft; chỉ hủy PO chưa có phiếu nhập. |
| BR-45 | Số tiền chưa gồm VAT. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-PUR-01 | Lọc theo trạng thái (Draft, Sent to Supplier, Partially Received, Completed, Canceled), nhà cung cấp, ngày; xem dòng hàng và số đã nhận | Có | Trạng thái code: DRAFT, ORDERED, PARTIAL, COMPLETED, CANCELLED |
| FR-PUR-02 | Tạo PO: nhà cung cấp, kho nhận, ngày giao dự kiến, kỳ hạn thanh toán, dòng hàng | Một phần | Không có ngày giao dự kiến và kỳ hạn thanh toán; có giảm giá dòng và giảm giá phiếu |
| FR-PUR-03 | Tính thành tiền dòng và tổng | Có | PurchaseOrderHelper.ComputeTotal |
| FR-PUR-04 | Lưu nháp hoặc Gửi nhà cung cấp | Có | Status DRAFT hoặc ORDERED |
| FR-PUR-05 | Chỉ sửa PO Draft | Khác tài liệu | Sửa được cả ORDERED chưa có phiếu nhập |
| FR-PUR-06 | Hủy PO chưa có phiếu nhập, có xác nhận và lý do | Một phần | Không ghi lý do |
| FR-PUR-07 | (Existing) Gộp PO cùng nhà cung cấp, cùng kho; kết thúc PO đang nhập một phần | Ngoài tài liệu | — |

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
| Nhà cung cấp | Bắt buộc, đúng loại | BE: SUPPLIER hoặc BOTH |
| Dòng hàng | ≥ 1 dòng; số lượng > 0; đơn giá ≥ 0 | BE: có; mỗi hàng một dòng |
| Kho nhận | Có quyền | BE: có; không kiểm tra kho đang hoạt động |
| Mã PO | Duy nhất | BE: có + unique index |

## 9. Main Flow

1. Mở Đơn mua hàng
2. Hệ thống hiển thị danh sách kèm trạng thái và tiến độ nhận
3. Chọn thao tác
4. Hệ thống kiểm tra và lưu
5. Hiển thị kết quả

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A30.2 Tạo | Chọn nhà cung cấp, kho, ngày giao, kỳ hạn; thêm dòng; Lưu nháp hoặc Gửi |
| A30.3 Sửa | Mở PO Draft, sửa, lưu |
| A30.4 Hủy | Chọn PO chưa có phiếu nhập, xác nhận và nhập lý do |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E30.1 | Thiếu nhà cung cấp, không có dòng, số lượng ≤ 0, giá < 0 | MSG01; không lưu |
| E30.2 | PO không phải Draft (sửa) hoặc đã có phiếu nhập (hủy) | MSG17; không đổi |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/purchase-orders | PURCHASE_READ | Danh sách | Có |
| GET | /api/purchase-orders/{id}, /by-code/{code} | PURCHASE_READ | Chi tiết | Có |
| POST | /api/purchase-orders | PURCHASE_CREATE | Tạo | Có |
| PUT | /api/purchase-orders/{id} | PURCHASE_UPDATE | Sửa | Khác tài liệu |
| POST | /api/purchase-orders/{id}/cancel | PURCHASE_UPDATE | Hủy | Một phần |
| POST | /api/purchase-orders/{id}/finish | PURCHASE_UPDATE | Kết thúc | Ngoài tài liệu |
| POST | /api/purchase-orders/merge | PURCHASE_UPDATE | Gộp | Ngoài tài liệu |
| PATCH | /api/purchase-orders/{id}/notes | PURCHASE_UPDATE | Sửa ghi chú | Ngoài tài liệu |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_purchase_orders | Đầu PO | Thiếu ngày giao dự kiến, kỳ hạn thanh toán |
| dtl_purchase_order_items | Dòng PO | Có |
| trx_goods_receipts.purchase_order_id | Liên kết phiếu nhập | Có |

## 14. Acceptance Criteria

- **AC-PUR-01.** PO thiếu nhà cung cấp hoặc không có dòng hàng không lưu được.
- **AC-PUR-02.** PO đã gửi không sửa được nội dung.
- **AC-PUR-03.** PO đã có phiếu nhập không hủy được.
- **AC-PUR-04.** Tiến độ nhận trên PO khớp tổng các phiếu nhập hoàn thành.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-PUR-01 | Tạo PO nháp, gửi PO | Trạng thái đúng, tổng tiền đúng | Unit, System |
| TS-PUR-02 | Dòng số lượng 0, giá âm, trùng hàng | Bị từ chối | Unit |
| TS-PUR-03 | Sửa PO đã gửi | Bị từ chối theo BR-22 (hiện tại: sửa được) | Integration |
| TS-PUR-04 | Hủy PO đã có phiếu nhập | Bị từ chối | Integration |
| TS-PUR-05 | Nhận đủ theo nhiều đợt | PO chuyển Partially Received rồi Completed | Integration |

## 16. Dependencies and Constraints

- specs/master-data
- specs/goods-receipt
- Sequence stockflow.seq_purchase_order
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Cho sửa PO ở trạng thái ORDERED (trái BR-22).
2. Thiếu ngày giao dự kiến, kỳ hạn thanh toán, lý do hủy.
3. Gộp, kết thúc PO có trong code, SRS không mô tả.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/PurchaseOrders/Commands/PurchaseOrderCommands.cs`
- `StockFlow_Backend/StockFlow.Application/Features/PurchaseOrders/Helpers/PurchaseOrderHelper.cs`
- `StockFlow_Backend/StockFlow.Application/Features/PurchaseOrders/Queries/PurchaseOrderQueries.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/PurchaseOrdersController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/purchase-orders/screens/PurchaseOrdersScreen.tsx`
