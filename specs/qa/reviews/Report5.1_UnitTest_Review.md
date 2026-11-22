# Review bộ Unit Test – Report 5.1 (StockFlow)

Ngày review: 22/11/2026 · Người review: Ninh (HaQuangNinh) với hỗ trợ AI · Phạm vi: **chỉ review và đề xuất, không sửa code, không sửa workbook**.

| Mục | Giá trị |
|---|---|
| Tài liệu review | `docs/Report5.1_Unit_Test.xlsx` (bản ngày 18/11/2026, build c60ea62, 72 chức năng) |
| Nguồn đối chiếu SPEC | Report 3 bản sao `docs/SEP_490_Group82(bản sao).docx` + quyết định nhóm D1–D4, O1–O4 (`specs/qa/reports/01d_REPORT3_CHANGES.md`) |
| Nguồn đối chiếu code | `origin/dev` commit 0b183e9 (85 file backend đổi so với c60ea62) |
| Cách đối chiếu | Đọc 528 UTCID; so từng thông báo lỗi trong workbook với chuỗi trong code; liệt kê mọi nhánh trả lỗi của handler / validator / helper rồi tìm ca phủ; đọc tay các luồng tiền, tồn kho, giá vốn |

## A. Executive Summary

- Workbook có **72 chức năng, 528 UTCID** (N 150 / A 306 / B 72); tất cả đang **Untested** (chưa có kết quả chạy).
- Phân loại ca hiện có: **EXISTING_VALID 418**, **EXISTING_INCOMPLETE 106**, **OBSOLETE 2**, **NEEDS_CLARIFICATION 2**, **DUPLICATED 0**.
- Ca đặt sai tầng: **9 ca** kiểm tra thông báo của tầng API (`[RequireAdmin]`, `[RequirePermission]`), handler không thể trả kết quả đó → chuyển sang API test.
- Độ phủ nhánh lỗi: code có **561 nhánh trả lỗi** thuộc 72 chức năng; workbook phủ **278 (50%)**. Thấp nhất (≥ 5 nhánh): CreateDisposal 2/14, CreateOrderFromPlan 3/19, CreateSalesReturn 5/25, CreateProductionPlan 5/25, CreatePosOrder 7/34, ApproveProductionOrder 5/22, CreateFinishedGoodsReceipt 5/21.
- Đề xuất **375 test case mới**: Critical 27, High 123, Medium 157, Low 68. Trong đó 294 ca bổ sung vào sheet có sẵn và 81 ca cho **25 sheet mới** (payOS, hoàn tiền công nợ 21/11, hủy trả hàng, điều chỉnh công nợ, điều chỉnh định mức, chính sách Domain thuần…).
- **54 command** trong code chưa có sheet; 19 command được đề xuất sheet ngay, phần còn lại đưa vào danh sách chờ (mục C.4).
- Ghi nhận **10 vấn đề SPEC ↔ code** riêng (mục C.5), trong đó 3 mức High: nhập hàng không kiểm loại đối tác (ISS-01), sửa nhân viên mất quyền kho (ISS-03), giao một phần đơn đặt khác BR-17 (ISS-10).
- Rủi ro lớn nhất của bộ hiện tại: **79 ca N/B chỉ ghi "Success"** ở nhóm nhập hàng / trả hàng nhập / kiểm kho, nên dù chạy "Pass" cũng không chứng minh được tồn kho, giá vốn MAC (BR-29, nay làm tròn 3 chữ số) và công nợ NCC đúng.

**Kết luận nhanh:** bộ test có khung tốt (đúng mẫu FPT, phân N/A/B, nhiều ca Abnormal theo thông báo thật), nhưng **chưa đủ để nộp như bằng chứng unit test** cho phiên bản hiện tại. Cần (1) cập nhật 11 ca đổi chữ + 2 ca lỗi thời, (2) bổ sung Expected có số liệu cho 79 ca, (3) thêm các ca Critical/High ở mục C, (4) chốt các câu hỏi Q1–Q7 (mục G).

## B. Đánh giá theo module

| Module | Chức năng | UTCID (N/A/B) | Phủ nhánh lỗi | VALID | INCOMPLETE | OBSOLETE | CLARIFY | Ca đề xuất thêm (C/H/M/L) |
|---|---:|---|---:|---:|---:|---:|---:|---|
| AUTH – Xác thực & tài khoản | 6 | 36 (11/23/2) | 66% (21/32) | 33 | 3 | 0 | 0 | 0/1/10/1 |
| AUTH – Vai trò, quyền, quyền kho | 7 | 43 (17/19/7) | 80% (8/10) | 43 | 0 | 0 | 0 | 0/2/0/0 |
| Kho & thiết lập đơn hàng | 2 | 12 (3/6/3) | 100% (5/5) | 12 | 0 | 0 | 0 | 0/0/0/0 |
| GOODS – Hàng hóa & bảng giá | 5 | 29 (9/17/3) | 65% (15/23) | 29 | 0 | 0 | 0 | 0/1/5/2 |
| PARTNER/FIN – Khách hàng, công nợ KH, tín dụng | 9 | 52 (13/32/7) | 46% (33/72) | 49 | 3 | 0 | 0 | 0/9/18/12 |
| PARTNER/FIN – Nhà cung cấp, công nợ NCC | 2 | 9 (3/4/2) | 40% (4/10) | 9 | 0 | 0 | 0 | 0/3/1/2 |
| PURCHASE – Đặt hàng, nhập hàng, trả hàng nhập | 12 | 172 (49/93/30) | 82% (88/107) | 101 | 69 | 1 | 1 | 3/7/5/9 |
| SALES – Bán hàng, đặt hàng, trả hàng | 9 | 51 (13/35/3) | 30% (34/112) | 50 | 1 | 0 | 0 | 7/40/30/8 |
| STOCK – Chuyển kho, kiểm kho, xuất hủy | 9 | 67 (20/39/8) | 57% (35/61) | 53 | 12 | 1 | 1 | 0/3/13/8 |
| BOM/PROD – Định mức, kế hoạch, lệnh sản xuất | 11 | 57 (12/38/7) | 27% (35/129) | 39 | 18 | 0 | 0 | 2/20/47/25 |

- **AUTH – Xác thực & tài khoản:** Ca đúng thông báo, phủ khá. Thiếu: validator mật khẩu (BR-05: thường, số, ký tự đặc biệt), UpdateStaff mất quyền kho (ISS-03). Login/UTCID05, CreateStaff/UTCID03 ghi "400" là kết quả tầng API.
- **AUTH – Vai trò, quyền, quyền kho:** 6 ca "Chỉ Quản trị viên…" là của `[RequireAdmin]` → API test. GetPermissionCodes / HasWarehouseAccess cần DB (dùng EF InMemory hoặc chạy như Integration). Đúng quyết định 12/11: Admin chỉ thấy kho được tích.
- **Kho & thiết lập đơn hàng:** Đủ cho phạm vi hiện tại. UpdateSettings/UTCID09 là API test.
- **GOODS – Hàng hóa & bảng giá:** AdjustStock thiếu nhánh hàng/kho không tồn tại. Chưa có sheet CreateProduct / UpdateProduct / bảng giá (CRUD).
- **PARTNER/FIN – Khách hàng, công nợ KH, tín dụng:** CreateCustomer mới phủ 5/15 nhánh (thiếu độ dài, định dạng email, mã). CreditLimitChanger (hạ hạn mức dưới dư nợ) chưa có ca. Chưa có sheet cho hoàn tiền công nợ (21/11) và điều chỉnh công nợ (UC-98).
- **PARTNER/FIN – Nhà cung cấp, công nợ NCC:** CreateSupplierPayment thiếu phân bổ vượt / sai phiếu nhập. Chưa có sheet phiếu thu tiền NCC trả (21/11).
- **PURCHASE – Đặt hàng, nhập hàng, trả hàng nhập:** Nhiều ca nhất (172) và Abnormal rất kỹ, nhưng 67 ca N/B chỉ ghi "Success" – không kiểm MAC, tồn, công nợ. Chưa có ca hàng lỗi (nhập toàn hàng lỗi, trả hàng lỗi – tính năng 20/11). ReceivePurchaseOrder/UTCID05 lỗi thời.
- **SALES – Bán hàng, đặt hàng, trả hàng:** Rủi ro cao nhất: CreatePosOrder 598 LOC chỉ 9 ca (phủ 7/34 nhánh) – thiếu tạm giữ hàng, hạn mức 0 / hết hạn mức, chống thanh toán trùng, lập hóa đơn từ đơn đặt. CreateSalesReturn thiếu phân bổ giảm giá, khách lẻ, ngày. Chưa có sheet payOS (UC-26) và hủy trả hàng.
- **STOCK – Chuyển kho, kiểm kho, xuất hủy:** Chuyển kho đủ luồng chính. CancelTransfer/UTCID03 cần chốt (ISS-04). UpdateStocktake/UTCID17 lỗi thời; 10 ca kiểm kho chỉ ghi "Success". CreateDisposal/UTCID08 Expected mơ hồ.
- **BOM/PROD – Định mức, kế hoạch, lệnh sản xuất:** 7 ca đổi chữ "BOM" → "định mức". CreateProductionPlan thiếu 2 kho bắt buộc (cả 7 ca sẽ Fail). Thiếu kiểm tra "đủ NVL đã xuất" khi duyệt hoàn thành / nhập thành phẩm (BR-37), chưa có sheet điều chỉnh định mức (BR-51/52) và MRP.

### B.1 Nhận xét chung về cách viết

| Người phụ trách | Ca viết kiểu mock handler | Ca viết kiểu hộp đen qua API ("Connect to server", "Logged in") | Thông báo lỗi ghi ở Return | ở Exception |
|---|---:|---:|---:|---:|
| TamDM | 0 | 90 | 0 | 33 |
| DatTD | 0 | 90 | 2 | 51 |
| LucDT | 189 | 40 | 101 | 25 |
| NinhHQ | 0 | 95 | 0 | 61 |
| QuanDN | 0 | 17 | 0 | 12 |

- Hai kiểu viết cùng tồn tại: nhóm LucDT viết theo handler có mock (`UserId = null`, `HasWarehouseAccess (mock)`), các nhóm khác viết theo hộp đen qua API. Khi viết code test nên thống nhất một kiểu: **gọi handler trực tiếp, mock `ICurrentUserService` / `IInventoryLedger`, DB dùng EF Core InMemory hoặc SQLite**; kiểm quyền và mã HTTP để cho bộ API test.
- Handler trả `Result.Failure(...)` (giá trị trả về, không ném lỗi), validator ném `ValidationException` qua `ValidationBehavior`. Đề xuất quy ước: thông báo của `Result.Failure` ghi ở **Return** (`IsSuccess = false`, `Error = "…"`), lỗi validator ghi ở **Exception**. Hiện các nhóm ghi lẫn hai cột.
- Metadata: 24/72 sheet chưa có mã SF-FUNC; 51/72 sheet không ghi UC/BR trong Test requirement; 58/72 chức năng dưới định mức 145 ca/KLOC (tổng LOC 8239, định mức 1198 ca, hiện có 528). LOC 347 của 4 sheet đặt hàng là LOC cả file `SalesBookingCommands.cs` dùng chung nên "Lack of test cases" bị đếm lặp.
- Tham chiếu sai so với Report 3 bản sao:

| Sheet | Workbook ghi | Nên ghi | Lý do |
|---|---|---|---|
| ChangePassword | BR-35/36/37 | BR-05 (mật khẩu mạnh) | Report 3 bản sao gộp luật mật khẩu vào BR-05; code vẫn ghi "(BR-35)" trong PasswordPolicy – xem vấn đề ISS-09 |
| CreateProductionPlan | UC-59 | UC-92, UC-93 | UC-59 là lệnh sản xuất; kế hoạch sản xuất là UC-92/93 |
| CreateSalesReturn | BR-18 | BR-19, BR-21 | BR-18 là hạn thanh toán công nợ; trả hàng theo hóa đơn là BR-19, cộng tồn / giảm nợ là BR-21 |
| MergeBookings | BR-09 | BR-10 | BR-09 là sửa/hủy đơn chưa giao; gộp đơn cùng khách, cùng chi nhánh là BR-10 |

## C. Test case còn thiếu (MISSING)

Mã mới lấy **UTCID tiếp theo chưa dùng** của từng sheet (sheet có 29 ca thì ca mới bắt đầu UTCID30). Sheet mới bắt đầu UTCID01. Tổng 375 ca: Critical 27 · High 123 · Medium 157 · Low 68.

- **C.1** – ca Critical/High bổ sung vào sheet có sẵn (bảng dưới).
- **C.2** – ca cho sheet mới (bảng dưới).
- **C.3** – ca Medium/Low của sheet có sẵn: xem `Report5.1_Review_Appendix.md` mục 2 và `report51_missing_testcases.csv` (đủ cột).

### C.1 Bổ sung vào sheet có sẵn – Critical / High

| Test Case ID | Module | Use Case | Function/Class | Scenario | Test Data | Expected Result | Priority | Test Type | Reason |
|---|---|---|---|---|---|---|---|---|---|
| AdjustCreditLimit/UTCID08 | PARTNER/FIN | UC-55 | UpdateCustomerCreditLimitCommandHandler → CreditLimitChanger.cs | Hạ hạn mức xuống dưới dư nợ | Khách dư nợ 5.000.000; SET hạn mức 4.000.000 | Bắt đầu bằng "Hạn mức mới (4.000.000 đ) thấp hơn dư nợ hiện tại (5.000.000 đ). Không được hạ hạn mức xuống dưới dư nợ." | High | Business Logic | BR-12 (CreditLimitChanger.cs:37) |
| AdjustCreditLimit/UTCID11 | PARTNER/FIN | UC-55 | UpdateCustomerCreditLimitCommandHandler → CustomerCreditLimitCommands.cs | Nhánh lỗi: Hạn mức phải trong khoảng 0 – 999.999.999.999 đ. | Đổi 1 khách: SET hạn mức 1.000.000.000.000 (biên trên + 1) | "Hạn mức phải trong khoảng 0 – 999.999.999.999 đ." | High | Boundary | Nhánh trong code chưa có ca (CustomerCreditLimitCommands.cs:25) |
| AdjustCreditLimit/UTCID12 | PARTNER/FIN | UC-55 | UpdateCustomerCreditLimitCommandHandler → CreditLimitChanger.cs | Nhánh lỗi: Hạn mức phải trong khoảng 0 – 999.999.999.999 đ. | PERCENT +1000% trên hạn mức 100.000.000.000 → kết quả vượt 999.999.999.999 (validator không chặn được, chỉ CreditLimitChanger chặn) | "Hạn mức phải trong khoảng 0 – 999.999.999.999 đ." | High | Business Logic | Nhánh trong code chưa có ca (CreditLimitChanger.cs:35) |
| AdjustStock/UTCID09 | GOODS | UC-99 | AdjustProductStockCommandHandler | Nhánh lỗi: Kho không tồn tại hoặc đã ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Kho không tồn tại hoặc đã ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (AdjustProductStockCommand.cs:54) |
| ApproveProductionOrder/UTCID08 | BOM/PROD | UC-58, UC-59 | ApproveProductionOrderCommandHandler | Duyệt hoàn thành vượt số NVL đã xuất cho phép | Lệnh FG-01 kế hoạch 100; NVL đã xuất đủ cho 50; đã nhập 0; duyệt accepted 60 | Bắt đầu bằng "Thành phẩm FG-01: NVL đã xuất chỉ đủ sản xuất tối đa 50 <đơn vị>, đã nhập 0 (đạt + lỗi) nên đợt này duyệt được tối đa 50 <đơn vị>." | Critical | Business Logic | BR-37 / ProductionPolicy.ProducibleFromIssued (ApproveProductionOrderCommand.cs:145, ApproveProductionOrderCommand.cs:146) |
| ApproveProductionOrder/UTCID09 | BOM/PROD | UC-58, UC-59 | ApproveProductionOrderCommandHandler | Nhánh lỗi: Số lượng đạt không được âm. | Giá trị −1 | "Số lượng đạt không được âm." | High | Boundary | Nhánh trong code chưa có ca (ApproveProductionOrderCommand.cs:41) |
| ApproveProductionOrder/UTCID10 | BOM/PROD | UC-58, UC-59 | ApproveProductionOrderCommandHandler | Nhánh lỗi: Số lượng lỗi không được âm. | Giá trị −1 | "Số lượng lỗi không được âm." | High | Boundary | Nhánh trong code chưa có ca (ApproveProductionOrderCommand.cs:45) |
| ApproveProductionOrder/UTCID11 | BOM/PROD | UC-58, UC-59 | ApproveProductionOrderCommandHandler | Nhánh lỗi: Kho thành phẩm không tồn tại hoặc đã ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Kho thành phẩm không tồn tại hoặc đã ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (ApproveProductionOrderCommand.cs:90) |
| CreateBooking/UTCID07 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Số lượng đặt phải lớn hơn 0. | Giá trị 0 (biên dưới) | "Số lượng đặt phải lớn hơn 0." | High | Boundary | Nhánh trong code chưa có ca (SalesBookingCommands.cs:38) |
| CreateBooking/UTCID08 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Đơn giá không được âm. | Giá trị −1 | "Đơn giá không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesBookingCommands.cs:40) |
| CreateBooking/UTCID09 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Giảm giá không được âm. | Giá trị −1 | "Giảm giá không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesBookingCommands.cs:41) |
| CreateBooking/UTCID10 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Giảm giá đơn không được âm. | Giá trị −1 | "Giảm giá đơn không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesBookingCommands.cs:43) |
| CreateBooking/UTCID11 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Tiền khách trả trước không được âm. | Giá trị −1 | "Tiền khách trả trước không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesBookingCommands.cs:44) |
| CreateBooking/UTCID12 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Chi nhánh xử lý không tồn tại hoặc đã ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Chi nhánh xử lý không tồn tại hoặc đã ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (SalesBookingCommands.cs:95) |
| CreateBooking/UTCID13 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Bạn không có quyền tạo đơn cho chi nhánh '<WarehouseName>'. | Mock ICurrentUserService: không có quyền kho / sai vai trò | "Bạn không có quyền tạo đơn cho chi nhánh '<WarehouseName>'." | High | Negative | Nhánh trong code chưa có ca (SalesBookingCommands.cs:97) |
| CreateBooking/UTCID14 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Khách hàng '<PartnerName>' đang ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Khách hàng '<PartnerName>' đang ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (SalesBookingCommands.cs:102) |
| CreateBooking/UTCID15 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Hàng '<ProductName>' (<ProductCode>) đã ngừng kinh doanh. | Bản ghi tham chiếu IsActive = false | "Hàng '<ProductName>' (<ProductCode>) đã ngừng kinh doanh." | High | Negative | Nhánh trong code chưa có ca (SalesBookingCommands.cs:109) |
| CreateBooking/UTCID16 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Hàng '<ProductName>' đã hết tồn tại <WarehouseName>. Thiết lập hiện không cho đặt hàng khi… | AllowOrderWhenOutOfStock = false; hàng hết tồn tại chi nhánh | "Hàng '<ProductName>' đã hết tồn tại <WarehouseName>. Thiết lập hiện không cho đặt hàng khi hết tồn." | High | Business Logic | Nhánh trong code chưa có ca (SalesBookingCommands.cs:121) |
| CreateBooking/UTCID17 | SALES | UC-19 | SaveSalesBookingCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Giá trị đơn (<total>) nhỏ hơn tiền khách đã trả trước (<alreadyPaid>). | Đơn đã trả trước 600.000; sửa giá trị đơn còn 500.000 | "Giá trị đơn (<total>) nhỏ hơn tiền khách đã trả trước (<alreadyPaid>)." | High | Business Logic | Nhánh trong code chưa có ca (SalesBookingCommands.cs:156) |
| CreateCreditRequest/UTCID07 | PARTNER/FIN | UC-27 | CreateCreditRequestCommandHandler | Nhánh lỗi: Nợ mới dự kiến phải lớn hơn 0. | Giá trị 0 (biên dưới) | "Nợ mới dự kiến phải lớn hơn 0." | High | Boundary | Nhánh trong code chưa có ca (CreateCreditRequestCommand.cs:27) |
| CreateCreditRequest/UTCID08 | PARTNER/FIN | UC-27 | CreateCreditRequestCommandHandler | Nhánh lỗi: Hạn mức đề xuất phải lớn hơn 0. | Giá trị 0 (biên dưới) | "Hạn mức đề xuất phải lớn hơn 0." | High | Boundary | Nhánh trong code chưa có ca (CreateCreditRequestCommand.cs:31) |
| CreateCreditRequest/UTCID09 | PARTNER/FIN | UC-27 | CreateCreditRequestCommandHandler → CreditRequestMessages.cs | Nhánh lỗi: Hạn mức đề xuất phải từ <required> đ trở lên (bằng dư nợ hiện tại + nợ mới dự kiến). | Dư nợ 9.000.000 + nợ mới 2.000.000; hạn mức đề xuất 10.000.000 | "Hạn mức đề xuất phải từ <required> đ trở lên (bằng dư nợ hiện tại + nợ mới dự kiến)." | High | Boundary | Nhánh trong code chưa có ca (CreditRequestMessages.cs:35) |
| CreateCustomer/UTCID08 | PARTNER/FIN | UC-54 | CreateCustomerCommandHandler | Nhánh lỗi: Email không được vượt quá 254 ký tự. | Giá trị vượt giới hạn nghiệp vụ (biên + 1) | "Email không được vượt quá 254 ký tự." | High | Boundary | Nhánh trong code chưa có ca (CreateCustomerCommand.cs:50) |
| CreateCustomerPayment/UTCID08 | PARTNER/FIN | UC-25, UC-84 | CreateCustomerPaymentCommandHandler | Nhánh lỗi: Số tiền phân bổ không được âm. | Giá trị −1 | "Số tiền phân bổ không được âm." | High | Boundary | Nhánh trong code chưa có ca (CreateCustomerPaymentCommand.cs:29) |
| CreateCustomerPayment/UTCID09 | PARTNER/FIN | UC-25, UC-84 | CreateCustomerPaymentCommandHandler | Nhánh lỗi: Tiền thu cho hóa đơn <OrderCode> (<Amount>) vượt quá số còn cần thu (<remaining>).… | Hóa đơn HD0001 còn cần thu 300.000; phân bổ 400.000 | "Tiền thu cho hóa đơn <OrderCode> (<Amount>) vượt quá số còn cần thu (<remaining>)." | High | Business Logic | Nhánh trong code chưa có ca (CreateCustomerPaymentCommand.cs:113) |
| CreateDisposal/UTCID09 | STOCK | UC-43 | CreateDisposalCommandHandler | Nhánh lỗi: Kho xuất hủy không tồn tại hoặc đã ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Kho xuất hủy không tồn tại hoặc đã ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (CreateDisposalCommand.cs:74) |
| CreateDisposal/UTCID10 | STOCK | UC-43 | CreateDisposalCommandHandler → DisposalLogic.cs | Nhánh lỗi: Người xuất hủy không hợp lệ hoặc không có quyền trên kho của phiếu. | ProcessedBy là nhân viên không có quyền kho của phiếu | "Người xuất hủy không hợp lệ hoặc không có quyền trên kho của phiếu." | High | Negative | Nhánh trong code chưa có ca (DisposalLogic.cs:83) |
| CreateDisposal/UTCID11 | STOCK | UC-43 | CreateDisposalCommandHandler → DisposalLogic.cs | Nhánh lỗi: Số lượng hủy phải lớn hơn 0. | Giá trị 0 (biên dưới) | "Số lượng hủy phải lớn hơn 0." | High | Boundary | Nhánh trong code chưa có ca (DisposalLogic.cs:111) |
| CreateFinishedGoodsReceipt/UTCID07 | BOM/PROD | UC-49, UC-50 | CreateFinishedGoodsReceiptCommandHandler | Nhập thành phẩm vượt số NVL đã xuất cho phép | Như trên, nhập accepted 30 sau khi đã nhập 30 | Bắt đầu bằng "Thành phẩm FG-01: NVL đã xuất chỉ đủ sản xuất tối đa 50, đã nhập 30 (đạt + lỗi) nên phiếu này nhập được tối đa 20." | Critical | Business Logic | BR-37 (CreateFinishedGoodsReceiptCommand.cs:123, CreateFinishedGoodsReceiptCommand.cs:124) |
| CreateFinishedGoodsReceipt/UTCID08 | BOM/PROD | UC-49, UC-50 | CreateFinishedGoodsReceiptCommandHandler | Nhập thành phẩm giữ nguyên giá vốn | FG-01 giá vốn hiện tại 12.000; nhập accepted 10 | Tồn FG-01 +10; giá vốn FG-01 vẫn 12.000 (không tính lại từ NVL) | High | Business Logic | Quyết định 18/11: bỏ CalculateFinishedGoodsUnitCost |
| CreateFinishedGoodsReceipt/UTCID09 | BOM/PROD | UC-49, UC-50 | CreateFinishedGoodsReceiptCommandHandler | Nhánh lỗi: Số lượng lỗi không được âm. | Giá trị −1 | "Số lượng lỗi không được âm." | High | Boundary | Nhánh trong code chưa có ca (CreateFinishedGoodsReceiptCommand.cs:36) |
| CreateFinishedGoodsReceipt/UTCID10 | BOM/PROD | UC-49, UC-50 | CreateFinishedGoodsReceiptCommandHandler | Nhánh lỗi: Kho thành phẩm không tồn tại hoặc đã ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Kho thành phẩm không tồn tại hoặc đã ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (CreateFinishedGoodsReceiptCommand.cs:84) |
| CreateFinishedGoodsReceipt/UTCID11 | BOM/PROD | UC-49, UC-50 | CreateFinishedGoodsReceiptCommandHandler → ProductionHelper.cs | Nhánh lỗi: Số thành phẩm cần nhiều nguyên vật liệu hơn số đã xuất theo định mức. Vui lòng nhập ghi ch… | Nhập TP cần NVL nhiều hơn số đã xuất, không có WarningNote | "Số thành phẩm cần nhiều nguyên vật liệu hơn số đã xuất theo định mức. Vui lòng nhập ghi chú để tiếp tục." | High | Business Logic | Nhánh trong code chưa có ca (ProductionHelper.cs:20) |
| CreateMaterialIssue/UTCID08 | BOM/PROD | UC-46, UC-47 | CreateMaterialIssueCommandHandler | Xuất NVL khi kho đang kiểm | Phiếu kiểm KK0001 DRAFT của K001 có RM-01; xuất RM-01 | "Mặt hàng RM-01 đang được kiểm kho (phiếu KK0001). Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc." | High | Business Logic | BR-42 áp cho cả xuất NVL, nhập TP, duyệt hoàn thành, xuất hủy |
| CreateMaterialIssue/UTCID09 | BOM/PROD | UC-46, UC-47 | CreateMaterialIssueCommandHandler | Nhánh lỗi: Lệnh lập từ kế hoạch <PlanCode>: phải xuất nguyên vật liệu tại <Name>.… | Lệnh lập từ kế hoạch KH0001 (kho NVL K001); xuất tại K002 | "Lệnh lập từ kế hoạch <PlanCode>: phải xuất nguyên vật liệu tại <Name>." | High | Business Logic | Nhánh trong code chưa có ca (CreateMaterialIssueCommand.cs:82) |
| CreateMaterialIssue/UTCID10 | BOM/PROD | UC-46, UC-47 | CreateMaterialIssueCommandHandler | Nhánh lỗi: Kho xuất không tồn tại hoặc đã ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Kho xuất không tồn tại hoặc đã ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (CreateMaterialIssueCommand.cs:87) |
| CreateMaterialIssue/UTCID11 | BOM/PROD | UC-46, UC-47 | CreateMaterialIssueCommandHandler → ProductionHelper.cs | Nhánh lỗi: Bạn không có quyền thao tác trên kho này. | Mock ICurrentUserService: không có quyền kho / sai vai trò | "Bạn không có quyền thao tác trên kho này." | High | Negative | Nhánh trong code chưa có ca (ProductionHelper.cs:21) |
| CreateOrderFromPlan/UTCID06 | BOM/PROD | UC-95 | CreateProductionOrderFromPlanCommandHandler → ProductionPlanRules.cs | Nhánh lỗi: Bạn không có quyền lập lệnh sản xuất. | Người dùng không có quyền PROD_CREATE | "Bạn không có quyền lập lệnh sản xuất." | High | Negative | Nhánh trong code chưa có ca (ProductionPlanRules.cs:179) |
| CreateOrderFromPlan/UTCID07 | BOM/PROD | UC-95 | CreateProductionOrderFromPlanCommandHandler → ProductionPlanRules.cs | Nhánh lỗi: Số lượng lập lệnh của thành phẩm <Code> vượt số còn lại của kế hoạch (<remaining>).… | Kế hoạch FG-01 100, đã lập lệnh 80; lập thêm 30 | "Số lượng lập lệnh của thành phẩm <Code> vượt số còn lại của kế hoạch (<remaining>)." | High | Boundary | Nhánh trong code chưa có ca (ProductionPlanRules.cs:382) |
| CreatePosOrder/UTCID10 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Bán phần hàng đang tạm giữ cho đơn đặt | Tồn P-TEST K001 = 10; đơn đặt mở giữ 8; bán 5 | "Sản phẩm '<tên>' (Mã: P-TEST) có tồn kho 10 nhưng đang tạm giữ 8 cho các đơn đặt hàng khác. Tồn khả dụng: 2, Yêu cầu xuất: 5. Chính sách hệ thống không cho phép bán hàng đang tạm giữ (A3)." | Critical | Business Logic | BR-16: tồn khả dụng = tồn − tạm giữ (CreatePosOrderCommand.cs:362) |
| CreatePosOrder/UTCID11 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Bán vượt tồn khi không cho âm kho | AllowNegativeStockSale = false; tồn 3; bán 5 | "Sản phẩm '<tên>' (Mã: P-TEST) không đủ tồn kho tại Kho Gia Lâm. Tồn hiện tại: 3 …, Số lượng yêu cầu xuất: 5. Không thể xuất âm kho (B1, POS-014, INV-006)." | Critical | Business Logic | BR-16 (CreatePosOrderCommand.cs:355) |
| CreatePosOrder/UTCID12 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Gửi lại cùng ClientRequestId (idempotent) | Lần 1 tạo HD0001 với ClientRequestId "REQ-1"; gửi lại y hệt | Trả lại HD0001, Message "Đơn hàng đã được ghi nhận trước đó (Idempotent response)."; tồn chỉ trừ 1 lần; không tạo hóa đơn thứ 2 | Critical | Business Logic | Chống thanh toán trùng (CreatePosOrderCommand.cs:100–128) (CreatePosOrderCommand.cs:128) |
| CreatePosOrder/UTCID13 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Lập hóa đơn từ đơn đặt, giao đủ | DH0001 DRAFT của KH-HM01 tại K001: P-TEST 10, trả trước 200.000; hóa đơn BookingId = DH0001 giao 10, trả phần còn lại CASH | Hóa đơn COMPLETED; DH0001 COMPLETED; tồn K001 −10 (ISSUE_SALE); tiền trả trước 200.000 trừ vào hóa đơn; không tạo đơn đặt mới | Critical | Business Logic | Bước chính của UC-23 (đặt hàng → hóa đơn) chưa có ca |
| CreatePosOrder/UTCID14 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Giao một phần đơn đặt, tách đơn phần còn lại | DH0001 đặt 10, trả trước 0; hóa đơn giao 6; CreateRemainderBooking = true | Theo code: DH0001 chốt SL 6 → COMPLETED; tạo đơn đặt mới DRAFT SL 4, ghi chú "Tách từ đơn DH0001 (phần khách chưa lấy)"; tồn −6. BR-17 (Report 3) lại ghi "đơn chuyển Đang giao, giữ SL còn lại" → NEEDS_CLARIFICATION (ISS-10) | Critical | Business Logic | BR-17 chưa có ca; code khác spec |
| CreatePosOrder/UTCID15 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Bán khi cho phép âm kho | AllowNegativeStockSale = true; tồn 3; bán 5 | Success; tồn = −2; thẻ kho ISSUE_SALE −5 | High | Business Logic | Nhánh còn lại của thiết lập âm kho (BR-16 "unless negative stock is allowed") |
| CreatePosOrder/UTCID16 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Ghi nợ khi khách không có hạn mức | Khách KH-HM02 hạn mức 0; ghi nợ 100.000 | "Khách hàng '<tên>' không có hạn mức tín dụng (Hạn mức: 0 đ). Không thể thực hiện ghi công nợ (CUS-007)." | High | Business Logic | BR-12 (CreatePosOrderCommand.cs:429) |
| CreatePosOrder/UTCID17 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Khách đã dùng hết hạn mức | Hạn mức 10.000.000, dư nợ 10.000.000; ghi nợ 1 | "Khách hàng '<tên>' đã sử dụng hết hạn mức tín dụng (Hạn mức: 10.000.000 đ, Dư nợ hiện tại: 10.000.000 đ). Không thể phát sinh thêm nợ 1 đ (CUS-008)." | High | Boundary | BR-12 biên = hạn mức (CreatePosOrderCommand.cs:445) |
| CreatePosOrder/UTCID18 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Nợ đúng bằng hạn mức còn lại | Hạn mức 10.000.000, dư nợ 9.900.000; ghi nợ 100.000 | Success; CurrentDebt = 10.000.000 | High | Boundary | BR-12: điều kiện ≤ hạn mức (biên đúng bằng) |
| CreatePosOrder/UTCID19 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Bấm thanh toán 2 lần trong 3 giây (không có ClientRequestId) | Cùng khách, cùng tổng tiền, gửi lần 2 ngay sau lần 1 | "Giao dịch đang được xử lý, vui lòng không nhấn thanh toán nhiều lần liên tiếp (PAY-016)." | High | Business Logic | CreatePosOrderCommand.cs:142; phụ thuộc giờ hệ thống – nếu không ổn định thì chuyển Integration |
| CreatePosOrder/UTCID20 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Lập hóa đơn từ đơn đặt đã hoàn thành/hủy | BookingId của DH0002 COMPLETED | "Đơn đặt hàng DH0002 đã hoàn thành hoặc đã hủy." | High | Negative | UC-23 (CreatePosOrderCommand.cs:196) |
| CreatePosOrder/UTCID21 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Hóa đơn khác khách với đơn đặt | DH0001 của KH-HM01; hóa đơn chọn KH-HM02 | "Hóa đơn phải cùng khách hàng với đơn đặt hàng DH0001." | High | Negative | UC-23 (CreatePosOrderCommand.cs:198) |
| CreatePosOrder/UTCID22 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Hóa đơn xuất từ chi nhánh khác đơn đặt | DH0001 chi nhánh K001; hóa đơn WarehouseId K002 | "Đơn đặt hàng DH0001 thuộc chi nhánh khác — hóa đơn phải xuất từ chi nhánh xử lý của đơn." | High | Negative | BR-10 / UC-23 (CreatePosOrderCommand.cs:200) |
| CreatePosOrder/UTCID23 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Giao một phần đơn đặt, không tách đơn | Như trên, CreateRemainderBooking = false | DH0001 COMPLETED với SL 6; không có đơn mới; tồn −6 | High | Business Logic | Nhánh còn lại của SettleWithInvoice |
| CreatePosOrder/UTCID24 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Khách ngừng hoạt động | KH-HM03 IsActive = false | "Khách hàng '<tên>' đang trong trạng thái ngừng hoạt động, từ chối giao dịch (CUS-003)." | High | Negative | Nhánh chưa có ca (CreatePosOrderCommand.cs:184) |
| CreatePosOrder/UTCID25 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Kho xuất ngừng hoạt động | WarehouseId = 1 (inactive) | "Kho xuất '<tên kho>' đang tạm ngừng hoạt động, không thể xuất hàng (INV-003)." | High | Negative | Nhánh chưa có ca (CreatePosOrderCommand.cs:156) |
| CreatePosOrder/UTCID26 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Hàng ngừng kinh doanh | P-STOP IsActive = false | "Sản phẩm '<tên>' (P-STOP) đã ngừng kinh doanh/ngừng hoạt động (POS-003)." | High | Negative | Nhánh chưa có ca (CreatePosOrderCommand.cs:218) |
| CreatePosOrder/UTCID27 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Nhánh lỗi: Số lượng sản phẩm vượt quá giới hạn 100.000 (POS-008). | Giá trị vượt giới hạn nghiệp vụ (biên + 1) | "Số lượng sản phẩm vượt quá giới hạn 100.000 (POS-008)." | High | Boundary | Nhánh trong code chưa có ca (CreatePosOrderCommand.cs:47) |
| CreatePosOrder/UTCID28 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Nhánh lỗi: Đơn giá không được âm (POS-011). | Giá trị −1 | "Đơn giá không được âm (POS-011)." | High | Boundary | Nhánh trong code chưa có ca (CreatePosOrderCommand.cs:50) |
| CreatePosOrder/UTCID29 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Nhánh lỗi: Số tiền giảm giá đơn hàng không được âm (AMT-005). | Giá trị −1 | "Số tiền giảm giá đơn hàng không được âm (AMT-005)." | High | Boundary | Nhánh trong code chưa có ca (CreatePosOrderCommand.cs:54) |
| CreatePosOrder/UTCID30 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Nhánh lỗi: Số tiền thanh toán trước không được âm (PAY-005). | Giá trị −1 | "Số tiền thanh toán trước không được âm (PAY-005)." | High | Boundary | Nhánh trong code chưa có ca (CreatePosOrderCommand.cs:57) |
| CreatePosOrder/UTCID31 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Nhánh lỗi: Tổng giá trị đơn hàng không hợp lệ (AMT-013). | Tổng sau giảm giá < 0 (giảm giá > tiền hàng) | "Tổng giá trị đơn hàng không hợp lệ (AMT-013)." | High | Boundary | Nhánh trong code chưa có ca (CreatePosOrderCommand.cs:289) |
| CreatePosOrder/UTCID32 | SALES | UC-23, UC-35 | CreatePosOrderCommandHandler | Nhánh lỗi: Sản phẩm '<ProductName>' (Mã: <ProductCode>) hiện đã hết hàng tồn kho. Chính sách hệ thống… | AllowOrderWhenOutOfStock = false; lập hóa đơn từ đơn đặt khi hàng tồn = 0 | "Sản phẩm '<ProductName>' (Mã: <ProductCode>) hiện đã hết hàng tồn kho. Chính sách hệ thống không cho phép nhận đặt hàng khi hết tồn kho (A2)." | High | Business Logic | Nhánh trong code chưa có ca (CreatePosOrderCommand.cs:325) |
| CreateProductionPlan/UTCID08 | BOM/PROD | UC-92, UC-93 | CreateProductionPlanCommandHandler → ProductionPlanRules.cs | Thiếu kho xuất NVL | Request hợp lệ nhưng WarehouseId = null | "Vui lòng chọn kho xuất nguyên vật liệu." | High | Negative | Trường bắt buộc mới (20/11) (ProductionPlanRules.cs:64) |
| CreateProductionPlan/UTCID09 | BOM/PROD | UC-92, UC-93 | CreateProductionPlanCommandHandler → ProductionPlanRules.cs | Dòng thiếu kho nhận thành phẩm | Dòng FG-01 WarehouseId = null | "Vui lòng chọn kho nhận thành phẩm." | High | Negative | Trường bắt buộc mới (ProductionPlanRules.cs:79) |
| CreateProductionPlan/UTCID10 | BOM/PROD | UC-92, UC-93 | CreateProductionPlanCommandHandler → ProductionPlanRules.cs | Kho xuất NVL ngừng hoạt động | WarehouseId = 1 (kho inactive) | "Kho xuất nguyên vật liệu không tồn tại hoặc đã ngừng hoạt động." | High | Negative | BR-04 (ProductionPlanRules.cs:289) |
| CreateProductionPlan/UTCID11 | BOM/PROD | UC-92, UC-93 | CreateProductionPlanCommandHandler → ProductionPlanRules.cs | Kho xuất NVL không thuộc quyền người lập | Người lập chỉ có K001; WarehouseId = 4 (K002) | "Kho xuất nguyên vật liệu phải là kho mà người lập kế hoạch được phân quyền." | High | Negative | BR-04 cô lập kho (ProductionPlanRules.cs:293) |
| CreateProductionPlan/UTCID12 | BOM/PROD | UC-92, UC-93 | CreateProductionPlanCommandHandler → ProductionPlanRules.cs | Kho nhận thành phẩm ngừng hoạt động | Dòng FG-01 WarehouseId = 1 | "Kho nhận thành phẩm không tồn tại hoặc đã ngừng hoạt động." | High | Negative | BR-04 (ProductionPlanRules.cs:273) |
| CreateProductionPlan/UTCID13 | BOM/PROD | UC-92, UC-93 | CreateProductionPlanCommandHandler → ProductionPlanRules.cs | Đưa nguyên vật liệu vào kế hoạch | Dòng RM-01 (loại nguyên vật liệu) | "Chỉ được đưa thành phẩm hoặc bán thành phẩm vào kế hoạch, không đưa nguyên vật liệu: RM-01" | High | Business Logic | Ràng buộc loại hàng (ProductionPlanRules.cs:254) |
| CreatePurchase/UTCID30 | PURCHASE | UC-31, UC-32 | CreatePurchaseCommandHandler | Dòng vừa đạt vừa lỗi | COMPLETED; Quantity 8, DefectQuantity 2, giá 6.000 | Tồn +8; INBOUND_RECEIPT +8; CurrentPayable +48.000 (chỉ tính SL đạt) | Critical | Business Logic | BR-24, BR-25: tiền phải trả NCC chỉ theo SL đạt |
| CreatePurchase/UTCID31 | PURCHASE | UC-31, UC-32 | CreatePurchaseCommandHandler | Giá vốn MAC làm tròn 3 chữ số thập phân | Tồn trước 1 @ 1.000; COMPLETED nhập 2 @ 1.001 | Giá vốn = 3.002 / 3 = 1.000,667 | Critical | Business Logic | BR-29; CostingPolicy đổi sang 3 chữ số thập phân (CostDecimals = 3) – chưa ca nào kiểm số lẻ |
| CreatePurchase/UTCID32 | PURCHASE | UC-31, UC-32 | CreatePurchaseCommandHandler | Dòng toàn hàng lỗi (SL đạt 0, SL lỗi 5) được chấp nhận | COMPLETED; P-TEST Quantity 0, DefectQuantity 5, giá 6.000 | Success; dòng AcceptedQty 0 / DefectQty 5; tồn không đổi, không có thẻ kho; CurrentPayable +0 | High | Business Logic | BR-24: chỉ SL đạt vào kho và tính tiền; nhánh mới từ 20/11 (CreatePurchaseCommand.cs:206) |
| CreatePurchase/UTCID33 | PURCHASE | UC-31, UC-32 | CreatePurchaseCommandHandler → PurchaseItemMapper.cs | SL đạt âm | Quantity −1, DefectQuantity 0 | "Số lượng đạt của sản phẩm ID #1 không được âm." | High | Boundary | Nhánh chưa có ca (PurchaseItemMapper.cs:45) |
| CreatePurchaseReturn/UTCID23 | PURCHASE | UC-33 | CreatePurchaseReturnCommandHandler | Trả hàng lỗi hợp lệ không trừ tồn, không đổi công nợ | Phiếu nhập SL lỗi 5; COMPLETED trả DEFECT 5 | Success; ReturnPrice = 0, TotalAmount = 0; tồn không đổi (không có OUTBOUND_PURCHASE_RETURN); CurrentPayable không đổi | Critical | Business Logic | Hàng lỗi chưa vào kho, chưa tính tiền (PurchaseReturnLogic.cs:193, 275) |
| CreatePurchaseReturn/UTCID24 | PURCHASE | UC-33 | CreatePurchaseReturnCommandHandler → PurchaseReturnLogic.cs | Trả hàng lỗi không theo phiếu nhập | ReturnType "DEFECT", GrId = null | "Phiếu trả hàng lỗi phải lập theo phiếu nhập có ghi nhận hàng lỗi." | High | Negative | Nhánh trả hàng lỗi mới (20/11) (PurchaseReturnLogic.cs:113) |
| CreatePurchaseReturn/UTCID25 | PURCHASE | UC-33 | CreatePurchaseReturnCommandHandler → PurchaseReturnLogic.cs | Trả hàng lỗi vượt SL lỗi còn lại | Phiếu nhập dòng P-TEST SL lỗi 5, đã trả lỗi 2; trả DEFECT 4 | "Mặt hàng P-TEST chỉ còn 3 hàng lỗi chưa trả (SL lỗi 5)." | High | Boundary | Giới hạn theo SL lỗi, khác giới hạn SL đạt (PurchaseReturnLogic.cs:178) |
| CreatePurchaseReturn/UTCID26 | PURCHASE | UC-33 | CreatePurchaseReturnCommandHandler → SavePurchaseReturnCommands.cs | Nhánh lỗi: Bạn không có quyền truy cập phiếu trả hàng của kho này. | Mock ICurrentUserService: không có quyền kho / sai vai trò | "Bạn không có quyền truy cập phiếu trả hàng của kho này." | High | Negative | Nhánh trong code chưa có ca (SavePurchaseReturnCommands.cs:51) |
| CreatePurchaseReturn/UTCID27 | PURCHASE | UC-33 | CreatePurchaseReturnCommandHandler → SavePurchaseReturnCommands.cs | Nhánh lỗi: Chỉ sửa được phiếu trả hàng nhập ở trạng thái Phiếu tạm. | Chứng từ ở trạng thái không cho phép | "Chỉ sửa được phiếu trả hàng nhập ở trạng thái Phiếu tạm." | High | Negative | Nhánh trong code chưa có ca (SavePurchaseReturnCommands.cs:53) |
| CreateSalesReturn/UTCID08 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Trả hàng của hóa đơn có giảm giá nhưng không trừ giảm giá | HD0001 tiền hàng 1.000.000, giảm 100.000; trả hàng 500.000 theo giá bán; Discount = 0 | "Hóa đơn HD0001 được giảm giá 100.000: hàng trả phải trừ giảm giá tối thiểu 50.000 (phân bổ theo giá trị hàng trả), không trả khách nhiều hơn số đã thanh toán." | Critical | Business Logic | Chặn trả khách nhiều hơn đã thu (SalesReturnCommands.cs:153) (SalesReturnCommands.cs:154) |
| CreateSalesReturn/UTCID09 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler | Trả hàng có giảm giá phân bổ đúng | Như trên, khách KH-HM01, Discount = 50.000, phí 0, RefundAmount 0 | Success; TotalAmount 450.000; tồn +SL trả (RETURN_SALE); CurrentDebt khách −450.000 | Critical | Business Logic | BR-21 |
| CreateSalesReturn/UTCID10 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Khách lẻ nhận thiếu tiền | Khách lẻ; cần trả 200.000; RefundAmount 150.000 | "Khách lẻ không có công nợ — phải trả đủ tiền cho khách." | High | Business Logic | Khách lẻ không ghi nợ (SalesReturnCommands.cs:161) |
| CreateSalesReturn/UTCID13 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Nhánh lỗi: Giảm giá không được âm. | Giá trị −1 | "Giảm giá không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesReturnCommands.cs:41) |
| CreateSalesReturn/UTCID14 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Nhánh lỗi: Phí trả hàng không được âm. | Giá trị −1 | "Phí trả hàng không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesReturnCommands.cs:42) |
| CreateSalesReturn/UTCID15 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Nhánh lỗi: Tiền trả khách không được âm. | Giá trị −1 | "Tiền trả khách không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesReturnCommands.cs:43) |
| CreateSalesReturn/UTCID16 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Nhánh lỗi: Số lượng trả không được âm. | Giá trị −1 | "Số lượng trả không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesReturnCommands.cs:48) |
| CreateSalesReturn/UTCID17 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Nhánh lỗi: Giá nhập lại không được âm. | Giá trị −1 | "Giá nhập lại không được âm." | High | Boundary | Nhánh trong code chưa có ca (SalesReturnCommands.cs:49) |
| CreateSalesReturn/UTCID18 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Nhánh lỗi: Chi nhánh nhận hàng trả không tồn tại hoặc đã ngừng hoạt động. | Bản ghi tham chiếu IsActive = false | "Chi nhánh nhận hàng trả không tồn tại hoặc đã ngừng hoạt động." | High | Negative | Nhánh trong code chưa có ca (SalesReturnCommands.cs:92) |
| CreateSalesReturn/UTCID19 | SALES | UC-28, UC-41 | CreateSalesReturnCommandHandler → SalesReturnCommands.cs | Nhánh lỗi: Bạn không có quyền trả hàng của chi nhánh này. | Mock ICurrentUserService: không có quyền kho / sai vai trò | "Bạn không có quyền trả hàng của chi nhánh này." | High | Negative | Nhánh trong code chưa có ca (SalesReturnCommands.cs:93) |
| CreateSupplierPayment/UTCID06 | PARTNER/FIN | UC-85 | CreateSupplierPaymentCommandHandler | Nhánh lỗi: Số tiền phân bổ không được âm. | Giá trị −1 | "Số tiền phân bổ không được âm." | High | Boundary | Nhánh trong code chưa có ca (CreateSupplierPaymentCommand.cs:30) |
| CreateSupplierPayment/UTCID07 | PARTNER/FIN | UC-85 | CreateSupplierPaymentCommandHandler | Nhánh lỗi: Tổng tiền phân bổ vượt quá số tiền thanh toán. | Thanh toán 1.000.000; phân bổ 1.200.000 | "Tổng tiền phân bổ vượt quá số tiền thanh toán." | High | Business Logic | Nhánh trong code chưa có ca (CreateSupplierPaymentCommand.cs:90) |
| CreateSupplierPayment/UTCID08 | PARTNER/FIN | UC-85 | CreateSupplierPaymentCommandHandler | Nhánh lỗi: Phiếu nhập #<ReceiptId> không thuộc nhà cung cấp này hoặc chưa hoàn thành. | Phân bổ vào phiếu nhập của NCC khác hoặc phiếu DRAFT | "Phiếu nhập #<ReceiptId> không thuộc nhà cung cấp này hoặc chưa hoàn thành." | High | Business Logic | Nhánh trong code chưa có ca (CreateSupplierPaymentCommand.cs:119) |
| GetMyWarehouses/UTCID07 | AUTH | UC-16 | GetMyWarehousesQueryHandler | Nhánh lỗi: Yêu cầu xác thực tài khoản để xem kho làm việc. | Mock ICurrentUserService: không có quyền kho / sai vai trò | "Yêu cầu xác thực tài khoản để xem kho làm việc." | High | Negative | Nhánh trong code chưa có ca (GetMyWarehousesQuery.cs:31) |
| MergeBookings/UTCID06 | SALES | UC-24 | MergeSalesBookingsCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Bạn không có quyền gộp đơn của chi nhánh này. | Mock ICurrentUserService: không có quyền kho / sai vai trò | "Bạn không có quyền gộp đơn của chi nhánh này." | High | Negative | Nhánh trong code chưa có ca (SalesBookingCommands.cs:337) |
| MergeBookings/UTCID07 | SALES | UC-24 | MergeSalesBookingsCommandHandler → SalesBookingCommands.cs | Nhánh lỗi: Có đơn đã tạo hóa đơn giao hàng, không gộp được. | Chứng từ ở trạng thái không cho phép | "Có đơn đã tạo hóa đơn giao hàng, không gộp được." | High | Negative | Nhánh trong code chưa có ca (SalesBookingCommands.cs:339) |
| ReceivePurchaseOrder/UTCID09 | PURCHASE | UC-31, UC-32 | ReceivePurchaseOrderCommandHandler | Nhận theo phiếu đặt, dòng toàn hàng lỗi (thay UTCID05 lỗi thời) | PO PDN0001 ORDERED: P-TEST 100 × 10.000; nhận accepted 0, defect 5 | Success; phiếu nhập COMPLETED có dòng SL đạt 0 / lỗi 5; tồn P-TEST không đổi; không có thẻ kho | High | Business Logic | Thay ca OBSOLETE UTCID05; ReceivePurchaseOrderCommand.cs:53–56 |
| SubmitProductionPlan/UTCID06 | BOM/PROD | UC-93 | SubmitProductionPlanCommandHandler → ProductionPlanRules.cs | Nhánh lỗi: Chỉ người lập kế hoạch hoặc người có quyền duyệt mới được <action> kế hoạch này. | Người khác người lập, không có quyền duyệt, gửi duyệt kế hoạch | "Chỉ người lập kế hoạch hoặc người có quyền duyệt mới được <action> kế hoạch này." | High | Negative | Nhánh trong code chưa có ca (ProductionPlanRules.cs:134) |
| UpdateOrder/UTCID06 | SALES | UC-63 | UpdateOrderCommandHandler | Nhánh lỗi: Bạn không có quyền sửa đơn hàng của chi nhánh này. | Mock ICurrentUserService: không có quyền kho / sai vai trò | "Bạn không có quyền sửa đơn hàng của chi nhánh này." | High | Negative | Nhánh trong code chưa có ca (UpdateOrderCommand.cs:58) |
| UpdateStaff/UTCID07 | AUTH | UC-08 | UpdateStaffCommandHandler | Sửa tên nhưng không gửi danh sách kho (N-01) | sales01 có K001, K002; request đổi tên, AssignedWarehouses = null | Theo UC-08: quyền kho giữ nguyên K001, K002. Dự kiến Fail – code xóa hết (UpdateStaffCommand.cs:163) | High | Business Logic | ISS-03 |
| UpdateWarehouseAccess/UTCID07 | AUTH | UC-17 | UpdateWarehouseAccessCommandHandler | Người không phải Admin gọi handler | IsAuthenticated = true, IsAdmin = false | "Chỉ có Quản trị viên (Admin) mới có quyền phân bổ kho làm việc cho nhân sự." | High | Negative | Bản unit của UTCID06 (UTCID06 chuyển sang API) (UpdateWarehouseAccessCommand.cs:33) |

### C.2 Sheet mới

| Sheet mới | Lớp / hàm | Module | UC | BR | Ưu tiên | Phạm vi | Lý do |
|---|---|---|---|---|---|---|---|
| CreatePayosPayment | PayosPaymentCommands.cs – CreatePayosPaymentCommandHandler | SALES | UC-26 | BR-14 | Critical | Unit (mock IPayosGateway, ICurrentUserService) | UC-26 có code từ 20/11; tiền thật |
| HandlePayosWebhook | PayosPaymentCommands.cs – HandlePayosWebhookCommandHandler | SALES | UC-26 | BR-14 | Critical | Unit (mock IPayosGateway.VerifyWebhook) | An toàn chữ ký, idempotent |
| CancelPayosPayment | PayosPaymentCommands.cs – CancelPayosPaymentCommandHandler | SALES | UC-26 | BR-04 | High | Unit |  |
| TrxPayosPaymentStatus | Domain/Entities/TrxPayosPayment.Status.cs | SALES | UC-26 | — | Critical | Unit thuần (không DB) | MarkPaid idempotent |
| CreateCustomerDebtRefund | Customers/Commands/CreateCustomerDebtRefundCommand.cs | FIN | UC-84, UC-98 | BR-15, BR-46 | Critical | Unit | Tính năng mới 21/11 |
| CancelCustomerDebtRefund | Customers/Commands/CancelCustomerDebtRefundCommand.cs | FIN | UC-84 | BR-15 | High | Unit | Tính năng mới 21/11 |
| CreateSupplierRefundReceipt | Suppliers/Commands/CreateSupplierRefundReceiptCommand.cs | FIN | UC-85, UC-98 | BR-25, BR-46 | Critical | Unit | Tính năng mới 21/11 |
| CancelSupplierRefundReceipt | Suppliers/Commands/CancelSupplierRefundReceiptCommand.cs | FIN | UC-85 | BR-25 | High | Unit | Tính năng mới 21/11 |
| CancelSalesReturn | SalesReturns/Commands/SalesReturnCommands.cs – CancelSalesReturnCommand | SALES | UC-28 | BR-21 | Critical | Unit | Đảo tồn + công nợ |
| AddSalesReturnRefund | SalesReturns/Commands/SalesReturnCommands.cs – AddSalesReturnRefundCommand | SALES | UC-28 | BR-46 | High | Unit |  |
| AdjustCustomerDebt | Customers/Commands/AdjustCustomerDebtCommand.cs | FIN | UC-98 | BR-15, BR-49 | High | Unit |  |
| AdjustSupplierDebt | Suppliers/Commands/AdjustSupplierDebtCommand.cs | FIN | UC-98 | BR-25, BR-49 | High | Unit |  |
| AdjustMaterialNorm | Production/Commands/AdjustMaterialNormCommand.cs | PROD | UC-59 | BR-51, BR-52 | High | Unit | BR-51/52 chưa có ca nào |
| CancelProductionOrder | Production/Commands/CancelProductionOrderCommand.cs | PROD | UC-59 | BR-38 | Medium | Unit |  |
| UpdateProductionPlan | Production/Commands/UpdateProductionPlanCommand.cs | PROD | UC-92 | BR-30 | High | Unit | Ràng buộc kế hoạch đã duyệt |
| RunMrp | Production/Commands/RunMrpCommand.cs + Domain/Services/MrpPolicy.cs | PROD | UC-100 – UC-105 | BR-MRP-01 – 33 | High | Unit (MrpPolicy thuần) + Integration (RunMrp) | MRP bổ sung vào Report 3 (D3) |
| CreateStocktake | Stocktakes/Commands/StocktakeCommands.cs – CreateStocktakeCommand | STOCK | UC-39, UC-40 | BR-42, BR-43 | High | Unit | Bước đầu của luồng kiểm kho |
| ActivateBom | Production/Commands/ActivateBomCommand.cs + BomRules.ActivateAsync | PROD | UC-57 | BR-30 | High | Unit | Bước bắt buộc của luồng sản xuất |
| UpdateTransfer | Transfers/Commands/UpdateTransferCommand.cs | STOCK | UC-37 | BR-40 | Medium | Unit |  |
| MergeStocktakes | Stocktakes/Commands/StocktakeCommands.cs – MergeStocktakesCommand | STOCK | UC-39 | BR-42 | Medium | Unit |  |
| CostingPolicy | Domain/Services/CostingPolicy.cs | Domain | UC-31, UC-70 | BR-29 | Critical | Unit thuần | Đã đổi sang 3 chữ số thập phân + hàm mới WeightedAverageCost |
| ProductionPolicy | Domain/Services/ProductionPolicy.cs | Domain | UC-46, UC-49, UC-95 | BR-31, BR-37 | Critical | Unit thuần | Công thức nhu cầu NVL |
| PurchasePricing | Purchases/Helpers/PurchasePricing.cs | Domain/Helper | UC-31 | BR-29 | Critical | Unit thuần | Phân bổ giảm giá vào giá vốn |
| SalesReturnOps | SalesReturns/Queries/SalesReturnOps.cs | Domain/Helper | UC-28 | BR-21 | High | Unit thuần | Phân bổ giảm giá hóa đơn |
| DomainStatusRules | Domain/Entities/*.Status.cs (6 file) | Domain | UC-37, UC-43, UC-59, UC-64, UC-92 | BR-38 | High | Unit thuần | Ma trận trạng thái |

Mã SF-FUNC cho sheet mới: đề xuất dùng tiếp từ **SF-FUNC-141** theo thứ tự bảng trên (mã lớn nhất đang dùng là SF-FUNC-140) – cần nhóm xác nhận vì dãy 001–140 có vẻ lấy từ danh sách chức năng gốc (xem mục G, câu hỏi Q4).

| Test Case ID | Module | Use Case | Function/Class | Scenario | Test Data | Expected Result | Priority | Test Type | Reason |
|---|---|---|---|---|---|---|---|---|---|
| ActivateBom/UTCID01 | PROD | UC-57 | BomRules.ActivateAsync | Kích hoạt định mức phiên bản mới | FG-01 có v1.0 đang áp dụng; kích hoạt v2.0 có 1 dòng NVL | v2.0 IsActive = true; v1.0 IsActive = false (mỗi thành phẩm chỉ 1 định mức áp dụng) | High | Business Logic | BR-30: bước bắt buộc trước khi gửi duyệt kế hoạch / lập lệnh |
| ActivateBom/UTCID02 | PROD | UC-57 | Production/Commands/ActivateBomCommand.cs + BomRules.ActivateAsync | Kích hoạt định mức không có NVL | BOM v3.0 chưa có dòng NVL | "Định mức phải có ít nhất một nguyên vật liệu." | Medium | Negative | Chức năng chưa có sheet (ActivateBomCommand.cs:30) |
| AddSalesReturnRefund/UTCID01 | SALES | UC-28 | SalesReturns/Commands/SalesReturnCommands.cs – AddSalesReturnRefundCommand | Trả tiền thêm cho khách | TH0001 cần trả 300.000, đã trả 100.000; Amount 200.000 | Success; phiếu đã trả đủ | High | Positive | Chức năng chưa có sheet |
| AddSalesReturnRefund/UTCID02 | SALES | UC-28 | SalesReturns/Commands/SalesReturnCommands.cs – AddSalesReturnRefundCommand | Trả vượt số còn lại | Còn 200.000; Amount 250.000 | "Chỉ còn 200.000 chưa trả cho khách." | High | Boundary | BR-46 (SalesReturnCommands.cs:322) |
| AddSalesReturnRefund/UTCID03 | SALES | UC-28 | SalesReturns/Commands/SalesReturnCommands.cs – AddSalesReturnRefundCommand | Phiếu đã trả đủ | Còn 0 | "Phiếu TH0001 đã trả đủ tiền cho khách." | Medium | Negative | Chức năng chưa có sheet (SalesReturnCommands.cs:321) |
| AddSalesReturnRefund/UTCID04 | SALES | UC-28 | SalesReturns/Commands/SalesReturnCommands.cs – AddSalesReturnRefundCommand | Ngày trả trước ngày trả hàng | RefundDate < ReturnDate | "Thời gian trả tiền không được trước thời gian trả hàng." | Medium | Boundary | Chức năng chưa có sheet (SalesReturnCommands.cs:327) |
| AdjustCustomerDebt/UTCID01 | FIN | UC-98 | Customers/Commands/AdjustCustomerDebtCommand.cs | Điều chỉnh nợ cần thu | Nợ hiện tại 1.000.000; giá trị mới 800.000 | Success; CurrentDebt = 800.000; ghi chứng từ điều chỉnh −200.000 | High | Positive | UC-98 |
| AdjustCustomerDebt/UTCID02 | FIN | UC-98 | Customers/Commands/AdjustCustomerDebtCommand.cs | Giá trị mới bằng nợ hiện tại | Nợ 1.000.000; giá trị mới 1.000.000 | "Giá trị nợ điều chỉnh bằng nợ cần thu hiện tại — không có gì thay đổi." | Medium | Boundary | Chức năng chưa có sheet (AdjustCustomerDebtCommand.cs:77) |
| AdjustCustomerDebt/UTCID03 | FIN | UC-98 | Customers/Commands/AdjustCustomerDebtCommand.cs | Khách lẻ | Khách lẻ | "Khách lẻ không có công nợ để điều chỉnh." | Medium | Negative | Chức năng chưa có sheet (AdjustCustomerDebtCommand.cs:71) |
| AdjustCustomerDebt/UTCID04 | FIN | UC-98 | Customers/Commands/AdjustCustomerDebtCommand.cs | Ngày ở tương lai | AdjustDate = ngày mai | "Không được điều chỉnh công nợ với thời gian trong tương lai." | Medium | Boundary | Chức năng chưa có sheet (AdjustCustomerDebtCommand.cs:82) |
| AdjustMaterialNorm/UTCID01 | PROD | UC-59 | Production/Commands/AdjustMaterialNormCommand.cs | Giảm nhu cầu NVL xuống dưới số đã xuất | RM-01 đã xuất 30; nhu cầu mới 20; có lý do | "Nhu cầu NVL không được thấp hơn số lượng đã xuất." | High | Business Logic | BR-51 (ProductionHelper.cs:16) |
| AdjustMaterialNorm/UTCID02 | PROD | UC-59 | Production/Commands/AdjustMaterialNormCommand.cs | Bỏ NVL đã xuất | Bỏ dòng RM-01 đã xuất 5 | "Không bỏ được RM-01 vì đã xuất nguyên vật liệu này." | High | Business Logic | BR-52 (AdjustMaterialNormCommand.cs:90) |
| AdjustMaterialNorm/UTCID03 | PROD | UC-59 | Production/Commands/AdjustMaterialNormCommand.cs | Thiếu lý do | Đổi định mức, Reason rỗng | "Vui lòng nhập lý do điều chỉnh định mức." | Medium | Negative | BR-51 (ProductionHelper.cs:15) |
| AdjustMaterialNorm/UTCID04 | PROD | UC-59 | Production/Commands/AdjustMaterialNormCommand.cs | Tỷ lệ hao hụt 101% | WastageRate 101 | "Tỷ lệ hao hụt phải từ 0 đến 100%." | Medium | Boundary | Chức năng chưa có sheet (AdjustMaterialNormCommand.cs:77) |
| AdjustSupplierDebt/UTCID01 | FIN | UC-98 | Suppliers/Commands/AdjustSupplierDebtCommand.cs | Điều chỉnh nợ cần trả NCC | Nợ 2.000.000; giá trị mới 2.500.000 | Success; CurrentPayable = 2.500.000 | High | Positive | UC-98 |
| AdjustSupplierDebt/UTCID02 | FIN | UC-98 | Suppliers/Commands/AdjustSupplierDebtCommand.cs | Giá trị mới bằng nợ hiện tại | Nợ 2.000.000; giá trị mới 2.000.000 | "Giá trị nợ điều chỉnh bằng nợ cần trả hiện tại — không có gì thay đổi." | Medium | Boundary | Chức năng chưa có sheet (AdjustSupplierDebtCommand.cs:73) |
| CancelCustomerDebtRefund/UTCID01 | FIN | UC-84 | Customers/Commands/CancelCustomerDebtRefundCommand.cs | Hủy phiếu chi trả khách | Phiếu PC0001 200.000, CurrentDebt −300.000 | Success; CurrentDebt = −500.000; phiếu CANCELLED | High | Positive | Chức năng chưa có sheet |
| CancelCustomerDebtRefund/UTCID02 | FIN | UC-84 | Customers/Commands/CancelCustomerDebtRefundCommand.cs | Phiếu gắn với trả hàng | PC0002 sinh từ phiếu trả hàng TH0001 | "Phiếu PC0002 gắn với phiếu trả hàng — hủy ở phiếu trả hàng." | High | Business Logic | Chức năng chưa có sheet (CancelCustomerDebtRefundCommand.cs:42) |
| CancelCustomerDebtRefund/UTCID03 | FIN | UC-84 | Customers/Commands/CancelCustomerDebtRefundCommand.cs | Phiếu đã hủy | PC0001 đã CANCELLED | "Phiếu PC0001 đã hủy trước đó." | Medium | Negative | Chức năng chưa có sheet (CancelCustomerDebtRefundCommand.cs:44) |
| CancelPayosPayment/UTCID01 | SALES | UC-26 | PayosPaymentCommands.cs – CancelPayosPaymentCommandHandler | Hủy QR đang chờ | Giao dịch PENDING của kho K001 | Status CANCELLED | High | Positive | UC-26 |
| CancelPayosPayment/UTCID02 | SALES | UC-26 | PayosPaymentCommands.cs – CancelPayosPaymentCommandHandler | Giao dịch của kho khác | Người dùng chỉ có K001; giao dịch thuộc K002 | "Bạn không có quyền với giao dịch thanh toán này." | High | Negative | BR-04 (PayosPaymentCommands.cs:148) |
| CancelPayosPayment/UTCID03 | SALES | UC-26 | PayosPaymentCommands.cs – CancelPayosPaymentCommandHandler | Không tìm thấy giao dịch | PaymentId 999999 | "Không tìm thấy giao dịch thanh toán." | Medium | Negative | Chức năng chưa có sheet (PayosPaymentCommands.cs:146) |
| CancelProductionOrder/UTCID01 | PROD | UC-59 | Production/Commands/CancelProductionOrderCommand.cs | Hủy lệnh đã xuất NVL | Lệnh IN_PROGRESS | "Chỉ huỷ được lệnh sản xuất chưa xuất nguyên vật liệu." | High | Business Logic | BR-38 (CanCancel chỉ NOT_STARTED) (CancelProductionOrderCommand.cs:33) |
| CancelSalesReturn/UTCID01 | SALES | UC-28 | SalesReturns/Commands/SalesReturnCommands.cs – CancelSalesReturnCommand | Hủy phiếu trả hàng đã hoàn thành | TH0001 COMPLETED trả 2 × 100.000, RefundAmount 0 (đã giảm nợ 200.000) | Status CANCELLED; tồn −2 (RETURN_SALE_CANCEL); CurrentDebt +200.000 | Critical | Business Logic | Đảo BR-21 |
| CancelSalesReturn/UTCID02 | SALES | UC-28 | SalesReturns/Commands/SalesReturnCommands.cs – CancelSalesReturnCommand | Chi nhánh không có quyền | Người dùng chỉ có K002; TH0001 ở K001 | "Bạn không có quyền hủy phiếu trả hàng của chi nhánh này." | High | Negative | BR-04 (SalesReturnCommands.cs:259) |
| CancelSalesReturn/UTCID03 | SALES | UC-28 | SalesReturns/Commands/SalesReturnCommands.cs – CancelSalesReturnCommand | Phiếu đã hủy | TH0001 CANCELLED | "Phiếu TH0001 đã hủy trước đó." | Medium | Negative | Chức năng chưa có sheet (SalesReturnCommands.cs:257) |
| CancelSupplierRefundReceipt/UTCID01 | FIN | UC-85 | Suppliers/Commands/CancelSupplierRefundReceiptCommand.cs | Hủy phiếu thu NCC | Phiếu PT-NCC 100.000; CurrentPayable −200.000 | Success; CurrentPayable = −300.000 | High | Positive | Chức năng chưa có sheet |
| CancelSupplierRefundReceipt/UTCID02 | FIN | UC-85 | Suppliers/Commands/CancelSupplierRefundReceiptCommand.cs | Phiếu gắn với trả hàng nhập | Phiếu sinh từ THN0001 | "Phiếu <mã> gắn với phiếu trả hàng nhập — hủy ở phiếu trả hàng nhập." | High | Business Logic | Chức năng chưa có sheet (CancelSupplierRefundReceiptCommand.cs:41) |
| CancelSupplierRefundReceipt/UTCID03 | FIN | UC-85 | Suppliers/Commands/CancelSupplierRefundReceiptCommand.cs | Phiếu đã hủy | Phiếu đã CANCELLED | "Phiếu <mã> đã hủy trước đó." | Medium | Negative | Chức năng chưa có sheet (CancelSupplierRefundReceiptCommand.cs:43) |
| CostingPolicy/UTCID01 | Domain | UC-31, UC-70 | CostingPolicy.CalculateMovingAverageCost | MAC thông thường | CalculateMovingAverageCost(10, 4000, 10, 6000) | 5000.000 | Critical | Business Logic | BR-29 |
| CostingPolicy/UTCID02 | Domain | UC-31, UC-70 | CostingPolicy.CalculateMovingAverageCost | Tồn âm hoặc bằng 0 | (−5, 4000, 10, 6000) và (0, 0, 10, 6000) | 6000.000 cả hai | Critical | Boundary | Quy tắc tồn ≤ 0 lấy giá nhập |
| CostingPolicy/UTCID03 | Domain | UC-31, UC-70 | CostingPolicy.CalculateMovingAverageCost | SL nhập ≤ 0 | (10, 4000, 0, 6000) | 4000 (giữ giá cũ) | High | Boundary | Chức năng chưa có sheet |
| CostingPolicy/UTCID04 | Domain | UC-31, UC-70 | CostingPolicy.RoundCost | Làm tròn 3 chữ số, nửa lên | (1, 1, 1, 0.001) → 0,5005 | 0.501 (MidpointRounding.AwayFromZero, không phải 0.500) | High | Boundary | CostDecimals = 3 |
| CostingPolicy/UTCID05 | Domain | UC-31, UC-70 | CostingPolicy.WeightedAverageCost | Giá vốn bình quân nhiều dòng tồn | WeightedAverageCost([(10,4000),(10,6000),(5,0),(−2,7000)]) | 5000.000 (bỏ dòng SL ≤ 0 hoặc giá 0) | High | Business Logic | Hàm mới |
| CostingPolicy/UTCID06 | Domain | UC-31, UC-70 | CostingPolicy.WeightedAverageCost | Không có dòng hợp lệ | WeightedAverageCost([(0,7000)]) và ([] , fallback 123) | 7000 và 123 | Medium | Boundary | Chức năng chưa có sheet |
| CreateCustomerDebtRefund/UTCID01 | FIN | UC-84, UC-98 | Customers/Commands/CreateCustomerDebtRefundCommand.cs | Trả tiền khi cửa hàng nợ khách | CurrentDebt khách = −500.000; Amount 200.000 | Success; phiếu chi mới; CurrentDebt = −300.000 | Critical | Positive | Tính năng mới 21/11 |
| CreateCustomerDebtRefund/UTCID02 | FIN | UC-84, UC-98 | Customers/Commands/CreateCustomerDebtRefundCommand.cs | Cửa hàng không nợ khách | CurrentDebt = 0 | "Cửa hàng không nợ khách nên không thể lập phiếu chi. Khách đang nợ cửa hàng thì dùng Thanh toán." | High | Business Logic | Chức năng chưa có sheet (CreateCustomerDebtRefundCommand.cs:59) |
| CreateCustomerDebtRefund/UTCID03 | FIN | UC-84, UC-98 | Customers/Commands/CreateCustomerDebtRefundCommand.cs | Trả vượt số cửa hàng nợ | CurrentDebt = −500.000; Amount 500.001 | Bắt đầu bằng "Số tiền trả khách (500.001" … "vượt quá số cửa hàng đang nợ khách (500.000" | High | Boundary | BR-46 (CreateCustomerDebtRefundCommand.cs:66) |
| CreateCustomerDebtRefund/UTCID04 | FIN | UC-84, UC-98 | Customers/Commands/CreateCustomerDebtRefundCommand.cs | Trả đúng bằng số nợ | CurrentDebt = −500.000; Amount 500.000 | Success; CurrentDebt = 0 | High | Boundary | BR-46 biên |
| CreateCustomerDebtRefund/UTCID05 | FIN | UC-84, UC-98 | Customers/Commands/CreateCustomerDebtRefundCommand.cs | Số tiền làm tròn về 0 | Amount = 0,4 | "Số tiền trả khách phải lớn hơn 0." | Medium | Boundary | Math.Round về đồng (CreateCustomerDebtRefundCommand.cs:63) |
| CreateCustomerDebtRefund/UTCID06 | FIN | UC-84, UC-98 | Customers/Commands/CreateCustomerDebtRefundCommand.cs | Khách lẻ | PartnerCode = khách lẻ | "Khách lẻ không có công nợ." | Medium | Negative | Chức năng chưa có sheet (CreateCustomerDebtRefundCommand.cs:53) |
| CreateCustomerDebtRefund/UTCID07 | FIN | UC-84, UC-98 | Customers/Commands/CreateCustomerDebtRefundCommand.cs | Ngày ở tương lai | RefundDate = ngày mai | "Thời gian trả tiền không được ở tương lai." | Medium | Boundary | Chức năng chưa có sheet (CreateCustomerDebtRefundCommand.cs:71) |
| CreatePayosPayment/UTCID01 | SALES | UC-26 | PayosPaymentCommands.cs – CreatePayosPaymentCommandHandler | Tạo QR thanh toán hợp lệ | Đơn đang lập "TMP-1", số tiền 150.000, kho K001; mock IPayosGateway trả link | Success; bản ghi TrxPayosPayment PENDING, Amount 150.000; trả checkout URL / QR | Critical | Positive | UC-26 mới có code (20/11) |
| CreatePayosPayment/UTCID02 | SALES | UC-26 | PayosPaymentCommands.cs – CreatePayosPaymentCommandHandler | Đơn đã thanh toán qua payOS | Đơn HD0005 đã có giao dịch PAID 150.000 | Bắt đầu bằng "[PAYOS_ALREADY_PAID] Đơn HD0005 đã thanh toán qua payOS 150.000đ"; không tạo QR mới | Critical | Business Logic | Chống thu trùng (PayosPaymentCommands.cs:96, PayosPaymentCommands.cs:97) |
| CreatePayosPayment/UTCID03 | SALES | UC-26 | PayosPaymentCommands.cs – CreatePayosPaymentCommandHandler | Số tiền 0 | Amount = 0 | "Số tiền thanh toán phải lớn hơn 0." | High | Boundary | Validator (PayosPaymentCommands.cs:29) |
| CreatePayosPayment/UTCID04 | SALES | UC-26 | PayosPaymentCommands.cs – CreatePayosPaymentCommandHandler | Không có quyền kho bán | HasWarehouseAccess(K002) = false | "Bạn không có quyền bán hàng tại kho này." | High | Negative | BR-04 (PayosPaymentCommands.cs:72) |
| CreatePayosPayment/UTCID05 | SALES | UC-26 | PayosPaymentCommands.cs – CreatePayosPaymentCommandHandler | Số tiền lẻ đồng | Amount = 1.000,5 | "Số tiền chuyển khoản phải là số nguyên (đồng)." | Medium | Boundary | Validator (PayosPaymentCommands.cs:30) |
| CreatePayosPayment/UTCID06 | SALES | UC-26 | PayosPaymentCommands.cs – CreatePayosPaymentCommandHandler | Chưa cấu hình payOS | Mock gateway IsConfigured = false | "Chưa cấu hình tài khoản payOS. Liên hệ quản trị viên." | Medium | Negative | Nhánh cấu hình (PayosPaymentCommands.cs:70) |
| CreateStocktake/UTCID01 | STOCK | UC-39, UC-40 | Stocktakes/Commands/StocktakeCommands.cs – CreateStocktakeCommand | Tạo phiếu kiểm kho | K001, P-TEST tồn 100; Status DRAFT; StocktakeCode rỗng | Phiếu KKxxxx DRAFT, dòng SystemQty 100; tồn không đổi; từ lúc này giao dịch xuất NVL / nhập TP / xuất hủy của P-TEST tại K001 bị chặn (BR-42) | High | Positive | Bước đầu của UC-39 chưa có ca |
| CreateStocktake/UTCID02 | STOCK | UC-39, UC-40 | Stocktakes/Commands/StocktakeCommands.cs – CreateStocktakeCommand | Tạo và cân bằng ngay | K001, P-TEST tồn 100; Status BALANCED; actual 95 | Phiếu BALANCED; tồn 95; thẻ kho STOCKTAKE_OUT −5 | High | Business Logic | UC-39, UC-40 (BR-43) |
| CreateSupplierRefundReceipt/UTCID01 | FIN | UC-85, UC-98 | Suppliers/Commands/CreateSupplierRefundReceiptCommand.cs | Thu tiền khi NCC nợ cửa hàng | CurrentPayable NCC = −300.000; Amount 100.000 | Success; phiếu thu mới; CurrentPayable = −200.000 | Critical | Positive | Tính năng mới 21/11 |
| CreateSupplierRefundReceipt/UTCID02 | FIN | UC-85, UC-98 | Suppliers/Commands/CreateSupplierRefundReceiptCommand.cs | NCC không nợ cửa hàng | CurrentPayable = 0 | "Nhà cung cấp không nợ cửa hàng nên không thể lập phiếu thu. Cửa hàng đang nợ NCC thì dùng Thanh toán." | High | Business Logic | Chức năng chưa có sheet (CreateSupplierRefundReceiptCommand.cs:62) |
| CreateSupplierRefundReceipt/UTCID03 | FIN | UC-85, UC-98 | Suppliers/Commands/CreateSupplierRefundReceiptCommand.cs | Thu vượt số NCC nợ | CurrentPayable = −300.000; Amount 300.001 | Bắt đầu bằng "Số tiền thu (300.001" … "vượt quá số nhà cung cấp đang nợ cửa hàng (300.000" | High | Boundary | BR-46 (CreateSupplierRefundReceiptCommand.cs:69) |
| CreateSupplierRefundReceipt/UTCID04 | FIN | UC-85, UC-98 | Suppliers/Commands/CreateSupplierRefundReceiptCommand.cs | Số tiền 0 | Amount = 0 | "Số tiền thu phải lớn hơn 0." | Medium | Boundary | Chức năng chưa có sheet (CreateSupplierRefundReceiptCommand.cs:66) |
| CreateSupplierRefundReceipt/UTCID05 | FIN | UC-85, UC-98 | Suppliers/Commands/CreateSupplierRefundReceiptCommand.cs | Ngày ở tương lai | ReceiptDate = ngày mai | "Thời gian thu tiền không được ở tương lai." | Medium | Boundary | Chức năng chưa có sheet (CreateSupplierRefundReceiptCommand.cs:74) |
| DomainStatusRules/UTCID01 | Domain | UC-37, UC-43, UC-59, UC-64, UC-92 | TrxStockTransfer.Status | Chuyển kho: CanIssue / CanReceive / CanCancel | DRAFT, IN_TRANSIT, RECEIVED, CANCELLED | CanIssue chỉ DRAFT; CanReceive chỉ IN_TRANSIT; CanCancel mọi trạng thái trừ CANCELLED (xem ISS-04) | High | Business Logic | UC-37 |
| DomainStatusRules/UTCID02 | Domain | UC-37, UC-43, UC-59, UC-64, UC-92 | TrxProductionPlan.Status | Kế hoạch SX: CanSubmit / CanApprove / CanCancel / CanCreateOrder | DRAFT, REJECTED, PENDING_APPROVAL, APPROVED, CLOSED, CANCELLED | CanSubmit: DRAFT, REJECTED; CanApprove: PENDING_APPROVAL; CanCancel: trừ CLOSED, CANCELLED; CanCreateOrder: APPROVED | High | Business Logic | UC-92–96 |
| DomainStatusRules/UTCID03 | Domain | UC-37, UC-43, UC-59, UC-64, UC-92 | TrxProductionOrder.Status | Lệnh SX: CanCancel / CanReceiveFinishedGoods / CanApproveCompletion | NOT_STARTED, IN_PROGRESS, COMPLETED | CanCancel chỉ NOT_STARTED; nhận TP và duyệt hoàn thành chỉ IN_PROGRESS | High | Business Logic | BR-38 |
| HandlePayosWebhook/UTCID01 | SALES | UC-26 | PayosPaymentCommands.cs – HandlePayosWebhookCommandHandler | Webhook hợp lệ, mã "00" | Chữ ký đúng; Code "00"; orderCode của giao dịch PENDING; amount đủ | Success(true); giao dịch PAID, PaidAmount, PayosReference, PaidAt được ghi | Critical | Positive | Ghi nhận tiền vào |
| HandlePayosWebhook/UTCID02 | SALES | UC-26 | PayosPaymentCommands.cs – HandlePayosWebhookCommandHandler | Chữ ký sai | Signature bị sửa 1 ký tự | "Chữ ký webhook không hợp lệ."; trạng thái không đổi | Critical | Negative | An toàn: chống giả webhook (PayosPaymentCommands.cs:177) |
| HandlePayosWebhook/UTCID03 | SALES | UC-26 | PayosPaymentCommands.cs – HandlePayosWebhookCommandHandler | Webhook gửi lặp | Giao dịch đã PAID; gửi lại cùng webhook | Không đổi PaidAt / PaidAmount; không ghi nhận tiền lần 2 (MarkPaid trả false) | Critical | Business Logic | Idempotent – payOS có thể gửi lại |
| HandlePayosWebhook/UTCID04 | SALES | UC-26 | PayosPaymentCommands.cs – HandlePayosWebhookCommandHandler | Mã kết quả khác "00" | Chữ ký đúng; Code "01" | Success(false); giao dịch vẫn PENDING | High | Negative | Không ghi nhận khi payOS báo lỗi |
| HandlePayosWebhook/UTCID05 | SALES | UC-26 | PayosPaymentCommands.cs – HandlePayosWebhookCommandHandler | Số tiền webhook nhỏ hơn số cần thu | Giao dịch 150.000; webhook amount 100.000 | NEEDS_CLARIFICATION – code hiện ghi PAID và chỉ log cảnh báo (ISS-06) | High | Business Logic | ISS-06 |
| HandlePayosWebhook/UTCID06 | SALES | UC-26 | PayosPaymentCommands.cs – HandlePayosWebhookCommandHandler | orderCode không tồn tại | Chữ ký đúng; orderCode 999999 | Success(false); không ghi gì | Medium | Negative | Webhook lạ |
| MergeStocktakes/UTCID01 | STOCK | UC-39 | Stocktakes/Commands/StocktakeCommands.cs – MergeStocktakesCommand | Gộp phiếu kiểm khác kho | KK0001 (K001), KK0002 (K002) | "Chỉ gộp được các phiếu kiểm kho của cùng một kho." | Medium | Negative | UC-39 (StocktakeCommands.cs:164) |
| ProductionPolicy/UTCID01 | Domain | UC-46, UC-49, UC-95 | ProductionPolicy.CalculateRequirement | Nhu cầu NVL theo BR-31 | CalculateRequirement(100, 0.5, 10) | 55.00 | Critical | Business Logic | BR-31 |
| ProductionPolicy/UTCID02 | Domain | UC-46, UC-49, UC-95 | ProductionPolicy.ProducibleFromIssued | Số thành phẩm làm được từ NVL đã xuất | ProducibleFromIssued(55, 27.5, 100) | 50.00 (làm tròn xuống 2 chữ số) | Critical | Business Logic | Dùng ở duyệt hoàn thành / nhập TP |
| ProductionPolicy/UTCID03 | Domain | UC-46, UC-49, UC-95 | ProductionPolicy.CalculateRequirement | Hao hụt âm coi như 0; SL 0 | (100, 0.5, −5) và (0, 0.5, 10) | 50.00 và 0 | High | Boundary | Chức năng chưa có sheet |
| ProductionPolicy/UTCID04 | Domain | UC-46, UC-49, UC-95 | ProductionPolicy.TryCalculateRequirement | Tràn giới hạn lưu trữ | TryCalculateRequirement(9e15, 10, 0) | Trả false | Medium | Boundary | MaxStoredQuantity |
| PurchasePricing/UTCID01 | Domain/Helper | UC-31 | PurchasePricing.Compute | Phân bổ giảm giá phiếu vào giá vốn dòng | 2 dòng 10×6.000, 5×4.000; giảm 8.000 | GoodsTotal 80.000; Discount 8.000; LandedCost 5.400 và 3.600; NetTotal 72.000 | Critical | Business Logic | BR-29 (giá nhập sau giảm giá) |
| PurchasePricing/UTCID02 | Domain/Helper | UC-31 | PurchasePricing.Compute | Giảm giá lớn hơn tiền hàng; % giảm dòng > 100 | Giảm 100.000 trên tiền hàng 80.000; DiscountPercent 150 | Discount bị chặn 80.000 (NetTotal 0); % chặn 100 → giá 0 | High | Boundary | Chức năng chưa có sheet |
| RunMrp/UTCID01 | PROD | UC-100 – UC-105 | Production/Commands/RunMrpCommand.cs + Domain/Services/MrpPolicy.cs | Ngày cuối kỳ quá 366 ngày | EndDate = hôm nay + 367 ngày | "Ngày cuối kỳ phải từ hôm nay và không quá 366 ngày." | Medium | Boundary | UC-100 (RunMrpCommand.cs:34) |
| RunMrp/UTCID02 | PROD | UC-100 – UC-105 | Production/Commands/RunMrpCommand.cs + Domain/Services/MrpPolicy.cs | Chọn quá 20 kho | 21 kho NVL | "Chọn tối đa 20 kho." | Low | Boundary | Chức năng chưa có sheet (RunMrpCommand.cs:37) |
| SalesReturnOps/UTCID01 | Domain/Helper | UC-28 | SalesReturnOps.AllocateInvoiceDiscount | Phân bổ giảm giá hóa đơn cho hàng trả | AllocateInvoiceDiscount(1.000.000, 100.000, 333.333) | 33.333 (làm tròn đồng, không vượt 100.000) | High | Business Logic | Dùng ở CreateSalesReturn |
| TrxPayosPaymentStatus/UTCID01 | SALES | UC-26 | TrxPayosPayment.MarkPaid | MarkPaid từ PENDING | Status PENDING; MarkPaid(150000, "REF1", t) | Trả true; Status PAID; PaidAmount 150000; PayosReference "REF1"; PaidAt = t | Critical | Positive | Domain thuần |
| TrxPayosPaymentStatus/UTCID02 | SALES | UC-26 | TrxPayosPayment.MarkPaid | MarkPaid lần 2 | Status PAID; MarkPaid(1, "REF2", t2) | Trả false; các trường giữ giá trị cũ | Critical | Business Logic | Idempotent |
| TrxPayosPaymentStatus/UTCID03 | SALES | UC-26 | TrxPayosPayment.MarkPaid | MarkPaid khi đã CANCELLED | Status CANCELLED | Trả true; Status PAID (tiền thực đã vào) | High | Business Logic | Quy ước trong code |
| TrxPayosPaymentStatus/UTCID04 | SALES | UC-26 | TrxPayosPayment.CanClose | CanClose theo trạng thái | PENDING / PAID / CANCELLED / EXPIRED | true / false / false / false | Medium | Business Logic | Chức năng chưa có sheet |
| UpdateProductionPlan/UTCID01 | PROD | UC-92 | Production/Commands/UpdateProductionPlanCommand.cs | Giảm SL kế hoạch dưới số đã lập lệnh | Kế hoạch APPROVED, FG-01 đã lập lệnh 60; sửa SL 50 | "Số lượng kế hoạch của FG-01 không được thấp hơn số đã lập lệnh (60)." | High | Business Logic | UC-92 (UpdateProductionPlanCommand.cs:107) |
| UpdateProductionPlan/UTCID02 | PROD | UC-92 | Production/Commands/UpdateProductionPlanCommand.cs | Đổi tên kế hoạch đã duyệt | APPROVED; đổi tên | "Kế hoạch đã duyệt không được đổi tên hoặc kỳ kế hoạch." | Medium | Negative | Chức năng chưa có sheet (UpdateProductionPlanCommand.cs:88) |
| UpdateTransfer/UTCID01 | STOCK | UC-37 | Transfers/Commands/UpdateTransferCommand.cs | Sửa phiếu đang chuyển | Phiếu IN_TRANSIT | "Chỉ có thể sửa phiếu ở trạng thái 'Phiếu tạm'. Trạng thái hiện tại: IN_TRANSIT." | Medium | Negative | UC-37 (UpdateTransferCommand.cs:52) |

### C.3 Thống kê ca Medium / Low cho sheet có sẵn

| Sheet | Medium | Low |
|---|---:|---:|
| CreateOrderFromPlan | 9 | 5 |
| CreateProductionPlan | 11 | 3 |
| ApproveProductionOrder | 7 | 5 |
| CreateFinishedGoodsReceipt | 7 | 4 |
| CreateSalesReturn | 9 | 2 |
| CreateMaterialIssue | 7 | 3 |
| CreatePosOrder | 9 | 1 |
| CreateCustomer | 9 | 0 |
| AdjustCreditLimit | 4 | 4 |
| CreateBooking | 7 | 1 |
| CreateDisposal | 5 | 2 |
| ChangePassword | 4 | 1 |
| CreateCreditRequest | 3 | 2 |
| ApplyFormula | 4 | 0 |
| CreateStaff | 4 | 0 |
| UpdateBom | 4 | 0 |
| CancelBooking | 2 | 1 |
| CancelCustomerReceipt | 1 | 2 |
| CompleteTransfer | 3 | 0 |
| CreateCustomerPayment | 1 | 2 |
| CreatePurchase | 2 | 1 |
| CreateSupplierPayment | 1 | 2 |
| CreateTransfer | 2 | 1 |
| AdjustStock | 1 | 1 |
| CancelOrder | 1 | 1 |
| CreateBom | 1 | 1 |
| CreatePurchaseReturn | 1 | 1 |
| MergeBookings | 1 | 1 |
| ReceivePurchaseOrder | 1 | 1 |
| RejectProductionPlan | 0 | 2 |
| SubmitProductionPlan | 1 | 1 |
| UpdateDisposal | 1 | 1 |
| UpdateStaff | 2 | 0 |
| UpdateStocktake | 0 | 2 |
| ApproveCreditRequest | 0 | 1 |
| ApproveProductionPlan | 0 | 1 |
| CancelDisposal | 0 | 1 |
| CancelPurchase | 0 | 1 |
| CancelPurchaseReturn | 0 | 1 |
| CancelStocktake | 0 | 1 |
| CancelTransfer | 1 | 0 |
| CompletePurchase | 0 | 1 |
| CreatePurchaseOrder | 1 | 0 |
| CreateRefund | 0 | 1 |
| DeleteProduct | 0 | 1 |
| MergePurchaseOrders | 0 | 1 |
| ReceiveTransfer | 1 | 0 |
| UpdateBooking | 1 | 0 |
| UpdateCustomerReceipt | 0 | 1 |
| UpdateOrder | 0 | 1 |
| UpdatePurchase | 0 | 1 |

Ca Low gồm chủ yếu: `UserId = null` (handler phòng thủ, tầng API đã chặn), `catch (Exception)` khi lưu DB (cần mock DbContext ném lỗi), độ dài tối đa của ghi chú / lý do. **Không đề xuất viết hết** – chỉ viết khi nhóm cần đạt định mức ca/KLOC.

### C.4 Command chưa có sheet – danh sách chờ (chi tiết sau khi duyệt)

| Command | Ưu tiên | Kịch bản chính |
|---|---|---|
| CancelProductionPlanCommand / CloseProductionPlanCommand | Medium | Hủy kế hoạch đã có lệnh chưa hủy (ProductionPlanMessages:21); đóng kế hoạch APPROVED |
| CloseProductionOrderCommand | Medium | Đóng lệnh IN_PROGRESS kèm lý do; lý do > 300 ký tự |
| DeactivateBomCommand | Medium | Ngừng áp dụng định mức đang dùng cho kế hoạch / lệnh mở; BR-30 |
| UpdatePurchaseOrderCommand | Medium | Sửa phiếu đã có phiếu nhập ("Phiếu đã có phiếu nhập liên kết, không thể sửa.") |
| UpdatePurchaseReturnCommand | Medium | Chỉ sửa phiếu DRAFT; quyền kho |
| CreateProductCommand / UpdateProductCommand | Medium | Trùng mã (BR-06); thời gian giao 0–365 ngày (ProductLeadTime); tồn ban đầu vào kho không có quyền |
| CreateSupplierCommand / UpdateSupplierCommand / UpdateCustomerCommand | Medium | Trùng mã, định dạng liên hệ (tương tự CreateCustomer) |
| CreatePriceBookCommand / UpdatePriceBookCommand / UpdatePriceBookPricesCommand / DeletePriceBookCommand | Medium | Phạm vi chi nhánh/khách (PriceBookScope), vòng lặp công thức |
| CreateRoleCommand / UpdateRoleCommand | Medium | Trùng tên/mã vai trò; không sửa ROLE_ADMIN |
| CreateWarehouseCommand / UpdateWarehouseCommand / DeleteWarehouseCommand / ToggleWarehouseStatusCommand | Medium | Trùng mã kho; xóa kho còn tồn |
| UpdateCustomerDebtAdjustmentCommand / CancelCustomerDebtAdjustmentCommand / Update…/Cancel…SupplierDebtAdjustmentCommand | Medium | Sửa/hủy chứng từ điều chỉnh công nợ, đảo số dư |
| UpdateDebtWarningSettingsCommand | Low | Ngưỡng ngày/tiền cảnh báo nợ |
| CreateProductCategoryCommand | Low | Trùng tên nhóm hàng |
| ToggleCustomerStatusCommand / ToggleSupplierStatusCommand / BatchCustomerStatusCommand | Low | Bật/tắt trạng thái |
| UpdateDisposalInfoCommand / UpdatePurchaseOrderNotesCommand / UpdateSalesBookingInfoCommand / UpdateSalesReturnNotesCommand / UpdateTransferNotesCommand | Low | Chỉ sửa ghi chú/thông tin, không đổi tồn – 1 ca N + 1 ca trạng thái đã hủy mỗi lệnh |

### C.5 Tính năng / luật chưa triển khai hoặc lệch SPEC (ghi riêng, không viết test case “giả”)

| Mã | Mức | Chức năng | Mô tả | UC/BR | Vị trí code | Xử lý đề xuất |
|---|---|---|---|---|---|---|
| ISS-01 | High | CreatePurchase / UpdatePurchase | Nhập hàng không kiểm tra đối tác có phải nhà cung cấp (PartnerType). CreatePurchase/UTCID29 sẽ Fail. | BR-22 (phiếu phải có nhà cung cấp) | CreatePurchaseCommand.cs:83–88 | Lỗi code – báo nhóm |
| ISS-02 | Medium | CreatePurchase | Không giới hạn SL nhập theo SL đặt. UTCID28 sẽ Fail. | BR-23 | CreatePurchaseCommand.cs:98–103 | NEEDS_CLARIFICATION |
| ISS-03 | High | UpdateStaff | Sửa nhân viên mà không gửi danh sách kho thì xóa hết quyền kho (N-01). | UC-08, BR-04 | UpdateStaffCommand.cs:163–165 | Lỗi code (đề xuất UpdateStaff/UTCID07 để tái hiện) |
| ISS-04 | Medium | CancelTransfer | Hủy được phiếu đã nhận, trái A37.2 (N-08). | UC-37 | TrxStockTransfer.Status.cs:27 | NEEDS_CLARIFICATION |
| ISS-05 | Medium | ReceiveTransfer | Nhận nhiều hơn số đã xuất không bị chặn (N-02); BR-41 chỉ quy định trường hợp nhận thiếu. | UC-38, BR-41 | ReceiveTransferCommand.cs:63 | NEEDS_CLARIFICATION |
| ISS-06 | Medium | HandlePayosWebhook | Webhook báo số tiền nhỏ hơn số cần thu vẫn ghi PAID (chỉ ghi log cảnh báo). | UC-26, BR-14 | PayosPaymentCommands.cs (HandlePayosWebhook) | NEEDS_CLARIFICATION |
| ISS-07 | Low | Toàn workbook | CLAUDE.md ghi "Admin sees all active warehouses", code đã đổi (12/11): Admin chỉ thấy kho được tích. Workbook HasWarehouseAccess/UTCID03 và GetMyWarehouses đã theo code mới (đúng). | BR-04 | CurrentUserService.cs | Sửa CLAUDE.md (ngoài phạm vi review này) |
| ISS-08 | Low | Domain | ProductionMessages.ExceedsPlan ("Số lượng nhận vượt số lượng kế hoạch còn lại…") không còn chỗ dùng. | — | ProductionHelper.cs:18 | Dọn code (ngoài phạm vi) |
| ISS-10 | High | CreatePosOrder (lập hóa đơn từ đơn đặt) | Giao một phần: code chốt đơn đặt COMPLETED và (tùy chọn) tách đơn đặt mới cho phần còn lại; BR-17 ghi "đơn chuyển Đang giao và giữ SL còn lại". | BR-17, UC-23 | CreatePosOrderCommand.cs:655–684, SalesBookingOps.BuildRemainderBooking | NEEDS_CLARIFICATION – sửa Report 3 hoặc code |
| ISS-09 | Low | ChangePassword / CreateStaff | Thông báo mật khẩu ghi "(BR-35)" theo số BR cũ; Report 3 bản sao là BR-05. | BR-05 | PasswordPolicy.cs:16–20 | Thống nhất số BR (ngoài phạm vi) |

Ngoài ra, các mục đã ghi ở Phase 2 (`specs/qa/reports/04_TEST_CASES_SUMMARY.md`) vẫn đúng trên code mới và **không thuộc unit test**: N-03/N-05 (bán đồng thời, chống trùng không có ràng buộc unique – Integration), N-07 (ma trận quyền mặc định – API), N-10 (nhập hàng không ghi lô, BR-27), N-11 (không có nhật ký kiểm toán, BR-49), N-13 (chưa có báo cáo UC-86–90), N-14 (kỳ hạn nợ BR-18). UC-26 (QR) **đã có code** (payOS) nên N-12 đóng.

## D. Test case cần chỉnh sửa

Không đổi UTCID; chỉ sửa nội dung ô. Mỗi dòng giữ giá trị cũ để reviewer so.

### D.1 Thông báo đổi chữ, Expected mơ hồ, thiếu điều kiện, sai tầng

| Test Case | Loại | Expected / điều kiện cũ | Đề xuất mới | Lý do |
|---|---|---|---|---|
| CreateCustomer/UTCID07 | Câu chữ | Mã khách hàng 'KH-HM01' đã tồn tại trong hệ thống. | CUSTOMER_CODE_EXISTS:Mã khách hàng 'KH-HM01' đã tồn tại trong hệ thống. | Code trả kèm tiền tố để FE nhận diện (CreateCustomerCommand.cs:147). |
| CreatePurchase/UTCID15 | Câu chữ | Số lượng nhập của sản phẩm ID #1 phải lớn hơn 0. | Số lượng nhận của sản phẩm ID #1 phải lớn hơn 0. (Điều kiện ghi rõ: SL đạt = 0 và SL lỗi = 0) | Kiểm tra chuyển sang PurchaseItemMapper.ValidateQuantities:47 (SL đạt + SL lỗi ≤ 0). |
| UpdatePurchase/UTCID12 | Câu chữ | Số lượng nhập của sản phẩm ID #1 phải lớn hơn 0. | Số lượng nhận của sản phẩm ID #1 phải lớn hơn 0. (SL đạt = 0, SL lỗi = 0) | UpdatePurchaseCommand.cs:86 gọi cùng PurchaseItemMapper.ValidateQuantities. |
| CreateMaterialIssue/UTCID03 | Câu chữ | Số lượng xuất luỹ kế vượt nhu cầu theo BOM. ... | Số lượng xuất luỹ kế vượt nhu cầu theo định mức. Vui lòng nhập lý do. | Đổi "BOM" → "định mức" (CreateMaterialIssueCommand.cs:126 + ProductionMessages.ReasonRequired). |
| CreateBom/UTCID03 | Câu chữ | Thành phẩm đã có BOM phiên bản 1.0. | Thành phẩm đã có định mức phiên bản 1.0. | CreateBomCommand.cs:45. |
| CreateBom/UTCID04 | Câu chữ | Mã BOM BOM-FG01 đã tồn tại trong hệ thống. | Mã định mức BOM-FG01 đã tồn tại trong hệ thống. | CreateBomCommand.cs:51. |
| UpdateBom/UTCID02 | Câu chữ | BOM đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới. | Định mức đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới. | UpdateBomCommand.cs:47. |
| UpdateBom/UTCID03 | Câu chữ | Thành phẩm đã có BOM phiên bản 2.0. | Thành phẩm đã có định mức phiên bản 2.0. | UpdateBomCommand.cs:54. |
| DeleteBom/UTCID02 | Câu chữ | BOM đã được dùng cho lệnh sản xuất nên không xoá được. Bạn có thể ngừng áp dụng BOM. | Định mức đã được dùng cho lệnh sản xuất nên không hủy được. Bạn có thể ngừng áp dụng định mức. | DeleteBomCommand.cs:31 (đổi cả "xoá" → "hủy"). |
| DeleteBom/UTCID03 | Câu chữ | Không tìm thấy BOM hoặc BOM không còn khả dụng. | Không tìm thấy định mức hoặc định mức không còn khả dụng. | ProductionMessages.BomNotFound (ProductionHelper.cs:12). |
| CreateOrderFromPlan/UTCID05 | Câu chữ | Thành phẩm chưa có BOM đang áp dụng. Vui lòng thiết lập BOM trước. | Thành phẩm chưa có định mức đang áp dụng. Vui lòng thiết lập định mức trước. | ProductionMessages.NoActiveBom (ProductionHelper.cs:10). |
| CreateDisposal/UTCID08 | Expected mơ hồ | Stocktake lock message (StocktakeGuard, BR-42) | Mặt hàng P-TEST đang được kiểm kho (phiếu KK0001). Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc. | StocktakeGuard.cs:36–37; ghi rõ mã phiếu kiểm trong Precondition. |
| SubmitProductionPlan/UTCID02 | Expected mơ hồ | BOM not ready message (NoActiveBom / inactive product, R-05) | Thành phẩm chưa có định mức đang áp dụng. Vui lòng thiết lập định mức trước. (FG-02) | ProductionPlanRules.ValidateReadyForApprovalAsync nối mã hàng vào cuối câu. |
| ApproveProductionPlan/UTCID03 | Expected mơ hồ | Không duyệt được kế hoạch. <BOM error> | Không duyệt được kế hoạch. Thành phẩm chưa có định mức đang áp dụng. Vui lòng thiết lập định mức trước. (<mã FG trong Precondition>) | ApproveProductionPlanCommand.cs:53. |
| RejectProductionPlan/UTCID01 | Expected mơ hồ | Từ chối ... Thiếu NVL | Status = REJECTED; Notes được nối một dòng "Từ chối" kèm tên người duyệt, thời gian và lý do "Thiếu NVL"; plan không có ApprovedBy. | RejectProductionPlanCommand.cs:53 (ProductionPlanRules.AppendNote). |
| ApproveCreditRequest/UTCID04 | Expected mơ hồ | New limit below current limit message (E62.1) | Hạn mức mới thấp hơn hạn mức hiện tại của khách hàng (10.000.000 đ), không thể duyệt nâng hạn mức (E62.1). | CreditRequestMessages.NewLimitBelowCurrent (CreditRequestMessages.cs:27). Định dạng số {N0} theo culture của máy chạy test. |
| CreateSalesReturn/UTCID03 | Expected mơ hồ | "<P-TEST name>" chỉ còn được trả 3 (đã mua 5, đã trả 2) (BR-19). | Thay <P-TEST name> bằng tên hàng của P-TEST trong dữ liệu test, giữ nguyên phần còn lại. | Expected phải so được nguyên văn (SalesReturnCommands.cs:135). |
| CreateDisposal/UTCID04 | Expected mơ hồ | Hàng P-TEST - <name> chỉ còn 10 trong kho, không thể hủy 11. | Thay <name> bằng tên hàng P-TEST trong dữ liệu test. | DisposalLogic.cs:163. |
| CreateProductionPlan/UTCID01–UTCID07 | Thiếu điều kiện | Request không có kho xuất NVL (WarehouseId) và kho nhận thành phẩm của từng dòng | Thêm Input: WarehouseId = 3 (K001, người lập được phân quyền) và mỗi dòng WarehouseId = 3. Nếu không thêm, UTCID01 sẽ Fail với "Vui lòng chọn kho xuất nguyên vật liệu." và các ca A sẽ trả thông báo kho thay vì thông báo đang kiểm. | SaveProductionPlanRequest validator bắt buộc 2 kho (ProductionPlanRules.cs:64, 79) từ 20/11. |
| CreateStaff/UTCID08, ToggleStaffStatus/UTCID05, ResetStaffPassword/UTCID03, SaveRolePermissions/UTCID06, SaveFeatureMatrix/UTCID07, UpdateWarehouseAccess/UTCID06 | Phạm vi | "Chỉ Quản trị viên mới được thực hiện thao tác này." (403) | Chuyển sang bộ API test (đã có API-SEC-003 / API-ROLE-xxx ở Phase 2). Trong workbook giữ ca, ghi chú "API-level, không chạy ở unit". | Câu này do [RequireAdmin] ở tầng API trả (RequirePermissionAttribute.cs:141); handler không có nhánh này nên unit test gọi handler không thể ra kết quả đó. |
| UpdateSettings/UTCID09, ImportProducts/UTCID05, ToggleProductStatus/UTCID04 | Phạm vi | 403 Forbidden / "Bạn không có quyền thực hiện thao tác này (cần quyền …)" | Chuyển sang bộ API test (RequirePermission). | RequirePermissionAttribute.cs:146 – tầng API. |
| GetMyWarehouses/UTCID06 | Phạm vi | 401 Unauthorized | Unit: ICurrentUserService.IsAuthenticated = false → Result.Failure "Yêu cầu xác thực tài khoản để xem kho làm việc." (401 giữ ở API test). | Handler có nhánh riêng (GetMyWarehousesQuery.cs:31); 401 là của FallbackPolicy. |
| CreateStaff/UTCID03, Login/UTCID05 | Cách ghi | 400 validation: "Dữ liệu không hợp lệ." (…) | Unit: validator trả lỗi theo từng trường, ví dụ "Tên đăng nhập không được để trống.", "Email không đúng định dạng." (ValidationException qua ValidationBehavior). "Dữ liệu không hợp lệ." + 400 là của ExceptionHandlingMiddleware → API test. | ExceptionHandlingMiddleware.cs:36. |

### D.2 Ca chỉ ghi "Success" – Expected đề xuất theo code

Giữ "Success" ở Return và **thêm** các kiểm tra dưới đây (Log/Return). Giá vốn ghi 3 chữ số thập phân theo `CostingPolicy.CostDecimals = 3`.

| Test Case | Expected cũ | Expected mới (bổ sung) |
|---|---|---|
| CreatePurchaseOrder/UTCID01 | Success | Trả PoId > 0; phiếu DRAFT, 1 dòng 10 × 5.000; TotalAmount = 50.000; DiscountAmount = 0; PoCode sinh từ sequence. |
| CreatePurchaseOrder/UTCID02 | Success | Như UTCID01 nhưng Status = ORDERED. |
| CreatePurchaseOrder/UTCID03 | Success | PoCode = "PDN-NEW" (trim + viết hoa, PurchaseOrderCommands.cs:91). |
| CreatePurchaseOrder/UTCID04 | Success | Kho lấy từ danh sách kho được phân quyền (authorized = [3]) → WarehouseId = 3. |
| CreatePurchaseOrder/UTCID05 | Success | Chấp nhận đối tác loại BOTH; phiếu DRAFT. |
| CreatePurchaseOrder/UTCID06 | Success | DiscountAmount = 10.000; TotalAmount = 40.000. |
| CreatePurchaseOrder/UTCID07 | Success | Dòng 0,01 × 5.000 → thành tiền 50 (làm tròn đồng); TotalAmount = 50. |
| CreatePurchaseOrder/UTCID08 | Success | Đơn giá 0 → TotalAmount = 0; phiếu vẫn lưu. |
| CreatePurchaseOrder/UTCID09 | Success | Giảm giá 9.000 > tiền hàng 5.000 → DiscountAmount bị chặn = 5.000; TotalAmount = 0 (PurchaseOrderHelper.ComputeTotal). |
| CancelPurchaseOrder/UTCID01 | Success | Status = CANCELLED. |
| CancelPurchaseOrder/UTCID02 | Success | Status = CANCELLED. |
| CancelPurchaseOrder/UTCID03 | Success | Status = CANCELLED (phiếu nhập đã hủy không chặn). |
| FinishPurchaseOrder/UTCID01 | Success | Status = COMPLETED; các dòng giữ SL đã nhận. |
| MergePurchaseOrders/UTCID01 | Success | Trả PoId mới; phiếu mới DRAFT có 2 dòng; phiếu 1, 2 → CANCELLED. |
| MergePurchaseOrders/UTCID02 | Success | Phiếu mới Status = ORDERED (có nguồn ORDERED); 2 phiếu nguồn CANCELLED. |
| MergePurchaseOrders/UTCID03 | Success | Phiếu mới có 1 dòng SL 20, đơn giá 5.000. |
| MergePurchaseOrders/UTCID04 | Success | Phiếu mới có 1 dòng SL 20, đơn giá bình quân 6.000 (Σ thành tiền ÷ SL). |
| MergePurchaseOrders/UTCID05 | Success | DiscountAmount = 3.000; Notes = "A; B". |
| MergePurchaseOrders/UTCID06 | Success | 1 phiếu mới; 3 phiếu nguồn CANCELLED. |
| MergePurchaseOrders/UTCID07 | Success | Notes bị cắt còn 500 ký tự. |
| CreatePurchase/UTCID01 | Success | Phiếu DRAFT; tồn kho, thẻ kho, công nợ NCC không đổi. |
| CreatePurchase/UTCID02 | Success | Phiếu COMPLETED; tồn kho 3 = 10; giá vốn = 6.000,000; 1 dòng thẻ kho INBOUND_RECEIPT +10 (reference GOODS_RECEIPT); CurrentPayable NCC +60.000. |
| CreatePurchase/UTCID03 | Success | Tồn 20; giá vốn MAC = (10×4.000 + 10×6.000) / 20 = 5.000,000 (BR-29); CurrentPayable +60.000. |
| CreatePurchase/UTCID04 | Success | CurrentPayable +40.000; 1 giao dịch SUPPLIER_PAYMENT 20.000 (CASH). |
| CreatePurchase/UTCID05 | Success | CurrentPayable +0; giao dịch SUPPLIER_PAYMENT 60.000. |
| CreatePurchase/UTCID06 | Success | Phiếu đặt chuyển PARTIAL (nhận 10/20). |
| CreatePurchase/UTCID07 | Success | Phiếu đặt chuyển COMPLETED (nhận đủ 10/10). |
| CreatePurchase/UTCID08 | Success | Kho lấy từ danh sách kho được phân quyền → WarehouseId = 3. |
| CreatePurchase/UTCID09 | Success | Tồn 0,01; giá vốn 6.000,000; CurrentPayable +60 (làm tròn đồng). |
| CreatePurchase/UTCID10 | Success | Tồn 10; giá vốn = 0,000; CurrentPayable +0. |
| CreatePurchase/UTCID11 | Success | Tồn trước −5 → giá vốn mới = đơn giá nhập 6.000,000 (CostingPolicy: tồn ≤ 0 lấy giá nhập); tồn sau = 5. |
| CreatePurchase/UTCID12 | Success | Trả trước 70.000 bị chặn còn 60.000 (Math.Clamp); SUPPLIER_PAYMENT 60.000; CurrentPayable +0. |
| CreatePurchase/UTCID26 | Success | Phiếu DRAFT với SL 0,01; không đổi tồn. |
| CreatePurchase/UTCID27 | Success | Phiếu DRAFT với đơn giá 0; không đổi tồn. |
| UpdatePurchase/UTCID01 | Success | Phiếu vẫn DRAFT; dòng thay bằng SL 15; tiền hàng 90.000; không đổi tồn. |
| UpdatePurchase/UTCID02 | Success | Phiếu DRAFT đổi được NCC sang Supplier 2. |
| UpdatePurchase/UTCID03 | Success | Tồn +5 (thẻ kho INBOUND_RECEIPT_EDIT_OUT −10 và INBOUND_RECEIPT_EDIT_IN +15); CurrentPayable NCC +30.000. |
| UpdatePurchase/UTCID04 | Success | Phiếu đặt tính lại trạng thái theo SL đã nhận = 20 → COMPLETED. |
| CompletePurchase/UTCID01 | Success | Status COMPLETED; tồn 10; giá vốn 6.000,000; INBOUND_RECEIPT +10; CurrentPayable +60.000. |
| CompletePurchase/UTCID02 | Success | Tồn 20; giá vốn MAC 5.000,000. |
| CompletePurchase/UTCID03 | Success | CurrentPayable +40.000; SUPPLIER_PAYMENT 20.000. |
| CompletePurchase/UTCID04 | Success | CurrentPayable +0; SUPPLIER_PAYMENT 60.000. |
| CompletePurchase/UTCID05 | Success | Phiếu đặt liên kết → COMPLETED. |
| CompletePurchase/UTCID06 | Success | Giá vốn MAC = (3×1.000 + 7×1.001) / 10 = 1.000,700 (làm tròn 3 chữ số thập phân – CostingPolicy.CostDecimals = 3). |
| CompletePurchase/UTCID07 | Success | Tồn trước −5 → giá vốn = 6.000,000; tồn sau 5. |
| CompletePurchase/UTCID08 | Success | Trả trước bị chặn còn 60.000; CurrentPayable +0. |
| CancelPurchase/UTCID01 | Success | Status CANCELLED; không đổi tồn, không ghi thẻ kho. |
| CancelPurchase/UTCID02 | Success | Status CANCELLED; tồn −10 (INBOUND_RECEIPT_CANCEL); CurrentPayable −60.000. |
| CancelPurchase/UTCID03 | Success | CurrentPayable −40.000; giao dịch trả 20.000 lúc nhập bị hủy. |
| CancelPurchase/UTCID04 | Success | Phiếu đặt liên kết tính lại trạng thái (về ORDERED nếu không còn phiếu nhập COMPLETED). |
| CancelPurchase/UTCID05 | Success | Notes chứa "[Lý do hủy]: Nhập sai". |
| CancelPurchase/UTCID06 | Success | Phiếu DRAFT hủy được dù UserId = null (chỉ phiếu COMPLETED mới cần người dùng – CancelPurchaseCommand.cs:64). |
| CreatePurchaseReturn/UTCID01 | Success | Phiếu DRAFT; không đổi tồn, không đổi công nợ. |
| CreatePurchaseReturn/UTCID02 | Success | Phiếu COMPLETED; tồn −4 (OUTBOUND_PURCHASE_RETURN); TotalAmount 24.000; CurrentPayable −24.000. |
| CreatePurchaseReturn/UTCID03 | Success | RefundAmount 10.000; CurrentPayable −14.000 (PurchaseReturnLogic.cs:294). |
| CreatePurchaseReturn/UTCID04 | Success | Phiếu DRAFT trả tự do tại kho 3. |
| CreatePurchaseReturn/UTCID05 | Success | Kho lấy từ danh sách kho được phân quyền → kho 3. |
| CreatePurchaseReturn/UTCID06 | Success | Tồn −10; CurrentPayable −60.000; dòng phiếu nhập không còn SL trả được. |
| CreatePurchaseReturn/UTCID07 | Success | Phiếu DRAFT, TotalAmount = 0. |
| CreatePurchaseReturn/UTCID08 | Success | Giảm giá bị chặn = 24.000 (tiền hàng) → TotalAmount 0; RefundAmount bị chặn 0; CurrentPayable không đổi. |
| CancelPurchaseReturn/UTCID01 | Success | Status CANCELLED; không đổi tồn. |
| CancelPurchaseReturn/UTCID02 | Success | Status CANCELLED; tồn +4 (PURCHASE_RETURN_CANCEL); CurrentPayable +24.000. |
| CancelPurchaseReturn/UTCID03 | Success | CurrentPayable +14.000; khoản NCC trả 10.000 bị hủy. |
| CreateRefund/UTCID01 | Success | Giao dịch SUPPLIER_REFUND 10.000, PaymentMethod CASH; CurrentPayable +10.000. |
| CreateRefund/UTCID02 | Success | PaymentMethod = BANK_TRANSFER (trim + viết hoa). |
| CreateRefund/UTCID03 | Success | Số tiền làm tròn = 1.000 (CreateSupplierRefundCommand.cs:44). |
| CreateRefund/UTCID04 | Success | Thu đủ 24.000; số còn phải trả = 0. |
| UpdateStocktake/UTCID01 | Success | Phiếu vẫn DRAFT; dòng SystemQty 100, ActualQty 105, Discrepancy +5; tồn không đổi. |
| UpdateStocktake/UTCID02 | Success | Status BALANCED; tồn 105; thẻ kho STOCKTAKE_IN +5. |
| UpdateStocktake/UTCID03 | Success | Status BALANCED; tồn 97; thẻ kho STOCKTAKE_OUT −3. |
| UpdateStocktake/UTCID04 | Success | Status BALANCED; Discrepancy 0; không ghi thẻ kho. |
| UpdateStocktake/UTCID05 | Success | Tồn 0; thẻ kho STOCKTAKE_OUT −100. |
| UpdateStocktake/UTCID06 | Success | Chỉ 1 dòng, lấy số thực tế nhập sau cùng = 105 (StocktakeLogic.ReplaceItemsAsync GroupBy … Last()). |
| CancelStocktake/UTCID01 | Success | Status CANCELLED; không đổi tồn. |
| CancelStocktake/UTCID02 | Success | Tồn về 100; thẻ kho STOCKTAKE_CANCEL_OUT −5. |
| CancelStocktake/UTCID03 | Success | Tồn về 100; thẻ kho STOCKTAKE_CANCEL_IN +3. |
| CancelStocktake/UTCID04 | Success | Status CANCELLED; không ghi thẻ kho. |
| UpdateCustomerReceipt/UTCID02 | Success | Lưu thành công; ngày phiếu = thời điểm gửi (biên: không ở tương lai, cho phép lệch ≤ 1 phút). |
| ChangePassword/UTCID06 | Success | Thành công; PasswordHash đổi; đăng nhập bằng mật khẩu mới được, mật khẩu cũ bị từ chối. |

### D.3 Metadata của workbook

| Vị trí | Hiện tại | Đề xuất |
|---|---|---|
| Cột Function Code (sheet Functions) | 24 sheet ghi "-" | Gán mã (Q4) |
| Test requirement | 51 sheet không có UC/BR | Thêm UC/BR theo cột "Use Case / Business Rule" ở mục F |
| Test requirement của CreatePurchase | "Expected to fail on dev 1f3b203: UTCID28 … UTCID29" | Ghi theo build mới: UTCID28 chờ Q2, UTCID29 dự kiến Fail (ISS-01) |
| Test requirement của UpdateStocktake | "Expected to fail … UTCID17 (BR-43 requires a reason…)", "Manager approval is covered by Integration #60" | Bỏ hai câu (O2, D1) |
| Cover / Functions: build | c60ea62 (18/11) | Build đang chạy test thật (hiện origin/dev 0b183e9) |
| LOC sheet đặt hàng | 347 = cả file, lặp ở 4 sheet | LOC theo handler hoặc ghi chú dùng chung |

## E. Test case trùng lặp / lỗi thời

**Trùng lặp: 0 ca.** Đã so từng cặp ca trong cùng sheet theo (Precondition, Input, Expected): không có cặp nào giống hệt. Các cặp cùng thông báo lỗi (ví dụ FinishPurchaseOrder/UTCID02–05 cùng "Chỉ kết thúc được phiếu đang nhập một phần.", CreateRefund/UTCID05–06, MergePurchaseOrders/UTCID09–10) là các lớp tương đương khác nhau (trạng thái DRAFT / ORDERED / COMPLETED / CANCELLED; số tiền 0 và âm) nên **giữ lại**. CreateBooking và UpdateBooking dùng chung `SaveSalesBookingCommand`: hai sheet không có ca trùng nhau.

| Test Case | Trạng thái | Lý do | Xử lý (không xóa) |
|---|---|---|---|
| ReceivePurchaseOrder/UTCID05 | OBSOLETE | Code hiện cho phép dòng SL đạt = 0 khi SL lỗi > 0 (ReceivePurchaseOrderCommand.cs:53–56, chú thích "SL đạt = 0 khi cả dòng là hàng lỗi"). Thông báo "Số lượng đạt phải lớn hơn 0. Mặt hàng lỗi toàn bộ thì để trống dòng…" không còn trong code. | Giữ ca trong file, ghi Result = "Obsolete". Thay bằng ReceivePurchaseOrder/UTCID09 (mục C). |
| UpdateStocktake/UTCID17 | OBSOLETE | Quyết định O2 (19/11): bỏ lý do từng dòng chênh lệch; quyết định D1: kiểm kê không cần Manager duyệt. Code không kiểm tra lý do (StocktakeLogic.ReplaceItemsAsync). Ghi chú Test requirement "Expected to fail… UTCID17" và "Manager approval is covered by Integration #60" cũng lỗi thời. | Giữ ca, ghi Result = "Obsolete"; sửa câu Test requirement của sheet. |
| CancelTransfer/UTCID03 | NEEDS_CLARIFICATION | Hủy phiếu chuyển đã RECEIVED: workbook và code cho phép (TrxStockTransfer.CanCancel = mọi trạng thái trừ CANCELLED), Report 3 A37.2 không cho (nghi vấn N-08). | Theo code + quyết định nhóm (ghi ở Test requirement); sửa Report 3 cho khớp. |
| CreatePurchase/UTCID28 | NEEDS_CLARIFICATION | Nhập vượt SL đặt (PO 10, nhập 11): workbook mong bị chặn (BR-23), code không kiểm tra; BR-23 trong Report 3 bản sao chỉ nói trạng thái phiếu đặt, không nói giới hạn SL. | Hỏi nhóm: nếu cho phép nhập dư thì đổi Expected thành Success + PO COMPLETED; nếu không thì ghi lỗi code. |

## F. Coverage Matrix

Coverage Status: **Đạt** = phủ ≥ 80% nhánh lỗi, không còn ca Critical/High thiếu, không có ca cần sửa · **Một phần** = còn ca High thiếu hoặc ca cần sửa hoặc phủ 50–79% · **Thiếu** = còn ca Critical thiếu hoặc phủ < 50% · **Chưa có** = chưa có sheet.

| Module | Use Case | Business Rule | Function (sheet) | Existing Test | Phủ nhánh | Missing Test (C/H/M/L) | Coverage Status |
|---|---|---|---|---|---:|---|---|
| AUTH | UC-01 | BR-01, BR-05 | Login | 7 (3N/3A/1B), 1 cần sửa | 100% (4/4) | 0/0/0/0 | Một phần |
| AUTH | UC-03 | BR-05 | ChangePassword | 7 (1N/5A/1B), 1 cần sửa | 50% (5/10) | 0/0/4/1 | Một phần |
| AUTH | UC-07 | BR-03, BR-05, BR-06 | CreateStaff | 8 (2N/6A/0B), 1 cần sửa | 56% (5/9) | 0/0/4/0 | Một phần |
| AUTH | UC-08 | BR-03, BR-04, BR-06 | UpdateStaff | 6 (2N/4A/0B) | 67% (4/6) | 0/1/2/0 | Một phần |
| AUTH | UC-09 | BR-01, BR-03 | ToggleStaffStatus | 5 (2N/3A/0B) | 100% (2/2) | 0/0/0/0 | Đạt |
| AUTH | UC-08 | BR-05 | ResetStaffPassword | 3 (1N/2A/0B) | 100% (1/1) | 0/0/0/0 | Đạt |
| AUTH | UC-13 | BR-02, BR-03 | SaveRolePermissions | 6 (2N/3A/1B) | 100% (1/1) | 0/0/0/0 | Đạt |
| AUTH | UC-13 | BR-02, BR-03 | SaveFeatureMatrix | 7 (1N/4A/2B) | 100% (3/3) | 0/0/0/0 | Đạt |
| AUTH | UC-12 | BR-03 | DeleteRole | 4 (1N/3A/0B) | 100% (3/3) | 0/0/0/0 | Đạt |
| AUTH | UC-10, UC-13 | BR-02 | GetPermissionCodes | 8 (6N/2A/0B) | 100% (0/0) | 0/0/0/0 | Đạt |
| AUTH | UC-15 | BR-04 | HasWarehouseAccess | 6 (3N/2A/1B) | 100% (0/0) | 0/0/0/0 | Đạt |
| AUTH | UC-17 | BR-03, BR-04 | UpdateWarehouseAccess | 6 (2N/3A/1B) | 50% (1/2) | 0/1/0/0 | Một phần |
| AUTH | UC-16 | BR-04 | GetMyWarehouses | 6 (2N/2A/2B) | 0% (0/1) | 0/1/0/0 | Thiếu |
| Kho & thiết lập đơn hàng | UC-56 | BR-04 | GetWarehouseById | 3 (1N/1A/1B) | 100% (1/1) | 0/0/0/0 | Đạt |
| Kho & thiết lập đơn hàng | UC-97 | BR-06 | UpdateSettings | 9 (2N/5A/2B) | 100% (4/4) | 0/0/0/0 | Đạt |
| GOODS | UC-99 | BR-04, BR-43 | AdjustStock | 8 (2N/4A/2B) | 57% (4/7) | 0/1/1/1 | Một phần |
| GOODS | UC-99 | BR-06 | ImportProducts | 5 (2N/3A/0B) | 100% (2/2) | 0/0/0/0 | Đạt |
| GOODS | UC-52 | — | ToggleProductStatus | 4 (2N/2A/0B) | 100% (1/1) | 0/0/0/0 | Đạt |
| GOODS | UC-52 | — | DeleteProduct | 5 (1N/4A/0B) | 80% (4/5) | 0/0/0/1 | Đạt |
| GOODS | UC-91 | BR-11 | ApplyFormula | 7 (2N/4A/1B) | 50% (4/8) | 0/0/4/0 | Một phần |
| PARTNER/FIN | UC-54 | BR-06 | CreateCustomer | 7 (1N/5A/1B), 1 cần sửa | 33% (5/15) | 0/1/9/0 | Thiếu |
| PARTNER/FIN | UC-54 | — | DeleteCustomer | 5 (2N/2A/1B) | 100% (1/1) | 0/0/0/0 | Đạt |
| PARTNER/FIN | UC-25, UC-84 | BR-15, BR-46 | CreateCustomerPayment | 7 (2N/4A/1B) | 44% (4/9) | 0/2/1/2 | Thiếu |
| PARTNER/FIN | UC-84 | BR-46 | UpdateCustomerReceipt | 5 (1N/3A/1B), 1 cần sửa | 75% (3/4) | 0/0/0/1 | Một phần |
| PARTNER/FIN | UC-84 | BR-15 | CancelCustomerReceipt | 4 (1N/3A/0B) | 50% (3/6) | 0/0/1/2 | Một phần |
| PARTNER/FIN | UC-27 | BR-12, BR-13 | CreateCreditRequest | 6 (1N/4A/1B) | 50% (8/16) | 0/3/3/2 | Một phần |
| PARTNER/FIN | UC-64 | BR-13, BR-50 | ApproveCreditRequest | 6 (2N/4A/0B), 1 cần sửa | 80% (4/5) | 0/0/0/1 | Một phần |
| PARTNER/FIN | UC-64 | BR-13, BR-50 | RejectCreditRequest | 5 (1N/3A/1B) | 100% (1/1) | 0/0/0/0 | Đạt |
| PARTNER/FIN | UC-55 | BR-12, BR-49 | AdjustCreditLimit | 7 (2N/4A/1B) | 27% (4/15) | 0/3/4/4 | Thiếu |
| PARTNER/FIN | UC-85 | BR-25, BR-46 | CreateSupplierPayment | 5 (1N/3A/1B) | 33% (3/9) | 0/3/1/2 | Thiếu |
| PARTNER/FIN | UC-54 | — | DeleteSupplier | 4 (2N/1A/1B) | 100% (1/1) | 0/0/0/0 | Đạt |
| PURCHASE | UC-30 | BR-04, BR-22 | CreatePurchaseOrder | 22 (6N/12A/4B), 9 cần sửa | 92% (11/12) | 0/0/1/0 | Một phần |
| PURCHASE | UC-30 | BR-22 | CancelPurchaseOrder | 7 (2N/4A/1B), 3 cần sửa | 100% (2/2) | 0/0/0/0 | Một phần |
| PURCHASE | UC-30 | — | FinishPurchaseOrder | 7 (1N/6A/0B), 1 cần sửa | 100% (1/1) | 0/0/0/0 | Một phần |
| PURCHASE | UC-30 | — | MergePurchaseOrders | 16 (5N/7A/4B), 7 cần sửa | 89% (8/9) | 0/0/0/1 | Một phần |
| PURCHASE | UC-31, UC-32 | BR-23, BR-24 | ReceivePurchaseOrder | 8 (2N/5A/1B), 1 cần sửa | 75% (6/8) | 0/1/1/1 | Một phần |
| PURCHASE | UC-31, UC-32 | BR-23, BR-24, BR-25, BR-29 | CreatePurchase | 29 (8N/14A/7B), 16 cần sửa | 76% (13/17) | 2/2/2/1 | Thiếu |
| PURCHASE | UC-31 | BR-25, BR-29 | UpdatePurchase | 15 (4N/10A/1B), 5 cần sửa | 91% (10/11) | 0/0/0/1 | Một phần |
| PURCHASE | UC-31 | BR-24, BR-25, BR-29 | CompletePurchase | 14 (5N/6A/3B), 8 cần sửa | 86% (6/7) | 0/0/0/1 | Một phần |
| PURCHASE | UC-31 | BR-25 | CancelPurchase | 12 (5N/6A/1B), 6 cần sửa | 86% (6/7) | 0/0/0/1 | Một phần |
| PURCHASE | UC-33 | BR-24, BR-25 | CreatePurchaseReturn | 22 (5N/12A/5B), 8 cần sửa | 70% (14/20) | 1/4/1/1 | Thiếu |
| PURCHASE | UC-33 | BR-25 | CancelPurchaseReturn | 7 (3N/4A/0B), 3 cần sửa | 80% (4/5) | 0/0/0/1 | Một phần |
| PURCHASE | UC-33, UC-71 | BR-46 | CreateRefund | 13 (3N/7A/3B), 4 cần sửa | 88% (7/8) | 0/0/0/1 | Một phần |
| SALES | UC-23, UC-35 | BR-12, BR-14, BR-15, BR-16, BR-45 | CreatePosOrder | 9 (2N/6A/1B) | 21% (7/34) | 5/18/9/1 | Thiếu |
| SALES | UC-63 | — | UpdateOrder | 5 (1N/4A/0B) | 60% (3/5) | 0/1/0/1 | Một phần |
| SALES | UC-63 | BR-15 | CancelOrder | 5 (1N/4A/0B) | 67% (4/6) | 0/0/1/1 | Một phần |
| SALES | UC-19 | BR-08, BR-11, BR-14 | CreateBooking | 6 (2N/4A/0B) | 29% (8/28) | 0/11/7/1 | Thiếu |
| SALES | UC-21 | BR-09 | UpdateBooking | 5 (1N/4A/0B) | dùng chung CreateBooking | 0/0/1/0 | Thiếu |
| SALES | UC-22 | BR-09 | CancelBooking | 5 (2N/3A/0B) | 50% (3/6) | 0/0/2/1 | Một phần |
| SALES | UC-24 | BR-10 | MergeBookings | 5 (1N/4A/0B) | 50% (4/8) | 0/2/1/1 | Một phần |
| SALES | UC-23 | BR-16 | GetReserved | 4 (2N/1A/1B) | 100% (0/0) | 0/0/0/0 | Đạt |
| SALES | UC-28, UC-41 | BR-19, BR-21 | CreateSalesReturn | 7 (1N/5A/1B), 1 cần sửa | 20% (5/25) | 2/8/9/2 | Thiếu |
| STOCK | UC-37 | BR-04, BR-40 | CreateTransfer | 6 (1N/5A/0B) | 63% (5/8) | 0/0/2/1 | Một phần |
| STOCK | UC-37 | BR-04 | CompleteTransfer | 5 (1N/2A/2B) | 40% (2/5) | 0/0/3/0 | Thiếu |
| STOCK | UC-37, UC-38 | BR-41 | ReceiveTransfer | 7 (2N/4A/1B) | 80% (4/5) | 0/0/1/0 | Đạt |
| STOCK | UC-37 | — | CancelTransfer | 6 (3N/3A/0B), 1 cần sửa | 75% (3/4) | 0/0/1/0 | Một phần |
| STOCK | UC-39, UC-40 | BR-42, BR-43 | UpdateStocktake | 17 (4N/10A/3B), 7 cần sửa | 82% (9/11) | 0/0/0/2 | Một phần |
| STOCK | UC-39 | BR-43 | CancelStocktake | 8 (3N/4A/1B), 4 cần sửa | 80% (4/5) | 0/0/0/1 | Một phần |
| STOCK | UC-43 | BR-42, BR-44 | CreateDisposal | 8 (2N/5A/1B), 2 cần sửa | 14% (2/14) | 0/3/5/2 | Thiếu |
| STOCK | UC-43 | BR-44 | UpdateDisposal | 5 (2N/3A/0B) | 60% (3/5) | 0/0/1/1 | Một phần |
| STOCK | UC-43 | — | CancelDisposal | 5 (2N/3A/0B) | 75% (3/4) | 0/0/0/1 | Một phần |
| BOM/PROD | UC-57 | BR-06 | CreateBom | 5 (1N/3A/1B), 2 cần sửa | 67% (4/6) | 0/0/1/1 | Một phần |
| BOM/PROD | UC-57 | BR-06 | UpdateBom | 4 (1N/2A/1B), 2 cần sửa | 43% (3/7) | 0/0/4/0 | Thiếu |
| BOM/PROD | UC-57 | — | DeleteBom | 3 (1N/2A/0B), 2 cần sửa | 100% (2/2) | 0/0/0/0 | Một phần |
| BOM/PROD | UC-92, UC-93 | BR-04 | CreateProductionPlan | 7 (1N/4A/2B), 7 cần sửa | 20% (5/25) | 0/6/11/3 | Thiếu |
| BOM/PROD | UC-93 | BR-30 | SubmitProductionPlan | 5 (1N/4A/0B), 1 cần sửa | 0% (0/3) | 0/1/1/1 | Thiếu |
| BOM/PROD | UC-94 | BR-30, BR-50 | ApproveProductionPlan | 4 (1N/3A/0B), 1 cần sửa | 50% (1/2) | 0/0/0/1 | Một phần |
| BOM/PROD | UC-94 | BR-50 | RejectProductionPlan | 4 (1N/3A/0B), 1 cần sửa | 33% (1/3) | 0/0/0/2 | Thiếu |
| BOM/PROD | UC-95 | BR-30, BR-31 | CreateOrderFromPlan | 5 (1N/4A/0B), 1 cần sửa | 16% (3/19) | 0/2/9/5 | Thiếu |
| BOM/PROD | UC-46, UC-47 | BR-32, BR-33, BR-34, BR-42 | CreateMaterialIssue | 7 (1N/5A/1B), 1 cần sửa | 32% (6/19) | 0/4/7/3 | Thiếu |
| BOM/PROD | UC-58, UC-59 | BR-36, BR-37, BR-38 | ApproveProductionOrder | 7 (2N/4A/1B) | 23% (5/22) | 1/3/7/5 | Thiếu |
| BOM/PROD | UC-49, UC-50 | BR-35, BR-36, BR-37 | CreateFinishedGoodsReceipt | 6 (1N/4A/1B) | 24% (5/21) | 1/4/7/4 | Thiếu |
| SALES | UC-26 | BR-14 | CreatePayosPayment (mới) | 0 | — | 2/2/2/0 | Chưa có |
| SALES | UC-26 | BR-14 | HandlePayosWebhook (mới) | 0 | — | 3/2/1/0 | Chưa có |
| SALES | UC-26 | BR-04 | CancelPayosPayment (mới) | 0 | — | 0/2/1/0 | Chưa có |
| SALES | UC-26 | — | TrxPayosPaymentStatus (mới) | 0 | — | 2/1/1/0 | Chưa có |
| FIN | UC-84, UC-98 | BR-15, BR-46 | CreateCustomerDebtRefund (mới) | 0 | — | 1/3/3/0 | Chưa có |
| FIN | UC-84 | BR-15 | CancelCustomerDebtRefund (mới) | 0 | — | 0/2/1/0 | Chưa có |
| FIN | UC-85, UC-98 | BR-25, BR-46 | CreateSupplierRefundReceipt (mới) | 0 | — | 1/2/2/0 | Chưa có |
| FIN | UC-85 | BR-25 | CancelSupplierRefundReceipt (mới) | 0 | — | 0/2/1/0 | Chưa có |
| SALES | UC-28 | BR-21 | CancelSalesReturn (mới) | 0 | — | 1/1/1/0 | Chưa có |
| SALES | UC-28 | BR-46 | AddSalesReturnRefund (mới) | 0 | — | 0/2/2/0 | Chưa có |
| FIN | UC-98 | BR-15, BR-49 | AdjustCustomerDebt (mới) | 0 | — | 0/1/3/0 | Chưa có |
| FIN | UC-98 | BR-25, BR-49 | AdjustSupplierDebt (mới) | 0 | — | 0/1/1/0 | Chưa có |
| PROD | UC-59 | BR-51, BR-52 | AdjustMaterialNorm (mới) | 0 | — | 0/2/2/0 | Chưa có |
| PROD | UC-59 | BR-38 | CancelProductionOrder (mới) | 0 | — | 0/1/0/0 | Chưa có |
| PROD | UC-92 | BR-30 | UpdateProductionPlan (mới) | 0 | — | 0/1/1/0 | Chưa có |
| PROD | UC-100 – UC-105 | BR-MRP-01 – 33 | RunMrp (mới) | 0 | — | 0/0/1/1 | Chưa có |
| STOCK | UC-39, UC-40 | BR-42, BR-43 | CreateStocktake (mới) | 0 | — | 0/2/0/0 | Chưa có |
| PROD | UC-57 | BR-30 | ActivateBom (mới) | 0 | — | 0/1/1/0 | Chưa có |
| STOCK | UC-37 | BR-40 | UpdateTransfer (mới) | 0 | — | 0/0/1/0 | Chưa có |
| STOCK | UC-39 | BR-42 | MergeStocktakes (mới) | 0 | — | 0/0/1/0 | Chưa có |
| Domain | UC-31, UC-70 | BR-29 | CostingPolicy (mới) | 0 | — | 2/3/1/0 | Chưa có |
| Domain | UC-46, UC-49, UC-95 | BR-31, BR-37 | ProductionPolicy (mới) | 0 | — | 2/1/1/0 | Chưa có |
| Domain/Helper | UC-31 | BR-29 | PurchasePricing (mới) | 0 | — | 1/1/0/0 | Chưa có |
| Domain/Helper | UC-28 | BR-21 | SalesReturnOps (mới) | 0 | — | 0/1/0/0 | Chưa có |
| Domain | UC-37, UC-43, UC-59, UC-64, UC-92 | BR-38 | DomainStatusRules (mới) | 0 | — | 0/3/0/0 | Chưa có |

Tổng hợp: Một phần 34 · Đạt 17 · Thiếu 21 · Chưa có 25.

## G. Kết luận QA

1. **Chưa sẵn sàng chạy làm bằng chứng.** Bộ 528 ca viết theo build c60ea62; trên build hiện tại dự kiến **Fail ngay ít nhất 20 ca** vì lý do của test chứ không phải lỗi code (11 ca đổi chữ, 7 ca CreateProductionPlan thiếu kho, 2 ca lỗi thời), cộng 1 ca Fail do lỗi code thật (CreatePurchase/UTCID29 – ISS-01).
2. **Điểm mạnh:** Abnormal nhiều và trích đúng thông báo (286/302 câu khớp code), có Boundary cho số lẻ, số âm, biên tiền; phân quyền kho được kiểm ở hầu hết chức năng thao tác kho.
3. **Điểm yếu chính:** Normal chỉ kiểm "Success" ở nhóm tiền/tồn; thiếu hẳn nhánh nghiệp vụ mới (hàng lỗi 20/11, kho kế hoạch 20/11, payOS 20/11, hoàn tiền công nợ 21/11, giá vốn 3 chữ số); chưa có test cho hàm Domain thuần – đây lại là phần dễ viết unit test nhất.
4. **Thứ tự đề xuất:** sửa D.1 + đánh dấu E → bổ sung D.2 → thêm C.1 + C.2 Critical → C.2 High → Medium. Low chỉ thêm nếu cần đạt định mức.
5. Ca phụ thuộc DB thật, đồng thời, thời gian thực (N-03, N-05, chống bấm 3 giây nếu không ổn định) để ở Integration; ca 401/403 để ở API test (đã có trong Phase 2).

### Câu hỏi cần nhóm chốt (NEEDS_CLARIFICATION)

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| Q1 | Hủy phiếu chuyển đã RECEIVED (CancelTransfer/UTCID03, ISS-04): theo code hay Report 3 A37.2? | Theo code + quyết định nhóm; sửa Report 3 |
| Q2 | Nhập vượt SL đặt (CreatePurchase/UTCID28, ISS-02) có bị chặn không? | Cho phép nhập dư (code hiện tại) → đổi Expected thành Success |
| Q3 | Webhook payOS báo thiếu tiền vẫn ghi PAID (ISS-06)? | Không ghi PAID; giữ PENDING và cảnh báo → báo lỗi code |
| Q4 | Mã SF-FUNC cho 25 sheet "-" và 23 sheet mới lấy theo danh sách nào? | Dùng tiếp từ SF-FUNC-141 |
| Q5 | Giao một phần đơn đặt (ISS-10): theo code (tách đơn) hay BR-17 (Đang giao)? | Theo code; sửa BR-17 |
| Q6 | Nhận chuyển kho nhiều hơn số đã xuất (ISS-05) có hợp lệ? | Chặn (nhận ≤ đã xuất) → báo lỗi code |
| Q7 | Unit test chạy với DB nào: EF InMemory, SQLite hay PostgreSQL test? | EF Core InMemory cho handler; PostgreSQL scratch cho Integration |

## H. Phạm vi tối thiểu – chỉ kiểm thử đơn vị cho luồng chính

Luồng chính = kịch bản thành công chính (main success scenario) và luật tiền / tồn kho cốt lõi của các UC có đặc tả đầy đủ trong Report 3. Không gồm: nhánh validate độ dài / định dạng, nhánh phòng thủ (`UserId = null`, lỗi DB), luồng thay thế phụ, tính năng mới ngoài luồng (payOS, hoàn tiền công nợ, điều chỉnh công nợ, MRP).

| Luồng | UC | Bước (sheet) | Ca Normal hiện có | Ca Normal đạt | Kết luận | Việc tối thiểu |
|---|---|---|---:|---:|---|---|
| Đăng nhập & quyền kho | UC-01, UC-15 | Login → HasWarehouseAccess → GetMyWarehouses | 8 | 8 | **Đủ** | — |
| Đặt hàng nhập → nhập kho (tồn, MAC) → trả NCC | UC-30, UC-31, UC-85 | CreatePurchaseOrder → ReceivePurchaseOrder → CreatePurchase → CompletePurchase → CancelPurchase → CreateSupplierPayment | 27 | 3 | **Chưa đủ** | sửa 24 ca (CreatePurchaseOrder, CreatePurchase, CompletePurchase, CancelPurchase); thêm CreatePurchase/UTCID30 – Giá vốn MAC làm tròn 3 chữ số thập phân |
| Trả hàng nhập → NCC hoàn tiền | UC-33 | CreatePurchaseReturn → CreateRefund | 8 | 0 | **Chưa đủ** | sửa 8 ca (CreatePurchaseReturn, CreateRefund) |
| Đặt hàng → hóa đơn → thu tiền / ghi nợ (hạn mức) | UC-19, UC-23, UC-25, UC-27, UC-64 | CreateBooking → CreatePosOrder → CancelOrder → CreateCustomerPayment → CreateCreditRequest → ApproveCreditRequest | 10 | 10 | **Chưa đủ** | thêm CreatePosOrder/UTCID10 – Lập hóa đơn từ đơn đặt, giao đủ; thêm CreatePosOrder/UTCID11 – Bán phần hàng đang tạm giữ cho đơn đặt |
| Trả hàng bán | UC-28 | CreateSalesReturn | 1 | 1 | **Đủ** | — |
| Chuyển kho 2 bước | UC-37 | CreateTransfer → CompleteTransfer → ReceiveTransfer | 4 | 4 | **Đủ** | — |
| Kiểm kho → cân bằng | UC-39, UC-40 | CreateStocktake (chưa có sheet) → UpdateStocktake | 4 | 0 | **Chưa đủ** | sửa 4 ca (UpdateStocktake); thêm CreateStocktake/UTCID01 – Tạo phiếu kiểm kho |
| Xuất hủy | UC-43 | CreateDisposal | 2 | 2 | **Đủ** | — |
| Định mức → kế hoạch → lệnh → xuất NVL → nhập TP / duyệt hoàn thành | UC-57, UC-92–95, UC-46, UC-49 | CreateBom → ActivateBom (chưa có sheet) → CreateProductionPlan → SubmitProductionPlan → ApproveProductionPlan → CreateOrderFromPlan → CreateMaterialIssue → CreateFinishedGoodsReceipt → ApproveProductionOrder | 9 | 8 | **Chưa đủ** | sửa 7 ca (CreateProductionPlan); thêm ActivateBom/UTCID01 – Kích hoạt định mức phiên bản mới |

Tổng việc tối thiểu cho luồng chính: **sửa 43 ca** (Expected số liệu ở D.2, 7 ca CreateProductionPlan ở D.1) và **thêm 5 ca**:

| Test Case ID (nếu chỉ làm phần này) | Mã trong danh sách C đầy đủ | Scenario | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|
| CreatePosOrder/UTCID10 | CreatePosOrder/UTCID13 | Lập hóa đơn từ đơn đặt, giao đủ | DH0001 DRAFT của KH-HM01 tại K001: P-TEST 10, trả trước 200.000; hóa đơn BookingId = DH0001 giao 10, trả phần còn lại CASH | Hóa đơn COMPLETED; DH0001 COMPLETED; tồn K001 −10 (ISSUE_SALE); tiền trả trước 200.000 trừ vào hóa đơn; không tạo đơn đặt mới | Critical |
| CreatePosOrder/UTCID11 | CreatePosOrder/UTCID10 | Bán phần hàng đang tạm giữ cho đơn đặt | Tồn P-TEST K001 = 10; đơn đặt mở giữ 8; bán 5 | "Sản phẩm '<tên>' (Mã: P-TEST) có tồn kho 10 nhưng đang tạm giữ 8 cho các đơn đặt hàng khác. Tồn khả dụng: 2, Yêu cầu xuất: 5. Chính sách hệ thống không cho phép bán hàng đang tạm giữ (A3)." | Critical |
| CreatePurchase/UTCID30 | CreatePurchase/UTCID31 | Giá vốn MAC làm tròn 3 chữ số thập phân | Tồn trước 1 @ 1.000; COMPLETED nhập 2 @ 1.001 | Giá vốn = 3.002 / 3 = 1.000,667 | Critical |
| CreateStocktake/UTCID01 | CreateStocktake/UTCID01 | Tạo phiếu kiểm kho | K001, P-TEST tồn 100; Status DRAFT; StocktakeCode rỗng | Phiếu KKxxxx DRAFT, dòng SystemQty 100; tồn không đổi; từ lúc này giao dịch xuất NVL / nhập TP / xuất hủy của P-TEST tại K001 bị chặn (BR-42) | High |
| ActivateBom/UTCID01 | ActivateBom/UTCID01 | Kích hoạt định mức phiên bản mới | FG-01 có v1.0 đang áp dụng; kích hoạt v2.0 có 1 dòng NVL | v2.0 IsActive = true; v1.0 IsActive = false (mỗi thành phẩm chỉ 1 định mức áp dụng) | High |

Ghi chú phạm vi: 11 ca đổi chữ ở D.1 là ca Abnormal (ngoài luồng chính) nhưng vẫn nằm trong workbook, nếu chạy cả workbook sẽ Fail – nên sửa luôn vì chỉ là đổi câu. Ca giao một phần đơn đặt (ISS-10) và hủy phiếu chuyển đã nhận (ISS-04) cần chốt Q5, Q1 trước khi đưa vào luồng chính.

## Danh sách đề xuất chờ phê duyệt

| Mã | Đề xuất | Số ca | Ảnh hưởng |
|---|---|---:|---|
| P-01 | Đánh dấu 2 ca OBSOLETE (không xóa) và ghi ca thay thế | 2 | Workbook |
| P-02 | Sửa 11 ca đổi chữ (BOM → định mức, "nhập" → "nhận", tiền tố CUSTOMER_CODE_EXISTS) | 11 | Workbook |
| P-03 | Bổ sung Expected có số liệu cho ca chỉ ghi "Success" (D.2) | 79 | Workbook |
| P-04 | Sửa Expected mơ hồ + thêm 2 kho cho 7 ca CreateProductionPlan (D.1) | 14 | Workbook |
| P-05 | Chuyển ca tầng API sang bộ API test; sửa cách ghi 400/401 (D.1 "Phạm vi", "Cách ghi") | 12 | Workbook + API test |
| P-06 | Thêm ca Critical/High vào sheet có sẵn (C.1) | 98 | Workbook + code test |
| P-07 | Tạo 25 sheet mới với ca đề xuất (C.2) | 81 | Workbook + code test |
| P-08 | Thêm ca Medium cho sheet có sẵn (C.3) | 129 | Workbook + code test |
| P-09 | Ca Low (C.3) – tùy chọn, chỉ để đạt định mức | 67 | Tùy chọn |
| P-10 | Cập nhật metadata: mã SF-FUNC, UC/BR, build, Test requirement lỗi thời (D.3) | 75 | Workbook |
| P-11 | Thống nhất kiểu viết: handler + mock; Result.Failure ở Return, ValidationException ở Exception (B.1) | — | Quy ước nhóm |
| P-12 | Chốt Q1–Q7 trước khi viết code test cho các ca liên quan | 7 | Nhóm |

Sau khi được duyệt mới chuyển sang giai đoạn viết code test (chưa tạo project test, chưa thêm package – cần nhóm đồng ý thêm xUnit/Moq/EF InMemory theo quy định "không thêm package nếu chưa nêu lý do").
