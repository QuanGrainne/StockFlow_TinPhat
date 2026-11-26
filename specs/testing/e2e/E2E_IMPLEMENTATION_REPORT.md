# Báo cáo triển khai E2E – StockFlow.E2ETests

- Cập nhật: 26/11/2026 (thêm đợt 2 = sheet No 11–20, đợt 3 = sheet No 21–29, đợt 4 = 5 sheet NEW No 30–34) · Nhánh `feature/e2e-test`
- Project riêng ở gốc repo, không nằm trong frontend / backend, nên không ảnh hưởng `npm run lint` / `build` của frontend hay Unit Test / Integration Test.

## 1. Package (ghim chính xác, chỉ devDependencies)

| Package | Phiên bản | Mục đích |
|---|---|---|
| `@playwright/test` | 1.65.1 | Test runner, điều khiển trình duyệt, báo cáo HTML / JSON, trace |
| `pg` | 8.23.1 | Guard database, dựng lại DB từ mẫu, truy vấn kiểm kết quả, chụp / khôi phục bảng phân quyền |
| `typescript` | 5.9.3 | `tsc --noEmit` kiểm kiểu chặt (cùng bản frontend) |
| `@types/node` | 26.6.6 | Kiểu cho Node 26 |
| `@types/pg` | 8.23.1 | Kiểu cho `pg` (không dùng `any`) |

Không tải trình duyệt Playwright và ffmpeg; dùng Chrome / Edge đã cài.

## 2. Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `playwright.config.ts` | 1 worker, không retry, `chrome-1366` / `chrome-1920` (Edge khi `E2E_EDGE=1`), trace và ảnh khi Fail, video tắt trừ khi `E2E_VIDEO=1` |
| `fixtures/env.ts` | Đọc `.env.e2e.local` / biến môi trường; **guard** tên DB (`stockflow_e2e_test` / `_template`) và host (localhost) |
| `fixtures/pg.ts` | Kết nối có kiểm `current_database()`; DROP / CREATE chỉ cho DB E2E; `queryRows` chỉ SELECT; `snapshotTable` / `restoreTable` chỉ cho `jnc_role_permissions` |
| `fixtures/stack.ts` | Kiểm cổng trống (không tự dừng tiến trình của người dùng), build API, dựng DB mẫu, khởi động / dừng API và Next |
| `fixtures/global-setup.ts`, `global-teardown.ts` | Chuẩn bị lượt chạy, tạo 5 tài khoản phụ qua API, ghi tóm tắt và kiểm `stockflow_dev` không đổi |
| `fixtures/test.ts` | `test` mở rộng: `env`, `adminApi`, `db`, `uid` (hậu tố duy nhất), `dialogs` (ghi và kiểm `confirm` / `alert`), chặn mạng ngoài + giả lập payOS, `newUserContext` cho luồng nhiều người dùng, `traceTc` |
| `fixtures/accounts.ts`, `data.ts`, `sales.ts`, `inventory.ts`, `dbq.ts`, `ui.ts` | Dựng dữ liệu qua API (hàng, tồn, khách, hạn mức, đơn đặt, hóa đơn, phiếu trả, yêu cầu tín dụng, chứng từ kho nháp, phiếu chuyển đang chuyển); truy vấn kiểm; `seeMessage`, `uiBlocksAction`, `makeAccount`, `captureTexts` (bắt toast chỉ hiện thoáng qua trước khi trang tự chuyển) |
| `fixtures/purchasing.ts`, `production.ts` (đợt 2) | Phiếu đặt hàng nhập, nhập hàng theo phiếu đặt, hủy phiếu đặt; lệnh sản xuất (BOM → kế hoạch → duyệt → lập lệnh), xuất NVL, duyệt hoàn thành |
| `pages/*.ts` | Page Object theo giao diện thật: Login, AppShell (menu, chi nhánh, đổi mật khẩu, đăng xuất), Staff, Roles / Ma trận / Phân quyền kho, POS, Đặt hàng, Duyệt hạn mức, Khách hàng, Chuyển hàng; đợt 2 thêm `PurchasingPages` (Đặt hàng nhập, Nhập hàng, Trả hàng nhập), `InventoryPages` (Kiểm kho, Xuất hủy), `ProductionPages` (Lệnh sản xuất); `navMap.ts` đọc `NAV_GROUPS` từ frontend |
| `tests/authentication`, `tests/admin`, `tests/sales` | Đợt 1: 10 file, 64 TC (sheet No 1–10) |
| `tests/purchasing`, `tests/inventory`, `tests/production`, `tests/sales/uc-41-*` | Đợt 2: 10 sheet No 11–20 (59 TC, 16 N/A); `uc-37` gồm cả ca pilot SYS-TRF-01 |
| `tests/production/uc-46|49|58-*`, `tests/master-data`, `tests/manager` | Đợt 3: 9 sheet No 21–29 (87 TC, 31 N/A); page object thêm `MaterialIssuePage`, `FinishedGoodsPage`, `ProductionPlansPage` (ProductionPages), `MasterDataPages` (Hàng hóa, Khách hàng, Nhà cung cấp, Định mức); truy vấn kiểm `fixtures/dbq3.ts`; `fixtures/production.ts` thêm `arrangeApprovedPlan`, tuỳ chọn xuất bổ sung / SL lỗi; `readToast` đọc toast ngay khi hiện |
| `tests/new` (đợt 4) | 5 sheet NEW No 30–34, 37 TC: `new-pos-and-invoices` (POS-N01..N08, ORD-N01..N03), `new-purchasing` (PUR-N01..N04), `new-inventory` (TRF-N01..N05, STK-N01, INV-N01, INV-N02), `new-master-data-settings` (PRD, PRB, SET), `new-cross-cutting` (XCT-N01..N08) |
| `fixtures/dbq4.ts`, `fixtures/xlsx.ts` (đợt 4) | Truy vấn kiểm hóa đơn / đơn đặt, thẻ kho theo kho, bảng giá, thiết lập đơn hàng; dựng file .xlsx tối giản theo cột file mẫu hàng hóa (ZIP stored + CRC-32, không thêm package). `fixtures/purchasing.ts` thêm phiếu nhập trực tiếp và phiếu trả hàng nhập (`/api/PurchaseReturns`) |

## 3. Quy ước

1. Tên test bắt đầu bằng mã TC thật; annotation `tc`, `sheet`, `SPEC_CODE_MISMATCH`, `observed`, `note`. Bước Procedure / Expected là `test.step`.
2. Thao tác đang kiểm làm qua UI; API chỉ dựng tiền đề, DB chỉ kiểm kết quả. Ngoại lệ duy nhất là khôi phục bảng phân quyền sau ROL-05 / ROL-06 (dọn dữ liệu test).
3. Ca N/A: `test.skip(true, 'N/A – <lý do từ Note>')`.
4. Giao diện chặn thao tác nên không thấy thông báo Expected: `uiBlocksAction` (soft-fail + bằng chứng backend), không đổi tiêu chí.
5. Không dùng `waitForTimeout`; chờ theo điều kiện (`expect`, `waitForResponse`, `expect.poll`, `toPass`).
6. Selector theo role / label / placeholder / text tiếng Việt. Chỗ phải dùng vị trí đã được liệt kê trong đề xuất `data-testid` (E2E_PILOT_REPORT.md mục 5, chờ duyệt).

## 4. Lệnh

```bash
cd StockFlow.E2ETests
npm ci                                   # cài 5 package đã ghim
npx tsc --noEmit                         # kiểm kiểu
npx playwright test --grep @pilot --project=chrome-1366
npx playwright test tests/authentication tests/admin tests/sales/uc-18* tests/sales/uc-23* tests/sales/uc-28* tests/sales/uc-29* --project=chrome-1366   # đợt 1
npx playwright test tests/purchasing tests/inventory tests/production/uc-44* tests/production/uc-45* tests/sales/uc-41-customer-returns.spec.ts --project=chrome-1366   # đợt 2
npx playwright test tests/production/uc-46* tests/production/uc-49* tests/production/uc-58* tests/master-data tests/manager --project=chrome-1366   # đợt 3
npx playwright test tests/new --project=chrome-1366   # đợt 4 (5 sheet NEW)
npx playwright test tests/new --project=chrome-1920   # đợt 4 chạy cả 37 TC ở 1920
npx playwright test --grep @p1 --project=chrome-1920
npx playwright show-report reports/html
```

Trước khi chạy:
- tắt `npm run dev` và API dev (cổng 3000 / 5100 phải trống);
- tạo `.env.e2e.local` từ `.env.e2e.example`.

Lần đầu sẽ dựng database mẫu và build frontend (vài phút).
