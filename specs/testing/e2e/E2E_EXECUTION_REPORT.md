# Báo cáo thực thi E2E – Report 5.3

- Cập nhật: 26/11/2026 · Nhánh `feature/e2e-test` (tách từ `feature/integration-test`, commit `fad89d9`). Code nghiệp vụ không đổi.
- Đã chạy: pilot (7 TC), **đợt 1 = sheet No 1–10** (UC-01 … UC-29, 64 TC), **đợt 2 = sheet No 11–20** (UC-30 … UC-45, 59 TC; mục 6), **đợt 3 = sheet No 21–29** (UC-46 … UC-83, 87 TC; mục 7) và **đợt 4 = 5 sheet NEW No 30–34** (37 TC; mục 8). Đã chạy đủ 247 TC của bản nháp.
- **Round 1 đợt 4 đã ghi** (theo yêu cầu 26/11/2026) cho 37 TC của 5 sheet NEW No 30–34 vào bản nháp: F (23 Passed, 14 Failed – SYS-TRF-N04 ghi Failed theo quyết định người phụ trách vì lỗi DEF-IT-01 tái hiện 8/11 lần), G = 26/11/2026, H = NinhHQ, O nối thêm "[Round 1 E2E 26/11/2026] …" (26 dòng). Sheet Test Statistics của bản nháp: **128 Passed, 67 Failed, 0 Pending, 52 N/A / 247 TC** (Test Coverage 100%, Success 65,6%). File gốc `Report5.3_System_Test.xlsx` không đổi.
- **Round 1 đợt 3 đã ghi** (theo yêu cầu 25/11/2026) cho 87 TC của sheet No 21–29 vào bản nháp: F, G = 25/11/2026, H = người phụ trách sheet (DatTD: No 21, 22, 24; QuanDN: No 23; NinhHQ: No 25; TamDM: No 26, 29; LucDT: No 27, 28), O nối thêm "[Round 1 E2E 25/11/2026] …". Sheet Test Statistics của bản nháp: **105 Passed, 53 Failed, 37 Pending, 52 N/A / 247 TC** (37 Pending là các ca NEW chưa chạy).
- **Round 1 đợt 2 đã ghi** (theo yêu cầu 25/11/2026) cho 59 TC của sheet No 11–20 vào bản nháp `docs/Report5.3_System_Test_NEW_draft.xlsx`:
  - F = Passed / Failed / N/A; G = 25/11/2026; H = người phụ trách sheet (NinhHQ: No 11–13, TamDM: No 14–18, DatTD: No 19–20).
  - O = nối thêm "[Round 1 E2E 25/11/2026] …" với phân loại, mã DEF và câu chữ thực tế. Ghi chú cũ giữ nguyên.
  - File gốc `Report5.3_System_Test.xlsx` không đổi.
  - Sheet Test Statistics của bản nháp: **68 Passed, 34 Failed, 93 Pending, 52 N/A / 247 TC** (gồm SYS-TRF-N05 thêm 25/11/2026).
- **Round 1 đã ghi** (theo yêu cầu 23/11/2026) cho 64 TC của sheet No 1–10 vào **bản nháp** `docs/Report5.3_System_Test_NEW_draft.xlsx`:
  - F = Passed / Failed / N/A; G = 23/11/2026; H = người phụ trách sheet (QuanDN: No 1–6, DatTD: No 7–10).
  - O = nối thêm "[Round 1 E2E 23/11/2026] …" với phân loại, mã DEF và câu chữ thực tế. Ghi chú cũ giữ nguyên.
  - File gốc `Report5.3_System_Test.xlsx` không đổi.
  - Sheet Test Statistics của bản nháp: 42 Passed, 17 Failed, 135 Pending, 52 N/A / 246 TC.

## 1. Môi trường

| Thành phần | Giá trị |
|---|---|
| Frontend | `next build` với `NEXT_PUBLIC_API_URL=http://localhost:5100`, `next start` cổng 3000 |
| Backend | `StockFlow.API.dll` (Debug), `ASPNETCORE_ENVIRONMENT=E2E`, cổng 5100, khoá JWT ngẫu nhiên mỗi lượt, không có khoá payOS |
| Database | `stockflow_e2e_test`, dựng lại từ `stockflow_e2e_template` (51 migration + seed) trước mỗi lượt; PostgreSQL 18.6 cục bộ |
| Trình duyệt | Chrome có sẵn (`channel: 'chrome'`), `locale vi-VN`, `timezoneId Asia/Ho_Chi_Minh` |
| Cấu hình | `workers: 1`, `retries: 0`, trace + ảnh khi Fail, video tắt (chưa có ffmpeg) |
| An toàn | Guard chỉ cho `stockflow_e2e_*` trên localhost; `stockflow_dev` không bị ghi ở mọi lượt (so `pg_stat_database`) |

## 2. Các lượt chạy

| Lượt | Phạm vi | Viewport | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|---|
| Pilot ×5 | 7 TC pilot | 1366 (×3, ×1 không reset), 1920 (×1) | 7/7 Passed mỗi lượt | ~31 s | Xem E2E_PILOT_REPORT.md |
| Đợt 1 – a | 64 TC | 1366 | 44 Passed, 15 Failed, 5 N/A | 323 s | **Bị thay thế:** BKG-08, RRQ-03 Passed nhờ tác dụng phụ của ROL-05 (xem mục 4) |
| Đợt 1 – P1 | 11 TC @p1 | 1920 | 11/11 Passed | 50 s | |
| Đợt 1 – b | 64 TC | 1366 | 42 Passed, 17 Failed, 5 N/A | 338 s | Sau khi sửa cách khôi phục ma trận |
| **Đợt 1 – c (chính thức)** | 64 TC | 1366 | **42 Passed, 17 Failed, 5 N/A** | 422 s | Giống hệt lượt b (0 ca khác nhau, 0 flaky) |

## 3. Kết quả đợt 1 theo sheet (lượt c)

| No | Sheet | TC | Passed | Failed | N/A | Thời gian |
|---|---|---|---|---|---|---|
| 1 | UC-01 Login | 4 | 4 | 0 | 0 | 12 s |
| 2 | UC-02 Logout | 2 | 2 | 0 | 0 | 6 s |
| 3 | UC-03 Change Password | 4 | 3 | 1 | 0 | 24 s |
| 4 | UC-04 Manage Accounts | 12 | 9 | 3 | 0 | 73 s |
| 5 | UC-10 Roles and Permissions | 8 | 5 | 3 | 0 | 42 s |
| 6 | UC-15 Warehouse Access | 5 | 4 | 1 | 0 | 24 s |
| 7 | UC-18 Pending Orders | 9 | 5 | 4 | 0 | 77 s |
| 8 | UC-23 Consolidate Orders | 11 | 7 | 1 | 3 | 47 s |
| 9 | UC-28 Return Request | 6 | 2 | 3 | 1 | 44 s |
| 10 | UC-29 Customer Debt | 3 | 1 | 1 | 1 | 19 s |
| | **Tổng** | **64** | **42** | **17** | **5** | ~6 phút test + 8 s chuẩn bị |

- Tỉ lệ đạt trên số TC thực thi được: 42 / 59 = 71,2%.
- Ca N/A (`test.skip` kèm lý do lấy từ Note của file): SYS-CON-01, SYS-CON-02, SYS-CON-06, SYS-RRQ-02, SYS-DEB-02.

### Phân loại 17 ca Failed

| Phân loại | Số TC | TC |
|---|---|---|
| AUTHORIZATION_BUG | 3 | SYS-ROL-06 (DEF-E2E-05); SYS-BKG-08, SYS-RRQ-03 (DEF-E2E-06) |
| BUSINESS_LOGIC_BUG | 1 | SYS-ROL-04 (DEF-E2E-04) |
| UI_BUG | 2 | SYS-ACC-02 (DEF-E2E-02); SYS-ACC-07 (DEF-E2E-03, kèm lệch SPEC) |
| SPEC_CODE_MISMATCH | 11 | SYS-ACC-06, SYS-ROL-08, SYS-WHA-04, SYS-PWD-04 (kèm DEF-E2E-07), SYS-BKG-04, SYS-BKG-07, SYS-BKG-09, SYS-CON-04, SYS-RRQ-05, SYS-RRQ-06, SYS-DEB-01 |

Chi tiết tái hiện, nguồn và đề xuất: [E2E_DEFECT_REPORT.md](E2E_DEFECT_REPORT.md).

**Quy ước khi giao diện chặn thao tác** nên không thể hiện thông báo như Expected (ẩn / khoá nút, select không có lựa chọn rỗng, ô số tự giới hạn):

- Ghi **Failed + SPEC_CODE_MISMATCH** (soft-fail), đính kèm thông báo backend khi gọi API làm bằng chứng.
- Không tự đổi tiêu chí cho Pass (quyết định 2–3).
- Nhóm xem xét: nếu chấp nhận "chặn trên UI" là đúng, cần cập nhật Expected trong Report 5.3.

## 4. Vấn đề cô lập dữ liệu đã phát hiện và xử lý

- **Hiện tượng:** ở lượt a, BKG-08 và RRQ-03 Passed; khi chạy riêng thì 403.
- **Nguyên nhân:** ROL-05 / ROL-06 khôi phục ma trận bằng `PUT /api/roles/feature-matrix`. API này tính lại quyền phân hệ cho mọi vai trò (`DeriveModulePermissionCodes`), nên SalesStaff có thêm SALES_DELETE / SALES_APPROVE.
- **Cách sửa trong test:** chụp và trả lại đúng các dòng của bảng `stockflow.jnc_role_permissions` (`fixtures/pg.ts`: `snapshotTable` / `restoreTable`). Chỉ cho phép bảng này, chỉ trên `stockflow_e2e_test`, trong một transaction. Đây là dọn dữ liệu test, không thay thao tác nghiệp vụ đang kiểm.
- **Sau khi sửa:** lượt b và c cho kết quả giống nhau. Hành vi gốc được ghi thành lỗi DEF-E2E-06.

## 5. Độ ổn định

- 0 ca flaky trong 2 lượt chính thức; không dùng retry.
- Ca chậm nhất là các ca soft-fail chờ thông báo (BKG-04 ~33 s: 3 lần chờ 10 s). Thời gian này có thể giảm khi Expected được thống nhất.
- 1920×1080: 11 ca P1 Passed; chưa thấy khác biệt bố cục.

## 6. Đợt 2 – sheet No 11–20 (chạy 25/11/2026)

Phạm vi: UC-30 Purchase Orders, UC-31 Goods Receipt, UC-34 Inbound Costs, UC-35 Sales Stock Issue, UC-37 Stock Transfer, UC-39 Stocktake, UC-41 Customer Returns, UC-43 Inventory Disposal, UC-44 Production Orders, UC-45 Material Requirement (59 TC, trong đó 16 N/A theo bản nháp).

### 6.1 Các lượt chạy

| Lượt | Viewport | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|
| Đợt 2 – a | 1366 | 15 Passed, 28 Failed, 16 N/A | 6,4 phút | **Bị thay thế.** Lỗi script: `docRef` không đọc `stockTransferId` (id = 0); API kiểm kho / xuất hủy / trả hàng nhập viết hoa (`/api/Stocktakes`) nên không bắt được response; chờ response 8 s trước khi xem toast 3,5 s |
| Đợt 2 – b | 1366 | 26 Passed, 17 Failed, 16 N/A | 4,1 phút | Sau khi sửa script. Còn 2 lỗi script (STK-05 dòng biến mất khi đổi tab lọc; DSP-03 dò lại ô nhập) đã sửa, không đổi kết quả Passed / Failed |
| **Đợt 2 – c (chính thức)** | 1366 | **26 Passed, 17 Failed, 16 N/A** | 3,6 phút | Giống hệt lượt b (0 ca khác nhau, 0 flaky) |
| Đợt 2 – P1 | 1920 | 7 / 7 Passed | 36 s | SYS-TRF-01 (pilot), POR-03, GRN-01, STK-01, DSP-01, PRO-01, CRT-01 |
| Hồi quy đợt 1 | 1366 | 43 Passed, 17 Failed, 5 N/A (64 TC đợt 1 + SYS-POS-N01) | 5,5 phút | Sau khi sửa fixture dùng chung (`docRef`, `backendError`, `cancelStocktake`): 64 / 64 ca giống lượt chính thức đợt 1 |

`stockflow_dev` không bị ghi ở mọi lượt (so `pg_stat_database`).

### 6.2 Kết quả theo sheet (lượt c)

| No | Sheet | TC | Passed | Failed | N/A |
|---|---|---|---|---|---|
| 11 | UC-30 Purchase Orders | 8 | 3 | 5 | 0 |
| 12 | UC-31 Goods Receipt | 12 | 6 | 4 | 2 |
| 13 | UC-34 Inbound Costs | 4 | 0 | 0 | 4 |
| 14 | UC-35 Sales Stock Issue | 4 | 0 | 0 | 4 |
| 15 | UC-37 Stock Transfer | 8 | 4 | 3 | 1 |
| 16 | UC-39 Stocktake | 6 | 3 | 2 | 1 |
| 17 | UC-41 Customer Returns | 7 | 2 | 1 | 4 |
| 18 | UC-43 Inventory Disposal | 4 | 3 | 1 | 0 |
| 19 | UC-44 Production Orders | 3 | 3 | 0 | 0 |
| 20 | UC-45 Material Requirement | 3 | 2 | 1 | 0 |
| | **Tổng** | **59** | **26** | **17** | **16** |

- Tỉ lệ đạt trên số TC thực thi được: 26 / 43 = 60,5%.
- N/A (`test.skip` kèm lý do từ Note): GRN-09, GRN-12, LCS-01..04, SIS-01..04, TRF-07, STK-03, CRT-02, CRT-05, CRT-06, CRT-07.

### 6.3 Phân loại 17 ca Failed

| Phân loại | Số TC | TC |
|---|---|---|
| AUTHORIZATION_BUG | 2 | SYS-POR-04, SYS-POR-05 (DEF-E2E-08: WarehouseStaff thiếu PURCHASE_UPDATE) |
| BUSINESS_LOGIC_BUG (lỗi đã biết Report 5.2) | 2 | SYS-TRF-06 (DEF-IT-02), SYS-STK-02 (DEF-IT-08) |
| NOT_IMPLEMENTED | 1 | SYS-GRN-03 (không có ô số lô / hạn dùng / vị trí; không có cờ hàng theo lô) |
| SPEC_CODE_MISMATCH | 12 | SYS-POR-06, POR-07, POR-08, GRN-05, GRN-07, GRN-08, TRF-03, TRF-04, STK-05, DSP-03, MRQ-03 (kèm NEEDS_CLARIFICATION), CRT-04 |

- 10 / 12 ca SPEC_CODE_MISMATCH là "UI chặn thao tác" (ẩn / khoá nút, ô số tự bỏ dấu "−" hoặc tự giới hạn, select không có lựa chọn trùng); backend trả đúng câu của Expected khi gọi API (bằng chứng trong annotation).
- GRN-05 và DSP-03 là lệch câu chữ: frontend kiểm trước với câu riêng (thiếu mã phiếu / thiếu tên hàng).
- MRQ-03: không dựng được tiền đề (định mức đã dùng cho lệnh không xóa được) → cần nhóm xác nhận lại Expected.

### 6.4 Người thao tác và ghi chú triển khai

- UC-30, 31, 39, 43: whstaff01 (WarehouseStaff, K001 + K002) cho actor "Warehouse Accountant". UC-37: e2e.wh.k001 (chỉ K001, kho xuất) và e2e.wh.k002 (chỉ K002, kho nhận). UC-44, 45: prodstaff01 (chỉ K002); MRQ-02 dùng tài khoản ProductionStaff riêng có 2 kho để đổi kho xem tồn.
- UC-41: sales01 (SalesStaff) vì phiếu trả lập trên POS (chức năng Trả hàng); code không có bước Thủ kho nhận / phân loại hàng trả. Ghi rõ trong annotation.
- SYS-STK-02: các thao tác thử khoá kiểm kho làm bằng Admin (đủ chức năng, đủ kho) để chỉ còn điều kiện khoá kiểm kho.
- Bằng chứng backend cho POR-07 / POR-08 gọi bằng Admin, vì WarehouseStaff nhận 403 (DEF-E2E-08) trước khi tới kiểm tra nghiệp vụ.
- Dữ liệu tiền đề (phiếu đặt, phiếu nhập, lệnh sản xuất, phiếu chuyển đang chuyển, phiếu kiểm tạm) dựng qua API bằng Admin; thao tác đang kiểm làm qua UI; DB chỉ dùng để kiểm (SELECT).

### 6.5 Độ ổn định

- 0 ca flaky giữa lượt b và c; không dùng retry.
- Ca chậm nhất: SYS-POR-06 (~20 s, 4 ý), SYS-DSP-03 (~11 s), SYS-STK-02 (~8 s, 5 thao tác).

## 7. Đợt 3 – sheet No 21–29 (chạy 25/11/2026)

Phạm vi: UC-46 Material Stock Issue, UC-49 Finished Goods Receipt, UC-51 Master Data, UC-58 Production, UC-62 Sales and Credit, UC-67 Purchasing and Receiving, UC-72 Manage Inventory, UC-79 Manage Returns, UC-83 Finance and Reports (87 TC, 31 N/A theo bản nháp).

### 7.1 Các lượt chạy

| Lượt | Viewport | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|
| Đợt 3 – a | 1366 | 29 Passed, 27 Failed, 31 N/A | 7,0 phút | **Bị thay thế.** Lỗi script: helper duyệt hạn mức không điền ô "Hạn mức mới *", bộ lọc trạng thái Chuyển hàng là chip, ghi chú nhận hiện dạng chữ, toast tắt trước khi đọc, kiểm quyền màn Kho khi trang còn đang tải |
| Đợt 3 – b | 1366 | 32 Passed, 24 Failed, 31 N/A | 6,4 phút | Sửa giữa lượt; còn lỗi script ở MSC-07, MIN-03, MRT-03/05, FIN-06, MST-07 |
| Đợt 3 – c | 1366 | 36 Passed, 20 Failed, 31 N/A | 5,7 phút | Còn MRT-05 (dò chữ "trừ vào công nợ" nằm trong title) |
| **Đợt 3 – d (chính thức)** | 1366 | **37 Passed, 19 Failed, 31 N/A** | 5,7 phút | So với lượt c chỉ MRT-05 đổi (do sửa script); 0 flaky |
| Đợt 3 – P1 | 1920 | 6 / 6 Passed | 35 s | MST-02, MIS-01, FGR-01, MPR-02, MSC-03, FIN-03 (lượt đầu MST-02 vướng danh sách gợi ý tìm kiếm che dòng hàng – đã đóng gợi ý bằng Escape) |
| Hồi quy | 1366 | 23 / 23 ca giống kết quả chính thức cũ | 1,6 phút | UC-23 (đợt 1), UC-39, UC-44, UC-45 (đợt 2) – các spec dùng helper đã sửa |

`stockflow_dev` không bị ghi ở mọi lượt.

### 7.2 Kết quả theo sheet (lượt d)

| No | Sheet | TC | Passed | Failed | N/A |
|---|---|---|---|---|---|
| 21 | UC-46 Material Stock Issue | 7 | 5 | 2 | 0 |
| 22 | UC-49 Finished Goods Receipt | 6 | 4 | 2 | 0 |
| 23 | UC-51 Master Data | 20 | 10 | 9 | 1 |
| 24 | UC-58 Production | 8 | 5 | 3 | 0 |
| 25 | UC-62 Sales and Credit | 9 | 5 | 1 | 3 |
| 26 | UC-67 Purchasing and Receiving | 6 | 2 | 0 | 4 |
| 27 | UC-72 Manage Inventory | 14 | 1 | 0 | 13 |
| 28 | UC-79 Manage Returns | 5 | 2 | 0 | 3 |
| 29 | UC-83 Finance and Reports | 12 | 3 | 2 | 7 |
| | **Tổng** | **87** | **37** | **19** | **31** |

- Tỉ lệ đạt trên số TC thực thi được: 37 / 56 = 66,1%.
- N/A (`test.skip` kèm lý do từ Note): MST-16; MSC-01, 08, 09; MPU-01, 02, 04, 05; MIN-01, 02, 04–14; MRT-01, 02, 04; FIN-01, 02, 08–12.

### 7.3 Phân loại 19 ca Failed

Cả 19 ca là **SPEC_CODE_MISMATCH** (không có lỗi nghiệp vụ / phân quyền mới):

| Nhóm | TC |
|---|---|
| Giao diện chặn thao tác, backend trả đúng câu Expected | MIS-02, MPR-06 (ý 2), MST-06 (ý 2, POS-003), MST-14, MSC-07 (MSG57) |
| Câu chữ khác (frontend kiểm trước với câu riêng) | MST-03, MST-04, FGR-05, FIN-04, FIN-07 |
| Đổi thuật ngữ "BOM" → "định mức" | MIS-06, MPR-05, MST-20 |
| Hành vi khác Expected | FGR-03 (chặn hẳn thay vì cảnh báo + ghi chú), MST-08 (hệ số quy đổi 0 không bị từ chối, code đổi thành 1) |
| Actor không có quyền màn Kho (chỉ Admin) | MST-01, MST-15, MST-17 |
| Tiền đề không dựng được (NEEDS_CLARIFICATION) | MPR-08 (không tạo được phiếu có ghi chú cảnh báo định mức vì hệ thống chặn duyệt vượt NVL) |

### 7.4 Người thao tác và ghi chú triển khai

- UC-46: prodstaff01, kho K002 (Procedure ghi K001 nhưng prodstaff01 chỉ có K002). UC-49: manager01 vì "Nhập thành phẩm" = "Duyệt hoàn thành" cần chức năng Lập lệnh sản xuất. UC-51, 58, 62, 67, 72, 79, 83: manager01; MSC-07 thêm e2e.manager2.
- UC-58: lệnh lập qua Kế hoạch sản xuất → "Lập lệnh sản xuất"; "cập nhật lệnh Chưa bắt đầu" là "Điều chỉnh định mức".
- Đơn vị quy đổi (MST-07) lưu trong `variants_json` của hàng hóa.
- Helper `ApprovalsPage.decide` (đợt 1) được sửa để điền đúng ô "Hạn mức mới *"; hồi quy cho thấy không đổi kết quả cũ.

### 7.5 Tổng hợp 3 đợt (210 TC gốc, sheet No 1–29)

| Đợt | TC | Passed | Failed | N/A |
|---|---|---|---|---|
| 1 (No 1–10) | 64 | 42 | 17 | 5 |
| 2 (No 11–20) | 59 | 26 | 17 | 16 |
| 3 (No 21–29) | 87 | 37 | 19 | 31 |
| **Tổng** | **210** | **105** | **53** | **52** |

## 8. Đợt 4 – 5 sheet NEW, No 30–34 (chạy 26/11/2026)

Phạm vi: NEW POS and Invoices (11), NEW Purchasing (4), NEW Inventory (8), NEW Master Data and Settings (6), NEW Cross-cutting (8) = 37 TC, không có N/A. Người phụ trách cả 5 sheet: NinhHQ.

### 8.1 Các lượt chạy

| Lượt | Viewport | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|
| Đợt 4 – a | 1366 | 17 Passed, 20 Failed | 6,8 phút | **Bị thay thế.** Lỗi script: đường dẫn API trả hàng nhập là `/api/PurchaseReturns`; so đường dẫn điều chỉnh tồn phân biệt hoa thường; cột bảng giá theo công thức hiện chữ (không phải ô nhập); công tắc là checkbox ẩn; kiểm kho lưu trữ sau khi mở trang; reset sai mảng token; toast tắt trước khi đọc; chống trùng PAY-016 với đơn đặt vừa tạo; màn Khách hàng không có "tín dụng còn lại" |
| Đợt 4 – b | 1366 | 20 ca lỗi chạy lại: 5 Passed, 15 Failed | 5,0 phút | Còn lỗi script ở PRB-N01 (thông báo antd che nút), SET-N02 (toast), ORD-N02, PUR-N04 (khớp nhầm tab "Lịch sử thanh toán"), XCT-N05 (Thủ kho không có chức năng Bán hàng) |
| Đợt 4 – c | 1366 | 23 Passed, 14 Failed | 5,9 phút | Còn PUR-N04 (tiền đề: phiếu nhập gốc chưa trả NCC nên tiền trả hàng tự trừ vào công nợ phiếu nhập) và PRB-N01 (đọc nhầm nhãn) |
| Đợt 4 – d | 1366 | 2 ca: 0 / 2 | 1,0 phút | Hàm dựng phiếu trả lấy `grId` làm id phiếu trả; ô tên bảng giá chặn bằng `required` của trình duyệt |
| Đợt 4 – e | 1366 | 23 Passed, 14 Failed | 5,1 phút | ORD-N03 lỗi thời điểm bấm "Hủy" khi chi tiết còn vẽ lại (đã sửa: bấm lại tới khi hộp hiện); TRF-N04 Passed |
| Chạy lặp 5 lần | 1366 | ORD-N03 5 / 5 Passed; TRF-N04 1 / 5 Passed | 1,9 phút | TRF-N04 tái hiện DEF-IT-01 4 / 5 lần |
| **Đợt 4 – f (chính thức)** | 1366 | **24 Passed, 13 Failed** | 5,0 phút | So với e: ORD-N03 Passed (sửa script), TRF-N04 Passed (lỗi tranh chấp, không ổn định); 0 flaky theo Playwright (không retry) |
| Đợt 4 – 1920 | 1920 | 23 Passed, 14 Failed | 4,9 phút | Giống lượt f trừ TRF-N04 (Failed) |

`stockflow_dev` không bị ghi ở mọi lượt (global teardown kiểm lại).

**SYS-TRF-N04 không ổn định:** tính cả các lượt a, b, c, e, f, 1920 và 5 lần chạy lặp, lỗi DEF-IT-01 (hai người cùng nhận đều HTTP 200, tồn K002 cộng hai lần) xuất hiện **8 / 11 lần**. Round 1 ghi Failed (KNOWN_DEFECT DEF-IT-01) theo quyết định người phụ trách 26/11/2026.

### 8.2 Kết quả theo sheet (lượt f)

| No | Sheet | TC | Passed | Failed | N/A |
|---|---|---|---|---|---|
| 30 | NEW POS and Invoices | 11 | 10 | 1 | 0 |
| 31 | NEW Purchasing | 4 | 1 | 3 | 0 |
| 32 | NEW Inventory | 8 | 5 (4 nếu TRF-N04 ghi Failed) | 3 (4) | 0 |
| 33 | NEW Master Data and Settings | 6 | 3 | 3 | 0 |
| 34 | NEW Cross-cutting | 8 | 5 | 3 | 0 |
| | **Tổng** | **37** | **24 (23)** | **13 (14)** | **0** |

### 8.3 Phân loại các ca Failed (13 ca lượt f + SYS-TRF-N04)

| Nhóm | TC |
|---|---|
| Lỗi đã biết của Report 5.2 / pilot, gặp lại qua giao diện | TRF-N03 (DEF-IT-03), TRF-N04 (DEF-IT-01, không ổn định), TRF-N05 (DEF-E2E-01), XCT-N02 (DEF-IT-04 – màn Nhập hàng) |
| Phân quyền (đã có mã) | PUR-N01 (DEF-E2E-08: Kế toán kho thiếu PURCHASE_UPDATE khi mở lại phiếu tạm để hoàn thành) |
| Lỗi mới | XCT-N06 (**DEF-E2E-09** UI_BUG: màn Hàng hóa chỉ hiện "Đang tải..." khi API ngừng, không báo lỗi) |
| Giao diện chặn thao tác, backend trả đúng câu Expected | INV-N01 (ý 2, 3), PRB-N01 (ý 2), SET-N01 (ý 2), PUR-N03 (ý 2), PUR-N04 (ý 2) |
| Hành vi khác Expected | ORD-N02 (bản in không có mã QR), XCT-N05 (Chuyển hàng không lọc theo chi nhánh header – cần nhóm xác nhận), PRD-N02 (dòng thiếu tên không bị báo – NEEDS_CLARIFICATION) |

### 8.4 Người thao tác và ghi chú triển khai

- POS, Hóa đơn: sales01 (K001). Mua hàng: N01 Kế toán kho e2e.wh.k001 (theo Pre); N02–N04 Pre không nêu vai trò → manager01. Kho: e2e.wh.k001 / e2e.wh.k002 / e2e.wh.k002b; TRF-N02 bước 2 whstaff01; INV-N01, INV-N02 manager01. Danh mục, bảng giá: manager01; thiết lập: admin (SET-N01 bước 4 manager01). XCT-N02 tài khoản Thủ kho không gán kho tạo riêng; XCT-N05 e2e.manager2 (cần K001 + K002 và chức năng Bán hàng).
- SET-N01, SET-N02 đổi thiết lập chung → khôi phục bản gốc qua API trong `finally`.
- Import Excel (PRD-N01/N02): file .xlsx dựng theo đúng cột của file mẫu (`fixtures/xlsx.ts`, không thêm package).
- In hóa đơn (ORD-N02, XCT-N07): nút In dựng phiếu trong iframe ẩn rồi gọi `print()`; test đọc nội dung iframe.
- API ngừng (XCT-N06): giả lập bằng chặn request trong trình duyệt, không dừng API thật.
- Tiền đề NCC trả tiền (PUR-N04): phiếu nhập gốc phải đã trả đủ NCC; nếu còn nợ, tiền trả hàng tự trừ vào công nợ phiếu nhập (NCC cần trả 0, không có nút Thanh toán).

### 8.5 Tổng hợp 4 đợt (247 TC của bản nháp)

| Đợt | TC | Passed | Failed | N/A |
|---|---|---|---|---|
| 1 (No 1–10) | 64 | 42 | 17 | 5 |
| 2 (No 11–20) | 59 | 26 | 17 | 16 |
| 3 (No 21–29) | 87 | 37 | 19 | 31 |
| 4 (No 30–34, NEW) | 37 | 24 (23) | 13 (14) | 0 |
| **Tổng** | **247** | **129 (128)** | **66 (67)** | **52** |

Số trong ngoặc: SYS-TRF-N04 ghi Failed (đã ghi Round 1 theo cách này).
