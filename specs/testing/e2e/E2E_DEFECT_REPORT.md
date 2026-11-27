# Báo cáo lỗi E2E – Report 5.3

- Cập nhật: 26/11/2026 · Nhánh `feature/e2e-test`
- Phạm vi đã chạy: pilot (7 TC), đợt 1 = sheet No 1–10 (UC-01 … UC-29, 64 TC), đợt 2 = sheet No 11–20 (UC-30 … UC-45, 59 TC), đợt 3 = sheet No 21–29 (UC-46 … UC-83, 87 TC), đợt 4 = 5 sheet NEW No 30–34 (37 TC)
- Không sửa code nghiệp vụ. Lỗi được ghi kèm bằng chứng; người phụ trách quyết định cách sửa.
- Bằng chứng (trace, ảnh, error-context) nằm ở `StockFlow.E2ETests/test-results/<tên test>/` sau mỗi lượt chạy (thư mục bị ignore). Có thể chạy lại bằng `npx playwright test --grep <mã TC>`.

## 0. Trạng thái sau khi sửa (Round 2, 26/11/2026 – nhánh `fix/system-test-r1`)

| Mã | Trạng thái | Cách sửa |
|---|---|---|
| DEF-E2E-01 | Đã sửa | `getDefaultReceiveDate` so theo phút; cùng phút với giờ chuyển thì gợi ý giờ chuyển + 1 phút |
| DEF-E2E-02 | Đã sửa | Phân trang 15 dòng / trang ở màn Nhân viên; thêm mới thì chuyển tới trang cuối |
| DEF-E2E-03 | Đã sửa | Bỏ bắt buộc chọn kho khi tạo / sửa nhân viên |
| DEF-E2E-04 | Đã sửa | `CreateRoleCommand` so cả tên hiển thị và mã vai trò; lỗi hiện trong hộp thoại |
| DEF-E2E-05 | Đã sửa | Admin luôn có mọi chức năng (`AdminLockedFeatureIds` = mọi chức năng), cột Quản trị viên bị khoá |
| DEF-E2E-06 | Đã sửa | Quyền mặc định SalesStaff thêm SALES_DELETE (không thêm SALES_APPROVE); seeder bù quyền cho DB cũ |
| DEF-E2E-07 | Đã sửa | Câu báo lỗi mật khẩu dùng đúng câu backend "… phải có ít nhất 1 chữ in hoa (BR-35)." |
| DEF-E2E-08 | Đã sửa | Quyền mặc định WarehouseStaff thêm PURCHASE_UPDATE; seeder bù quyền cho DB cũ |
| DEF-E2E-09 | Đã sửa | Khung trang báo "Không thể kết nối đến máy chủ. Vui lòng thử lại." + Thử lại khi không tải được quyền; màn Hàng hóa báo lỗi + Thử lại và không xoá danh sách |

Lỗi đã biết của Report 5.2 gặp lại (DEF-IT-01/02/03/04) đã được sửa trên `dev`; SYS-TRF-N03 thêm: ô SL nhận không còn tự đổi số âm thành 0.
Mục 3 (lệch SPEC / Expected): câu chữ đã đổi theo Expected; ca giao diện chặn sớm, BOM → định mức, BR-37 / BR-42 đã cập nhật Expected trong bản nháp Report 5.3 (Round 2).

8 ca cần làm rõ – **đã chốt 27/11/2026 (nhóm duyệt đề xuất)**:

| Ca | Quyết định |
|---|---|
| SYS-MRQ-03 | Kiểm thật: định mức đã dùng cho lệnh không xóa được (chỉ ngừng áp dụng), lệnh giữ nguyên nhu cầu NVL |
| SYS-GRN-03 | Xoá ca – không quản lý theo lô với hàng nhập từ NCC (Report 3 BR-27) |
| SYS-MST-01 / 15 / 17 | Danh mục Kho chỉ Admin quản lý; Manager bị chặn; test tạo / sửa / xóa kho bằng Admin |
| SYS-PRD-N02 | Sửa code: hàng mới thiếu tên báo "Dòng n: Thiếu tên hàng hóa."; cả file trong một transaction |
| SYS-XCT-N05 | Sửa code: màn Chuyển hàng lọc theo chi nhánh đang chọn trên header |
| SYS-ORD-N02 | Bỏ yêu cầu QR trên bản in |

Phạm vi (27/11/2026): nhóm bỏ các chức năng Report 3 ghi ngoài phạm vi / không áp dụng, tài liệu theo code hiện tại. Đã **xoá 43 ca** khỏi Report 5.3 và bộ E2E
(phiếu yêu cầu xuất kho bán hàng, phân bổ chi phí nhập – xoá sheet UC-34, UC-35; duyệt phiếu kiểm kho / xuất hủy; phân loại / sửa chữa hàng trả; theo lô, hạn dùng;
màn tổng quan Mua hàng / Trả hàng; ghi chú nhắc nợ; gộp đơn kèm thanh toán và yêu cầu xuất; tiền tố mã chứng từ; khoá kiểm kho ngoài BR-42; báo cáo chi phí).
Đổi sang kiểm thật trên màn Báo cáo / form hàng hóa: SYS-FIN-01/02/08/09/10/12, SYS-MIN-01/02/13, SYS-MSC-01, SYS-MST-16. Report 3 sửa kèm (dòng 27/11 trong Record of Changes).

Round 2 (E2E toàn bộ 27/11/2026): **204 Passed, 0 Failed, 0 N/A / 204 TC**.

## 1. Danh sách lỗi

| Mã | Loại | Mức | Tóm tắt | TC |
|---|---|---|---|---|
| DEF-E2E-01 | UI_BUG | Thấp–TB | Nhận chuyển kho trong cùng phút với lúc xuất bị chặn (giờ nhận mặc định cắt giây) | SYS-TRF-01 (đi vòng), SYS-TRF-N05 (NEW) |
| DEF-E2E-02 | UI_BUG | Thấp | Màn Nhân viên không phân trang: "Trang 1 / 1" là chữ cố định | SYS-ACC-02 |
| DEF-E2E-03 | UI_BUG | TB | Form nhân viên bắt buộc chọn ít nhất 1 kho, trái quyết định nhóm 10/11 (backend và màn Phân quyền kho cho phép 0 kho) | SYS-ACC-07 |
| DEF-E2E-04 | BUSINESS_LOGIC_BUG | TB | Tạo được vai trò trùng tên hiển thị / mã ("Quản lý", ROLE_MANAGER) | SYS-ROL-04 |
| DEF-E2E-05 | AUTHORIZATION_BUG | Cao | Admin bị khoá khỏi hệ thống (cả UI và API) sau khi bỏ tick cột Quản trị viên trên ma trận | SYS-ROL-06 |
| DEF-E2E-06 | AUTHORIZATION_BUG | Cao | Quyền seed của SalesStaff thiếu SALES_DELETE nên nhân viên bán hàng không huỷ được đơn đặt / phiếu trả (403); chỉ cần Admin lưu ma trận một lần là quyền tự đổi (thêm SALES_DELETE, SALES_APPROVE) | SYS-BKG-08, SYS-RRQ-03 |
| DEF-E2E-07 | UI_BUG | Thấp | Form đổi mật khẩu ghi sai "có chữ in hoa (a–z)" | SYS-PWD-04 |
| DEF-E2E-08 | AUTHORIZATION_BUG | Cao | Quyền seed của WarehouseStaff thiếu PURCHASE_UPDATE nên nhân viên kho không sửa / hủy được phiếu đặt hàng nhập (403) dù nút Mở phiếu / Sửa / Hủy vẫn hiện | SYS-POR-04, SYS-POR-05, SYS-PUR-N01 (NEW) |
| DEF-E2E-09 | UI_BUG | Thấp–TB | Màn Hàng hóa không báo lỗi khi không gọi được API: chỉ hiện "Đang tải..." (lỗi chỉ ghi console) | SYS-XCT-N06 (NEW) |

## 2. Chi tiết

### DEF-E2E-01 – Nhận chuyển kho cùng phút với lúc xuất bị chặn

- **Tái hiện:**
  1. Người dùng K001 tạo phiếu K001 → K002 rồi bấm Hoàn thành → Đồng ý tiếp tục.
  2. Trong cùng phút, người dùng K002 mở phiếu → Nhận hàng → bấm Nhận hàng.
- **Mong đợi:** nhận được với giờ mặc định.
- **Thực tế:** toast "Thời gian nhận hàng (…) phải sau thời gian chuyển hàng (…)!"; không gửi request. Backend cũng chặn `receivedDate <= TransferDate`.
- **Nguyên nhân:** `features/transfers/utils/dateUtils.ts` `getDefaultReceiveDate` so sánh có giây nhưng trả giá trị cắt giây; giờ chuyển lưu dạng `…:00`.
- **Đề xuất:** khi `now` cùng phút với giờ chuyển thì gợi ý giờ chuyển + 1 phút.
- **TC đề xuất thêm:** SYS-TRF-N05 – đã thêm vào sheet NEW Inventory của bản nháp ngày 25/11/2026 (Pending, chưa chạy). SYS-TRF-01 đang ghi giờ nhận = giờ chuyển + 1 phút, có annotation.

### DEF-E2E-02 – Màn Nhân viên không phân trang

- **Tái hiện:** có 16 tài khoản → mở /staff.
- **Mong đợi (5.3 ACC-02):** phân trang hoạt động.
- **Thực tế:** hiện cả 16 dòng; dưới bảng là "Trang 1 / 1", hai nút trang luôn vô hiệu.
- **Nguồn:** `StockFlow_Frontend/src/features/admin/screens/StaffAccountsScreen.tsx` ~766 (chữ cố định).
- **Giả định của test:** chuẩn UI nhóm lấy màn Hàng hóa 15 dòng / trang làm ngưỡng.

### DEF-E2E-03 – Form nhân viên bắt buộc chọn kho

- **Tái hiện:** Admin → Nhân viên → Thêm nhân viên, chọn vai trò, bỏ hết kho → Thêm mới.
- **Mong đợi (5.3 ACC-07, quyết định nhóm 10/11/2026):** lưu được tài khoản không có kho.
- **Thực tế:** `alert("Vui lòng chọn ít nhất 1 chi nhánh kho trực thuộc cho nhân viên!")`, không gửi request.
- **Không nhất quán:** màn Phân quyền kho lưu được 0 kho (SYS-WHA-05 Passed), backend cũng cho phép.
- **Nguồn:** `StaffAccountsScreen.tsx` ~338.

### DEF-E2E-04 – Tạo được vai trò trùng

- **Tái hiện:** Admin → Vai trò → + Tạo vai trò, tên "Quản lý", mã ROLE_MANAGER → Thêm mới.
- **Mong đợi (5.3 ROL-04):** "Vai trò 'Quản lý' hoặc mã 'ROLE_MANAGER' đã tồn tại trong hệ thống." và không lưu.
- **Thực tế:** số vai trò tăng (5 → 6), xuất hiện thẻ "Quản lý / ROLE_MANAGER / 0 nhân sự"; không có thông báo.
- **Nguyên nhân:** `StockFlow.Application/Features/Roles/Commands/CreateRoleCommand.cs` chỉ so với `RoleName` trong DB ("Manager"), không so tên hiển thị hay mã vai trò.

### DEF-E2E-05 – Admin bị khoá sau khi bỏ tick ma trận

- **Tái hiện:** Admin → Phân quyền chức năng → cột Quản trị viên bấm "Bỏ chọn" → Lưu (màn không chặn) → mở /staff, /roles/warehouses, /purchases…
- **Mong đợi (5.3 ROL-06, SPEC FR-ROLE-04):** Admin vẫn toàn quyền.
- **Thực tế:**
  - Giao diện báo "Bạn không có quyền truy cập chức năng này" ở các màn, menu chỉ còn "Phân quyền".
  - `GET /api/staff` trả **403** "Vai trò của bạn chưa được phân quyền chức năng Nhân viên / Tổng quan / Thiết lập giá / Phân quyền kho."
- **Nguyên nhân:** kiểm `[RequireFeature]` không miễn trừ Admin; màn ma trận chỉ khoá một số ô của Admin (`ADMIN_LOCKED_FEATURES`).
- **Ảnh hưởng:** có thể tự khoá quyền quản trị. Muốn khôi phục phải vào /roles/permissions (còn mở) để tick lại.
- **Đề xuất:** Admin luôn qua `RequireFeature` (giống `RequirePermission`), hoặc chặn lưu khi bỏ chức năng của ROLE_ADMIN.

### DEF-E2E-06 – Quyền seed của SalesStaff không khớp quyền suy ra từ ma trận

- **Tái hiện:** DB mới (seed) → sales01 mở Đặt hàng → mở đơn Phiếu tạm → Hủy → Đồng ý. Tương tự: Trả hàng → mở phiếu → Hủy.
- **Mong đợi (5.3 BKG-08, RRQ-03):** đơn / phiếu chuyển sang Đã hủy.
- **Thực tế:** `POST /api/sales-bookings/{id}/cancel` và `/api/sales-returns/{id}/cancel` trả **403** "Bạn không có quyền thực hiện thao tác này (cần quyền SALES_DELETE)."; hộp xác nhận vẫn mở. Nút Hủy vẫn hiện và bấm được.
- **Bằng chứng:**
  - DB mẫu: SalesStaff có `SALES_CREATE, SALES_READ, SALES_UPDATE`.
  - `FeatureConstants.DeriveModulePermissionCodes` cấp đủ READ / CREATE / UPDATE / DELETE / APPROVE cho phân hệ của chức năng được tick, nên Admin bấm Lưu ma trận một lần (kể cả không đổi gì) là SalesStaff có thêm SALES_DELETE và **SALES_APPROVE**.
  - Ở lượt chạy đầu, hai ca này Passed vì chạy sau SYS-ROL-05 (lúc đó khôi phục ma trận bằng API). Lượt hiện tại khôi phục bằng bản chụp bảng nên kết quả không còn phụ thuộc thứ tự.
- **Đề xuất:** thống nhất quyền seed với luật suy ra, hoặc đánh dấu cấu hình. Đồng thời xem lại việc SalesStaff có SALES_APPROVE khi lưu ma trận (ảnh hưởng duyệt tín dụng nếu không có `RequireFeature` chặn).

### DEF-E2E-07 – Chữ sai trong form đổi mật khẩu

- **Tái hiện:** Đổi mật khẩu, mật khẩu mới không có chữ in hoa.
- **Thực tế:** "Mật khẩu mới chưa đạt: có chữ in hoa (a–z)." (đúng phải là A–Z).
- **Lệch kèm theo:** câu chữ khác Expected "… phải có ít nhất 1 chữ in hoa (BR-35)." (mục 3).

### DEF-E2E-08 – Quyền seed của WarehouseStaff thiếu PURCHASE_UPDATE

- **Tái hiện:** DB mới (seed) → whstaff01 mở Đặt hàng nhập → mở phiếu Phiếu tạm → Mở phiếu → sửa số lượng → Lưu tạm. Tương tự: phiếu Đã đặt hàng → Hủy → Đồng ý.
- **Mong đợi (5.3 POR-04, POR-05):** lưu được thay đổi / phiếu chuyển sang Đã hủy. Actor của UC-30 là Warehouse Accountant (vai trò WarehouseStaff).
- **Thực tế:** `PUT /api/purchase-orders/{id}` và `POST /api/purchase-orders/{id}/cancel` trả **403** "Bạn không có quyền thực hiện thao tác này (cần quyền PURCHASE_UPDATE)."; nút vẫn hiện và bấm được.
- **Bằng chứng:**
  - DB mẫu: WarehouseStaff có `PURCHASE_CREATE, PURCHASE_READ` (không có PURCHASE_UPDATE / PURCHASE_DELETE); các thao tác kho (chuyển, kiểm kho, xuất hủy) cần STOCK_UPDATE và vai trò này đã có.
  - Cùng nhóm endpoint cần PURCHASE_UPDATE: sửa / hủy / kết thúc phiếu đặt, sửa ghi chú phiếu đặt, gộp phiếu đặt, sửa / hủy phiếu nhập, sửa / hủy phiếu trả hàng nhập.
  - Cùng nguyên nhân với DEF-E2E-06: quyền seed khác quyền suy ra khi Admin lưu ma trận (`DeriveModulePermissionCodes`).
- **Gặp lại ở đợt 4 (SYS-PUR-N01):** Kế toán kho lưu tạm phiếu nhập trực tiếp được, nhưng mở lại (Mở phiếu) → Hoàn thành thì form gọi `PUT /api/purchases/{id}` trước `PATCH /complete` và bị 403 "cần quyền PURCHASE_UPDATE"; phiếu vẫn Phiếu tạm. (Nút "Nhập hàng (Hoàn thành)" ở danh sách chỉ gọi `PATCH /complete` – quyền PURCHASE_CREATE – nhưng không phải thao tác của Procedure.)
- **Đề xuất:** thống nhất quyền seed của WarehouseStaff với ma trận chức năng (hoặc ẩn nút khi thiếu quyền), rồi chạy lại POR-04, POR-05, PUR-N01.

### DEF-E2E-09 – Màn Hàng hóa không báo lỗi khi API không phản hồi

- **Tái hiện:** đăng nhập → làm API không phản hồi (E2E: chặn request `/api/*` trong trình duyệt) → mở Hàng hóa (/products).
- **Mong đợi (5.3 SYS-XCT-N06 ý 2):** có thông báo lỗi, trang không trắng.
- **Thực tế:** trang chỉ hiện "Đang tải..." (11 ký tự), không có thông báo; `GoodsCatalogScreen` bắt lỗi tải hàng hóa và chỉ `console.warn`. Khi API trở lại, tải lại trang thì có dữ liệu (ý 3 đạt). Ý 1 (đăng nhập khi API ngừng → "Không thể kết nối đến máy chủ. Vui lòng thử lại.") đạt.
- **Đề xuất:** hiện thông báo lỗi kèm nút Thử lại khi tải danh sách thất bại.

## 3. Lệch SPEC / Expected (SPEC_CODE_MISMATCH, không xếp vào lỗi)

| TC | Expected (Report 5.3) | Thực tế | Ghi chú |
|---|---|---|---|
| SYS-ACC-06 | "Họ và tên nhân viên không được để trống.", "Email không đúng định dạng." | Ô họ tên dùng kiểm tra `required` của trình duyệt; form không kiểm email | Backend có đủ hai thông báo |
| SYS-ACC-07 (ý 1), SYS-ROL-08 | "Vai trò không được để trống." | Ô vai trò là select không có lựa chọn rỗng, nên không thể bỏ trống trên UI | Backend trả đúng thông báo khi gọi API |
| SYS-WHA-04 | Có thao tác Select All | Hộp phân quyền kho không có "Chọn tất cả" | Chọn / bỏ chọn và hiệu lực ở header đều đạt |
| SYS-PWD-04 (ý 1) | "… phải có ít nhất 1 chữ in hoa (BR-35)." | "Mật khẩu mới chưa đạt: có chữ in hoa (a–z)." | Ý 2 "Xác nhận mật khẩu mới không khớp." đạt |
| SYS-BKG-04 | "Đơn đặt hàng phải có ít nhất 1 hàng hóa.", "Số lượng đặt phải lớn hơn 0.", "Đơn giá không được âm." | Frontend báo câu khác; ô đơn giá tự bỏ dấu "−" | Ý "Vui lòng chọn khách hàng đặt hàng." đạt |
| SYS-BKG-07 | "Đơn <mã> đang ở trạng thái không cho phép sửa." | Nút "Sửa đơn" bị ẩn với đơn đã huỷ | Không sửa được (đạt về nghiệp vụ) |
| SYS-BKG-09 | "Đơn <mã> đã hoàn thành hoặc đã hủy." | Nút "Hủy" bị vô hiệu | Không huỷ lại được |
| SYS-CON-04 | "Chỉ gộp được các đơn của cùng 1 khách hàng (BR-09)." | "Chỉ gộp được các đơn của cùng 1 khách hàng." (thiếu "(BR-09)"), nút Gộp bị khoá | Không gộp được (đạt về nghiệp vụ) |
| SYS-RRQ-05 | "Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0." / thông báo BR-19 | "Nhập số lượng trả cho ít nhất 1 hàng hóa."; ô số lượng tự giới hạn ở số còn được trả | Không tạo phiếu (đạt về nghiệp vụ) |
| SYS-RRQ-06 | như trên | "Nhập số lượng trả cho ít nhất 1 hàng hóa." | Không tạo phiếu |
| SYS-DEB-01 | Hiện dư nợ, hạn mức, **tín dụng còn lại**, nợ quá hạn | Màn Khách hàng có dư nợ và hạn mức, không có tín dụng còn lại và nợ quá hạn | SPEC FR-CRD-01 "Một phần"; chứng từ chưa thanh toán và phiếu thu hiện đúng |
| SYS-POR-06 (ý 3, 4) | Mỗi trường hợp bị từ chối kèm thông báo | Ô Số lượng tự đặt tối thiểu 1; ô Đơn giá bỏ dấu "−" | Ý thiếu NCC, thiếu hàng đạt; backend có "Số lượng đặt phải lớn hơn 0.", "Đơn giá không được âm." |
| SYS-POR-07 | "Phiếu đã có phiếu nhập liên kết, không thể sửa." | Nút "Sửa" bị ẩn khi phiếu đã có phiếu nhập | Gọi API sửa phiếu Nhập một phần trả "Chỉ sửa được phiếu tạm hoặc phiếu đã đặt hàng chưa nhập." (kiểm trạng thái trước) |
| SYS-POR-08 | "Phiếu đã có phiếu nhập liên kết. Hãy hủy các phiếu nhập đó trước." | Nút "Hủy" bị vô hiệu | Backend trả đúng câu này |
| SYS-GRN-05 | "Phiếu đặt hàng nhập <mã> không ở trạng thái chờ nhập hàng." | Nút "Nhập hàng" ẩn; mở form bằng `?po=` hiện "Phiếu đặt hàng nhập không ở trạng thái chờ nhập hàng" (thiếu mã) rồi quay về danh sách | Backend trả đúng câu có mã phiếu |
| SYS-GRN-07 | "Số lượng đạt / lỗi không được âm." | Ô SL nhận chỉ nhận chữ số | Câu này nằm ở `POST /purchase-orders/{id}/receive` (giao diện không dùng); form gọi `POST /purchases`, trả "Số lượng đạt của sản phẩm ID #… không được âm." |
| SYS-GRN-08 | "Bạn không có quyền nhập hàng vào kho của phiếu đặt này." | Người chỉ có K002 không thấy phiếu K001; mở `?po=` không nạp được dòng hàng | Backend trả đúng câu này |
| SYS-TRF-03 | "Chi nhánh nhận hàng phải khác chi nhánh chuyển đi." | Ô "Chuyển tới" không liệt kê kho đang chuyển | Backend trả đúng câu này |
| SYS-TRF-04 | "Bạn không có quyền xuất hàng chuyển kho từ kho này." / "… xác nhận nhận hàng cho kho nhận này." | (1) Người chỉ có K002 mở được phiếu tạm của K001 (Mở phiếu), Hoàn thành bị chặn bằng "Bạn không có quyền sửa phiếu chuyển hàng của kho xuất này."; (2) người chỉ có K001 không thấy nút Nhận hàng | Chặn đúng về nghiệp vụ; câu chữ ý 1 khác vì form gọi `PUT` trước `complete` |
| SYS-STK-05 | "Số lượng thực tế không được âm." | Ô SL thực tế bỏ dấu "−" | Backend trả đúng câu này; bỏ trống SL → "Còn 1 hàng chưa nhập số lượng thực tế." |
| SYS-DSP-03 | "Số lượng hủy phải lớn hơn 0." / "Hàng <mã> - <tên> chỉ còn <n> trong kho, không thể hủy <m>." | "Hàng <mã> chưa nhập số lượng hủy." / "Hàng <mã> chỉ còn 4 trong kho, không thể hủy 6." (thiếu tên hàng) | Frontend kiểm trước với câu riêng; backend trả đúng hai câu của Expected |
| SYS-MRQ-03 | Báo lỗi khi lệnh có định mức đã bị xóa | Không xóa được định mức đã dùng cho lệnh ("Định mức đã được dùng cho lệnh sản xuất nên không hủy được. Bạn có thể ngừng áp dụng định mức."); ngừng áp dụng thì chi tiết lệnh vẫn hiện nhu cầu | **NEEDS_CLARIFICATION:** tiền đề không dựng được; nhóm xác nhận lại Expected |
| SYS-CRT-04 | Thông báo BR-19 khi trả vượt | Ô SL trả tự giới hạn ở số còn được trả | Không tạo phiếu (đạt về nghiệp vụ) |
| SYS-MIS-02 | "Lệnh sản xuất đã hoàn thành hoặc đã huỷ nên không xuất được nguyên vật liệu." | Hộp chọn lệnh chỉ liệt kê lệnh Chưa bắt đầu / Đang sản xuất | Backend trả đúng câu này |
| SYS-MIS-06, SYS-MPR-05, SYS-MST-20 | Câu có chữ "BOM" | Code dùng "định mức" ("… theo định mức. Vui lòng nhập lý do.", "Thành phẩm chưa có định mức đang áp dụng…", "Định mức phải có ít nhất một nguyên vật liệu.") | Đổi thuật ngữ BOM → định mức; nhóm nên cập nhật Expected |
| SYS-FGR-03 | Cảnh báo + bắt nhập ghi chú khi thành phẩm cần nhiều NVL hơn số đã xuất | Chặn hẳn: "… NVL đã xuất chỉ đủ duyệt tối đa N … Vui lòng Xuất bổ sung NVL trước." (UI và API) | Luồng cảnh báo BR-37 không xảy ra được; SYS-MPR-08 cũng không dựng được phiếu có ghi chú cảnh báo |
| SYS-FGR-05 | "Số lượng đạt phải lớn hơn 0." / "Vui lòng nhập số lô thành phẩm." / thông báo không có quyền kho | "Tổng số lượng thành phẩm (đạt + lỗi) phải lớn hơn 0."; số lô không bắt buộc; ô kho chỉ liệt kê kho được phân quyền | |
| SYS-MPR-06 (ý 2) | "Chỉ huỷ được lệnh sản xuất chưa xuất nguyên vật liệu." | Lệnh đã xuất NVL không có nút "Hủy lệnh" | Backend trả đúng câu này |
| SYS-MST-01, 15, 17 | Manager quản lý danh mục Kho | Màn Kho (/warehouses → /roles/warehouses, chức năng Phân quyền kho) chỉ Admin dùng được; API kho trả 403 với Manager | Nhóm xác nhận actor của UC-51 phần Kho |
| SYS-MST-03 | "Tên hàng hóa không được để trống." | Hộp thoại "Vui lòng nhập Tên hàng hóa!" | Backend trả đúng câu này |
| SYS-MST-04 | "Mã hàng hóa '<mã>' đã tồn tại trong hệ thống." | "… đã tồn tại trong hệ thống! Vui lòng chọn mã khác." | |
| SYS-MST-06 (ý 2) | POS từ chối (POS-003) | POS không liệt kê hàng ngừng kinh doanh khi tìm | Backend trả POS-003 khi gọi API bán |
| SYS-MST-08 | Hệ số quy đổi 0 bị từ chối | Không báo lỗi; code đổi 0 thành 1 (`Number(rate) \|\| 1`) | Có thể ghi sai hệ số mà người dùng không biết |
| SYS-MST-14 | "Hạn mức phải trong khoảng 0 – 999.999.999.999 đ." | Ô Hạn mức mới bỏ dấu "−" | |
| SYS-MSC-07 | "Yêu cầu này đã được xử lý (MSG57)." và làm mới danh sách | Mở yêu cầu luôn tải trạng thái mới (Kết quả xử lý) nên không gửi được quyết định trùng; dòng ngoài danh sách vẫn "Chờ duyệt" | Backend trả đúng MSG57 |
| SYS-FIN-04 | "Số tiền thu phải lớn hơn 0." / "Số tiền thu (…) vượt quá nợ hiện tại của khách (…)." | "Vui lòng nhập số tiền thu." / "Số tiền thu vượt quá nợ hiện tại của khách (<nợ>)." | |
| SYS-FIN-07 | "Số tiền thanh toán phải lớn hơn 0." | "Vui lòng nhập số tiền thanh toán." | Ý vượt công nợ đạt |
| SYS-ORD-N02 (NEW) | Bản in có mã QR thanh toán chuyển khoản | Nút In của hóa đơn in mẫu "PHIẾU XUẤT KHO" (mã, khách, dòng hàng, tổng tiền đúng), không có mã QR | QR chỉ có ở hộp thanh toán payOS trên POS |
| SYS-INV-N01 (NEW, ý 2, 3) | "Tồn kho thực tế không được âm." / "Bạn không có quyền điều chỉnh tồn kho tại <kho>." | Ô tồn kho bỏ dấu "−"; form hàng hóa chỉ cho sửa tồn ở kho người dùng được gán | Backend trả đúng hai câu; ý 1 đạt (thẻ kho ghi STOCKTAKE_IN +5) |
| SYS-PRB-N01 (NEW, ý 2) | "Tên bảng giá không được để trống." | Ô tên có thuộc tính `required` → trình duyệt chặn ("Please fill out this field."); nếu bỏ `required`, form còn câu riêng "Vui lòng nhập tên bảng giá." | Backend trả đúng câu; ý 1 đạt. Nút "Áp dụng" của Procedure trên màn là "Tính toán lại theo công thức" |
| SYS-SET-N01 (NEW, ý 2) | "Tiền tố mã chứng từ không được vượt quá 10 ký tự." | Ô tiền tố `maxLength=10` (nhập 11 ký tự còn 10) | Backend trả đúng câu; ý 1, 3 đạt |
| SYS-PUR-N03 (NEW, ý 2) | "Mặt hàng <mã> chỉ còn được trả tối đa <n> (đã nhập <m>)." | Ô SL trả tự giảm về số còn được trả, toast "Chỉ được trả tối đa 8 Cái cho <mã>" | Backend trả đúng câu |
| SYS-PUR-N04 (NEW, ý 2) | "Chỉ thu tiền được cho phiếu trả hàng nhập đã hoàn thành." | Phiếu trả tạm không có nút "Thanh toán" | Backend trả đúng câu |
| SYS-PRD-N02 (NEW) | Mỗi dòng lỗi được báo kèm số dòng và lý do | Dòng trùng mã khác tên được báo ("Dòng 3: Trùng mã hàng …") và dừng cả file; dòng thiếu tên không bị báo – code lấy mã làm tên | **NEEDS_CLARIFICATION:** dòng thiếu tên có bị từ chối không; dòng hợp lệ của file có lỗi có được nhập không (hiện dừng cả file, không tạo hàng nào) |
| SYS-XCT-N05 (NEW) | Danh sách theo chi nhánh đang chọn trên header | POS lấy tồn theo K002, giữ K002 sau khi tải lại (đạt); Chuyển hàng vẫn hiện phiếu K001→K003 vì bộ lọc Chuyển đi / Nhận về mặc định "Tất cả chi nhánh" | Cần nhóm xác nhận màn Chuyển hàng có phải lọc theo chi nhánh header không (Hóa đơn, Trả hàng nhập có lọc theo chi nhánh) |

## 4. Quan sát khác (ca vẫn Passed)

1. **SYS-ACC-11:** tài khoản bị khoá nhận **403** ở yêu cầu kế tiếp (không phải 401), nên vẫn ở trang hiện tại với dữ liệu lỗi, không bị đưa về /login. Expected chỉ yêu cầu "bị từ chối", nên ca đạt.
2. **SYS-WHA-02:** mở hóa đơn K002 bằng URL trả **404** (kèm toast "Bạn không có quyền truy cập dữ liệu của chi nhánh/kho này.") thay vì 403.
3. **SYS-ACC-01:** đặt lại mật khẩu hiện toast chứa mật khẩu mặc định dạng rõ ("đã được reset thành "<mật khẩu mặc định>""). Nhóm nên cân nhắc về bảo mật.
4. **OBS-E2E-01..03 (pilot):** header render lại sau đăng nhập; `next build` khuyến nghị nâng cấp bảo mật Next.js (không thực hiện); `.next` là bản build E2E.
5. **SYS-GRN-06 (đợt 2):** nhập vượt phiếu đặt chỉ bị **cảnh báo** ("Nhập vượt số lượng phiếu đặt"); bấm "Vẫn nhập hàng" thì nhận 12 / đặt 10, phiếu đặt chuyển Hoàn thành. Expected cho phép "rejected or warned" nên ca đạt; nhóm xem có cần chặn (BR) hay không.
6. **SYS-TRF-04 (đợt 2):** người không có quyền kho xuất vẫn thấy nút "Mở phiếu" của phiếu tạm và mở được màn sửa; chỉ bị chặn khi lưu. Không làm sai dữ liệu nhưng nên ẩn nút.
7. **Điều chỉnh tồn (Arrange, đợt 2):** `POST /api/products/{id}/stock-adjustments` sinh một phiếu kiểm kho KK… trạng thái Đã cân bằng. Không ảnh hưởng kết quả; SYS-STK-05 so với danh sách phiếu kiểm có sẵn.
8. **Lỗi đã biết của Report 5.2 gặp lại qua giao diện (đợt 2):** DEF-IT-02 (SYS-TRF-06: nhận vượt số đã xuất vẫn được), DEF-IT-08 (SYS-STK-02: khoá kiểm kho không áp dụng cho nhập hàng, chuyển hàng, POS). Không lập mã DEF-E2E mới.
9. **Đợt 3 – người thao tác khác actor:** UC-49 (Nhập thành phẩm = "Duyệt hoàn thành") cần chức năng Lập lệnh sản xuất nên làm bằng manager01 (prodstaff01 không có nút). UC-46 dùng kho K002 thay K001 vì prodstaff01 chỉ có K002.
10. **Đợt 3 – đơn vị quy đổi (SYS-MST-07):** lưu trong cột `variants_json` của hàng hóa, không dùng bảng `mst_unit_conversions`.
11. **Lỗi helper đã sửa ở đợt 3:** hàm `ApprovalsPage.decide` (đợt 1) tìm nhãn "Hạn mức mới" chính xác nên bỏ qua ô hạn mức (nhãn thật "Hạn mức mới *") và hệ thống dùng số đề xuất. SYS-CON-09 đợt 1 không bị ảnh hưởng vì dùng đúng số đề xuất; hồi quy đợt 1 vẫn 64/64 như cũ.
12. **Đợt 4 – lỗi đã biết gặp lại qua giao diện:** DEF-IT-03 (SYS-TRF-N03: ô SL nhận đổi -1 thành 0, nhận xong phiếu Đã nhận với SL 0), DEF-IT-01 (SYS-TRF-N04: hai người cùng nhận đều HTTP 200, tồn cộng hai lần – tái hiện **8 / 11** lần, lỗi tranh chấp nên có lần không xảy ra), DEF-E2E-01 (SYS-TRF-N05), DEF-IT-04 (SYS-XCT-N02: tài khoản không kho thấy phiếu nhập; Chuyển hàng, Kiểm kho đúng).
13. **Đợt 4 – chống trùng PAY-016 tính cả đơn đặt (SYS-POS-N07):** thanh toán đơn đặt trong vòng 3 giây sau khi tạo đơn bị từ chối "Giao dịch đang được xử lý … (PAY-016)" vì điều kiện so mọi đơn cùng khách + cùng tổng tiền, kể cả chính đơn đặt đó. Thực tế ít gặp; ca thanh toán sau ≥ 3,5 giây thì đạt.
14. **Đợt 4 – chặn chức năng Bán hàng ở giao diện không nhất quán (cần kiểm lại):** ở lượt b của SYS-XCT-N05, Thủ kho whstaff01 (không có chức năng Bán hàng) mở /pos bằng URL vẫn thấy màn POS, tìm hàng và xem tồn được; tải lại trang thì mới hiện "Bạn không có quyền truy cập chức năng này". Chưa thử thanh toán (backend kiểm SALES_CREATE). Ca chính thức đã đổi người thao tác sang e2e.manager2.
15. **Đợt 4 – trả hàng nhập khi phiếu nhập còn nợ (SYS-PUR-N04):** tiền trả hàng tự trừ vào công nợ của phiếu nhập gốc ("Trừ vào công nợ PN…"), NCC cần trả 0 nên không có nút Thanh toán. Ca NCC trả tiền cần phiếu nhập đã trả đủ.
16. **Đợt 4 – điều chỉnh tồn trên Hàng hóa (SYS-INV-N01):** dòng thẻ kho có loại STOCKTAKE_IN và tham chiếu phiếu kiểm KK (giống quan sát 7).
17. **Đợt 4 – POS bấm đúp (SYS-POS-N06):** nút THANH TOÁN khoá ngay sau lần bấm đầu nên chỉ có 1 request; ý 2 (request thứ hai bị từ chối PAY-016) không phát sinh.
18. **Đợt 4 – tín dụng còn lại (SYS-POS-N02):** màn Khách hàng chỉ có Hạn mức nợ và Nợ hiện tại; "Còn lại" hiện ở POS (nút "Hạn mức còn lại" khi chọn khách). Ca kiểm ở POS và đạt (cùng điểm với SYS-DEB-01).
