# Integration Test – Báo cáo lỗi

> Ngày: 23/11/2026. Lỗi phát hiện khi chạy Integration Test trên nhánh feature/integration-test (tách từ feature/qa-unit-test 98946ff; cùng cây mã với origin/dev a5cc470). **Không sửa code nghiệp vụ** – chờ nhóm quyết định.

## 1. Danh sách lỗi

| Mã | Loại | Mức độ | Tiêu đề | TC Failed |
|---|---|---|---|---|
| DEF-IT-01 | TRANSACTION_BUG | Critical | Thao tác đồng thời trên cùng phiếu chuyển kho đều thành công | INT-TRF-45-01, INT-TRF-45-02, INT-TRF-45-03 |
| DEF-IT-02 | APPLICATION_BUG | High | Nhận chuyển kho vượt số lượng đã xuất không bị chặn | INT-TRF-42-01, INT-TRF-42-02, INT-TRF-42-04 |
| DEF-IT-03 | APPLICATION_BUG | Medium | Nhận chuyển kho với số âm được chấp nhận (đổi thành 0) | INT-TRF-41-07 |
| DEF-IT-04 | AUTHORIZATION_BUG | High | Tài khoản bị thu hồi hết kho thấy toàn bộ phiếu nhập | INT-SEC-53-04 |
| DEF-IT-05 | APPLICATION_BUG | Medium (cần xác nhận) | Nhập thành phẩm vượt kế hoạch đã xác nhận vẫn bị chặn vì NVL đã xuất chỉ đủ kế hoạch | INT-MFG-36-03 |
| DEF-IT-06 | APPLICATION_BUG | Medium | Duyệt hoàn thành lệnh sản xuất nhưng lệnh vẫn "Đang sản xuất" | INT-MFG-36-04 |
| DEF-IT-07 | NOT_IMPLEMENTED | Medium | Kiểm kho: dòng chênh lệch không bắt buộc lý do (BR-43) | INT-STK-46-09 |
| DEF-IT-08 | SPEC_CODE_MISMATCH | Cần quyết định | Phạm vi khóa kiểm kho (BR-42) giữa Report 5.2 và Report 3 | INT-STK-48-01, INT-STK-48-02, INT-STK-48-03, INT-STK-48-04, INT-STK-48-05, INT-STK-48-06 |

### DEF-IT-01 – Thao tác đồng thời trên cùng phiếu chuyển kho đều thành công

- **Loại / mức độ:** TRANSACTION_BUG · Critical
- **TC:** INT-TRF-45-01, INT-TRF-45-02, INT-TRF-45-03
- **Tái hiện:** Phiếu K001 → K002 P-TEST 30 Đang chuyển (hoặc Phiếu tạm). Gửi đồng thời 2 request nhận (hoặc nhận + hủy, hoặc 2 request xuất).
- **Expected:** Đúng 1 request thành công; tồn và thẻ kho chỉ thay đổi một lần.
- **Actual:** Cả 2 thành công. Nhận đôi: 2 dòng TRANSFER_IN +30 nhưng tồn K002 chỉ +30 (mất cập nhật – thẻ kho lệch tồn). Nhận + hủy: trạng thái RECEIVED nhưng K001 về 100 và K002 = 50 → sinh thêm 30 hàng. Xuất đôi: 2 dòng TRANSFER_OUT −30, tồn K001 chỉ −30.
- **Vị trí:** ReceiveTransferCommand.cs, CompleteTransferCommand.cs, CancelTransferCommand.cs: kiểm CanReceive / CanIssue / CanCancel rồi SaveChanges, không khóa dòng, không concurrency token; TrxStockTransfer.Status không phải concurrency token.
- **Đề xuất:** Bọc mỗi thao tác trong BeginTransactionAsync + AcquireTransactionLockAsync theo id phiếu (như kế hoạch sản xuất), hoặc đặt Status làm concurrency token (như TrxCreditLimitRequest) và trả thông báo "phiếu đã được xử lý".

### DEF-IT-02 – Nhận chuyển kho vượt số lượng đã xuất không bị chặn

- **Loại / mức độ:** APPLICATION_BUG · High
- **TC:** INT-TRF-42-01, INT-TRF-42-02, INT-TRF-42-04
- **Tái hiện:** Phiếu P-TEST 30 Đang chuyển; POST /api/transfers/{id}/receive với SL nhận 31 (hoặc 30,5; hoặc 2 dòng, 1 dòng vượt).
- **Expected:** Từ chối, tồn K002 không đổi (BR-40).
- **Actual:** Nhận thành công, K002 +31 (+30,5; P-TEST2 nhận 11/10).
- **Vị trí:** ReceiveTransferCommand.cs:63, 99 – chỉ kiểm nhận thiếu, không kiểm nhận vượt. Trùng DEF-UT-01 (Report 5.1).
- **Đề xuất:** Thêm kiểm ReceivedQuantity ≤ IssuedQuantity (theo từng dòng) trước khi ghi; trả thông báo rõ dòng nào vượt.

### DEF-IT-03 – Nhận chuyển kho với số âm được chấp nhận (đổi thành 0)

- **Loại / mức độ:** APPLICATION_BUG · Medium
- **TC:** INT-TRF-41-07
- **Tái hiện:** Phiếu Đang chuyển; receive với SL −5 và có ghi chú.
- **Expected:** Từ chối.
- **Actual:** Phiếu chuyển sang RECEIVED với SL nhận 0.
- **Vị trí:** ReceiveTransferCommand.cs:63, 99 Math.Max(0, ReceivedQuantity).
- **Đề xuất:** Từ chối SL < 0 (validator) thay vì đổi thành 0.

### DEF-IT-04 – Tài khoản bị thu hồi hết kho thấy toàn bộ phiếu nhập

- **Loại / mức độ:** AUTHORIZATION_BUG · High
- **TC:** INT-SEC-53-04
- **Tái hiện:** Người dùng chỉ có K001; Admin thu hồi K001 (PUT /api/WarehousePermissions/{id} rỗng); GET /api/purchases.
- **Expected:** Danh sách rỗng (BR-04).
- **Actual:** Trả về mọi phiếu nhập của K001 và K002.
- **Vị trí:** GetPurchasesQuery.cs:52 – chỉ lọc khi authorizedWarehouseIds.Count > 0. Các danh sách transfers / stocktakes / purchase-orders / purchasereturns lọc đúng (INT-SEC-53-05 đạt).
- **Đề xuất:** Khi người dùng không phải Admin và không có kho nào → trả danh sách rỗng (giống các query khác).

### DEF-IT-05 – Nhập thành phẩm vượt kế hoạch đã xác nhận vẫn bị chặn vì NVL đã xuất chỉ đủ kế hoạch

- **Loại / mức độ:** APPLICATION_BUG · Medium (cần xác nhận)
- **TC:** INT-MFG-36-03
- **Tái hiện:** Lệnh FG-01 × 10 đã xuất RM-01 đủ 20; POST finished-goods-receipts đạt 11, ConfirmExceedPlan = true.
- **Expected:** Lưu phiếu (BR-35 xác nhận vượt kế hoạch; BR-37: thiếu NVL chỉ cảnh báo + ghi chú, không chặn).
- **Actual:** 400 "Thành phẩm FG-01: NVL đã xuất chỉ đủ sản xuất tối đa 10, đã nhập 0 (đạt + lỗi) nên phiếu này nhập được tối đa 10. Vui lòng Xuất bổ sung NVL trước."
- **Vị trí:** CreateFinishedGoodsReceiptCommand.cs (kiểm NVL đã xuất trước khi lưu).
- **Đề xuất:** Nhóm xác nhận luật: nếu theo Report 3 BR-37 thì chuyển thành cảnh báo + ReviewNote; nếu giữ chặn thì cập nhật BR-37.

### DEF-IT-06 – Duyệt hoàn thành lệnh sản xuất nhưng lệnh vẫn "Đang sản xuất"

- **Loại / mức độ:** APPLICATION_BUG · Medium
- **TC:** INT-MFG-36-04
- **Tái hiện:** Lệnh FG-01 × 10 IN_PROGRESS; POST /api/production/orders/{id}/approve với đạt 5.
- **Expected:** Lệnh COMPLETED (BR-38: Manager duyệt hoàn thành thì lệnh hoàn thành).
- **Actual:** Phiếu nhập 5 được tạo, lệnh vẫn IN_PROGRESS.
- **Vị trí:** ApproveProductionOrderCommand.cs – trạng thái chỉ chuyển khi SL nhận ≥ SL kế hoạch. Trùng DEF-UT-07 (Report 5.1).
- **Đề xuất:** Đóng lệnh khi Manager duyệt hoàn thành (hoặc cập nhật BR-38 nếu chủ ý).

### DEF-IT-07 – Kiểm kho: dòng chênh lệch không bắt buộc lý do (BR-43)

- **Loại / mức độ:** NOT_IMPLEMENTED · Medium
- **TC:** INT-STK-46-09
- **Tái hiện:** POST /api/stocktakes BALANCED, P-TEST thực tế 105 (hệ thống 100), không có lý do.
- **Expected:** Từ chối, tồn giữ 100.
- **Actual:** Cân bằng ngay, tồn 105.
- **Vị trí:** StocktakeDtos.cs:42 StocktakeItemRequest không có trường lý do; StocktakeLogic không kiểm (cột discrepancy_reason có trong bảng).
- **Đề xuất:** Nhóm xác nhận phạm vi BR-43; nếu làm: thêm lý do vào request và kiểm khi BALANCED.

### DEF-IT-08 – Phạm vi khóa kiểm kho (BR-42) giữa Report 5.2 và Report 3

- **Loại / mức độ:** SPEC_CODE_MISMATCH · Cần quyết định
- **TC:** INT-STK-48-01, INT-STK-48-02, INT-STK-48-03, INT-STK-48-04, INT-STK-48-05, INT-STK-48-06
- **Tái hiện:** Phiếu kiểm DRAFT có P-TEST tại K001; nhập hàng / hoàn thành phiếu nhập / POS / xuất, nhận chuyển kho / trả NCC P-TEST tại K001.
- **Expected:** Workbook: tất cả bị chặn.
- **Actual:** Không bị chặn; chỉ xuất NVL, nhập thành phẩm, duyệt hoàn thành, xuất hủy bị chặn (INT-MFG-35-06, INT-DSP-29-07 đạt).
- **Vị trí:** StocktakeGuard.cs (chỉ Production + Disposals gọi) – khớp Report 3 BR-42 hiện hành.
- **Đề xuất:** Chốt phạm vi: sửa Expected 48-01…06 theo Report 3, hoặc mở việc gọi StocktakeGuard ở các luồng còn lại.


## 2. Lệch SPEC ↔ code còn lại (SPEC_CODE_MISMATCH, không phải lỗi code)

| TC | Nội dung |
|---|---|
| INT-PRD-01-05 | Như INT-POS-08-05: 'Kho Gia Lâm' ↔ 'Kho Tổng Gia Lâm'. Hành vi đúng: chặn, không tạo phiếu kiểm. |
| INT-PRB-03-01 | Tạo bảng giá trả 201 Created; workbook ghi 200 OK. Dòng bảng giá được tạo. |
| INT-PRB-03-03 | apply-formula không nhận công thức trong body (chỉ CategoryIds / AllProducts); công thức lưu trên bảng giá. Ca bổ sung INT-PRB-03-S01 (công thức lưu trên bảng giá) đạt 110.000. |
| INT-PRB-03-04 | Như INT-PRB-03-03: giá trị trong body bị bỏ qua, API trả 200. Luật 'không âm' kiểm khi lưu bảng giá (INT-PRB-03-S02 đạt). |
| INT-FIN-04-01 | Phiếu thu phân bổ cho hóa đơn có mã 'TTHD00001' (TT + mã hóa đơn), không phải 'PTxxxx'. Công nợ, phân bổ, loại RECEIPT đúng. |
| INT-CRD-06-01 | Chặn đúng (CUS-009); số tiền định dạng theo culture tiến trình API ('2,000,000' trên máy en-US) – workbook '2.000.000'. Program.cs không đặt culture. |
| INT-CRD-06-04 | Workbook gửi body {}; API bắt buộc ApprovalType = NEW_LIMIT ('Loại duyệt không hợp lệ: chỉ duyệt nâng hạn mức (NEW_LIMIT).'). Ca bổ sung INT-CRD-06-S01 với NEW_LIMIT đạt. |
| INT-POS-08-05 | Expected ghi 'Kho Gia Lâm'; DatabaseSeeder đặt tên 'Kho Tổng Gia Lâm'. Hành vi đúng: chặn, không tạo hóa đơn, tồn không đổi. |
| INT-POS-10-03 | Code chỉ áp A2 cho đơn đặt hàng; hóa đơn POS hết hàng trả thông báo B1 (POS-014, INV-006). Hành vi chặn đúng; cần chốt Expected A2 hay B1. |
| INT-SBK-12-05 | Tạo hóa đơn giao hàng đưa đơn đặt về FINISHED (SalesBookingOps.cs:139) nên nhánh 'Có đơn đã tạo hóa đơn giao hàng…' (SalesBookingCommands.cs:338) không tới được; API trả 'chỉ gộp đơn ở trạng thái Phiếu tạm'. Hành vi chặn đúng. |
| INT-SBK-13-03 | Precondition User S chỉ có K001 → API kiểm quyền kho K002 (AUTH-WH, CreatePosOrderCommand.cs:160) trước luật chi nhánh. Ca bổ sung INT-SBK-13-S03 (người dùng có K001 + K002) xác nhận luật đúng. Cần sửa Precondition. |
| INT-TRF-43-01 | Tồn đúng (-5) nhưng thẻ kho ghi 2 dòng TRANSFER_OUT (-10 và -5) thay vì 1 dòng -15 khi xuất vượt tồn (InventoryLedger tách theo dòng tồn). |
| INT-SEC-50-04 | 403 đúng; câu dùng tên chức năng 'Kiểm kho' thay vì mã 'feat-stocktake' (RequirePermissionAttribute.cs:143). |
| INT-PUR-30-03 | Nhận PO với SL đạt 0, lỗi 5 được chấp nhận (tạo phiếu nhập COMPLETED); câu 'Số lượng đạt phải lớn hơn 0. Mặt hàng lỗi toàn bộ…' không còn trong code nhập hàng (đổi sau c60ea62 – f5c270a hàng lỗi nhập). Cần chốt luật. |
| INT-PRT-32-04 | Phiếu nhập chưa thanh toán → NCC không nợ mình → 'Số tiền vượt quá số nhà cung cấp còn phải trả (0).' Precondition cần ghi phiếu nhập đã thanh toán. |
| INT-BOM-33-03 | Code: 'Định mức phải có ít nhất một nguyên vật liệu.' (ActivateBomCommand.cs:30). |
| INT-BOM-33-04 | Code: 'Thành phẩm đã có định mức phiên bản 1.0.' (CreateBomCommand.cs:45). |
| INT-BOM-33-05 | Code: 'Định mức đã được dùng cho lệnh sản xuất nên không sửa được…' (UpdateBomCommand.cs:47). |
| INT-BOM-33-06 | Code: 'Định mức đã được dùng cho lệnh sản xuất nên không hủy được. Bạn có thể ngừng áp dụng định mức.' (DeleteBomCommand.cs:31). |
| INT-PLN-34-03 | Endpoint duyệt gắn PROD_APPROVE + [RequireFeature(feat-production-plan-approval)] → 403 'Vai trò của bạn chưa được phân quyền chức năng Duyệt kế hoạch sản xuất.' ở tầng phân quyền, không tới câu 400 trong handler. |
| INT-MFG-35-02 | Code: 'Số lượng xuất luỹ kế vượt nhu cầu theo định mức. Vui lòng nhập lý do.' (CreateMaterialIssueCommand.cs:126; BR-34). |
| INT-SET-41-04 | Chặn đúng; API đặt hàng trả 'Hệ thống đang tạm ngừng nhận đơn đặt hàng mới (Thiết lập đơn hàng).' (SalesBookingCommands.cs:76). Câu (A1) của workbook chỉ có ở POS với Status PENDING. |

## 3. Quan sát khác (đọc code, chưa có TC trong workbook)

| # | Vị trí | Mô tả | Mức độ |
|---|---|---|---|
| O-1 | CreatePosOrderCommand.cs:134–143 | Chặn "nhấn thanh toán nhiều lần" (PAY-016) so mọi đơn cùng TotalAmount trong 3 giây (khách lẻ: so với mọi khách, gồm cả đơn đặt hàng) → tạo hóa đơn từ đơn đặt ngay sau khi đặt (cùng tổng tiền) hoặc 2 khách lẻ cùng số tiền trong 3 giây bị từ chối | Trung bình |
| O-2 | CreatePosOrderCommand.cs:175, 736–755 | Hồ sơ "Khách lẻ" KH00000 được tạo ngoài transaction, vẫn tạo khi đơn POS bị từ chối | Thấp |
| O-3 | Program.cs | Không đặt culture: số tiền trong thông báo theo culture máy chạy API (en-US "2,000,000"; một số câu khác lại định dạng kiểu Việt Nam) | Thấp |
| O-4 | UpdateWarehouseAccessCommand.cs | Ghi `DateTime.UtcNow` (Kind=UTC) vào cột timestamp without time zone – chỉ chạy được nhờ công tắc legacy của Npgsql trong Program.cs (các handler khác dùng VietnamTime) | Thấp |
| O-5 | InventoryLedger | Xuất vượt tồn ghi 2 dòng thẻ kho (phần có tồn + phần âm) cho một chứng từ (INT-TRF-43-01) | Thấp |
| O-6 | appsettings.json (đã commit) | Chứa chuỗi kết nối stockflow_dev; Program.cs tự migrate + seed khi khởi động | Thấp (cấu hình) |
