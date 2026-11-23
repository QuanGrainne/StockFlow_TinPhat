# Integration Test – Báo cáo tổng kết

> Ngày: 23/11/2026 · Người thực hiện: NinhHQ (AI hỗ trợ: Claude Code) · Report 5.2 (41 chức năng, 251 TC) · nhánh feature/integration-test (tách từ feature/qa-unit-test 98946ff; cùng cây mã với origin/dev a5cc470).

## 1. Kết quả

- **Triển khai:** 251/251 TC có test (3 TC nhóm C đánh dấu Skip vì là hành vi giao diện) + 10 ca bổ sung (rollback transaction, nhất quán công nợ, kiểm luật theo API thật).
- **Thực thi:** 248/248 TC chạy được đã chạy (100.00%).
- **Passed 209** · **Failed 39** · Skipped 3 · Blocked 0 → đạt 84.27% số TC chạy được. Ca bổ sung: 10/10 đạt.
- **39 TC Failed** gồm: SPEC_CODE_MISMATCH 28, APPLICATION_BUG 6, TRANSACTION_BUG 3, NOT_IMPLEMENTED 1, AUTHORIZATION_BUG 1.
- **Lỗi code (8 mã DEF-IT-01…08):** nghiêm trọng nhất là DEF-IT-01 (thao tác đồng thời trên phiếu chuyển kho làm lệch tồn / sinh thêm hàng) và DEF-IT-04 (tài khoản hết kho thấy mọi phiếu nhập).
- **Transaction:** các luồng ghi nhiều bước của bán hàng (POS, đặt hàng có cọc, gộp đơn, hóa đơn từ đơn đặt, trả hàng) rollback đúng khi lỗi giữa chừng; duyệt hạn mức đồng thời được chặn đúng (concurrency token).

## 2. Theo chức năng

| # | Chức năng | Người | TC | Passed | Failed | Skip | Tình trạng |
|---|---|---|---|---|---|---|---|
| 1 | Product Stock Adjustment & Stock Card | DatTD | 6 | 5 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 2 | Product Import from Excel | DatTD | 5 | 5 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 3 | Price Book & Formula Applied to POS | DatTD | 6 | 3 | 3 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 4 | Customer Receipts & Debt Ledger | DatTD | 6 | 5 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 5 | Supplier Payments & Payable | DatTD | 5 | 5 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 6 | Credit Limit Request & Approval | DatTD | 7 | 5 | 2 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 7 | Credit Limit Settings & History | DatTD | 5 | 5 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 8 | POS Cash Sale & Stock Ledger | NinhHQ | 6 | 5 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 9 | POS Debt Sale & Credit Limit | NinhHQ | 6 | 6 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 10 | POS Stock Policy & Reserved Stock | NinhHQ | 5 | 4 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 11 | Sales Booking & Deposit | NinhHQ | 6 | 6 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 12 | Merge Sales Bookings | NinhHQ | 5 | 4 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 13 | Booking to Delivery Invoice | NinhHQ | 5 | 4 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 14 | Sales Returns & Refund | NinhHQ | 7 | 7 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 15 | Two-Step Stock Transfer (UC-37, BR-40) | LucDT | 8 | 8 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 16 | Transfer Short Receipt (UC-38, BR-41) | LucDT | 7 | 6 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 17 | Transfer Over Receipt (UC-37, BR-40) | LucDT | 4 | 1 | 3 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 18 | Transfer Dispatch Over Stock (team decision 10/11/2026) | LucDT | 5 | 3 | 1 | 1 | Hoàn thành – còn TC Fail cần xử lý |
| 19 | Cancel Transfer By Status (UC-37) | LucDT | 8 | 8 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 20 | Concurrent Transfer Receipt (UC-37) | LucDT | 3 | 0 | 3 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 21 | Stocktake Balance (UC-39, UC-40) | LucDT | 10 | 9 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 22 | Cancel Balanced Stocktake (UC-39) | LucDT | 6 | 6 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 23 | Active Stocktake Blocks Moves (BR-42) | LucDT | 10 | 4 | 6 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 24 | API Authentication (BR-02) | LucDT | 7 | 7 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 25 | Role-Based Authorization (BR-02, BR-03) | LucDT | 7 | 6 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 26 | Immediate Access Revocation (BR-02) | LucDT | 6 | 6 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 27 | Warehouse Data Isolation (BR-04, team decision 10/11/2026) | LucDT | 7 | 7 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 28 | Revoked Warehouse Access (team decision 10/11/2026) | LucDT | 7 | 6 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 29 | Inventory Disposal | LucDT | 7 | 7 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 30 | Purchase Order to Goods Receipt & MAC | TamDM | 6 | 5 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 31 | Goods Receipt Draft, Complete & Cancel | TamDM | 6 | 6 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 32 | Supplier Return & Refund | TamDM | 6 | 5 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 33 | BOM Lifecycle | TamDM | 6 | 2 | 4 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 34 | Production Plan Approval | TamDM | 7 | 6 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 35 | Production Order & Material Issue | TamDM | 6 | 5 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 36 | Finished Goods Receipt & Order Completion | TamDM | 5 | 3 | 2 | 0 | Hoàn thành – còn TC Fail cần xử lý |
| 37 | Login & JWT Session | QuanDN | 6 | 4 | 0 | 2 | Hoàn thành – đạt toàn bộ |
| 38 | Change Password | QuanDN | 5 | 5 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 39 | Staff Accounts & Roles | QuanDN | 6 | 6 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 40 | Role Permission Matrix Enforcement | QuanDN | 5 | 5 | 0 | 0 | Hoàn thành – đạt toàn bộ |
| 41 | Order Settings Affect Sales | QuanDN | 5 | 4 | 1 | 0 | Hoàn thành – còn TC Fail cần xử lý |

Mọi chức năng đã được triển khai và chạy. Chức năng còn TC Fail cần nhóm xử lý (sửa code hoặc sửa Expected) trước khi ghi Round 1.

## 3. Vấn đề còn tồn tại

1. 8 lỗi / quyết định ở Defect Report (DEF-IT-01…08).
2. 22 TC lệch câu chữ / hợp đồng API so với workbook (xem Defect Report mục 2) – cần sửa Expected / bước / Precondition.
3. 3 TC nhóm C cần kiểm ở System / E2E (INT-TRF-43-04, INT-AUT-37-05, INT-AUT-37-06) và phần giao diện của 8 TC nhóm D.
4. Workbook chưa ghi Round 1 (chờ duyệt); mô tả môi trường trong sheet "Test Cases" cần cập nhật.
5. Mỗi máy chạy test cần PostgreSQL ≥ 15 có quyền CREATEDB và file appsettings.IntegrationTest.local.json (hoặc STOCKFLOW_IT_PG).

## 4. Đề xuất bước tiếp theo

1. Nhóm chốt DEF-IT-05, DEF-IT-07, DEF-IT-08 và các Expected lệch câu chữ; sửa code cho DEF-IT-01…04, DEF-IT-06 (mỗi lỗi một nhánh, chạy lại lớp test tương ứng).
2. Sau khi chốt: ghi Round 1 (Passed / Failed, Test date, Tester) vào Report 5.2, không sửa Test Case gốc.
3. Bổ sung ca rollback cho các luồng ghi nhiều bước của nhóm khác (hoàn thành phiếu nhập, chuyển kho, cân bằng kiểm kho, xuất NVL / nhập thành phẩm) – hạ tầng FaultInjector đã sẵn.
4. Đưa `dotnet test StockFlow.IntegrationTests` vào quy trình trước khi merge (cần PostgreSQL trên máy / CI).

## 5. Danh sách báo cáo

| File | Nội dung |
|---|---|
| INTEGRATION_TEST_REVIEW_REPORT.md | Review 251 TC, phân loại A–E, điểm cần xác nhận, ca bổ sung |
| INTEGRATION_TEST_SPEC_CODE_MAPPING.md | Từng TC ↔ endpoint, quyền, handler, bảng, trạng thái SPEC ↔ code |
| INTEGRATION_TEST_COVERAGE_MATRIX.md | TC → file test, phương thức, trạng thái triển khai / thực thi |
| INTEGRATION_TEST_IMPLEMENTATION_REPORT.md | Project, file, package, môi trường, cơ chế dọn dữ liệu |
| INTEGRATION_TEST_EXECUTION_REPORT.md | Số liệu chạy, chi tiết TC Fail, thời gian |
| INTEGRATION_TEST_DEFECT_REPORT.md | Lỗi DEF-IT-01…08, lệch SPEC, quan sát |
| INTEGRATION_TEST_PILOT_REPORT.md | Báo cáo pilot 40 TC (22/11/2026, trước khi triển khai toàn bộ) |
