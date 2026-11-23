# Integration Test – Báo cáo Pilot (40 Test Case của NinhHQ)

> Ngày: 22/11/2026 · Người thực hiện: NinhHQ (AI hỗ trợ: Claude Code) · Nguồn ca: `docs/Report5.2_Integration_Test.xlsx`, chức năng 8–14.
> Code kiểm thử: nhánh `feature/integration-test` (tách từ `feature/qa-unit-test` 98946ff; cùng cây mã với `origin/dev` a5cc470).
> Số liệu lấy từ TRX và `it-run-metrics.json` của lượt chạy 22/11/2026 22:39. Kết quả **chưa ghi vào workbook** (chờ duyệt).

## 1. Kết quả

| Chỉ số | 40 TC workbook | 7 ca bổ sung |
|---|---|---|
| Đã triển khai | 40 | 7 |
| Đã thực thi | 40 | 7 |
| Passed | **36** | **7** |
| Failed | **4** (đều là SPEC_CODE_MISMATCH, mục 5) | 0 |
| Blocked | 0 | 0 |
| Not Implemented | 0 | 0 |

INT-POS-08-02 đạt ở **phần backend** (phiếu thu ghi VIETQR). Phần "receipt shows QR" là giao diện, không thực thi ở đây và chuyển sang System/E2E.

| # | Chức năng (sheet) | TC | Passed | Failed | File test |
|---|---|---|---|---|---|
| 8 | POS Cash Sale & Stock Ledger | 6 (+1 bổ sung) | 5 | 1 (08-05) | `Sales/Pos/PosCashSaleTests.cs` |
| 9 | POS Debt Sale & Credit Limit | 6 | 6 | 0 | `Sales/Pos/PosDebtSaleTests.cs` |
| 10 | POS Stock Policy & Reserved Stock | 5 | 4 | 1 (10-03) | `Sales/Pos/PosStockPolicyTests.cs` |
| 11 | Sales Booking & Deposit | 6 (+1) | 6 | 0 | `Sales/Bookings/SalesBookingDepositTests.cs` |
| 12 | Merge Sales Bookings | 5 (+1) | 4 | 1 (12-05) | `Sales/Bookings/MergeSalesBookingsTests.cs` |
| 13 | Booking to Delivery Invoice | 5 (+3) | 4 | 1 (13-03) | `Sales/Bookings/BookingToInvoiceTests.cs` |
| 14 | Sales Returns & Refund | 7 (+1) | 7 | 0 | `Sales/Returns/SalesReturnRefundTests.cs` |

Mỗi test ghi vào output (TRX) từng điểm kiểm tra dạng `PASS/FAIL | <điểm> | Expected | Actual`, kèm request / response HTTP. Một test kiểm cả phản hồi HTTP lẫn dữ liệu PostgreSQL: hóa đơn, dòng hàng, phiếu xuất, tồn kho, thẻ kho, phiếu thu / chi, công nợ, trạng thái đơn đặt.

## 2. Ca bổ sung (yêu cầu 11 – rollback và nhất quán dữ liệu)

| ID | Kiểm tra | Kết quả |
|---|---|---|
| INT-POS-08-S01 | Lỗi khi ghi thẻ kho (sau khi đã ghi hóa đơn, dòng hàng, phiếu xuất trong cùng transaction) → HTTP 500, không còn hóa đơn / dòng hàng / phiếu xuất / thẻ kho / phiếu thu, tồn giữ 50 | Passed |
| INT-SBK-11-S01 | Lỗi khi lưu phiếu thu trả trước → không còn đơn đặt / dòng hàng, công nợ không đổi | Passed |
| INT-SBK-12-S01 | Lỗi ở lần ghi thứ hai khi gộp đơn → không có đơn gộp, 2 đơn gốc vẫn DRAFT, phiếu thu vẫn thuộc DH0001 | Passed |
| INT-SBK-13-S01 | Lỗi khi tạo hóa đơn từ đơn đặt → đơn đặt vẫn DRAFT, tồn / công nợ không đổi | Passed |
| INT-SBK-13-S02 | Đặt cọc 200.000 + hóa đơn thu 300.000 → dư nợ về như ban đầu, tổng phiếu thu 500.000 (BR-15) | Passed |
| INT-SBK-13-S03 | Người dùng có cả K001 + K002 xuất hóa đơn từ K002 cho đơn K001 → đúng câu "thuộc chi nhánh khác" (bổ trợ INT-SBK-13-03) | Passed |
| INT-SRT-14-S01 | Lỗi khi nhập lại kho hàng trả → không có phiếu trả, tồn / công nợ không đổi | Passed |

**Cách gây lỗi:** dùng `FaultInjector`, một `SaveChangesInterceptor` gắn vào DbContext thật của API. Nó ném lỗi đúng một lần, ở lần `SaveChanges` có bản ghi loại chỉ định (ví dụ `TrxInventoryTransaction`). Không mock DbContext hay repository: lỗi xảy ra giữa luồng thật trên PostgreSQL, sau đó test đọc lại database để kiểm tra rollback.

**Kết luận:** 4 luồng ghi nhiều bước của bán hàng đều dùng `BeginTransactionAsync` và rollback đúng: POS, đặt hàng có cọc, gộp đơn, trả hàng.

## 3. Thời gian chạy

| Bước | Thời gian |
|---|---|
| Tạo database rỗng `stockflow_integration_test` | 0,5 s |
| Khởi động API (Program.cs chạy 51 migration + DatabaseSeeder) | 17,9 s |
| Seed dữ liệu test | 1,9 s |
| Chụp database mẫu `stockflow_integration_test_template` | 3,3 s |
| **Khởi tạo một lần cho cả lượt** | **24,0 s** |
| Dựng lại database trước mỗi test (46 lần) | trung bình 1,48 s, tối đa 1,81 s |
| Thời gian một test (không tính dựng lại DB) | 0,5 – 2,7 s (trung bình 1,6 s) |
| Cả 47 test | 2 phút 22 s (dotnet test) |
| Chạy riêng 1 test (INT-SRT-14-06) | 28 s (gồm khởi tạo) |

**Ước tính cho cả 251 TC:** khoảng 251 × (1,5 + 1,6) s cộng 24 s, tức khoảng 13–14 phút chạy tuần tự.

## 4. Khởi tạo và dọn database

1. **Không dùng `stockflow_dev`.**
   - Test dùng hai database riêng trên PostgreSQL 18 cục bộ: `stockflow_integration_test` và `stockflow_integration_test_template`. Cả hai được tạo với cùng encoding / collation với `template1` (UTF8, English_United States.1252).
   - Thông tin kết nối đọc từ biến môi trường `STOCKFLOW_IT_PG` hoặc file `appsettings.IntegrationTest.local.json`. File này nằm trong `.gitignore` và không được commit; file mẫu là `.example`.
2. **Hàng rào an toàn.**
   - `DatabaseGuard` chỉ cho tạo / xoá / kết nối database có tiền tố `stockflow_integration_test`.
   - `DatabaseGuardInterceptor` gắn vào DbContext của API. Nó chặn mọi kết nối EF Core tới database khác, kể cả lúc Program.cs tự migrate khi khởi động.
   - Lý do: `appsettings.json` (đã commit) đang trỏ `stockflow_dev`.
3. **Schema thật.** Database được tạo bằng chính 51 migration của dự án, do Program.cs chạy khi API khởi động; schema là `stockflow`. Fixture kiểm tra và dừng nếu không đạt:
   - đã áp 51/51 migration, không còn migration chờ;
   - `HasPendingModelChanges() = false`;
   - có 56 bảng;
   - có dòng `mst_order_settings` id 1.
4. **Dữ liệu có kiểm soát.**
   - `DatabaseSeeder` thật: kho K001–K004, admin, vai trò, quyền.
   - Thêm `TestDataSeeder`:
     - vai trò `IT_SALES` có đúng quyền module và chức năng `feat-*` mà API đòi;
     - 3 tài khoản: K001; K002; K001 + K002;
     - P-TEST / P-TEST2 / P-OTHER;
     - KH-HM01 "Công ty Hoa Mai", KH-ABC, KH-ZERO.
   - Tồn kho và công nợ do từng test tự đặt.
   - Đơn đặt / hóa đơn trong Arrange được tạo bằng API thật.
5. **Độc lập, chạy lại được.**
   - Trước mỗi test, database chạy test bị xoá (`DROP … WITH (FORCE)`) và tạo lại từ bản mẫu (`CREATE DATABASE … TEMPLATE … STRATEGY FILE_COPY`), nên mọi test bắt đầu từ cùng dữ liệu.
   - API dùng `Pooling=false` để không giữ kết nối cũ qua lần dựng lại.
   - Test chạy tuần tự (`DisableTestParallelization`).
6. **Bằng chứng.**
   - Chạy pilot 2 lần liên tiếp cho cùng kết quả. Test 10-05 đổi thiết lập đơn hàng nhưng các test chạy sau nó không bị ảnh hưởng.
   - Chạy riêng 1 test vẫn đạt.
   - Sau khi chạy, trên máy chủ chỉ còn `stockflow_dev`; 2 database test đã bị xoá (`KeepDatabaseAfterRun = false`).

## 5. SPEC_CODE_MISMATCH (4 TC Failed, chưa sửa Expected, không đánh dấu Passed)

| TC | Expected (workbook) | Actual | Nhận định |
|---|---|---|---|
| INT-POS-08-05 | 400 "Bạn không có quyền xuất hàng từ kho 'Kho Gia Lâm' (AUTH-WH)." | 400 "Bạn không có quyền xuất hàng từ kho 'Kho Tổng Gia Lâm' (AUTH-WH)."; không tạo hóa đơn, tồn giữ 50 | Lỗi chữ trong workbook (DatabaseSeeder đặt tên "Kho Tổng Gia Lâm"). Hành vi đúng |
| INT-POS-10-03 | 400 thông báo A2 (hết hàng tồn kho) | 400 "… không đủ tồn kho tại Kho Tổng Gia Lâm. Tồn hiện tại: 0 Cái … Không thể xuất âm kho (B1, POS-014, INV-006)."; tồn giữ 0 | Code chỉ áp A2 cho đơn đặt hàng (`CreatePosOrderCommand.cs:315`, `SalesBookingCommands.cs:113`). Hóa đơn POS hết hàng đi theo B1. Cần chốt Expected là A2 hay B1 |
| INT-SBK-12-05 | 400 "Có đơn đã tạo hóa đơn giao hàng, không gộp được." | 400 "Đơn DH00002 không gộp được: chỉ gộp đơn ở trạng thái Phiếu tạm."; DH0001 vẫn DRAFT | Tạo hóa đơn giao hàng chuyển đơn đặt sang FINISHED (`SalesBookingOps.cs:139`). Vì vậy kiểm tra ở `SalesBookingCommands.cs:338` không bao giờ tới được. Hành vi chặn đúng, câu khác |
| INT-SBK-13-03 | 400 "Đơn đặt hàng DH0001 thuộc chi nhánh khác — …" | 400 "Bạn không có quyền xuất hàng từ kho 'Kho Đông Anh' (AUTH-WH)." | Precondition: User S chỉ có K001, nên quyền kho K002 bị kiểm trước (`CreatePosOrderCommand.cs:160`). Với người có cả 2 kho, luật chi nhánh đúng như Expected (INT-SBK-13-S03 đạt). Cần sửa Precondition |

**Lệch khác (không làm Fail):**
- **Quyền thật nhiều hơn Precondition:**
  - Mọi API bán hàng cần chức năng `feat-pos` / `feat-sales-booking` / `feat-invoices` / `feat-sales-returns` / `feat-customers`.
  - Hủy đơn đặt (11-05) và hủy phiếu trả (14-06) cần `SALES_DELETE`.
  - Hủy phiếu thu (13-05) cần `FIN_UPDATE` + `feat-customers`.
  - Test dùng quyền theo code và ghi lại khác biệt này.
- **Cách gửi tham số:** hủy đơn đặt nhận `keepDeposit` qua query string; workbook ghi dạng body `{keepDeposit: false}`.
- **Mã BR cũ:** "BR-09" (gộp đơn) trong Report 3 hiện hành là BR-10; BR-18 hiện là hạn công nợ.
- **Mã HTTP khi thành công:** API POS trả **201 Created**, các API khác trả 200. Workbook không ghi mã thành công; test chấp nhận 2xx và ghi mã thực tế.

## 6. Lỗi phát hiện

**Không có APPLICATION_BUG / TRANSACTION_BUG / AUTHORIZATION_BUG nào được xác nhận** trong 40 TC pilot và 7 ca bổ sung.

**Điểm đáng ngờ** (đọc code, chưa có TC trong workbook; đề nghị nhóm xem):

| # | Vị trí | Mô tả | Mức độ |
|---|---|---|---|
| O-1 | `CreatePosOrderCommand.cs:134–143` | Chặn "nhấn thanh toán nhiều lần" (PAY-016) so mọi đơn có cùng `TotalAmount` trong 3 giây. Khách lẻ thì so với đơn của **mọi** khách, và gồm cả đơn đặt hàng. Hệ quả: tạo hóa đơn từ đơn đặt ngay sau khi tạo đơn (cùng tổng tiền), hoặc hai khách lẻ khác nhau mua cùng số tiền trong 3 giây, đều bị từ chối. Test pilot tránh bằng cách lùi ngày đơn đặt 1 giờ, vì Precondition nói đơn có từ trước | Trung bình |
| O-2 | `CreatePosOrderCommand.cs:175, 736–755` | Hồ sơ "Khách lẻ" KH00000 được tạo **ngoài** transaction. Nếu đơn POS bị từ chối (ví dụ PAY-009) thì hồ sơ này vẫn được tạo. Không sai dữ liệu nghiệp vụ, chỉ là ghi phụ ngoài transaction | Thấp |
| O-3 | `Program.cs` | Không đặt culture: số tiền trong thông báo (`{x:N0}`) theo culture máy chạy API. Máy test en-US cho "2,000,000"; workbook ghi "2.000.000" | Thấp (môi trường) |

**Lỗi của chính test code (TEST_CODE_ERROR), đã sửa ở pilot:**
1. Kiểm "200 OK" trong khi POS trả 201. Đã đổi sang kiểm 2xx và ghi mã thực tế.
2. Bộ so câu thông báo coi khoảng trắng cạnh "..." là bắt buộc (INT-POS-10-02). Câu thật đúng, nên đã sửa bộ so.

Không sửa code nghiệp vụ.

## 7. Vấn đề kiến trúc / môi trường

1. **Không có Docker / WSL** nên không chạy được Testcontainers. Đã dùng PostgreSQL cục bộ như đã duyệt, với database riêng và hàng rào tên.
   - Điều kiện: PostgreSQL ≥ 15 (`STRATEGY FILE_COPY`) và tài khoản có quyền CREATEDB.
   - Máy khác trong nhóm cần tự tạo `appsettings.IntegrationTest.local.json`.
2. **Rủi ro cấu hình:** `appsettings.json` đã commit có chuỗi kết nối `stockflow_dev`, và Program.cs tự migrate + seed khi khởi động. Integration test chặn bằng `DatabaseGuardInterceptor`. Đề nghị nhóm cân nhắc bỏ chuỗi kết nối thật khỏi file đã commit (ngoài phạm vi, chưa sửa).
3. **Che cảnh báo model:** `DependencyInjection.cs:28` bỏ qua `PendingModelChangesWarning`, nên lệch model ↔ migration sẽ không báo khi migrate. Fixture tự kiểm `HasPendingModelChanges()`; hiện là `false`.
4. **Điểm vào của WebApplicationFactory:** dùng một kiểu public của assembly API (`AuthController`), nên không phải sửa `Program.cs`.
5. **Dịch vụ ngoài:** payOS được thay bằng bản "chưa cấu hình", không gọi mạng. Ảnh hàng hóa lưu vào thư mục tạm.
6. **Tài liệu dự án lỗi thời:** CLAUDE.md còn ghi BR-56 (nay là BR-42) và "Admin thấy mọi kho" (code: Admin cũng chỉ thấy kho được tích). Ngoài phạm vi, chưa sửa.
7. **Unit test không bị ảnh hưởng:** chạy lại vẫn 532 Pass / 7 Fail / 5 Skip như trước. Build cả solution 0 cảnh báo, 0 lỗi.

## 8. Kế hoạch triển khai 211 TC còn lại (chờ duyệt)

| Đợt | Phạm vi | TC | Dữ liệu test cần thêm | Ghi chú |
|---|---|---|---|---|
| 1 | LucDT – chuyển kho, kiểm kho, xuất hủy, bảo mật API / quyền kho (chức năng 15–29) | 102 | Vai trò kho (STOCK_*, feat-transfers/stocktake/disposal), người dùng A/B/C theo kho, tài khoản bị khóa, token hết hạn ký bằng khóa test | 48-01…06 chờ chốt BR-42; 45-xx chạy request song song thật |
| 2 | TamDM – đặt hàng nhập, nhập hàng, trả NCC, BOM, kế hoạch, lệnh sản xuất (30–36) | 42 | NCC-01, PO, FG-01 / RM-01 / RM-02, BOM, người lập / duyệt kế hoạch | Kiểm lại số giá vốn sau commit 42900a9 |
| 3 | DatTD – hàng hóa, bảng giá, công nợ, hạn mức (1–7) | 40 | Phiếu nhập NH0001 có công nợ, hóa đơn HD0001 còn nợ, Manager | 06-07 song song; chốt culture số tiền |
| 4 | QuanDN – đăng nhập, đổi mật khẩu, nhân viên, ma trận quyền, thiết lập (37–41) | 27 | locked01, sales01 có mật khẩu biết trước | 37-05, 37-06 chuyển E2E |

**Mỗi đợt:**
1. Viết test.
2. Chạy hai lần để kiểm khả năng chạy lại.
3. Phân loại Fail.
4. Cập nhật mapping và coverage.

Sau cùng xuất đủ 7 báo cáo của Giai đoạn H. Ghi Round 1 vào Report 5.2 chỉ sau khi được xác nhận.

**Cần nhóm quyết định trước đợt 1–3:**
- phạm vi BR-42;
- BR-43 (lý do chênh lệch kiểm kho);
- nhận số âm / nhận vượt khi chuyển kho;
- culture số tiền;
- Expected của 4 ca mismatch ở mục 5.
