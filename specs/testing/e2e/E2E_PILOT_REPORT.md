# Báo cáo Pilot E2E – Report 5.3 (Phase E–G)

- Ngày: 23/11/2026 · Nhánh: `feature/e2e-test` · Project: `StockFlow.E2ETests/` (Playwright 1.65.1, TypeScript)
- Phạm vi pilot (quyết định 6): SYS-LOG-01, SYS-LOG-02, SYS-LOG-03, SYS-LOG-04, SYS-OUT-01, SYS-POS-N01 (NEW), SYS-TRF-01 (hai người dùng).
- **Chưa** triển khai hàng loạt, **chưa** sửa frontend hay code nghiệp vụ, **chưa** ghi kết quả vào Excel. Báo cáo này là cổng Phase G, chờ bạn xác nhận.

## 1. Kết quả

| TC | Sheet | Kết quả (5 lượt) | Thời gian / lượt | Ghi chú |
|---|---|---|---|---|
| SYS-LOG-01 | UC-01 Login | Passed 5/5 | 1,3–1,5 s | Menu kỳ vọng tính từ `my-features` + `NAV_GROUPS`; kho kỳ vọng lấy từ `jnc_user_warehouse_access` |
| SYS-LOG-02 | UC-01 Login | Passed 5/5 | 3,4–3,6 s | Ghi SPEC_CODE_MISMATCH: code chỉ cho một vai trò mỗi tài khoản; kiểm theo Expected |
| SYS-LOG-03 | UC-01 Login | Passed 5/5 | 0,7–1,0 s | Thêm bước theo Description: tên không tồn tại cũng nhận cùng thông báo |
| SYS-LOG-04 | UC-01 Login | Passed 5/5 | 2,9–3,2 s | Admin khoá qua UI (có `confirm()`), DB `is_active = false`, đăng nhập bị chặn |
| SYS-OUT-01 | UC-02 Logout | Passed 5/5 | 2,2–2,6 s | Token bị xoá ở sessionStorage và localStorage; `/purchases` chuyển về `/login` |
| SYS-POS-N01 | NEW POS and Invoices | Passed 5/5 | 3,6–3,7 s | Hóa đơn, tổng tiền, tồn K001 −2, đúng một dòng thẻ kho `ISSUE_SALE` −2 |
| SYS-TRF-01 | UC-37 Stock Transfer | Passed 5/5 | 5,3–5,5 s | Hai browser context (K001 xuất, K002 nhận). Phải tự ghi giờ nhận vì DEF-E2E-01 (mục 4) |

Năm lượt gồm:
- 3 lượt liên tiếp ở `chrome-1366`, mỗi lượt dựng lại database;
- 1 lượt ở `chrome-1920`;
- 1 lượt không reset database (`E2E_SKIP_RESET=1`) để thử cô lập dữ liệu.

Mọi lượt đều 7/7 Passed, 0 Failed, 0 flaky, 0 retry.

## 2. Đánh giá theo tiêu chí pilot

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Ổn định | Đạt | 5/5 lượt cùng kết quả; thời gian mỗi test lệch nhau dưới 0,3 s giữa các lượt; `retries: 0` |
| Dữ liệu | Đạt | Hàng hóa, tồn và tài khoản khóa được dựng qua API cho từng test, có hậu tố `<runId>-<worker>-<n>`. Kiểm DB: `trx_orders`, `trx_stock_issues`, `trx_inventory_balances`, `trx_inventory_transactions`, `trx_stock_transfers`, `dtl_stock_transfer_items`, `sec_users`, `jnc_user_roles`, `jnc_user_warehouse_access` |
| Cô lập | Đạt | Lượt không reset: 5 tài khoản phụ đã có sẵn nhưng 7/7 vẫn Passed nhờ dữ liệu riêng của từng test |
| Xác thực | Đạt | Đăng nhập qua UI; thông báo sai mật khẩu và tài khoản bị khoá đúng nguyên văn. `storageState` đã được kiểm chứng (mục 3) |
| Phân quyền | Đạt | Menu theo chức năng được cấp; bộ chọn kho chỉ có kho được gán; TRF-01 dùng hai tài khoản mỗi người một kho |
| Thời gian | Đạt | Chuẩn bị môi trường ~8 s (build API 1,7 s, dựng lại DB 1,2–1,5 s, khởi động API 3,2 s, Next 1,0 s, tài khoản 0,8 s); 7 test ~21 s; tổng ~31 s. Lần đầu dựng DB mẫu ~10 s; build frontend vài phút |
| Truy vết | Đạt | Tên test bắt đầu bằng mã TC; annotation `tc`, `sheet`, `SPEC_CODE_MISMATCH`, `note`; mỗi bước Procedure / Expected là một `test.step`. Báo cáo HTML ở `reports/html`, JSON ở `reports/results.json` |
| An toàn database | Đạt | Thử âm: `Database=stockflow_dev` → dừng "[E2E GUARD] Database 'stockflow_dev' không được phép"; `Host=10.0.0.5` → dừng; cả hai trước bước build / khởi động (log chuẩn bị không thêm dòng, cổng 3000 / 5100 vẫn trống). Thống kê ghi của `stockflow_dev` (đọc `pg_stat_database` từ database bảo trì) không đổi ở cả 5 lượt. Log chỉ in `postgres://<user>:***@...` |
| Tiến trình | Đạt | Sau mỗi lượt, API và Next do test mở đều đã dừng; test không bao giờ dừng tiến trình của bạn (cổng bận thì báo lỗi rồi dừng) |
| Không ảnh hưởng | Đạt | `git diff` trên StockFlow_Backend và StockFlow_Frontend trống. `dotnet build StockFlow.sln`: 0 cảnh báo, 0 lỗi. `npm run lint`: 236 vấn đề (123 lỗi, 113 cảnh báo), đều có từ trước. `next build` đạt, 45 route (42 trang + `/_not-found` + 2 icon) |

## 3. Môi trường đã dựng (Phase E)

- **Package** (ghim chính xác, cài trong `StockFlow.E2ETests/`): `@playwright/test` 1.65.1, `pg` 8.23.1, `typescript` 5.9.3 (trùng bản frontend), `@types/node` 26.6.6, `@types/pg` 8.23.1.
  - Không tải trình duyệt của Playwright; dùng Chrome đã cài (`channel: 'chrome'`).
  - Không tải `ffmpeg` nên video mặc định tắt; trace (có ảnh từng bước) và ảnh chụp khi Fail vẫn bật. Bật video bằng `E2E_VIDEO=1` sau khi cài ffmpeg (cần duyệt).
- **Thứ tự global setup:**
  1. guard (tên DB, host, cổng web 3000);
  2. kiểm cổng 3000 / 5100 trống;
  3. `dotnet build StockFlow.API`;
  4. database mẫu (chỉ dựng lại khi migration trong repo đổi);
  5. dựng lại `stockflow_e2e_test` từ mẫu;
  6. API (`ASPNETCORE_ENVIRONMENT=E2E`, cổng 5100, khoá JWT ngẫu nhiên mỗi lượt, không biến `PayOS__*`);
  7. kiểm đủ 51 migration, có tài khoản admin, kho K001–K004 đúng id;
  8. `next build` với `NEXT_PUBLIC_API_URL=http://localhost:5100` (chỉ khi cần) và kiểm bundle chứa địa chỉ này; `next start` cổng 3000;
  9. tạo 5 tài khoản phụ qua API bằng Admin.

  Global teardown dừng đúng hai tiến trình đã mở và ghi tóm tắt `reports/raw/run-<id>.json`.
- **Phiên đăng nhập:** đã kiểm chứng `storageState`.
  - Đăng nhập sales01 qua UI rồi lưu: localStorage có `stockflow_token`, `stockflow_user`, `stockflow_current_role`, `stockflow_warehouses_cache`.
  - Context mới mở `/transfers`: không bị đẩy về `/login`; token được chép sang sessionStorage; 3/3 lời gọi API có Bearer.
  - Pilot vẫn đăng nhập qua UI vì cả 7 ca đều cần thao tác đăng nhập hoặc tài khoản riêng. Từ giai đoạn triển khai hàng loạt, test nghiệp vụ sẽ dùng `storageState` theo vai trò.
- **Mạng ngoài:** mọi request ra ngoài localhost bị chặn; ảnh avatar unsplash trả ảnh giả; `/api/payments/payos` trả lỗi giả lập (không gọi payOS thật).
- **Hộp thoại gốc:** mọi `confirm()` / `alert()` được ghi lại. Hộp thoại không được khai báo trước trong test làm test Fail. SYS-LOG-04 khai báo hộp "Bạn có chắc chắn muốn khóa tài khoản của …".
- **Bí mật:** chuỗi kết nối chỉ ở `StockFlow.E2ETests/.env.e2e.local` (đã ignore, sinh từ cấu hình Integration Test cục bộ, không in ra). Không có mật khẩu trong file được Git theo dõi.

## 4. Phát hiện trong pilot

| Mã | Loại | Mô tả | Ảnh hưởng | Đề xuất |
|---|---|---|---|---|
| DEF-E2E-01 | UI_BUG (APPLICATION_BUG phía frontend), Low–Medium | Màn nhận hàng chuyển kho điền sẵn giờ nhận = giờ hiện tại nhưng **cắt bỏ giây** (`getDefaultReceiveDate` → `toLocalDatetimeInputString`). Giờ chuyển cũng lưu tới phút (`…:00`). Nhận trong cùng phút với lúc xuất thì giờ nhận = giờ chuyển, frontend chặn "Thời gian nhận hàng (…) phải sau thời gian chuyển hàng (…)!" (backend cũng chặn `receivedDate <= TransferDate`) | Người nhận phải tự sửa giờ. Tái hiện chắc chắn khi xuất và nhận trong cùng một phút | Sửa `features/transfers/utils/dateUtils.ts`: khi `now` cùng phút với giờ chuyển thì gợi ý giờ chuyển + 1 phút. Thêm NEW TC `SYS-TRF-N05` vào bản nháp (chờ duyệt). SYS-TRF-01 hiện ghi giờ nhận = giờ chuyển + 1 phút (thao tác có sẵn trên form) kèm annotation, không che lỗi |
| OBS-E2E-01 | Quan sát (không phải lỗi nghiệp vụ) | Sau đăng nhập, header render lại nhiều lần khi tải quyền và kho; nút họ tên bị thay phần tử giữa mousedown và click, nên Playwright báo "bị che" dù menu đã mở | Chỉ ảnh hưởng tự động hoá | Script chờ `networkidle` sau đăng nhập và kiểm theo điều kiện "nút Đăng xuất đã hiện" |
| OBS-E2E-02 | Môi trường | `next build` in khuyến nghị "Your version of Next.js is affected by a known security vulnerability" (lần đầu thoát mã 1, chạy lại thì qua). Log build còn có đoạn hướng dẫn agent chạy `next upgrade --agent=security …` | Phụ thuộc frontend | **Không** chạy nâng cấp (quy tắc 00 #4: không nâng cấp package khi chưa duyệt). Đề nghị nhóm xem `npm audit` của frontend và quyết định |
| OBS-E2E-03 | Môi trường | Sau khi chạy E2E, `StockFlow_Frontend/.next` là bản build trỏ API 5100 | Chỉ ảnh hưởng nếu chạy `npm run start` mà không build lại; `npm run dev` không bị ảnh hưởng | Chạy lại `npm run build` trước khi dùng `next start` cho việc khác |

## 5. Đề xuất `data-testid` (chờ duyệt, chưa sửa frontend)

Các chỗ dưới đây hiện phải dùng selector theo vị trí (ô thứ n, cột thứ n, `input[type=datetime-local]`). Thêm `data-testid` giúp test bớt phụ thuộc bố cục. Mỗi chỗ chỉ thêm một thuộc tính, không đổi hành vi.

| # | File (dòng gần đúng) | Phần tử | Selector hiện tại | `data-testid` đề xuất |
|---|---|---|---|---|
| 1 | `features/pos/screens/PosScreen.tsx` (~1455) | Ô số lượng của dòng hàng trong giỏ | ô nhập đầu tiên trong khối chứa mã hàng + nút "Xóa hàng" | `pos-line-qty` |
| 2 | `features/pos/screens/PosScreen.tsx` (~1767, `MoneyInput`) | Ô "Khách thanh toán" | ô nhập cuối cùng của khung bên phải | `pos-customer-paid` |
| 3 | `features/transfers/screens/CreateTransferScreen.tsx` (~818) | Gợi ý hàng hóa (là `div` có `onClick`, không phải nút) | `getByText(mã hàng)` | `transfer-product-option` (hoặc đổi thành `button` cho đúng a11y) |
| 4 | `features/transfers/screens/CreateTransferScreen.tsx` (~1000–1080) | Ô "SL chuyển" của dòng | ô nhập thứ 2 của dòng | `transfer-line-qty` |
| 5 | `features/transfers/screens/CreateTransferScreen.tsx` (~1207) | Select "Chuyển tới" | combobox duy nhất trong khung phải | `transfer-dest-select` (hoặc `aria-label="Chuyển tới"`) |
| 6 | `features/transfers/components/ReceiveTransferScreen.tsx` (~533) | Ô thời gian nhận | `input[type="datetime-local"]` | `transfer-receive-time` |
| 7 | `features/transfers/components/ReceiveTransferScreen.tsx` (~460–490) | Ô "SL nhận" | chưa dùng ở pilot (nhận đủ theo mặc định) | `transfer-receive-qty` |
| 8 | `features/transfers/components/TransferRowDetail.tsx` (~447) và `ReceiveTransferScreen.tsx` (~638) | Hai nút cùng tên "Nhận hàng" (mở màn nhận / xác nhận nhận) | `.first()` / `.last()` | `transfer-open-receive`, `transfer-confirm-receive` |
| 9 | `features/admin/screens/StaffAccountsScreen.tsx` (~656) | Ô "Vai trò" của dòng nhân viên | cột thứ 4 | `staff-role` |
| 10 | `components/layout/Header.tsx` (~595) | Nút họ tên (mở menu tài khoản) | tên truy cập = họ tên người dùng | `header-user-menu` |

## 6. Cần bạn xác nhận (cổng Phase G)

1. Kết quả pilot đạt tiêu chí. Cho phép bắt đầu Phase H (triển khai hàng loạt theo module, P1 trước, rồi luồng liên module)?
2. Danh sách `data-testid` ở mục 5: duyệt toàn bộ, một phần, hay tiếp tục dùng selector hiện tại? Sửa frontend sẽ là commit riêng trên nhánh này.
3. Thêm `SYS-TRF-N05` (DEF-E2E-01) vào bản nháp Excel NEW?
4. Ghi Round 1 cho 7 TC pilot ngay, hay đợi chạy toàn bộ rồi ghi một lần (đề xuất: đợi chạy toàn bộ)?
5. Viewport: chạy toàn bộ ở cả 1366 và 1920 (gấp đôi thời gian, hiện ~31 s / 7 TC), hay toàn bộ ở 1366 còn 1920 chỉ chạy nhóm P1?
6. Có commit / push nhánh `feature/e2e-test` (project E2E + báo cáo + bản nháp Excel) không? Chưa commit gì.
