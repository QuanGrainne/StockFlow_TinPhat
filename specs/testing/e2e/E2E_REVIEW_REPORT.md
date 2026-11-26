# Báo cáo khảo sát và review E2E – Report 5.3 System Test (Phase A–D)

- Ngày: 23/11/2026 · Nhánh: `feature/e2e-test` (tạo từ `feature/integration-test`, commit `fad89d9`)
- Phạm vi lần này: khảo sát repository, review 210 TC của Report 5.3, đối chiếu frontend / backend, đề xuất NEW TEST CASE, thiết kế kiến trúc và kế hoạch pilot.
- **Chưa** viết test code, **chưa** sửa frontend, **chưa** ghi kết quả vào Excel, **chưa** cài package.
- Tài liệu kèm theo:
  - [E2E_COVERAGE_MATRIX.md](E2E_COVERAGE_MATRIX.md): truy vết từng TC gồm trang, API, bảng, loại, ưu tiên và đánh giá.
  - [E2E_ARCHITECTURE_AND_PILOT_PLAN.md](E2E_ARCHITECTURE_AND_PILOT_PLAN.md): kiến trúc, môi trường, database, pilot.
  - `docs/Report5.3_System_Test_NEW_draft.xlsx`: bản sao Excel có thêm 5 sheet NEW, chờ duyệt; file gốc không đổi.

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| TC gốc | 210 (29 sheet). Trong file: 158 Pending, 52 N/A |
| Phân loại | A (E2E) 125 · D (nhiều cấp, đã có ở 5.2) 27 · B (giao diện) 4 · C (Integration hơn) 1 · E (thiếu thông tin) 1 · NA 52 |
| Ưu tiên | P1 24 · P2 117 · P3 17 · N/A 52 |
| Description ≠ Expected (SPEC_CODE_MISMATCH) | 30 TC. Kiểm theo Expected, ghi khác biệt (quyết định 2) |
| Expected mơ hồ | 15 TC đã phân tích riêng: 13 có đề xuất điều kiện kiểm, 9 còn NEEDS_CLARIFICATION (một số TC có cả hai nhãn) |
| Dự kiến Fail vì lỗi đã biết | TC gốc: TRF-06 (DEF-IT-02), STK-02 (DEF-IT-08), FGR-02 (DEF-IT-06), FGR-04 (DEF-IT-05). NEW: TRF-N03 (DEF-IT-03), TRF-N04 (DEF-IT-01), XCT-N02 (DEF-IT-04) |
| NEW TEST CASE | 36 ca, nhóm 1–16 trừ nhóm 11, ở 5 sheet mới của bản nháp |
| Ngoài phạm vi | Kế hoạch sản xuất / duyệt kế hoạch / MRP (quyết định 5) |
| Bảo mật | `appsettings.json` (Git đang theo dõi) chứa mật khẩu thật của PostgreSQL cục bộ (mục 7.2) |

## 2. Nguồn đã đọc (Phase A)

| Nguồn | Trạng thái |
|---|---|
| `docs/Report5.3_System_Test.xlsx` | Đọc từ bản sao (file đang mở trong Excel). Lưu ý: file này **chưa được Git theo dõi** |
| `specs/*/spec.md` (18 module, chuẩn Expected / Existing) | Đọc phần FR, BR và luồng lỗi liên quan đến các TC mơ hồ |
| Report 5.1 Unit Test, Report 5.2 Integration Test và `specs/testing/integration-test/*` | Dùng để tham chiếu DEF-IT-01..08 và các ca có phần giao diện (C/D) |
| Source frontend | 42 trang trong `src/app`, `AppLayout`, `FeatureGuard`, `lib/api/client.ts`, `lib/auth/tabSession.ts`, `flags.ts`, các màn POS / Chuyển hàng / Login / Header |
| Source backend | `Program.cs`, `DatabaseSeeder`, 27 controller (214 endpoint), thông báo lỗi của các handler liên quan |
| Report 3 (Google Doc) | Không đọc lại lần này. Phần Expected của SPEC đã lấy từ Report 3 bản revised; nếu cần đối chiếu nguyên văn MSGxx thì phải đọc lại (mục 4.3) |

## 3. Khảo sát frontend và backend (Phase C)

### 3.1 Các điểm ảnh hưởng trực tiếp tới E2E

| # | Thực tế trong code | Ảnh hưởng và cách xử lý |
|---|---|---|
| 1 | CORS chỉ cho `http://localhost:3000` (`Program.cs:50`) | Frontend E2E bắt buộc chạy cổng 3000, nên phải tắt `npm run dev` trước khi chạy (quyết định 7). Backend chạy cổng 5100 |
| 2 | Frontend lấy địa chỉ API từ `NEXT_PUBLIC_API_URL` (client.ts và cả login page), giá trị bị gắn cố định lúc build | Build với `NEXT_PUBLIC_API_URL=http://localhost:5100`. Script kiểm tra giá trị này trong bản build trước khi chạy |
| 3 | `DEV_AUTO_LOGIN_ENABLED` chỉ bật khi `NODE_ENV=development` | `next build` + `next start` không tự đăng nhập admin |
| 4 | Migrate và seed chạy khi API khởi động. Nếu lỗi thì chỉ ghi log, API vẫn chạy tiếp (`Program.cs`) | Script chờ `/api/health`, rồi tự kiểm tra bảng `__EFMigrationsHistory` và bản ghi seed; thiếu thì dừng |
| 5 | `appsettings.json` trỏ `stockflow_dev`. Môi trường Development còn nạp thêm `appsettings.Development.json` (máy này không có file đó, nhưng máy người khác có thể có, kèm khoá payOS) | Chạy API với `ASPNETCORE_ENVIRONMENT=E2E`, `--no-launch-profile`, `ConnectionStrings__StockFlowDb` trỏ `stockflow_e2e_test`. Kiểm tra tên database trước khi khởi động |
| 6 | Seeder chỉ tạo vai trò, 5 tài khoản (admin, manager01, sales01, whstaff01, prodstaff01), kho K001–K004, đơn vị, quyền, 8 nhà cung cấp, bảng giá chung. **Không có** hàng hóa, khách hàng hay tồn kho | Mọi dữ liệu nghiệp vụ (hàng, khách, tồn) phải dựng qua API trước mỗi test, có hậu tố riêng |
| 7 | Kho được gán sẵn: admin K001–K004; manager01 K001–K003; sales01 K001, K003; whstaff01 K001, K002; prodstaff01 K002 | Cần tạo thêm tài khoản qua API (quyết định 9): chỉ K001, chỉ K002, không kho, Manager thứ hai, tài khoản đổi mật khẩu |
| 8 | Phiên lưu ở sessionStorage của từng tab, có bản sao trong localStorage. Tab mới chép bản sao này ở lần truy cập đầu (`tabSession.ts`) | `storageState` của Playwright chỉ lưu localStorage, nên về lý thuyết vẫn dùng được nhờ cơ chế chép. **Phải kiểm chứng ở pilot** (quyết định 14). Lưu ý bản sao còn mang theo màn và kho đang chọn |
| 9 | 401 trên phiên cũ thì xoá phiên rồi chuyển `/login`. Không có middleware chặn route phía server | Ca chưa đăng nhập (SYS-XCT-N03, SYS-OUT-01/02) kiểm bằng hành vi chuyển hướng phía client |
| 10 | Không có `data-testid` nào. Login có `label htmlFor`; POS có placeholder và title rõ ("Tìm hàng hóa (F3)", "Tìm khách hàng (F4)", nút THANH TOÁN) | Dùng `getByLabel`, `getByPlaceholder`, `getByRole`, `getByText`. Danh sách testid đề xuất sau pilot (quyết định 10) |
| 11 | 51 chỗ dùng `confirm()` / `alert()` gốc của trình duyệt (Nhân viên, Vai trò, Phân quyền kho, POS, Bảng giá, Hàng hóa, Chuyển hàng) | Playwright mặc định đóng hộp thoại, nghĩa là confirm trả về **false**. Cần helper `page.on('dialog')`: kiểm nội dung rồi chấp nhận |
| 12 | Thông báo dùng antd `message` (toast) và toast tự viết (`showToast`); antd `Modal` dùng ở hộp công nợ và duyệt tín dụng | Kiểm thông báo theo text; chờ toast bằng `expect(...).toBeVisible()`, không dùng `waitForTimeout` |
| 13 | payOS gọi qua backend `/api/payments/payos` (dịch vụ ngoài) | Giả lập bằng `page.route` ở trình duyệt; không đặt biến `PayOS__*` |
| 14 | Avatar seed tải từ `images.unsplash.com` | Chặn hoặc trả ảnh giả bằng `page.route`, để test không phụ thuộc mạng ngoài |
| 15 | Mặc định không cho bán âm kho và không cho bán hàng đang giữ (`MstOrderSetting`); POS chặn bấm trùng trong 3 giây (PAY-016) | Dùng làm điều kiện kiểm cho SYS-POS-N04/N05/N06 |

### 3.2 Đối chiếu route với Report 5.3

| Route có trong code | TC trong 5.3 | Ghi chú |
|---|---|---|
| `/login`, Header | UC-01, 02, 03 | Đủ |
| `/staff`, `/roles`, `/roles/permissions`, `/roles/warehouses` | UC-04, 10, 15 | Đủ |
| `/pos` | Không có ca bán hàng; chỉ chạm tới ở CON-07/08/11, MST-06 | Thiếu → NEW-POS |
| `/orders`, `/orders/[id]` | Chỉ có MSC-02 (xem) | Thiếu → NEW-ORD |
| `/sales-booking`, `/sales-returns`, `/approvals`, `/customers`, `/suppliers` | UC-18, 23, 28, 29, 41, 62, 79, 83 | Thiếu luồng đặt hàng → POS → NEW-POS-N07/N08 |
| `/purchase-orders(/create)`, `/purchases(/create)`, `/purchase-returns(/create)` | UC-30, 31 | Thiếu nhập trực tiếp và hoàn tiền NCC → NEW-PUR |
| `/transfers(/create)`, `/stocktakes(/create)`, `/disposals(/create)` | UC-37, 39, 43 | Thiếu huỷ chuyển kho ở IN_TRANSIT/RECEIVED và huỷ kiểm kho đã cân bằng → NEW-TRF/STK |
| `/products`, `/products/pricing`, `/products/price-books`, `/price-books` | UC-51 | Thiếu import Excel, điều chỉnh tồn, thẻ kho, bảng giá → NEW-PRD/INV/PRB |
| `/settings/orders` | Không có | → NEW-SET |
| `/warehouses`, `/bom`, `/production`, `/production/material-issues`, `/production/finished-goods` | UC-44..58 | Đủ |
| `/production/plans`, `/production/plan-approvals`, `/production/mrp` | Không có | **Ngoài phạm vi** (quyết định 5) |
| `/dashboard` (dashboard Admin), `/inventory`, `/reports` (chuyển về dashboard) | UC-72, 83 (N/A) | Giữ N/A |

## 4. Review Report 5.3 (Phase B)

### 4.1 Description (SRS) khác Expected (code / quyết định nhóm): 30 TC

Kiểm theo **Expected**, ghi SPEC_CODE_MISMATCH trong ghi chú kết quả. Không sửa Description hay Expected.

| Nhóm | TC |
|---|---|
| Quyết định nhóm đã ghi trong Note | ACC-07, WHA-05 (tài khoản không kho); TRF-05 (xuất vượt tồn); STK-01 (cân bằng ngay, không qua duyệt) |
| Code làm khác SRS (một vai trò, không có bước duyệt, chứng từ riêng) | LOG-02, ROL-07, STK-02, STK-06, DSP-01, RRQ-01, RRQ-03, CRT-01, GRN-11, CON-03, MIS-06, FGR-04, MST-07, MST-12, FIN-06 |
| SRS có thêm yêu cầu mà Expected không kiểm | PWD-01 (huỷ phiên khác), STK-05 (lý do chênh lệch, DEF-IT-07), MST-02 (theo dõi lô), DEB-01 (nợ quá hạn), ROL-06 |
| Chức năng xem ở màn khác với SRS | MSC-02, MPU-03, MPU-06, MIN-03, MRT-03, MRT-05 |

### 4.2 Expected mơ hồ: phân tích từng TC (quyết định 3)

Cách làm với từng ca: xác định hành vi cần kiểm → đối chiếu SPEC → đối chiếu code → đề xuất điều kiện kiểm. Đề xuất **không thay** Expected trong Excel. Sau khi bạn duyệt, đề xuất này được dùng làm điều kiện kiểm và ghi vào ma trận.

| TC | Hành vi cần kiểm | SPEC | Code | Điều kiện kiểm đề xuất | Trạng thái |
|---|---|---|---|---|---|
| ACC-01 | Mỗi thao tác trên màn Nhân viên có thông báo kết quả | accounts FR-ACC-05; reset mật khẩu ngoài SRS | Toast "Đã thêm nhân viên mới <tên>", "Đã cập nhật thông tin nhân viên <tên>", "Đã khóa tài khoản <tên>"; reset dùng `confirm()`, chỉ có `alert` khi lỗi | Danh sách tải (GET /api/staff 200) + 3 toast trên + DB thay đổi tương ứng | ORACLE_PROPOSED; thông báo **reset thành công**: NEEDS_CLARIFICATION |
| ROL-06 | Bỏ hết quyền của Admin | FR-ROLE-04 "Có": Admin luôn toàn quyền | `UserPermissionService` cho Admin luôn qua | Sau khi lưu ma trận rỗng, Admin vẫn mở /staff và lưu được; ghi lại màn có chặn lưu hay không | ORACLE_PROPOSED |
| BKG-08 | Huỷ đơn đặt có cọc | pending-orders BR-08/09 | Lựa chọn giữ tiền làm khoản trả trước hoặc hoàn tiền | Đơn CANCELLED; tồn không đổi; giữ tiền → tăng tiền khách trả trước; hoàn → có phiếu chi | ORACLE_PROPOSED; **trường lý do huỷ** chưa thấy: NEEDS_CLARIFICATION |
| RRQ-06 | Lưu phiếu trả không có hàng hoặc không lý do | FR-RET-02 "Một phần" (lý do tự do) | "Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0." | Thông báo trên + không có dòng mới ở `trx_return_requests`; lý do không bắt buộc → ghi mismatch | ORACLE_PROPOSED |
| DEB-01 | Dư nợ, hạn mức, tín dụng còn lại, nợ quá hạn | FR-CRD-01 "Một phần": chưa có quá hạn | Màn Khách hàng có dư nợ và hạn mức | Ba số đầu trên màn bằng DB; phần quá hạn ghi chưa có | ORACLE_PROPOSED + MISMATCH |
| POR-06 | 4 lỗi khi tạo PO | purchase-orders | "Phiếu đặt hàng nhập phải có ít nhất 1 mặt hàng.", "Số lượng đặt phải lớn hơn 0.", "Đơn giá không được âm." | Ba thông báo trên + không tạo PO | ORACLE_PROPOSED; lỗi **thiếu nhà cung cấp** không thấy ở backend: NEEDS_CLARIFICATION |
| GRN-03 | Nhận hàng theo lô | FR-GR-02 "Một phần": không bắt buộc lô, không vị trí; BR-27 | Form /purchases có số lô; chưa thấy hạn dùng và cờ theo dõi lô | Có `mst_inventory_lots` + `lot_id` ở tồn kho | NEEDS_CLARIFICATION (hạn dùng, vị trí) |
| GRN-06 | Nhận vượt số đặt | FR-GR-03 "Chưa có"; E31.2 → MSG33 | `ReceivePurchaseOrderCommand` không kiểm | Không tạo phiếu nhập; lũy kế ≤ số đặt. Dự kiến **Fail** | ORACLE_PROPOSED; nội dung MSG33: NEEDS_CLARIFICATION |
| TRF-06 | Nhận vượt số xuất | FR-TRF-05 "Chưa có"; BR-40; E37.2 → MSG46 | Không kiểm (DEF-IT-02) | Phiếu không sang RECEIVED; tồn kho nhận không đổi | KNOWN_DEFECT + ORACLE_PROPOSED |
| CRT-03 | Khách không nợ trả hàng | BR-21 Refund Due | Tiền trả khách ≤ tổng; khách lẻ phải trả đủ | Tiền trả = giá trị → có phiếu chi, dư nợ không âm | ORACLE_PROPOSED; ca **tiền trả = 0**: NEEDS_CLARIFICATION |
| MRQ-03 | Lệnh có BOM bị xoá | BR-06: BOM đã dùng không xoá được | `OrderNotFound` = MSG16 | Không dựng được qua UI. Đề xuất thay bằng lệnh không tồn tại → "Không tìm thấy lệnh sản xuất hoặc lệnh không còn khả dụng." | NEEDS_CLARIFICATION (loại E) |
| MST-01 | Mở 6 màn danh mục và lưu | master-data | — | Chỉ kiểm mở được 6 màn (API 200, bảng hiển thị); phần lưu đã có ở MST-02..20 | ORACLE_PROPOSED; cần bạn đồng ý thu hẹp |
| MST-02 | Tạo hàng có theo dõi lô | BR-27 | Không thấy trường theo dõi lô | Kiểm các trường còn lại; phần lô ghi chưa có | ORACLE_PROPOSED + MISMATCH |
| MST-08 | Hệ số quy đổi ≤ 0 | BR-26, E51.1 | Không thấy kiểm ở backend | Không lưu được, không có `mst_unit_conversions` hệ số ≤ 0. Dự kiến **Fail** | ORACLE_PROPOSED; nội dung thông báo: NEEDS_CLARIFICATION |
| MPR-06 | Số lượng 0, hạn quá khứ, huỷ sau xuất NVL | E58.2 | "Hạn hoàn thành không được trước ngày hôm nay." (`ProductionOrderRules.ValidateDeadline`) | Thông báo này + thông báo huỷ có sẵn trong Expected | ORACLE_PROPOSED |

### 4.3 Lỗi đã biết từ Report 5.2 (quyết định 11)

| Lỗi | Mức | Ca E2E dự kiến Fail |
|---|---|---|
| DEF-IT-01: thao tác đồng thời trên một phiếu chuyển | Critical | SYS-TRF-N04 (NEW) |
| DEF-IT-02: nhận vượt số xuất | High | SYS-TRF-06 |
| DEF-IT-03: nhận số âm bị đổi thành 0 | Medium | SYS-TRF-N03 (NEW) |
| DEF-IT-04: tài khoản không kho thấy mọi phiếu nhập | High | SYS-XCT-N02 (NEW) |
| DEF-IT-05: nhập thành phẩm vượt kế hoạch vẫn bị chặn | Medium | SYS-FGR-04 |
| DEF-IT-06: duyệt hoàn thành nhưng lệnh vẫn IN_PROGRESS | Medium | SYS-FGR-02 |
| DEF-IT-07: dòng chênh lệch kiểm kho không bắt buộc lý do | Medium | Không có TC nào kiểm (Expected của STK-05 chỉ kiểm số âm) → chỉ ghi chú |
| DEF-IT-08: phạm vi khoá kiểm kho | Cần quyết định | SYS-STK-02 (ý 2); GRN-09 và TRF-07 giữ N/A theo file |

Các ca này chạy và Fail thật, được phân loại KNOWN_DEFECT kèm mã lỗi. Không dùng `test.fail()`.

### 4.4 Ca N/A (52) → `test.skip` kèm lý do

UC-23 (CON-01/02/06), UC-28 (RRQ-02), UC-29 (DEB-02), UC-31 (GRN-09/12), UC-34 (4), UC-35 (4), UC-37 (TRF-07), UC-39 (STK-03), UC-41 (CRT-02/05/06/07), UC-51 (MST-16), UC-62 (MSC-01/08/09), UC-67 (MPU-01/02/04/05), UC-72 (13), UC-79 (MRT-01/02/04), UC-83 (FIN-01/02/08–12). Lý do lấy từ cột Note của file.

### 4.5 Vấn đề chung của file (không sửa, chỉ ghi nhận)

1. Phần môi trường ở sheet Test Cases còn ghi build `c60ea62` (nhánh dev) và cổng API 5000. Round 1 sẽ ghi commit thực tế trong cột Note, không sửa ô môi trường.
2. Actor trong file chưa ánh xạ sang tài khoản. Đề xuất: Sales Accountant = SalesStaff (`sales01`), Warehouse Accountant = WarehouseStaff (`whstaff01`), Production Accountant = ProductionStaff (`prodstaff01`), Manager = `manager01`, Admin = `admin`, cộng các tài khoản tạo qua API.
3. Một số TC gộp nhiều kiểm tra (BKG-04, POR-06, FGR-05, STK-02, WHA-02). Test viết từng bước (`test.step`) để biết bước nào Fail; kết quả TC là Fail nếu có bất kỳ bước nào Fail.

## 5. NEW TEST CASE (36 ca, nhóm 1–16 trừ nhóm 11)

Đã ghi vào `docs/Report5.3_System_Test_NEW_draft.xlsx`:

- 5 sheet mới chép định dạng từ sheet UC-01 (cùng cột A–O, khối Round 1–3, công thức đếm).
- Thêm dòng 30–34 ở Test Cases (có liên kết tới sheet) và ở Test Statistics. Dòng Sub total đổi thành SUM 10–43; ba dòng tỉ lệ tự dời theo.
- Mã có hậu tố `N` (ví dụ `SYS-POS-N01`) để không trùng mã gốc. Round 1 = Pending. Cột Note ghi "NEW TEST CASE … Basis: …".
- Người phụ trách tạm ghi NinhHQ.
- Cover và 29 sheet gốc không đổi nội dung: so từng ô thì chỉ khác giá trị công thức đã tính và cách lưu xuống dòng. Tổng thống kê sau khi thêm: 246 TC (194 Pending, 52 N/A).

| Nhóm | Sheet | TC | Căn cứ chính |
|---|---|---|---|
| 1 POS | NEW POS and Invoices | POS-N01 bán tiền mặt (pilot), N02 bán nợ trong hạn mức, N03 khách lẻ phải trả đủ, N04 vượt tồn, N05 hàng đang giữ, N06 bấm trùng | /pos, POST /api/orders/pos, SPEC sales-stock-issue (Trường hợp A), 5.2 POS |
| 2 Đặt hàng → POS | NEW POS and Invoices | POS-N07 giao đủ → FINISHED, N08 giao một phần → đơn chờ | INT-SBK-13-01 |
| 3 Hóa đơn | NEW POS and Invoices | ORD-N01 danh sách / chi tiết, N02 phiếu in có QR, N03 huỷ hóa đơn | /orders, INT-POS-08-02 |
| 4 Cài đặt chứng từ | NEW Master Data and Settings | SET-N01 tiền tố / quy tắc mã, N02 cho bán âm kho | /settings/orders, 5.2 Order Settings |
| 5 Nhập trực tiếp | NEW Purchasing | PUR-N01 lưu tạm → hoàn thành, N02 huỷ phiếu nhập | /purchases/create |
| 6 Trả NCC + hoàn tiền | NEW Purchasing | PUR-N03 trả hàng, N04 thu tiền hoàn | /purchase-returns |
| 7 Chuyển kho | NEW Inventory | TRF-N01 huỷ IN_TRANSIT, N02 huỷ RECEIVED, N03 nhận số âm, N04 nhận đồng thời | quyết định nhóm (note TRF-02), DEF-IT-01/03 |
| 8 Kiểm kho | NEW Inventory | STK-N01 huỷ phiếu đã cân bằng | quyết định nhóm (note STK-04) |
| 9 Hàng hóa | NEW Inventory / NEW Master Data and Settings | INV-N01 điều chỉnh tồn, INV-N02 thẻ kho, PRD-N01/N02 import Excel | 5.2 Product Stock Adjustment / Import |
| 10 Bảng giá | NEW Master Data and Settings | PRB-N01 công thức giá, N02 chọn bảng giá trên POS | INT-PRB-03-05 |
| 12 Chặn quyền | NEW Cross-cutting | XCT-N01 URL không có quyền, N02 tài khoản không kho | FeatureGuard, DEF-IT-04 |
| 13 Phiên | NEW Cross-cutting | XCT-N03 chưa đăng nhập, N04 mỗi tab một tài khoản | INT-AUT-37-05/06 |
| 14 Chi nhánh | NEW Cross-cutting | XCT-N05 đổi chi nhánh ở header | useActiveWarehouse |
| 15 Lỗi API | NEW Cross-cutting | XCT-N06 API không phản hồi | thay phần "stop the API" của các ca N/A |
| 16 Định dạng / bố cục | NEW Cross-cutting | XCT-N07 tiền và ngày kiểu VN, N08 hiển thị ở 1366x768 | môi trường của 5.3 |

Ca còn chỗ chưa chắc: PRD-N02 (import một phần hay tất cả-hoặc-không) là NEEDS_CLARIFICATION; POS-N05 sẽ ghi lại câu chữ thực tế ở lần chạy đầu. Các thông báo trích trong Expected đều lấy từ code.

## 6. Luồng liên module (đề xuất, chưa đưa vào Excel)

Các luồng này ghép từ TC đã có, không tạo dòng mới trong Excel. Mỗi luồng là một file `tests/flows/*.spec.ts`, các bước gắn mã TC tương ứng. Chờ bạn xác nhận.

| Luồng | Các bước (mã TC) |
|---|---|
| FLOW-01 Bán hàng | Tạo KH (MST-09) → POS bán nợ (POS-N02) → thu tiền (FIN-03) → trả hàng (CRT-01) → kiểm dư nợ và tồn |
| FLOW-02 Mua hàng | PO (POR-02/03) → nhập một phần, rồi nhập đủ (GRN-02/01) → trả NCC (PUR-N03) → chi tiền (FIN-05) |
| FLOW-03 Chuyển kho | Hai người dùng K001 / K002: xuất (TRF-01) → nhận thiếu có ghi chú (TRF-08) → kiểm tồn hai kho |
| FLOW-04 Kiểm kho | Phiếu kiểm DRAFT chặn thao tác (STK-02) → cân bằng (STK-01) → huỷ phiếu (STK-N01) |
| FLOW-05 Sản xuất | BOM (MST-18/19) → lệnh (MPR-02) → xuất NVL (MIS-01) → nhập TP (FGR-01) → hoàn thành (FGR-02) |
| FLOW-06 Tín dụng | Vượt hạn mức (CON-11) → gửi yêu cầu (CON-08) → Manager duyệt (MSC-03/04) → bán lại (CON-09) |
| FLOW-07 Đặt hàng | Đặt + cọc (BKG-02, CON-05) → gộp đơn (CON-03) → xuất hóa đơn trên POS (POS-N07) |
| FLOW-08 Thu hồi quyền | Người dùng đang đăng nhập; Admin thu hồi kho / quyền / khoá tài khoản (WHA-04, ROL-05, ACC-11) |

## 7. Ngoài phạm vi và phát hiện khác

### 7.1 OUT OF SCOPE: kế hoạch sản xuất / MRP (quyết định 5)

- Code có trang `/production/plans`, `/production/plan-approvals`, `/production/mrp`, 20 endpoint (`/api/production/plans/*`, `/api/production/mrp/*`) và các bảng `trx_production_plans`, `trx_mrp_runs`, `dtl_mrp_run_*`. Tài liệu nằm ở `specs/production-planning-*`, `specs/mrp`.
- Report 5.3 không có TC nào. Report 5.2 có sheet "Production Plan Approval" (7 TC).
- Không đưa vào bộ E2E chính thức cho đến khi nhóm xác nhận phạm vi Report 3. FLOW 04 trong prompt gốc (Tạo kế hoạch → BOM → Duyệt → Nhu cầu NVL) cũng chưa làm.

### 7.2 Bảo vệ thông tin kết nối (quyết định 13)

Không in hay chép giá trị mật khẩu nào. Mật khẩu chỉ được so sánh bằng phép bằng nhau trong script.

| File | Git theo dõi? | Nội dung nhạy cảm |
|---|---|---|
| `StockFlow_Backend/StockFlow.API/appsettings.json` | **Có** | `ConnectionStrings:StockFlowDb` có mật khẩu; `Jwt:SecretKey` |
| `StockFlow_Backend/StockFlow.API/Properties/launchSettings.json` | Có | Không có bí mật (cổng 5000, Development) |
| `appsettings.Development.json.example`, `appsettings.IntegrationTest.local.json.example`, `deploy/.env.example` | Có | Giá trị mẫu |
| `appsettings.Development.json`, `appsettings.IntegrationTest.local.json`, `StockFlow_Frontend/.env.local`, `deploy/.env` | Bị ignore | File thật (máy này chỉ có `appsettings.IntegrationTest.local.json`) |

**Phát hiện:**

- Mật khẩu trong `appsettings.json` **trùng với mật khẩu thật** của PostgreSQL cục bộ mà Integration Test đang dùng.
- File này có trong Git từ commit `91692b0` (13/10/2026) và `4affa4a` (14/10/2026), và đã được đẩy lên remote `origin` trên GitHub. Chưa kiểm được repo công khai hay riêng tư vì máy không có `gh`.
- Vì nằm trong lịch sử Git, nên coi như **đã lộ** với mọi người có quyền đọc repo, kể cả khi sửa file từ bây giờ.
- `Jwt:SecretKey` trùng với khoá trong file mẫu (khoá dev), không dùng cho bản deploy (deploy đọc `JWT_SECRET_KEY`).

**Đề xuất (chờ bạn quyết định, tôi không tự làm):**

1. Đổi mật khẩu user PostgreSQL cục bộ nếu mật khẩu này còn dùng ở chỗ khác. Sau đó cập nhật file local đã ignore của từng người.
2. Đưa chuỗi kết nối thật ra khỏi `appsettings.json`: giữ một placeholder không có mật khẩu, còn giá trị thật để trong `appsettings.Development.json` (đã ignore), `dotnet user-secrets` hoặc biến môi trường `ConnectionStrings__StockFlowDb`. Đây là thay đổi cấu hình dùng chung, nên cần nhóm đồng ý và báo trước cho mọi người.
3. Không viết lại lịch sử Git (cần force push, ảnh hưởng cả nhóm) trừ khi nhóm quyết định. Nếu repo công khai thì ưu tiên làm bước 1.
4. Riêng E2E: chuỗi kết nối chỉ đọc từ biến môi trường hoặc `StockFlow.E2ETests/.env.e2e.local` (đã ignore). Log che mật khẩu. Database bắt buộc đúng tên `stockflow_e2e_test` / `stockflow_e2e_template`.

### 7.3 Phát hiện khác (không sửa)

1. `docs/Report5.3_System_Test.xlsx` chưa được Git theo dõi. Bản nháp NEW cũng chưa commit.
2. `CreateTransferScreen.tsx` có `catch (err: any)`, trái quy ước "không `any`" (có từ trước).
3. Bộ SPEC (`specs/*/spec.md`) ghi hiện trạng ở commit `dbb58c0` (12/11). Phần "Existing" có thể đã cũ với các chức năng làm sau ngày đó (ví dụ SPEC production ghi "Chưa có" nhưng code đã có).

## 8. Điểm cần bạn xác nhận trước pilot

> **Cập nhật 23/11/2026:** người phụ trách chọn "làm theo đề xuất" cho các điểm 1–5:
> - 13 điều kiện kiểm được duyệt, gồm cả thu hẹp MST-01 và thay tiền đề MRQ-03;
> - NEEDS_CLARIFICATION: kiểm theo hành vi và ghi câu chữ thực tế;
> - 36 NEW được duyệt, người phụ trách NinhHQ;
> - 8 luồng đưa vào `tests/flows`;
> - thêm `typescript`, `@types/node`, `@types/pg`.
>
> Điểm 6 (bảo mật): chỉ làm bước 4 (E2E đọc thông tin kết nối từ `.env.e2e.local` đã ignore). Bước 1–3 sửa cấu hình dùng chung nên vẫn chờ nhóm quyết định (quyết định 13). Kết quả pilot: [E2E_PILOT_REPORT.md](E2E_PILOT_REPORT.md).

1. Duyệt các điều kiện kiểm đề xuất ở mục 4.2 (13 ca ORACLE_PROPOSED). Riêng MST-01 (thu hẹp còn mở màn) và MRQ-03 (thay tiền đề) cần bạn đồng ý rõ.
2. Với 9 điểm NEEDS_CLARIFICATION (nội dung MSG33/MSG46, thông báo reset mật khẩu, lý do huỷ đơn đặt, hạn dùng lô, trả tiền = 0, hệ số quy đổi, nhà cung cấp trống, import một phần): nhóm trả lời được thì dùng câu trả lời. Nếu không, đề xuất kiểm hành vi (không tạo dữ liệu) và ghi câu chữ thực tế vào Note.
3. Duyệt 36 NEW trong bản nháp Excel, và người phụ trách các sheet NEW (đang tạm ghi NinhHQ).
4. Có đưa 8 luồng ở mục 6 vào bộ E2E không (không thêm dòng Excel)?
5. Package dev-only phục vụ TypeScript chặt: `typescript`, `@types/node`, `@types/pg` (xem kế hoạch kiến trúc, mục 3).
6. Bảo mật mục 7.2: chọn bước 1–3 nào sẽ làm và ai làm.
