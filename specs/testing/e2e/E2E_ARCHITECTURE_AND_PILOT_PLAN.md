# Kiến trúc E2E và kế hoạch Pilot – Report 5.3 (Phase D)

- Ngày: 23/11/2026 · Nhánh: `feature/e2e-test`
- Tài liệu này là thiết kế. Chưa tạo project, chưa cài package, chưa viết test. Mọi bước dưới đây chờ bạn xác nhận ([E2E_REVIEW_REPORT.md](E2E_REVIEW_REPORT.md) mục 8).

## 1. Ràng buộc (theo 15 quyết định đã chốt)

- **Nguồn TC:** 210 TC SYS-* của Report 5.3 cộng NEW sau khi duyệt. 52 ca N/A viết `test.skip` kèm lý do. Report 5.2 chỉ để tham chiếu.
- **Điều kiện kiểm:** theo cột Expected; khác Description thì ghi SPEC_CODE_MISMATCH. Expected mơ hồ thì dùng điều kiện đã duyệt hoặc đánh NEEDS_CLARIFICATION.
- **Không sửa:** code nghiệp vụ, CORS, frontend (trong pilot), Excel gốc, Unit Test, Integration Test.
- **Database:** chỉ `stockflow_e2e_test` / `stockflow_e2e_template` trên PostgreSQL cục bộ. Sai tên thì dừng ngay.
- **Lỗi đã biết:** DEF-IT-01..08 để Fail thật, phân loại KNOWN_DEFECT.
- **Excel:** chỉ ghi F/G/H/O sau khi bạn xác nhận, trên bản sao.

## 2. Cấu trúc thư mục

Project đặt ở gốc repo, có `package.json` riêng, không nằm trong `StockFlow_Frontend` nên không ảnh hưởng `npm run lint` hay `npm run build` của frontend.

```
StockFlow.E2ETests/
  package.json            scripts: e2e:prepare, e2e:pilot, e2e:test, e2e:report, typecheck
  playwright.config.ts
  tsconfig.json           strict, noImplicitAny, không include thư mục frontend
  .env.e2e.example        mẫu biến môi trường (không có mật khẩu thật)
  .gitignore              .env.e2e.local, .auth/, playwright-report/, test-results/, reports/raw/
  scripts/
    db-guard.ts           kiểm tên DB, host, quyền; sai thì dừng
    db-template.ts        dựng bản mẫu: tạo DB rỗng → chạy API để migrate + seed → dừng API
    db-reset.ts           DROP ... WITH (FORCE) + CREATE ... TEMPLATE ... STRATEGY FILE_COPY
    stack.ts              build frontend, khởi động / dừng API (5100) và Next (3000), kiểm cổng trống
  fixtures/
    env.ts                đọc và kiểm biến môi trường
    api.ts                API client cho Arrange (đăng nhập admin qua API, tạo tài khoản, hàng, khách, tồn)
    db.ts                 truy vấn chỉ đọc để Assert (pg)
    auth.ts               đăng nhập theo vai trò; storageState (sau khi pilot kiểm chứng)
    data.ts               hậu tố duy nhất theo lượt chạy + test (vd E2E-<runId>-<n>)
    dialogs.ts            xử lý confirm()/alert(): kiểm nội dung rồi chấp nhận
    network.ts            giả lập payOS, chặn images.unsplash.com
  pages/                  Page Object, chỉ khi dùng lại nhiều lần
    LoginPage.ts  AppShell.ts (Header, Sidebar, chọn chi nhánh)  PosPage.ts  TransferPages.ts
  tests/
    authentication/  admin/  sales/  purchasing/  inventory/  production/  master-data/  finance/
    new/             5 file theo 5 sheet NEW
    flows/           luồng liên module (nếu được duyệt)
  reports/                tóm tắt JSON để ghi Round 1 sau này
```

Tên file test theo sheet, ví dụ `tests/inventory/uc-37-stock-transfer.spec.ts`. Ma trận đầy đủ ở [E2E_COVERAGE_MATRIX.md](E2E_COVERAGE_MATRIX.md).

## 3. Package (chưa cài; chờ duyệt)

| Package | Phiên bản đề xuất (ghim chính xác) | Loại | Mục đích | Tương thích |
|---|---|---|---|---|
| `@playwright/test` | 1.65.1 | dev | Test runner, trình duyệt tự động, HTML report, trace, video | Yêu cầu Node ≥ 20; máy có Node 26.7.0 / npm 11.19.0 |
| `pg` | 8.23.1 | dev | Kiểm tên DB, reset từ bản mẫu, truy vấn kiểm kết quả | PostgreSQL 18.6 trên máy |
| `typescript` | bản 5.x hiện hành | dev | `tsc --noEmit` kiểm kiểu chặt (Playwright chỉ dịch, không kiểm kiểu) | **Cần duyệt thêm** |
| `@types/node`, `@types/pg` | khớp Node 26 / pg 8 | dev | Kiểu cho `process.env` và `pg`, để không phải dùng `any` | **Cần duyệt thêm** |

- Không cần `dotenv`: Node ≥ 20.6 đọc file env sẵn (`process.loadEnvFile`).
- Trình duyệt: dùng Chrome đã cài (`channel: 'chrome'`, có sẵn) và Edge (`channel: 'msedge'`, có sẵn), không tải trình duyệt riêng của Playwright.
- Tên và lý do từng package sẽ ghi trong PR (quy tắc 00 #4).

## 4. Môi trường chạy

| Thành phần | Cấu hình |
|---|---|
| Frontend | `NEXT_PUBLIC_API_URL=http://localhost:5100 npm run build`, sau đó `next start -p 3000`. Chỉ chạy khi cổng 3000 trống (bạn tắt `npm run dev` trước); nếu cổng bận, script dừng và báo, không tự kill tiến trình |
| Backend | `dotnet run --project StockFlow.API --no-launch-profile` với: `ASPNETCORE_ENVIRONMENT=E2E` (không nạp `appsettings.Development.json`), `ASPNETCORE_URLS=http://localhost:5100`, `ConnectionStrings__StockFlowDb=<chuỗi E2E>`, `Jwt__SecretKey=<khoá ngẫu nhiên mỗi lượt>`, `Storage__UploadsPath=<thư mục tạm>`, `Seed__DemoData=true`; không đặt `PayOS__*` |
| Database | `stockflow_e2e_template` (bản mẫu) và `stockflow_e2e_test` (mỗi lượt chạy), trên localhost:5432 |
| Bí mật | `StockFlow.E2ETests/.env.e2e.local` (đã ignore) hoặc biến môi trường `STOCKFLOW_E2E_PG`. Log che mật khẩu |
| Thứ tự | guard → reset DB → khởi động API (migrate + seed) → chờ `/api/health` và kiểm `__EFMigrationsHistory` → tạo tài khoản phụ qua API → build/start Next → Playwright → dừng tiến trình do script mở |

## 5. Database và dữ liệu

1. **Guard (bắt buộc, chạy trước mọi thao tác):**
   - Tách tên database và host từ chuỗi kết nối. Chỉ chấp nhận `stockflow_e2e_test` / `stockflow_e2e_template` trên `localhost` / `127.0.0.1`. Mọi tên khác (kể cả `stockflow_dev`) thì dừng với mã lỗi.
   - Sau khi API khởi động, gọi `SELECT current_database()` qua `pg` để xác nhận lại.
2. **Bản mẫu:** dựng lại khi danh sách migration thay đổi.
   - Tạo DB rỗng, chạy API trỏ vào bản mẫu để `Program.cs` migrate và seed, rồi dừng API.
   - Lưu danh sách migration đã áp vào `reports/raw/template.json`.
   - Không chạy SQL schema bằng tay. Schema do migration quản lý.
3. **Mỗi lượt chạy:**
   - `DROP DATABASE stockflow_e2e_test WITH (FORCE)` rồi `CREATE DATABASE stockflow_e2e_test TEMPLATE stockflow_e2e_template STRATEGY FILE_COPY`. Làm việc này **trước** khi API khởi động, nên không cắt kết nối của API đang chạy.
   - Seeder chạy lại khi API khởi động (idempotent). Phân quyền kho mẫu chỉ được gán khi bảng trống, nên phân quyền tạo qua API vẫn giữ.
4. **Tài khoản phụ** (tạo qua API bằng admin, quyết định 9):
   - `e2e.wh.k001` (WarehouseStaff, chỉ K001), `e2e.wh.k002` (chỉ K002), `e2e.wh.k002b` (người thứ hai của K002, dùng cho TRF-N04);
   - `e2e.nowh` (có vai trò, không kho), `e2e.manager2` (Manager thứ hai, MSC-07), `e2e.pwd` (đổi mật khẩu), `e2e.locked` (bị khoá).
   - Mật khẩu là mật khẩu mặc định khi tạo nhân viên, đọc từ biến môi trường; không ghi trong code.
5. **Dữ liệu từng test:**
   - Hàng, khách, tồn được dựng qua API trong `beforeEach` / `test.step('Arrange')`, mã có hậu tố duy nhất. Tồn dựng bằng `POST /api/products/{id}/stock-adjustments` hoặc phiếu nhập, để thẻ kho và giá vốn nhất quán.
   - Không dùng SQL để thay thao tác nghiệp vụ. Truy vấn DB chỉ để kiểm kết quả.
6. **Dọn dữ liệu:** cả DB được dựng lại mỗi lượt. Trong một lượt, các test không dùng chung bản ghi (mỗi test có hàng, khách, phiếu riêng). Thiết lập dùng chung (`/settings/orders`) được đặt lại về mặc định trong `afterEach` của các test làm thay đổi nó.

## 6. Đăng nhập và phiên

- **Test xác thực** (UC-01/02/03, XCT-N03/N04): luôn đăng nhập qua UI, mỗi test một browser context mới.
- **Test nghiệp vụ:**
  - `globalSetup` đăng nhập qua UI mỗi vai trò một lần và lưu `storageState` (localStorage).
  - Cơ chế này dựa trên việc `tabSession` chép localStorage sang sessionStorage ở lần truy cập đầu, nên **pilot phải kiểm chứng**: context mới mở từ storageState thì header hiện đúng tên người dùng, và request API mang đúng token.
  - Nếu không ổn định: chuyển sang `addInitScript` ghi token lấy từ API vào cả sessionStorage và localStorage trước khi trang chạy, rồi ghi lý do vào báo cáo pilot.
  - Kho làm việc nằm trong bản sao phiên, nên mỗi test tự chọn chi nhánh ở header, không dựa vào giá trị lưu sẵn.
- **Nhiều người dùng** (TRF-01/04, MSC-07, ACC-11, ROL-05, XCT-N04): mỗi người một `browser.newContext()`.

## 7. Selector và kiểm kết quả

- **Ưu tiên selector:** `getByLabel` (login), `getByPlaceholder` (POS: "Tìm hàng hóa (F3)", "Tìm khách hàng (F4)"), `getByRole('button', { name: 'THANH TOÁN' })`, `getByText` cho toast và tiêu đề. Không dùng selector CSS phụ thuộc cấu trúc DOM.
- **Component antd** (Select, DatePicker, Table, Pagination): helper nhỏ dựa trên role và text.
- **data-testid:** chỗ nào vẫn không ổn định thì ghi vào danh sách đề xuất data-testid sau pilot (vị trí, lý do), chờ bạn duyệt rồi mới sửa frontend.
- **Hộp thoại gốc:** `dialogs.ts` đăng ký `page.on('dialog')`, so nội dung với mẫu rồi `accept()`; hộp thoại ngoài dự kiến thì làm test Fail.
- **Mỗi ca quan trọng kiểm 3 tầng:**
  1. UI (thông báo, trạng thái, số liệu hiển thị);
  2. API (`waitForResponse`: endpoint, mã, nội dung chính);
  3. DB (`fixtures/db.ts`: trạng thái chứng từ, `trx_inventory_balances`, `trx_inventory_transactions` với reference_type/reference_id, công nợ).
- **Không** chỉ kiểm mã HTTP hoặc chỉ kiểm toast.
- **Chờ** theo điều kiện (`expect(...).toBeVisible()`, `waitForResponse`, `expect.poll` cho DB), không dùng `waitForTimeout`.

## 8. Cấu hình Playwright

| Mục | Giá trị |
|---|---|
| Song song | `workers: 1`, `fullyParallel: false` |
| Retry | `retries: 0`. Chỉ dùng `--retries=1` khi chẩn đoán flaky, và ghi lại |
| Timeout | test 90 s, expect 10 s, navigation 30 s (chỉnh sau pilot theo số đo thật) |
| Ngữ cảnh | `locale: 'vi-VN'`, `timezoneId: 'Asia/Ho_Chi_Minh'`, `baseURL: http://localhost:3000` |
| Project | `chrome-1366` (Chrome, 1366x768) và `chrome-1920` (Chrome, 1920x1080). Edge (`msedge-1366`) chỉ chạy smoke khi cần |
| Bằng chứng | `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` |
| Báo cáo | `html`, `json` (để ghi Round 1), `list` |

Chạy cả hai viewport sẽ gấp đôi thời gian. Pilot sẽ đo thời gian rồi đề xuất: chạy toàn bộ ở 1366, còn 1920 chạy toàn bộ hoặc chỉ nhóm P1.

## 9. Truy vết

- **Tên test** bắt đầu bằng mã TC thật, ví dụ `test('SYS-TRF-01 – Xuất chuyển rồi nhận đủ', ...)`.
- **Annotation:** `{ type: 'tc', description: 'SYS-TRF-01' }`, `{ type: 'sheet', description: 'UC-37 Stock Transfer' }`, `{ type: 'known-defect', description: 'DEF-IT-02' }`, `{ type: 'mismatch', description: '...' }`.
- **Bước:** mỗi bước Arrange / Act / Assert là một `test.step` mang số bước của cột Procedure.
- **Ca N/A:** `test.skip(true, 'N/A – <lý do từ Note>')`.
- **Ghi Round 1:** sau khi bạn xác nhận, script đọc báo cáo JSON để ghi F (Passed / Failed / N/A), G (ngày), H (người phụ trách sheet), O (phân loại lỗi + mã DEF). Script làm trên bản sao Excel, như cách đã làm với Report 5.2.

## 10. Báo cáo sẽ có

| File | Khi nào |
|---|---|
| E2E_REVIEW_REPORT.md, E2E_COVERAGE_MATRIX.md, E2E_ARCHITECTURE_AND_PILOT_PLAN.md | Đã có (Phase A–D) |
| E2E_PILOT_REPORT.md | Sau pilot |
| E2E_IMPLEMENTATION_REPORT.md | Sau khi triển khai |
| E2E_EXECUTION_REPORT.md, E2E_DEFECT_REPORT.md, E2E_FINAL_REPORT.md | Sau khi chạy toàn bộ |

Trạng thái được tách riêng: đã review ≠ đã triển khai ≠ đã PASS.

## 11. Kế hoạch Pilot (Phase E–G)

**Phạm vi** (quyết định 6): SYS-LOG-01, SYS-LOG-02, SYS-LOG-03, SYS-LOG-04, SYS-OUT-01, SYS-POS-N01 (NEW, bán tiền mặt), SYS-TRF-01 (hai người dùng `e2e.wh.k001` và `e2e.wh.k002`).

Lưu ý: SYS-LOG-02 là SPEC_CODE_MISMATCH (một vai trò mỗi tài khoản). Pilot vẫn chạy theo Expected để thử cách ghi mismatch.

**Các bước**

1. Tạo `StockFlow.E2ETests/`, cài 2 package đã duyệt (thêm 3 package kiểu nếu được duyệt). Ghi baseline: `dotnet build` (số cảnh báo), `npm run lint`, `npm run build` của frontend, danh sách route.
2. Viết `db-guard`. **Thử âm:** cố tình trỏ `stockflow_dev` thì script phải dừng trước khi kết nối ghi.
3. Dựng bản mẫu, reset, khởi động API và Next theo mục 4. Kiểm migration, seed và `NEXT_PUBLIC_API_URL` trong bản build.
4. Viết 7 test và các fixture tối thiểu (env, api, db, auth, data, dialogs, network) và Page Object Login, AppShell, POS, Transfer.
5. Chạy 3 lượt liên tiếp ở `chrome-1366`, 1 lượt ở `chrome-1920`. Mỗi lượt reset DB.
6. Kiểm cô lập: chạy lại bộ pilot lần thứ hai trên cùng DB (không reset) để chứng minh hậu tố duy nhất giúp test không đụng nhau. Ghi kết quả, không dùng cách này làm cách chạy chính.

**Tiêu chí đánh giá pilot**

| Tiêu chí | Đạt khi |
|---|---|
| Ổn định | 3 lượt liên tiếp cùng kết quả, 0 ca flaky, không retry |
| Dữ liệu | Mỗi test tự dựng dữ liệu; kết quả DB (tồn K001/K002, thẻ kho, trạng thái phiếu, hóa đơn) khớp Expected |
| Xác thực | storageState được kiểm chứng (hoặc đã chuyển sang phương án dự phòng, có ghi lý do); LOG-03/04 hiện đúng thông báo |
| Phân quyền | TRF-01 chạy với hai tài khoản chỉ có một kho; tài khoản K002 không xuất được phiếu từ K001 |
| Thời gian | Ghi thời gian chuẩn bị (build, migrate) và thời gian chạy từng test; mục tiêu chạy pilot dưới 5 phút, không tính build |
| Truy vết | HTML/JSON report hiện mã TC, sheet, bước; trace và ảnh chụp có khi Fail |
| An toàn | Guard chặn được DB sai; `stockflow_dev` không bị chạm (so số dòng một bảng trước/sau); không in mật khẩu ra log |
| Không ảnh hưởng | Unit Test (532/7/5) và Integration Test giữ nguyên; frontend lint/build không đổi |

**Đầu ra pilot** (Phase G, chờ bạn xác nhận trước khi làm hàng loạt):

- `E2E_PILOT_REPORT.md` (kết quả, số đo, vấn đề).
- Danh sách đề xuất data-testid.
- Điều chỉnh kiến trúc nếu cần.
- Dòng AI_LOG.

## 12. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Cổng 3000 bị dev server chiếm | Script kiểm trước và dừng, không tự kill |
| Next 16 build lâu (vài phút) | Build một lần mỗi lượt; chỉ build lại khi frontend đổi |
| storageState không mang phiên vào tab | Phương án `addInitScript` (mục 6) |
| antd Select / DatePicker khó chọn | Helper riêng; nếu vẫn không ổn định thì đưa vào danh sách data-testid |
| Hộp thoại gốc bị tự đóng | `dialogs.ts` bắt buộc cho mọi test |
| Thời gian chạy hai viewport | Đo ở pilot, đề xuất phạm vi cho 1920 |
| Thông báo đổi câu chữ | Chỉ kiểm nguyên văn khi Expected trích nguyên văn; còn lại kiểm nghĩa và dữ liệu |
| Đồng thời (TRF-N04) không tái hiện ổn định | Dùng `Promise.all` hai context, kiểm hậu quả trong DB (tồn chỉ cộng một lần); ghi số lần thử |
