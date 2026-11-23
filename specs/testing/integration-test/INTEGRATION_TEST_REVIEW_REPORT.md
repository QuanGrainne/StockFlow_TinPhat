# Integration Test – Báo cáo review Test Case (Report 5.2)

> Ngày: 23/11/2026 · Người thực hiện: NinhHQ (AI hỗ trợ: Claude Code) · Nguồn ca: `docs/Report5.2_Integration_Test.xlsx` (sheet "Test Cases" + 41 sheet chức năng).
> SPEC: Report 3 bản hiện hành (`docs/SEP_490_Group82(bản sao).docx`), `specs/`. Code: nhánh feature/integration-test (tách từ feature/qa-unit-test 98946ff; cùng cây mã với origin/dev a5cc470). Workbook không bị sửa.

## 1. Nguồn dữ liệu và baseline

| Nguồn | Dùng để |
|---|---|
| Report 5.2 – "Test Cases" | 41 chức năng, người phụ trách, mô tả, Precondition chung |
| Report 5.2 – 41 sheet chức năng | 251 Test Case: ID, mô tả, các bước, Expected, Precondition riêng, ghi chú; Round 1 đang "Pending" |
| Report 3 (SRS) | UC, BR-01…BR-52, BR-PP, mục 4.2.3 (nhất quán dữ liệu, transaction), 4.2.4 (bảo mật) |
| Code | 210 route ở 27 controller, handler MediatR, StockFlowDbContext (schema `stockflow`, 56 bảng), 51 migration, DatabaseSeeder, RequirePermission / RequireFeature / RequireAdmin |
| Unit test | StockFlow.UnitTests (Report 5.1) – không bị ảnh hưởng |

Workbook ghi "Build under test: branch dev, commit c60ea62" (18/11/2026). Code đã chạy mới hơn 29 commit (payOS QR, hàng lỗi nhập, sửa giá vốn bình quân cả kho, xoá 3 bảng, cập nhật sản xuất, phiếu thu / chi công nợ ngược chiều). Kết quả trong bộ báo cáo này là của code hiện tại.

## 2. Phân loại theo cấp độ kiểm thử

| Nhóm | Ý nghĩa | Số TC |
|---|---|---|
| A | Phù hợp Backend Integration Test | 220 |
| B | Phù hợp Unit Test hơn (chỉ kiểm đầu vào; ở Integration kiểm thêm 400 + không ghi dữ liệu) | 13 |
| C | Phù hợp System / E2E (hành vi giao diện) | 3 |
| D | Nhiều cấp (backend ở Integration, giao diện ở E2E) | 8 |
| E | Chưa đủ thông tin / cần nhóm quyết định | 7 |
| **Tổng** | | **251** |

| Người | Chức năng | TC | A | B | C | D | E |
|---|---|---|---|---|---|---|---|
| DatTD | 7 | 40 | 31 | 5 | 0 | 4 | 0 |
| NinhHQ | 7 | 40 | 37 | 1 | 0 | 2 | 0 |
| LucDT | 15 | 102 | 93 | 1 | 1 | 0 | 7 |
| TamDM | 7 | 42 | 41 | 1 | 0 | 0 | 0 |
| QuanDN | 5 | 27 | 18 | 5 | 2 | 2 | 0 |

**Ca không thuộc nhóm A**

| TC | Nhóm | Lý do |
|---|---|---|
| INT-PRD-02-01 | D | Chọn file trên màn Hàng hóa là UI; frontend đọc Excel rồi gửi JSON tới POST /api/products/import (backend kiểm qua API) |
| INT-PRD-02-02 | D | Như INT-PRD-02-01 |
| INT-PRD-02-03 | D | Như INT-PRD-02-01 |
| INT-PRD-02-04 | B | Danh sách rỗng – kiểm đầu vào |
| INT-PRB-03-02 | B | Ngày bắt đầu sau ngày kết thúc – validator |
| INT-PRB-03-04 | B | Giá trị âm – validator |
| INT-PRB-03-05 | D | Chọn bảng giá trên POS là UI; backend: hóa đơn POS lưu đơn giá + ghi chú [Bảng giá: …] |
| INT-CRD-07-03 | B | Thiếu lý do – validator |
| INT-CRD-07-05 | B | Ngoài khoảng 0–3650 – kiểm đầu vào |
| INT-POS-08-02 | D | QR trên phiếu in là UI; backend: phiếu thu ghi phương thức VIETQR |
| INT-SBK-12-04 | B | Chọn < 2 đơn – kiểm đầu vào (không đọc DB) |
| INT-SBK-13-01 | D | Mở đơn đặt trên POS là UI; backend: POST /api/orders/pos với bookingOrderId |
| INT-TRF-43-04 | C | Cảnh báo + xác nhận trên màn Tạo phiếu chuyển là giao diện |
| INT-STK-46-07 | B | SL thực tế âm – kiểm đầu vào |
| INT-STK-48-01 | E | Cần nhóm chốt phạm vi BR-42 |
| INT-STK-48-02 | E | Cần nhóm chốt phạm vi BR-42 |
| INT-STK-48-03 | E | Cần nhóm chốt phạm vi BR-42 |
| INT-STK-48-04 | E | Cần nhóm chốt phạm vi BR-42 |
| INT-STK-48-05 | E | Cần nhóm chốt phạm vi BR-42 |
| INT-STK-48-06 | E | Cần nhóm chốt phạm vi BR-42 |
| INT-SEC-53-03 | E | Quyết định nhóm (tài khoản không kho) – luật lưu chưa review |
| INT-PUR-31-06 | B | Đơn giá âm – kiểm đầu vào |
| INT-AUT-37-05 | C | Chuyển hướng /login khi mất token là hành vi frontend (lib/api/client.ts) |
| INT-AUT-37-06 | C | Hai tab hai tài khoản (tabSession) là hành vi trình duyệt |
| INT-AUT-38-01 | D | Modal đổi mật khẩu là UI; backend: POST /api/auth/change-password rồi đăng nhập lại |
| INT-AUT-38-03 | B | Chính sách mật khẩu – validator |
| INT-AUT-38-04 | B | Trùng mật khẩu cũ |
| INT-AUT-38-05 | B | Xác nhận không khớp – validator |
| INT-ADM-40-03 | D | Ẩn menu là UI; backend: my-features bỏ chức năng, API của chức năng trả 403 |
| INT-SET-41-02 | B | Quy tắc sinh mã sai – kiểm đầu vào |
| INT-SET-41-03 | B | Tiền tố > 10 ký tự – kiểm đầu vào |

Nhóm B vẫn được chạy ở Integration (kiểm hợp đồng API: 400, câu thông báo, không ghi dữ liệu). Nhóm C không chạy ở đây (test đánh dấu Skip kèm lý do). Nhóm D chạy phần backend. Nhóm E vẫn chạy theo Expected của workbook, kết quả Fail được xếp riêng là "cần quyết định", không đánh dấu Passed.

## 3. Đối chiếu SPEC ↔ code (sau khi chạy)

| Trạng thái | Số TC |
|---|---|
| IMPLEMENTED | 209 |
| PARTIALLY IMPLEMENTED | 10 |
| NOT_IMPLEMENTED | 1 |
| SPEC_CODE_MISMATCH | 28 |
| INSUFFICIENT_INFORMATION | 0 |
| N/A (E2E) | 3 |

- PARTIALLY IMPLEMENTED = chức năng có nhưng sai luật (lỗi code, xem Defect Report).
- 79/80 endpoint ghi trong workbook có trong code; `/api/purchaseorders` không có (route thật `/api/purchase-orders`), test gọi route thật và ghi nhận lệch tên.
- Chi tiết từng TC: `INTEGRATION_TEST_SPEC_CODE_MAPPING.md`.

## 4. Điểm cần nhóm xác nhận (không tự sửa Expected)

| # | TC | SPEC (workbook) | Hành vi thực tế (code) | Đề xuất |
|---|---|---|---|---|
| 1 | INT-STK-48-01…06 | Kiểm kho đang mở chặn nhập hàng, hoàn thành phiếu nhập, POS, xuất / nhận chuyển kho, trả NCC (theo BR-56 cũ) | Report 3 BR-42 hiện hành chỉ chặn xuất NVL, nhập thành phẩm, duyệt hoàn thành, xuất hủy; code khớp Report 3 (StocktakeGuard), các luồng kia không bị chặn | Chốt phạm vi BR-42: sửa Expected theo Report 3, hoặc mở việc thêm khóa cho các luồng còn lại |
| 2 | INT-STK-46-09 | Dòng chênh lệch phải có lý do (BR-43) | Không có trường lý do | Xác nhận BR-43 có trong phạm vi không |
| 3 | INT-POS-10-03 | Hóa đơn POS hết hàng trả thông báo A2 | Trả thông báo B1 (A2 chỉ cho đơn đặt hàng) | Chốt Expected |
| 4 | INT-PUR-30-03 | Nhận PO chỉ có hàng lỗi bị từ chối | Được nhận (luật bỏ sau c60ea62) | Chốt luật hàng lỗi toàn bộ |
| 5 | INT-MFG-36-03 | Có xác nhận vượt kế hoạch thì lưu phiếu | Bị chặn vì NVL đã xuất chỉ đủ 10 (BR-37 nói chỉ cảnh báo) | Xác nhận đây là lỗi hay luật mới |
| 6 | INT-SBK-13-03, INT-PRT-32-04, INT-CRD-06-04, INT-PRB-03-03/04, INT-PLN-34-03 | Bước test / Precondition chưa khớp API thật | Xem Mapping (lệch hợp đồng API) | Sửa bước / Precondition; ca bổ sung đã chứng minh luật thật |
| 7 | Câu chữ (BOM ↔ "Định mức", "Kho Gia Lâm", mã PT ↔ TTHD, 201 ↔ 200, định dạng số) | | | Sửa Expected cho khớp câu thật, chốt culture của API (vi-VN) |
| 8 | Precondition quyền | Liệt kê thiếu `feat-*`, SALES_DELETE, FIN_UPDATE, BOM_APPROVE, SALES_APPROVE… | Code đòi đủ các quyền này | Bổ sung Precondition |
| 9 | Mã BR trong workbook | BR-09 (gộp đơn), BR-18/19 (trả hàng)… theo bản cũ | Report 3 hiện hành đánh số lại | Cập nhật mã BR |
| 10 | Mô tả môi trường (sheet Test Cases) | API :5000, DB stockflow_test, Swagger / UI | Test tự động chạy API trong tiến trình test, DB stockflow_integration_test tự dựng / xoá | Cập nhật khi ghi Round 1 |

## 5. Ca bổ sung (không thay thế ca gốc)

| ID | Nội dung | Căn cứ | Kết quả |
|---|---|---|---|
| INT-CRD-06-S01 | (Bổ sung) Manager duyệt với ApprovalType = NEW_LIMIT | Bổ trợ INT-CRD-06-04 (API thật) | Passed |
| INT-POS-08-S01 | (Bổ sung) Lỗi giữa chừng khi bán POS → rollback toàn bộ | Report 3 mục 4.2.3 – rollback transaction | Passed |
| INT-PRB-03-S01 | (Bổ sung) Công thức +10% lưu trên bảng giá rồi áp dụng | Bổ trợ INT-PRB-03-03 (API thật) | Passed |
| INT-PRB-03-S02 | (Bổ sung) Lưu bảng giá với giá trị điều chỉnh âm | Bổ trợ INT-PRB-03-04 (API thật) | Passed |
| INT-SBK-11-S01 | (Bổ sung) Lỗi khi lưu phiếu thu trả trước → rollback đơn đặt | Report 3 mục 4.2.3 – rollback transaction | Passed |
| INT-SBK-12-S01 | (Bổ sung) Lỗi khi hủy đơn gốc lúc gộp → rollback | Report 3 mục 4.2.3 – rollback transaction | Passed |
| INT-SBK-13-S01 | (Bổ sung) Lỗi khi tạo hóa đơn từ đơn đặt → rollback | Report 3 mục 4.2.3 – rollback transaction | Passed |
| INT-SBK-13-S02 | (Bổ sung) Công nợ nhất quán sau đặt cọc + hóa đơn trả đủ (BR-15) | BR-15 | Passed |
| INT-SBK-13-S03 | (Bổ sung) Hóa đơn khác chi nhánh, người dùng có quyền cả 2 kho | Bổ trợ INT-SBK-13-03 | Passed |
| INT-SRT-14-S01 | (Bổ sung) Lỗi khi nhập lại kho hàng trả → rollback | Report 3 mục 4.2.3 – rollback transaction | Passed |
