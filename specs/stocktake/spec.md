# SPEC — Kiểm kê và duyệt điều chỉnh tồn

- **Module:** `stocktake`  •  **Use Case:** UC-39, UC-40, UC-75
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Warehouse Accountant lập phiếu kiểm kê cho một kho và phạm vi hàng, nhập số đếm, giải trình chênh lệch và gửi Manager duyệt. Giao dịch kho của các hàng trong phạm vi bị tạm khóa cho đến khi Manager quyết định. Manager duyệt, từ chối hoặc yêu cầu đếm lại.

## 2. Scope

**Trong phạm vi**
- Lập và nhập kiểm kê (UC-39)
- Ghi lý do chênh lệch (UC-40)
- Manager duyệt điều chỉnh (UC-75)
- Khóa giao dịch khi kiểm kê (BR-42)

**Ngoài phạm vi**
- Hủy hàng (specs/inventory-disposal)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Warehouse Accountant | STOCK_READ, STOCK_CREATE, STOCK_UPDATE | Quyền kho kiểm |
| Manager | Quyền duyệt tồn kho | Code: chưa có chức năng duyệt |

## 4. Preconditions and Postconditions

**Preconditions**
- Có quyền kiểm kê và quyền kho

**Postconditions**
- UC-39: phiếu Waiting for Approval
- UC-75: duyệt thì tồn được điều chỉnh về số đếm và hàng được mở khóa

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-04 | Chỉ thao tác kho được gán. |
| BR-42 | Khi phiếu kiểm kê ở Counting hoặc Waiting for Approval, không xác nhận nhập, xuất, chuyển, hủy hàng trong phạm vi. |
| BR-43 | Dòng có chênh lệch phải có lý do. Tồn chỉ được điều chỉnh sau khi Manager duyệt; Manager có thể từ chối hoặc yêu cầu đếm lại. |
| BR-50 | Quyết định ghi người duyệt, thời gian, ghi chú; từ chối phải có lý do. |
| BR-49 | Điều chỉnh tồn được ghi audit. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-STK-01 | Tạo phiếu: kho, phạm vi (tất cả, nhóm hàng, vị trí), ngày kiểm; trạng thái Counting; chụp số hệ thống | Một phần | Chọn kho và từng hàng; trạng thái DRAFT; số hệ thống lấy lúc lưu |
| FR-STK-02 | Tạm khóa giao dịch của hàng trong phạm vi | Chưa có | Không module nào kiểm tra phiếu kiểm kê đang mở |
| FR-STK-03 | In / hiển thị phiếu đếm | Một phần | Có tiện ích in (chưa đọc chi tiết) |
| FR-STK-04 | Nhập số đếm; tính chênh lệch = Đếm − Hệ thống | Có | StocktakeLogic |
| FR-STK-05 | Nhập lý do cho dòng có chênh lệch (Natural loss, Wrong entry, Damaged, Lost, Other) | Chưa có | Cột discrepancy_reason có nhưng không được ghi |
| FR-STK-06 | Gửi duyệt: Waiting for Approval, thông báo Manager | Khác tài liệu | Người kiểm bấm Hoàn thành là cân bằng kho ngay (BALANCED) |
| FR-STK-07 | Manager Approve / Reject / Request Recount kèm ghi chú | Chưa có | — |
| FR-STK-08 | Hủy phiếu trước khi gửi, mở khóa hàng | Một phần | Hủy phiếu tạm; còn hủy được phiếu đã cân bằng (đảo điều chỉnh) |
| FR-STK-09 | (Existing) Gộp phiếu tạm; điều chỉnh tồn trực tiếp từ màn Hàng hóa | Ngoài tài liệu | Điều chỉnh từ màn Hàng hóa tự sinh phiếu kiểm kê đã cân bằng |

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
| Kho | Bắt buộc, có quyền | BE: có, kho đang hoạt động |
| Số đếm | Không thiếu, không âm | BE: không âm; ít nhất 1 hàng |
| Lý do chênh lệch | Bắt buộc với dòng lệch | Không có |
| Ghi chú quyết định | Bắt buộc khi từ chối / đếm lại | Chưa có |
| Mã phiếu | Duy nhất | BE: có |

## 9. Main Flow

1. Bấm Tạo kiểm kê
2. Chọn kho, phạm vi, ngày kiểm
3. Hệ thống tạo phiếu Counting, chụp số hệ thống, tạm khóa giao dịch
4. Hệ thống in / hiển thị phiếu đếm
5. Nhập số đếm từng dòng
6. Hệ thống tính chênh lệch
7. Nhập lý do cho dòng lệch
8. Bấm Gửi
9. Phiếu Waiting for Approval, thông báo Manager

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A39.1 Lý do chênh lệch | Chọn lý do và ghi chú |
| A39.2 Đếm lại | Manager yêu cầu; phiếu về Counting; cập nhật và gửi lại |
| A39.3 Hủy | Trước khi gửi; mở khóa hàng; Canceled |
| A72.3 Duyệt | Approve: tồn = số đếm, mở khóa. Reject: tồn giữ nguyên, mở khóa. Recount: về Counting |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E39.1 | Thiếu số đếm, số âm, dòng lệch thiếu lý do | MSG51; không gửi được |
| E72.1 | Từ chối / đếm lại thiếu ghi chú | Không lưu quyết định |
| E72.2 | Phiếu đã được quyết định | MSG57 |
| — | Giao dịch kho với hàng đang kiểm kê | MSG50 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/stocktakes | STOCK_READ | Danh sách | Có |
| GET | /api/stocktakes/{id} | STOCK_READ | Chi tiết | Có |
| POST | /api/stocktakes | STOCK_CREATE | Tạo (tạm hoặc cân bằng ngay) | Khác tài liệu |
| PUT | /api/stocktakes/{id} | STOCK_UPDATE | Sửa phiếu tạm | Có |
| POST | /api/stocktakes/{id}/cancel | STOCK_UPDATE | Hủy (kể cả phiếu đã cân bằng) | Khác tài liệu |
| POST | /api/stocktakes/merge | STOCK_CREATE | Gộp phiếu tạm | Ngoài tài liệu |
| POST | /api/products/{id}/stock-adjustments | STOCK_UPDATE | Điều chỉnh tồn trực tiếp | Ngoài tài liệu |
| — | Duyệt / từ chối / đếm lại | — | UC-75 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_stocktakes | Đầu phiếu | Trạng thái DRAFT / BALANCED / CANCELLED |
| dtl_stocktake_items | Dòng: số hệ thống, số đếm, chênh lệch, lý do, người duyệt | Lý do không được ghi; người duyệt là chính người kiểm |
| trx_inventory_balances, trx_inventory_transactions | Tồn, thẻ kho (STOCKTAKE_IN / OUT) | Có |

## 14. Acceptance Criteria

- **AC-STK-01.** Tồn kho không đổi cho đến khi Manager duyệt.
- **AC-STK-02.** Dòng có chênh lệch mà thiếu lý do thì không gửi được.
- **AC-STK-03.** Trong lúc kiểm kê, không xác nhận được nhập, xuất, chuyển của hàng trong phạm vi.
- **AC-STK-04.** Duyệt xong thì tồn bằng số đếm và có thẻ kho điều chỉnh.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-STK-01 | Kiểm kê có thừa và thiếu | Chênh lệch tính đúng | Unit |
| TS-STK-02 | Gửi duyệt rồi Manager duyệt | Tồn đổi sau khi duyệt (hiện tại: đổi ngay, không có duyệt) | System |
| TS-STK-03 | Bán / nhập / chuyển hàng đang kiểm kê | Bị chặn (hiện tại: không chặn) | Integration |
| TS-STK-04 | Dòng lệch không có lý do | Bị từ chối (hiện tại: không có trường lý do) | System |
| TS-STK-05 | Hủy phiếu đã cân bằng | Tồn trở về như trước đúng một lần | Integration |
| TS-STK-06 | NV kho A kiểm kho B | Bị chặn | Integration |

## 16. Dependencies and Constraints

- Mọi module đổi tồn (để thực thi BR-42)
- specs/warehouse-access
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Không có bước duyệt của Manager; người kiểm tự điều chỉnh tồn (trái BR-43, BR-50).
2. BR-42 không được thực thi ở bất kỳ module nào.
3. Không có lý do chênh lệch và phạm vi theo nhóm hàng / vị trí.
4. Điều chỉnh tồn từ màn Hàng hóa và hủy phiếu đã cân bằng nằm ngoài SRS.
5. Hủy phiếu đã cân bằng có thể làm tồn âm.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Stocktakes/Commands/StocktakeCommands.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Stocktakes/Helpers/StocktakeLogic.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Products/Commands/AdjustProductStockCommand.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/StocktakesController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/stocktakes/screens/*.tsx`
