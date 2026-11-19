# SPEC — Trả hàng bán

- **Module:** `sales-returns`  •  **Use Case:** UC-28, UC-41, UC-42, UC-79 – UC-82
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Sales Accountant lập yêu cầu trả hàng tham chiếu phiếu xuất gốc. Warehouse Accountant nhận hàng, phân loại từng món (nhập lại, sửa chữa, hủy) và hoàn tất; công nợ khách giảm theo giá bán gốc. Manager theo dõi yêu cầu trả, cách xử lý và hoàn tiền.

## 2. Scope

**Trong phạm vi**
- Lập, sửa, hủy yêu cầu trả hàng (UC-28)
- Nhận và xử lý hàng trả (UC-41), phân loại (UC-42)
- Manager theo dõi (UC-79 – UC-82)

**Ngoài phạm vi**
- Trả hàng cho nhà cung cấp (specs/goods-receipt)
- Phiếu chi hoàn tiền (specs/finance-reports)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Sales Accountant | Tạo yêu cầu trả | Code: SALES_CREATE + feat-sales-returns |
| Warehouse Accountant | Nhận và phân loại; cần quyền kho nhận | Code: không có bước này |
| Manager | Theo dõi | Code: SALES_READ qua màn Trả hàng |

## 4. Preconditions and Postconditions

**Preconditions**
- Phiếu xuất gốc ở trạng thái Completed (UC-28)
- Yêu cầu trả ở trạng thái Waiting for Receipt (UC-41)

**Postconditions**
- UC-28: yêu cầu Waiting for Receipt, kho nhìn thấy
- UC-41: phiếu trả Completed, tồn cập nhật theo phân loại, nợ khách giảm

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-19 | Yêu cầu trả phải tham chiếu phiếu xuất Completed của cùng khách; số trả ≤ số đã xuất − số đã trả. |
| BR-20 | Mỗi món trả phải được phân loại: Restock, Repair (Under Repair, không bán được), Scrap (Waiting for Disposal). |
| BR-21 | Hoàn tất trả hàng: nợ khách giảm theo giá trị số nhận tại giá bán gốc; khách không còn nợ thì thành Refund Due, chi bằng phiếu chi. |
| BR-04 | Chỉ thao tác kho được gán. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-RET-01 | Chọn khách và phiếu xuất gốc; hiển thị hàng và số còn được trả | Có | Chọn hóa đơn gốc; số còn được trả tính đúng theo từng dòng |
| FR-RET-02 | Nhập số trả, tình trạng, lý do (Wrong item, Transport damage, Manufacturing defect, Surplus, Other) | Một phần | Chỉ có ghi chú tự do, không có danh mục lý do |
| FR-RET-03 | Lưu yêu cầu Waiting for Receipt và thông báo kho | Khác tài liệu | Phiếu trả hoàn tất ngay khi tạo |
| FR-RET-04 | Sửa / hủy yêu cầu khi còn Waiting for Receipt | Một phần | Có hủy phiếu trả (đảo tồn, công nợ, phiếu chi); chỉ sửa được ghi chú |
| FR-RET-05 | Kho nhập số thực nhận và phân loại Restock / Repair / Scrap | Chưa có | Luôn nhập lại kho bán được (Condition = GOOD) |
| FR-RET-06 | Giảm nợ khách theo giá bán gốc | Khác tài liệu | Dùng "giá nhập lại" do người dùng nhập, không giới hạn; không trừ giảm giá toàn đơn |
| FR-RET-07 | Khách hết nợ thì đánh dấu Refund Due cho Manager chi | Khác tài liệu | Trả tiền ngay tại quầy bằng phiếu chi; phần chưa trả trừ vào công nợ |
| FR-RET-08 | Manager xem yêu cầu theo trạng thái, theo phân loại, theo hoàn tiền | Một phần | Xem qua màn Trả hàng; không có phân loại và Refund Due |
| FR-RET-09 | (Existing) Trả nhanh không cần hóa đơn | Ngoài tài liệu | Trái BR-19 |

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
| Phiếu xuất gốc | Tồn tại, thuộc khách, Completed | BE: hóa đơn COMPLETED, không phải đơn đặt |
| Số trả | > 0 và ≤ số còn được trả | BE và FE: có (trừ trả nhanh) |
| Lý do, hàng | Bắt buộc | Lý do không bắt buộc |
| Giá trả | Bằng giá bán gốc (BR-21) | Chỉ kiểm tra ≥ 0 |
| Số nhận, phân loại | 0 ≤ số nhận ≤ số yêu cầu; phải phân loại | Chưa có |

## 9. Main Flow

1. Sales mở Yêu cầu trả hàng, bấm Tạo
2. Chọn khách và phiếu xuất gốc
3. Hệ thống hiển thị hàng và số còn được trả
4. Chọn hàng, nhập số trả và tình trạng
5. Chọn lý do, bấm Gửi
6. Hệ thống kiểm tra và lưu Waiting for Receipt
7. Kho mở yêu cầu, nhập số thực nhận, phân loại từng món, xác nhận
8. Hệ thống cập nhật tồn theo phân loại, giảm nợ khách, chuyển Completed, thông báo Sales

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A28.1 Sửa yêu cầu | Khi còn Waiting for Receipt |
| A28.2 Hủy yêu cầu | Chuyển Canceled |
| A41.1 Phân loại | Restock: vào tồn khả dụng. Repair: Under Repair. Scrap: Waiting for Disposal |
| A41.2 Hoàn tất sửa chữa | Chọn kết quả Restock hoặc Scrap |
| A41.3 Hoàn tiền | Khách hết nợ thì đánh dấu Refund Due |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E28.1 | Phiếu xuất không tồn tại hoặc không thuộc khách | MSG16; không tạo |
| E28.2 | Số trả ≤ 0 hoặc vượt số còn được trả | MSG31; không tạo |
| E28.3 | Thiếu lý do hoặc hàng | MSG01; không tạo |
| E41.1 | Số nhận sai hoặc chưa phân loại | Không xác nhận |
| E79.1 | Không lấy được dữ liệu | MSG65 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/sales-returns | SALES_READ | Danh sách phiếu trả | Có |
| GET | /api/sales-returns/{id} | SALES_READ | Chi tiết | Có |
| GET | /api/sales-returns/source/{invoiceId} | SALES_READ | Hàng còn được trả của hóa đơn | Có |
| POST | /api/sales-returns | SALES_CREATE | Tạo phiếu trả (hoàn tất ngay) | Khác tài liệu |
| POST | /api/sales-returns/{id}/cancel | SALES_DELETE | Hủy phiếu trả | Một phần |
| POST | /api/sales-returns/{id}/refunds | SALES_UPDATE | Trả thêm tiền cho khách | Ngoài tài liệu |
| PATCH | /api/sales-returns/{id}/notes | SALES_UPDATE | Sửa ghi chú | Một phần |
| — | Kho nhận và phân loại | — | UC-41, UC-42 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_return_requests | Phiếu / yêu cầu trả | Có; trạng thái chỉ COMPLETED / CANCELLED |
| dtl_return_request_items | Dòng trả: số lượng, giá bán, giá trả, tình trạng | Có |
| trx_return_processing | Xử lý phân loại | Đã xoá bảng (migration `DropInboundCostAndReturnProcessing`, 19/11/2026) vì chưa có code dùng. Làm UC-42 thì tạo lại bằng migration mới |
| trx_inventory_* | Tồn và thẻ kho | Có |
| trx_financial_transactions | Phiếu chi trả khách | Có |

## 14. Acceptance Criteria

- **AC-RET-01.** Không trả được quá số đã mua trừ số đã trả.
- **AC-RET-02.** Trả hàng làm nợ khách giảm đúng bằng số nhận × giá bán gốc.
- **AC-RET-03.** Món Repair và Scrap không cộng vào tồn bán được.
- **AC-RET-04.** Yêu cầu chưa được kho xác nhận thì tồn và nợ chưa đổi.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-RET-01 | Trả một phần theo hóa đơn | Tồn tăng, nợ giảm đúng | Integration |
| TS-RET-02 | Trả vượt số còn được trả | Bị từ chối | Unit |
| TS-RET-03 | Trả hàng của hóa đơn có giảm giá toàn đơn | Tiền hoàn không vượt tiền thực trả (hiện tại: hoàn dư) | Integration |
| TS-RET-04 | Nhập giá trả cao hơn giá bán | Bị từ chối (hiện tại: nhận) | Integration |
| TS-RET-05 | Phân loại Repair, Scrap | Tồn đúng trạng thái (chưa kiểm thử được) | System |
| TS-RET-06 | Hủy phiếu trả | Tồn, nợ, phiếu chi đảo đúng một lần | Integration |

## 16. Dependencies and Constraints

- specs/sales-stock-issue (phiếu xuất gốc)
- specs/inventory-disposal (hàng Scrap)
- specs/finance-reports (phiếu chi Refund Due)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Không có bước kho nhận và phân loại; trả hàng hoàn tất ngay.
2. Giá trả do người dùng nhập, không giới hạn, và mặc định không trừ giảm giá toàn đơn (lỗi CRITICAL trong reviewSalesFlow.md: BH-01, BH-02).
3. Trả nhanh không cần hóa đơn trái BR-19. Cần chốt giữ hay bỏ.
4. Trả hàng không cập nhật "còn nợ" của hóa đơn gốc.
5. Không có danh mục lý do trả và trạng thái Waiting for Receipt.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/SalesReturns/Commands/SalesReturnCommands.cs`
- `StockFlow_Backend/StockFlow.Application/Features/SalesReturns/Queries/*.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/SalesReturnsController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/sales-returns/screens/SalesReturnsScreen.tsx`
- `StockFlow_Frontend/src/features/pos/components/ReturnTabView.tsx`
