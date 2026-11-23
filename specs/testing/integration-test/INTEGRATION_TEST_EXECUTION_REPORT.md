# Integration Test – Báo cáo thực thi

> Lượt chạy toàn bộ: 2026-11-23 09:16:57 → 2026-11-23 09:34:36 · nhánh feature/integration-test (tách từ feature/qa-unit-test 98946ff; cùng cây mã với origin/dev a5cc470) · PostgreSQL cục bộ (database stockflow_integration_test).
> Số liệu đọc từ TRX và it-run-metrics.json; chưa ghi vào workbook.

## 1. Tổng hợp

| Chỉ số | 251 TC workbook | 10 ca bổ sung |
|---|---|---|
| Đã triển khai | 251 | 10 |
| Đã thực thi | 248 | 10 |
| Passed | **209** | **10** |
| Failed | **39** | 0 |
| Skipped (E2E, nhóm C) | 3 | 0 |
| Blocked | 0 | 0 |
| Not Implemented (chức năng chưa có, chạy và Fail) | 1 | 0 |
| Tỷ lệ thực thi / chạy được | 100.00% | |
| Tỷ lệ đạt / chạy được | 84.27% | |

**Phân loại 39 TC Failed**

| Loại | Số TC |
|---|---|
| SPEC_CODE_MISMATCH | 28 |
| APPLICATION_BUG | 6 |
| TRANSACTION_BUG | 3 |
| NOT_IMPLEMENTED | 1 |
| AUTHORIZATION_BUG | 1 |


## 2. Theo chức năng

| # | Chức năng | Người | TC | Passed | Failed | Skip |
|---|---|---|---|---|---|---|
| 1 | Product Stock Adjustment & Stock Card | DatTD | 6 | 5 | 1 | 0 |
| 2 | Product Import from Excel | DatTD | 5 | 5 | 0 | 0 |
| 3 | Price Book & Formula Applied to POS | DatTD | 6 | 3 | 3 | 0 |
| 4 | Customer Receipts & Debt Ledger | DatTD | 6 | 5 | 1 | 0 |
| 5 | Supplier Payments & Payable | DatTD | 5 | 5 | 0 | 0 |
| 6 | Credit Limit Request & Approval | DatTD | 7 | 5 | 2 | 0 |
| 7 | Credit Limit Settings & History | DatTD | 5 | 5 | 0 | 0 |
| 8 | POS Cash Sale & Stock Ledger | NinhHQ | 6 | 5 | 1 | 0 |
| 9 | POS Debt Sale & Credit Limit | NinhHQ | 6 | 6 | 0 | 0 |
| 10 | POS Stock Policy & Reserved Stock | NinhHQ | 5 | 4 | 1 | 0 |
| 11 | Sales Booking & Deposit | NinhHQ | 6 | 6 | 0 | 0 |
| 12 | Merge Sales Bookings | NinhHQ | 5 | 4 | 1 | 0 |
| 13 | Booking to Delivery Invoice | NinhHQ | 5 | 4 | 1 | 0 |
| 14 | Sales Returns & Refund | NinhHQ | 7 | 7 | 0 | 0 |
| 15 | Two-Step Stock Transfer (UC-37, BR-40) | LucDT | 8 | 8 | 0 | 0 |
| 16 | Transfer Short Receipt (UC-38, BR-41) | LucDT | 7 | 6 | 1 | 0 |
| 17 | Transfer Over Receipt (UC-37, BR-40) | LucDT | 4 | 1 | 3 | 0 |
| 18 | Transfer Dispatch Over Stock (team decision 10/11/2026) | LucDT | 5 | 3 | 1 | 1 |
| 19 | Cancel Transfer By Status (UC-37) | LucDT | 8 | 8 | 0 | 0 |
| 20 | Concurrent Transfer Receipt (UC-37) | LucDT | 3 | 0 | 3 | 0 |
| 21 | Stocktake Balance (UC-39, UC-40) | LucDT | 10 | 9 | 1 | 0 |
| 22 | Cancel Balanced Stocktake (UC-39) | LucDT | 6 | 6 | 0 | 0 |
| 23 | Active Stocktake Blocks Moves (BR-42) | LucDT | 10 | 4 | 6 | 0 |
| 24 | API Authentication (BR-02) | LucDT | 7 | 7 | 0 | 0 |
| 25 | Role-Based Authorization (BR-02, BR-03) | LucDT | 7 | 6 | 1 | 0 |
| 26 | Immediate Access Revocation (BR-02) | LucDT | 6 | 6 | 0 | 0 |
| 27 | Warehouse Data Isolation (BR-04, team decision 10/11/2026) | LucDT | 7 | 7 | 0 | 0 |
| 28 | Revoked Warehouse Access (team decision 10/11/2026) | LucDT | 7 | 6 | 1 | 0 |
| 29 | Inventory Disposal | LucDT | 7 | 7 | 0 | 0 |
| 30 | Purchase Order to Goods Receipt & MAC | TamDM | 6 | 5 | 1 | 0 |
| 31 | Goods Receipt Draft, Complete & Cancel | TamDM | 6 | 6 | 0 | 0 |
| 32 | Supplier Return & Refund | TamDM | 6 | 5 | 1 | 0 |
| 33 | BOM Lifecycle | TamDM | 6 | 2 | 4 | 0 |
| 34 | Production Plan Approval | TamDM | 7 | 6 | 1 | 0 |
| 35 | Production Order & Material Issue | TamDM | 6 | 5 | 1 | 0 |
| 36 | Finished Goods Receipt & Order Completion | TamDM | 5 | 3 | 2 | 0 |
| 37 | Login & JWT Session | QuanDN | 6 | 4 | 0 | 2 |
| 38 | Change Password | QuanDN | 5 | 5 | 0 | 0 |
| 39 | Staff Accounts & Roles | QuanDN | 6 | 6 | 0 | 0 |
| 40 | Role Permission Matrix Enforcement | QuanDN | 5 | 5 | 0 | 0 |
| 41 | Order Settings Affect Sales | QuanDN | 5 | 4 | 1 | 0 |

## 3. Chi tiết TC Failed

| TC | Expected (workbook) | Actual (điểm kiểm tra Fail) | Phân loại | Nhận định |
|---|---|---|---|---|
| INT-PRD-01-05 | 1. 400 "Bạn không có quyền điều chỉnh tồn kho tại Kho Gia Lâm." 2. No stocktake created. | Thông báo \| Expected: Bạn không có quyền điều chỉnh tồn kho tại Kho Gia Lâm. \| Actual: Bạn không có quyền điều chỉnh tồn kho tại Kho Tổng Gia Lâm. | SPEC_CODE_MISMATCH | Như INT-POS-08-05: 'Kho Gia Lâm' ↔ 'Kho Tổng Gia Lâm'. Hành vi đúng: chặn, không tạo phiếu kiểm. |
| INT-PRB-03-01 | 1. 200 OK; row created. | HTTP status \| Expected: 200 \| Actual: 201 | SPEC_CODE_MISMATCH | Tạo bảng giá trả 201 Created; workbook ghi 200 OK. Dòng bảng giá được tạo. |
| INT-PRB-03-03 | 1. Price of P-TEST in "Giá sỉ" = 110,000. | Giá P-TEST trong "Giá sỉ" \| Expected: 110000 \| Actual: 100000.00 | SPEC_CODE_MISMATCH | apply-formula không nhận công thức trong body (chỉ CategoryIds / AllProducts); công thức lưu trên bảng giá. Ca bổ sung INT-PRB-03-S01 (công thức lưu trên bảng giá) đạt 110.000. |
| INT-PRB-03-04 | 1. 400 "Giá trị điều chỉnh không được âm." | HTTP status \| Expected: 400 \| Actual: 200 ‖ Thông báo \| Expected: Giá trị điều chỉnh không được âm. \| Actual: Đã tính lại toàn bộ giá theo công thức thành công. | SPEC_CODE_MISMATCH | Như INT-PRB-03-03: giá trị trong body bị bỏ qua, API trả 200. Luật 'không âm' kiểm khi lưu bảng giá (INT-PRB-03-S02 đạt). |
| INT-FIN-04-01 | 1. Receipt PTxxxx created. 2. Debt 3,000,000; HD0001 remaining 3,000,000. 3. Transaction type RECEIPT written. | Phiếu thu PTxxxx được tạo \| Expected: true \| Actual: TTHD00001 | SPEC_CODE_MISMATCH | Phiếu thu phân bổ cho hóa đơn có mã 'TTHD00001' (TT + mã hóa đơn), không phải 'PTxxxx'. Công nợ, phân bổ, loại RECEIPT đúng. |
| INT-CRD-06-01 | 1. Error CUS-009 "Khoản nợ 2.000.000 đ vượt quá hạn mức tín dụng còn lại ...". 2. No invoice created. | Thông báo \| Expected: Khoản nợ 2.000.000 đ vượt quá hạn mức tín dụng còn lại ... \| Actual: Khoản nợ 2,000,000 đ vượt quá hạn mức tín dụng còn lại của khách hàng 1,000,000 đ. (Hạn mức tín dụng: 10,000,000 đ, Dư nợ hiện tại: 9,000,000 đ, Còn được nợ: 1,000,000 đ) (CUS-009). | SPEC_CODE_MISMATCH | Chặn đúng (CUS-009); số tiền định dạng theo culture tiến trình API ('2,000,000' trên máy en-US) – workbook '2.000.000'. Program.cs không đặt culture. |
| INT-CRD-06-04 | 1. Status APPROVED; limit 12,000,000; one history row with source RequestApproved; MSG56. | HTTP thành công (2xx) \| Expected: 2xx \| Actual: 400 ‖ Trạng thái APPROVED \| Expected: APPROVED \| Actual: PENDING ‖ Hạn mức 12.000.000 \| Expected: 12000000 \| Actual: 10000000.00 ‖ 1 dòng lịch sử nguồn RequestApproved \| Expected: true \| Actual: | SPEC_CODE_MISMATCH | Workbook gửi body {}; API bắt buộc ApprovalType = NEW_LIMIT ('Loại duyệt không hợp lệ: chỉ duyệt nâng hạn mức (NEW_LIMIT).'). Ca bổ sung INT-CRD-06-S01 với NEW_LIMIT đạt. |
| INT-POS-08-05 | 1. 400 "Bạn không có quyền xuất hàng từ kho 'Kho Gia Lâm' (AUTH-WH)." | Thông báo \| Expected: Bạn không có quyền xuất hàng từ kho 'Kho Gia Lâm' (AUTH-WH). \| Actual: Bạn không có quyền xuất hàng từ kho 'Kho Tổng Gia Lâm' (AUTH-WH). | SPEC_CODE_MISMATCH | Expected ghi 'Kho Gia Lâm'; DatabaseSeeder đặt tên 'Kho Tổng Gia Lâm'. Hành vi đúng: chặn, không tạo hóa đơn, tồn không đổi. |
| INT-POS-10-03 | 1. 400 A2 message (hết hàng tồn kho). | Thông báo A2 (hết hàng tồn kho) \| Expected: chứa "(A2)" \| Actual: Sản phẩm 'Sản phẩm P-TEST' (Mã: P-TEST) không đủ tồn kho tại Kho Tổng Gia Lâm. Tồn hiện tại: 0 Cái, Số lượng yêu cầu xuất: 1. Không thể xuất âm kho (B1, POS-014, INV-006). | SPEC_CODE_MISMATCH | Code chỉ áp A2 cho đơn đặt hàng; hóa đơn POS hết hàng trả thông báo B1 (POS-014, INV-006). Hành vi chặn đúng; cần chốt Expected A2 hay B1. |
| INT-SBK-12-05 | 1. 400 "Có đơn đã tạo hóa đơn giao hàng, không gộp được." | Thông báo \| Expected: Có đơn đã tạo hóa đơn giao hàng, không gộp được. \| Actual: Đơn DH00002 không gộp được: chỉ gộp đơn ở trạng thái Phiếu tạm. | SPEC_CODE_MISMATCH | Tạo hóa đơn giao hàng đưa đơn đặt về FINISHED (SalesBookingOps.cs:139) nên nhánh 'Có đơn đã tạo hóa đơn giao hàng…' (SalesBookingCommands.cs:338) không tới được; API trả 'chỉ gộp đơn ở trạng thái Phiếu tạm'. Hành vi chặn đúng. |
| INT-SBK-13-03 | 1. 400 "Đơn đặt hàng DH0001 thuộc chi nhánh khác — hóa đơn phải xuất từ chi nhánh xử lý của đơn." | Thông báo \| Expected: Đơn đặt hàng DH00001 thuộc chi nhánh khác — hóa đơn phải xuất từ chi nhánh xử lý của đơn. \| Actual: Bạn không có quyền xuất hàng từ kho 'Kho Đông Anh' (AUTH-WH). | SPEC_CODE_MISMATCH | Precondition User S chỉ có K001 → API kiểm quyền kho K002 (AUTH-WH, CreatePosOrderCommand.cs:160) trước luật chi nhánh. Ca bổ sung INT-SBK-13-S03 (người dùng có K001 + K002) xác nhận luật đúng. Cần sửa Precondition. |
| INT-TRF-41-07 | 1. Request is rejected. 2. K002 stock is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 | APPLICATION_BUG / DEF-IT-03 | ReceiveTransferCommand.cs:63, 99 Math.Max(0, ReceivedQuantity): số âm thành 0 và phiếu được nhận, không từ chối. |
| INT-TRF-42-01 | 1. Request is rejected. 2. Status stays In Transit. 3. K002 stock stays 20. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Vẫn Đang chuyển \| Expected: IN_TRANSIT \| Actual: RECEIVED ‖ Tồn K002 giữ 20 \| Expected: 20 \| Actual: 51.00 | APPLICATION_BUG / DEF-IT-02 | Không kiểm SL nhận ≤ SL xuất (BR-40): nhận 31/30 thành công, K002 +31. Trùng DEF-UT-01 của Report 5.1. |
| INT-TRF-42-02 | 1. Request is rejected. 2. K002 stock stays 20. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Tồn K002 giữ 20 \| Expected: 20 \| Actual: 50.50 | APPLICATION_BUG / DEF-IT-02 | Như INT-TRF-42-01 (nhận 30,5). |
| INT-TRF-42-04 | 1. Whole request is rejected. 2. No line is received and stock of both products in K002 is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Không dòng nào được nhận \| Expected: true \| Actual: 1:30.00, 2:11.00 ‖ Tồn K002 P-TEST không đổi \| Expected: 20 \| Actual: 50.00 ‖ Tồn K002 P-TEST2 không đổi \| Expected: 0 \| Actual: 11.00 | APPLICATION_BUG / DEF-IT-02 | Như INT-TRF-42-01: cả phiếu được nhận, P-TEST2 nhận 11/10. |
| INT-TRF-43-01 | 1. Status In Transit. 2. K001 stock -5. 3. Stock card has TRANSFER_OUT -15. | Thẻ kho TRANSFER_OUT -15 \| Expected: true \| Actual: TRANSFER_OUT kho 3 -10, TRANSFER_OUT kho 3 -5 | SPEC_CODE_MISMATCH | Tồn đúng (-5) nhưng thẻ kho ghi 2 dòng TRANSFER_OUT (-10 và -5) thay vì 1 dòng -15 khi xuất vượt tồn (InventoryLedger tách theo dòng tồn). |
| INT-TRF-45-01 | 1. Exactly one request succeeds. 2. K002 stock 50. 3. Exactly one TRANSFER_IN entry is added. | Đúng 1 request thành công \| Expected: 1 \| Actual: 2 ‖ Đúng 1 dòng TRANSFER_IN \| Expected: 1 \| Actual: 2 | TRANSACTION_BUG / DEF-IT-01 | 2 request nhận đồng thời đều thành công; 2 dòng TRANSFER_IN +30 nhưng tồn K002 chỉ +30 (mất cập nhật) → thẻ kho lệch tồn. |
| INT-TRF-45-02 | 1. Exactly one request succeeds. 2. Stock matches the final status: Received gives K001 70, K002 50; Cancelled gives K001 100, K002 20. | Đúng 1 request thành công \| Expected: 1 \| Actual: 2 ‖ Tồn khớp trạng thái cuối (RECEIVED: 70/50; CANCELLED: 100/20) \| Expected: true \| Actual: RECEIVED: K001 100.00, K002 50.00 | TRANSACTION_BUG / DEF-IT-01 | Nhận và hủy đồng thời đều thành công: trạng thái RECEIVED nhưng K001 về 100 và K002 = 50 → phát sinh 30 hàng. |
| INT-TRF-45-03 | 1. Exactly one request succeeds. 2. K001 stock 70. 3. Exactly one TRANSFER_OUT entry is added. | Đúng 1 request thành công \| Expected: 1 \| Actual: 2 ‖ Đúng 1 dòng TRANSFER_OUT \| Expected: 1 \| Actual: 2 | TRANSACTION_BUG / DEF-IT-01 | 2 request xuất đồng thời đều thành công; 2 dòng TRANSFER_OUT −30 nhưng tồn K001 chỉ −30. |
| INT-STK-46-09 | 1. Request is rejected because every line with a variance must have a reason. 2. K001 stock stays 100. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Tồn K001 giữ 100 \| Expected: 100 \| Actual: 105.00 | NOT_IMPLEMENTED / DEF-IT-07 | BR-43: dòng chênh lệch phải có lý do – StocktakeItemRequest không có trường lý do, phiếu cân bằng được ngay. |
| INT-STK-48-01 | 1. Request is rejected. 2. K001 stock is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Lý do từ chối là hàng đang kiểm kho \| Expected: chứa "kiểm kho" \| Actual: (không có message) ‖ Tồn K001 không đổi \| Expected: 100 \| Actual: 105.00 | SPEC_CODE_MISMATCH / DEF-IT-08 | Report 3 hiện hành BR-42 không gồm nhập hàng; code (StocktakeGuard) khớp Report 3 nên không chặn. Workbook theo BR-56 cũ. Cần nhóm chốt phạm vi BR-42. |
| INT-STK-48-02 | 1. Request is rejected. 2. K001 stock is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Lý do từ chối là hàng đang kiểm kho \| Expected: chứa "kiểm kho" \| Actual: (không có message) ‖ Tồn K001 không đổi \| Expected: 100 \| Actual: 105.00 | SPEC_CODE_MISMATCH / DEF-IT-08 | Như INT-STK-48-01 (hoàn thành phiếu nhập không bị chặn). |
| INT-STK-48-03 | 1. Request is rejected. 2. K001 stock is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 201 Tạo đơn hàng POS thành công kèm phiếu xuất kho XK00001! ‖ Lý do từ chối là hàng đang kiểm kho \| Expected: chứa "kiểm kho" \| Actual: Tạo đơn hàng POS thành công kèm phiếu xuất kho XK00001! ‖ Tồn K001 không đổi \| Expected: 100 \| Actual: 99.00 | SPEC_CODE_MISMATCH / DEF-IT-08 | Như INT-STK-48-01 (POS không gọi StocktakeGuard). |
| INT-STK-48-04 | 1. Request is rejected. 2. K001 stock is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Lý do từ chối là hàng đang kiểm kho \| Expected: chứa "kiểm kho" \| Actual: (không có message) ‖ Tồn K001 không đổi \| Expected: 100 \| Actual: 90.00 | SPEC_CODE_MISMATCH / DEF-IT-08 | Như INT-STK-48-01 (xuất chuyển kho không bị chặn). |
| INT-STK-48-05 | 1. Request is rejected. 2. K001 stock is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Lý do từ chối là hàng đang kiểm kho \| Expected: chứa "kiểm kho" \| Actual: (không có message) ‖ Tồn K001 không đổi \| Expected: 100 \| Actual: 110.00 | SPEC_CODE_MISMATCH / DEF-IT-08 | Như INT-STK-48-01 (nhận chuyển kho không bị chặn). |
| INT-STK-48-06 | 1. Request is rejected. 2. K001 stock is unchanged. | Yêu cầu bị từ chối (4xx) \| Expected: 4xx \| Actual: 200 ‖ Lý do từ chối là hàng đang kiểm kho \| Expected: chứa "kiểm kho" \| Actual: (không có message) ‖ Tồn K001 không đổi \| Expected: 110.00 \| Actual: 108.00 | SPEC_CODE_MISMATCH / DEF-IT-08 | Như INT-STK-48-01 (trả hàng NCC không bị chặn). |
| INT-SEC-50-04 | 1. Response 403: "Vai trò của bạn chưa được phân quyền chức năng feat-stocktake." | Thông báo \| Expected: Vai trò của bạn chưa được phân quyền chức năng feat-stocktake. \| Actual: Vai trò của bạn chưa được phân quyền chức năng Kiểm kho. | SPEC_CODE_MISMATCH | 403 đúng; câu dùng tên chức năng 'Kiểm kho' thay vì mã 'feat-stocktake' (RequirePermissionAttribute.cs:143). |
| INT-SEC-53-04 | 1. The list is empty. | Danh sách rỗng \| Expected: 0 \| Actual: 2 | AUTHORIZATION_BUG / DEF-IT-04 | GetPurchasesQuery.cs:52 chỉ lọc theo kho khi người dùng có ≥ 1 kho → tài khoản bị thu hồi hết kho thấy mọi phiếu nhập (BR-04). Các danh sách khác (INT-SEC-53-05) lọc đúng. |
| INT-PUR-30-03 | 1. 400 "Số lượng đạt phải lớn hơn 0. Mặt hàng lỗi toàn bộ thì để trống dòng và ghi chú lý do." | HTTP status \| Expected: 400 \| Actual: 200 ‖ Thông báo \| Expected: Số lượng đạt phải lớn hơn 0. Mặt hàng lỗi toàn bộ thì để trống dòng và ghi chú lý do. \| Actual: (không có message) ‖ Không tạo phiếu nhập \| Expected: 0 \| Actual: 1 | SPEC_CODE_MISMATCH | Nhận PO với SL đạt 0, lỗi 5 được chấp nhận (tạo phiếu nhập COMPLETED); câu 'Số lượng đạt phải lớn hơn 0. Mặt hàng lỗi toàn bộ…' không còn trong code nhập hàng (đổi sau c60ea62 – f5c270a hàng lỗi nhập). Cần chốt luật. |
| INT-PRT-32-04 | 1. Refund recorded (SUPPLIER_REFUND). | HTTP thành công (2xx) \| Expected: 2xx \| Actual: 400 ‖ Ghi nhận SUPPLIER_REFUND 50.000 \| Expected: true \| Actual: 0 dòng | SPEC_CODE_MISMATCH | Phiếu nhập chưa thanh toán → NCC không nợ mình → 'Số tiền vượt quá số nhà cung cấp còn phải trả (0).' Precondition cần ghi phiếu nhập đã thanh toán. |
| INT-BOM-33-03 | 1. 400 "BOM phải có ít nhất một nguyên vật liệu." | Thông báo \| Expected: BOM phải có ít nhất một nguyên vật liệu. \| Actual: Định mức phải có ít nhất một nguyên vật liệu. | SPEC_CODE_MISMATCH | Code: 'Định mức phải có ít nhất một nguyên vật liệu.' (ActivateBomCommand.cs:30). |
| INT-BOM-33-04 | 1. 400 "Thành phẩm đã có BOM phiên bản 1.0." | Thông báo \| Expected: Thành phẩm đã có BOM phiên bản 1.0. \| Actual: Thành phẩm đã có định mức phiên bản 1.0. | SPEC_CODE_MISMATCH | Code: 'Thành phẩm đã có định mức phiên bản 1.0.' (CreateBomCommand.cs:45). |
| INT-BOM-33-05 | 1. 400 "BOM đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới." | Thông báo \| Expected: BOM đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới. \| Actual: Định mức đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới. | SPEC_CODE_MISMATCH | Code: 'Định mức đã được dùng cho lệnh sản xuất nên không sửa được…' (UpdateBomCommand.cs:47). |
| INT-BOM-33-06 | 1. 400 "BOM đã được dùng cho lệnh sản xuất nên không xoá được. Bạn có thể ngừng áp dụng BOM." | Thông báo \| Expected: BOM đã được dùng cho lệnh sản xuất nên không xoá được. Bạn có thể ngừng áp dụng BOM. \| Actual: Định mức đã được dùng cho lệnh sản xuất nên không hủy được. Bạn có thể ngừng áp dụng định mức. | SPEC_CODE_MISMATCH | Code: 'Định mức đã được dùng cho lệnh sản xuất nên không hủy được. Bạn có thể ngừng áp dụng định mức.' (DeleteBomCommand.cs:31). |
| INT-PLN-34-03 | 1. 400 "Chỉ người có quyền duyệt kế hoạch sản xuất mới được thực hiện thao tác này." | HTTP status \| Expected: 400 \| Actual: 403 ‖ Thông báo \| Expected: Chỉ người có quyền duyệt kế hoạch sản xuất mới được thực hiện thao tác này. \| Actual: Vai trò của bạn chưa được phân quyền chức năng Duyệt kế hoạch sản xuất. | SPEC_CODE_MISMATCH | Endpoint duyệt gắn PROD_APPROVE + [RequireFeature(feat-production-plan-approval)] → 403 'Vai trò của bạn chưa được phân quyền chức năng Duyệt kế hoạch sản xuất.' ở tầng phân quyền, không tới câu 400 trong handler. |
| INT-MFG-35-02 | 1. 400 "Số lượng xuất luỹ kế vượt nhu cầu theo BOM. ..." | Thông báo \| Expected: Số lượng xuất luỹ kế vượt nhu cầu theo BOM. ... \| Actual: Số lượng xuất luỹ kế vượt nhu cầu theo định mức. Vui lòng nhập lý do. | SPEC_CODE_MISMATCH | Code: 'Số lượng xuất luỹ kế vượt nhu cầu theo định mức. Vui lòng nhập lý do.' (CreateMaterialIssueCommand.cs:126; BR-34). |
| INT-MFG-36-03 | 1. 400 with [CONFIRM_EXCEED_PLAN] prompt. 2. With confirmation the receipt is saved. | HTTP thành công (2xx) \| Expected: 2xx \| Actual: 400 ‖ Có xác nhận: tồn FG-01 +11 \| Expected: 11 \| Actual: 0.0 | APPLICATION_BUG / DEF-IT-05 | Bước 1 đúng ([CONFIRM_EXCEED_PLAN]); có xác nhận vẫn bị chặn: 'NVL đã xuất chỉ đủ sản xuất tối đa 10…'. Report 3 BR-37: thiếu NVL chỉ cảnh báo + ghi chú, không chặn. Cần nhóm xác nhận. |
| INT-MFG-36-04 | 1. Order COMPLETED; FG-01 stock +5. | Lệnh COMPLETED \| Expected: COMPLETED \| Actual: IN_PROGRESS | APPLICATION_BUG / DEF-IT-06 | Duyệt hoàn thành 5/10 → lệnh vẫn IN_PROGRESS; BR-38: Manager duyệt hoàn thành thì lệnh Completed. Trùng DEF-UT-07 của Report 5.1. |
| INT-SET-41-04 | 1. 400 "Hệ thống hiện đang tạm ngừng tiếp nhận đơn đặt hàng mới theo chính sách cài đặt (A1)." | Thông báo \| Expected: Hệ thống hiện đang tạm ngừng tiếp nhận đơn đặt hàng mới theo chính sách cài đặt (A1). \| Actual: Hệ thống đang tạm ngừng nhận đơn đặt hàng mới (Thiết lập đơn hàng). | SPEC_CODE_MISMATCH | Chặn đúng; API đặt hàng trả 'Hệ thống đang tạm ngừng nhận đơn đặt hàng mới (Thiết lập đơn hàng).' (SalesBookingCommands.cs:76). Câu (A1) của workbook chỉ có ở POS với Status PENDING. |

## 4. TC không chạy ở Integration

- **INT-TRF-43-04** Create screen warns when quantity exceeds stock – Cảnh báo + xác nhận trên màn Tạo phiếu chuyển là giao diện. Đề xuất: System / E2E (Playwright hoặc kiểm tay trên trình duyệt).
- **INT-AUT-37-05** Expired session in the UI – Chuyển hướng /login khi mất token là hành vi frontend (lib/api/client.ts). Đề xuất: System / E2E (Playwright hoặc kiểm tay trên trình duyệt).
- **INT-AUT-37-06** Two tabs, two accounts – Hai tab hai tài khoản (tabSession) là hành vi trình duyệt. Đề xuất: System / E2E (Playwright hoặc kiểm tay trên trình duyệt).

## 5. Thời gian và môi trường

| Bước | Thời gian |
|---|---|
| Tạo database rỗng | 0.8 s |
| Khởi động API + 51 migration + DatabaseSeeder | 20.0 s |
| Seed dữ liệu test | 5.2 s |
| Chụp database mẫu | 4.2 s |
| Khởi tạo một lần | 30.6 s |
| Dựng lại database trước mỗi test (257 lần) | trung bình 2.24 s, tối đa 3.36 s |
| Tổng thời gian các test (không tính dựng lại DB) | 7.6 phút |

Ghi chú: INT-SEC-53-04 mất 90,3 s trong lượt chạy toàn bộ (một request chậm, kết quả vẫn như mọi lượt khác); chạy lại cả lớp WarehouseIsolationTests ngay sau đó chỉ 3,8 s, không tái hiện → do tải của máy chạy test, không phải lỗi code.

Migration 51/51 (mới nhất 20261119132211_NormalizeWarehouseCost); 56 bảng schema stockflow; HasPendingModelChanges = false. Sau lượt chạy 2 database test bị xoá; stockflow_dev không bị chạm tới.

## 6. Lỗi của chính test / môi trường đã gặp và đã sửa (không tính là lỗi code)

| Loại | Hiện tượng | Xử lý |
|---|---|---|
| TEST_CODE_ERROR | Kiểm "200" trong khi POS / bảng giá trả 201 Created (workbook không ghi mã thành công ở ca POS) | Ca không ghi mã: kiểm 2xx và ghi mã thực tế; ca workbook ghi rõ "200 OK" (INT-PRB-03-01) giữ nguyên và ghi lệch |
| TEST_CODE_ERROR | Bộ so câu coi khoảng trắng / dấu chấm cạnh "..." là bắt buộc | Sửa bộ so (INT-POS-10-02, INT-TRF-40-07) |
| TEST_CODE_ERROR | INT-STK-48-06 đạt giả: bị từ chối vì thiếu GrItemId, không phải vì kiểm kho | Thêm GrItemId; ca 48-xx bắt buộc lý do từ chối là "kiểm kho" |
| TEST_CODE_ERROR | Lấy mã phiếu thu theo tiền tố "PT" (mã thật TTHDxxxx) | Lấy voucherCode từ phản hồi |
| ENVIRONMENT_ERROR | INT-SEC-53-07 trả 500: "Cannot write DateTime with Kind=UTC…" (UpdateWarehouseAccessCommand dùng DateTime.UtcNow) | Npgsql đọc công tắc legacy timestamp một lần/tiến trình; fixture dùng Npgsql trước Program.cs → bật công tắc bằng ModuleInitializer như Program.cs. Môi trường thật không gặp |
