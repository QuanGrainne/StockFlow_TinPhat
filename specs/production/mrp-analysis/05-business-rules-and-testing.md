# 05 — Business rules, ngoại lệ và kiểm thử (Phần 8, 9)

Mã BR-MRP-xx là mã tạm, chưa có trong Report 3. Cột "Nguồn" ghi **Code** (đã có trong hệ thống), **Đề xuất** (suy từ phân tích) hoặc **Cần xác nhận** (kèm mã câu hỏi ở file 06).

## 1. Quy tắc nền

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-MRP-01 | Nhu cầu NVL = SL × định mức × (1 + hao hụt / 100), theo đơn vị cơ sở, làm tròn 2 chữ số | Code (`ProductionPolicy.CalculateRequirement`, BR-31) |
| BR-MRP-02 | Nhu cầu của kế hoạch tính trên số còn lại chưa lập lệnh; nhu cầu của lệnh là số còn phải xuất. Không tính trùng | Code (BR-PP-10, BR-PP-11) + Đề xuất |
| BR-MRP-03 | Ngày cần của nhu cầu = ngày bắt đầu của dòng kế hoạch (phương án A) | Đề xuất |
| BR-MRP-04 | Nguồn chắc chắn = tồn trong `trx_inventory_balances`, trừ lô hết hạn trước ngày cần | Đề xuất |
| BR-MRP-05 | Nguồn dự kiến = đơn mua `ORDERED` / `PARTIAL` có ngày giao dự kiến + phiếu chuyển `IN_TRANSIT` đến kho | Cần xác nhận (Q-M5) |
| BR-MRP-06 | Phân bổ mềm: nhu cầu có ngày cần sớm hơn được cấp nguồn trước; cùng ngày thì lệnh trước kế hoạch, rồi theo thời điểm tạo | Cần xác nhận (Q-M1) |
| BR-MRP-07 | Hạn đặt hàng = ngày cần − đệm an toàn − kiểm nhận − lead time của NVL | Đề xuất |
| BR-MRP-08 | Hạn đặt hàng trước hôm nay → trạng thái Trễ | Đề xuất |
| BR-MRP-09 | Dòng kế hoạch Sẵn sàng khi mọi NVL được cấp đủ từ nguồn chắc chắn | Đề xuất |
| BR-MRP-10 | MRP chỉ cảnh báo và đề xuất; không chặn duyệt kế hoạch, lập lệnh, và không tự tạo chứng từ | Code (BR-PP-15) + Đề xuất |
| BR-MRP-11 | MRP không làm thay đổi tồn kho | Đề xuất |

## 2. Các trường hợp

| # | Trường hợp | Điều kiện | Xử lý | Kết quả | Cảnh báo | Cho tiếp tục? |
|---|---|---|---|---|---|---|
| 1 | Kế hoạch chưa duyệt (Nháp) | `DRAFT` | Tính nhu cầu riêng cho kế hoạch khi xem; **không** đưa vào phân bổ chung | Không ảnh hưởng kế hoạch khác | — | Có |
| 2 | Kế hoạch chờ duyệt | `PENDING_APPROVAL` | Đưa vào phân bổ chung nếu chọn "tính cả chờ duyệt" (Q-M2) | Người duyệt thấy ảnh hưởng nếu duyệt | "Gồm kế hoạch chưa duyệt" | Có |
| 3 | Kế hoạch đã duyệt | `APPROVED` | Phần chưa lập lệnh vào phân bổ chung | Có ngày cần, thiếu, hạn đặt | Theo kết quả | Có |
| 4 | Kế hoạch bị từ chối | `REJECTED` | Không tính | Nguồn đã cấp cho nó được trả lại cho nhu cầu khác ở lần tính sau | — | Có |
| 5 | Kế hoạch bị hủy / đóng | `CANCELLED`, `CLOSED` | Không tính phần kế hoạch; lệnh còn mở của kế hoạch đã đóng vẫn tính | Như trên | — | Có |
| 6 | Đổi sản lượng | Sửa dòng kế hoạch (BR-PP-13) | Tính lại khi xem | Thiếu và hạn đặt đổi theo | Nếu trước đó đủ nay thiếu: hiện ở NVL thiếu | Có |
| 7 | Đổi ngày sản xuất | Sửa ngày của dòng | Tính lại ngày cần và hạn đặt | Thứ tự phân bổ có thể đổi | Trễ nếu hạn đặt mới đã qua | Có |
| 8 | BOM đổi (kích hoạt phiên bản mới) | BOM đang áp dụng khác trước | Phần chưa lập lệnh theo BOM mới; lệnh đã lập giữ nhu cầu đã chụp | Nhu cầu kế hoạch đổi | "Tính theo BOM phiên bản X" | Có |
| 9 | BOM ngừng hoạt động | Thành phẩm không còn BOM đang áp dụng | Bỏ thành phẩm khỏi phép tính, liệt kê riêng | Dòng có trạng thái Chưa có BOM | Có | Xem được; gửi duyệt và duyệt bị chặn (Code: `ValidateReadyForApprovalAsync`) |
| 10 | BOM thiếu NVL (không có dòng) | BOM đang áp dụng nhưng 0 dòng | Coi như chưa có BOM (Code: `ProductsWithoutActiveBomAsync` yêu cầu có dòng) | Như #9 | Có | Như #9 |
| 11 | NVL ngừng kinh doanh | `mst_products.is_active = false` với NVL trong BOM | Vẫn tính nhu cầu; đánh dấu NVL | Không đề xuất mua NVL này | "NVL đã ngừng, cần sửa BOM" | Có. Chặn hay không khi duyệt: Q-M10 |
| 12 | NVL không đủ tồn | Thiếu > 0 sau phân bổ | Tính số thiếu, hạn đặt, gợi ý mua / chuyển | Trạng thái Thiếu hoặc Trễ | Có | Có (BR-MRP-10) |
| 13 | NVL đã phân bổ cho kế hoạch khác | Nhu cầu sớm hơn đã dùng hết nguồn | Nhu cầu muộn hơn nhận phần còn lại | Thiếu ở kế hoạch muộn hơn | Hiện danh sách kế hoạch / lệnh đang được cấp | Có |
| 14 | NVL đang chờ nhập (đã đặt) | Đơn mua `ORDERED` / `PARTIAL` | Có ngày giao ≤ ngày cần: tính là nguồn dự kiến. Không có ngày hoặc về muộn: không dùng để xóa thiếu | Trạng thái "Đủ khi hàng về" | "Phụ thuộc đơn mua PO…" | Có |
| 15 | NVL đang kiểm nhận | Phiếu nhập `DRAFT` | Không tính là tồn; hiện cột riêng | Vẫn Thiếu cho tới khi phiếu hoàn thành | "Đang kiểm nhận N" | Có |
| 16 | NVL hết hạn | Lô có `expiry_date` < ngày cần | Loại khỏi tồn khả dụng | Tồn khả dụng giảm | "N thuộc lô hết hạn" | Có. Xuất NVL hiện **không** chặn lô hết hạn (ngoài phạm vi MRP, cần ghi nhận) |
| 17 | NVL lỗi / không đạt | Phát hiện sau khi nhập | Người dùng xuất hủy (module Disposals) để ra khỏi tồn | Tồn giảm, MRP tự phản ánh | — | Có |
| 18 | Nhiều kế hoạch trùng thời gian | Cùng ngày cần | Thứ tự theo BR-MRP-06 | Kết quả xác định, lặp lại được | — | Có |
| 19 | Nhiều kho cùng có NVL | Tồn ở kho khác kho đang xét | Không tự cộng; liệt kê ở gợi ý chuyển kho | Thiếu ở kho sản xuất vẫn hiện | "Có N ở kho K…" | Có |
| 20 | Hai người cùng phân bổ một lượng tồn | Hai người xem MRP cùng lúc | Phân bổ mềm không ghi dữ liệu nên không xung đột; cả hai thấy cùng kết quả | — | — | Có. Với giữ chỗ cứng (nếu làm sau): phải khóa theo (NVL, kho) trong transaction |
| 21 | NVL chưa có lead time | `lead_time_days` rỗng | Không tính hạn đặt | Trạng thái "Chưa có lead time" | Có | Có |
| 22 | NVL là bán thành phẩm có BOM riêng | NVL trong BOM có BOM đang áp dụng | Giai đoạn đầu: tính như NVL thường | Nhu cầu cấp dưới không được phân rã | "Hàng có BOM riêng, chưa phân rã" | Có |
| 23 | Kho đang kiểm kho | Có phiếu kiểm kho đang mở ở kho | MRP vẫn tính trên tồn hiện tại | — | "Kho đang kiểm kho, số tồn có thể đổi" | Có (xuất NVL thì bị chặn: Code BR-42) |

## 3. Kiểm thử

Repo chưa có project test tự động. Kế hoạch sản xuất đang dùng console harness (`specs/production-planning-implementation/unit-tests`) và script PowerShell gọi API thật trên DB tạm (`api-tests`). MRP có thể theo cùng cách cho tới khi nhóm duyệt thêm package test.

### 3.1 Unit test (`MrpPolicy`, thuần)

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| MU-01 | Ví dụ file 02 mục 6: tổng nhu cầu | Gỗ 900, sơn 200, ốc vít 2.600 |
| MU-02 | Phân bổ theo ngày, một NVL, hai mốc | Sơn: 20/11 thiếu 0, 22/11 thiếu 50 |
| MU-03 | Tồn 0 | Thiếu = toàn bộ nhu cầu |
| MU-04 | Tồn dư | Thiếu 0, trạng thái Đủ |
| MU-05 | Hao hụt 10% | Nhu cầu × 1,1, làm tròn 2 chữ số |
| MU-06 | Hai nhu cầu cùng ngày: lệnh và kế hoạch | Lệnh được cấp trước |
| MU-07 | Thêm nhu cầu sớm hơn (ví dụ mục 6.5) | KH-2 thiếu 0, Bàn A thiếu 450, Ghế B thiếu 400 |
| MU-08 | Hàng về trước ngày cần | Được tính; trạng thái "Đủ khi hàng về" |
| MU-09 | Hàng về sau ngày cần | Không tính cho mốc đó; tính cho mốc sau |
| MU-10 | Hạn đặt = ngày cần − lead time | Gỗ cần 20/11, 3 ngày → 17/11 |
| MU-11 | Hạn đặt đã qua | Trạng thái Trễ; ngày sớm nhất có hàng = hôm nay + lead time |
| MU-12 | Lead time rỗng | Không có hạn đặt; trạng thái Chưa có lead time |
| MU-13 | Hạn đặt rơi vào ngày nghỉ | Lùi về ngày làm việc trước |
| MU-14 | Đệm an toàn và kiểm nhận theo ngày làm việc, qua cuối tuần | Bỏ qua ngày nghỉ |
| MU-15 | Lô hết hạn trước ngày cần | Không tính vào tồn khả dụng |
| MU-16 | Tỷ lệ làm được của dòng | Bàn A: 60 / 100 |
| MU-17 | Số rất lớn | Không tràn số; trả lỗi rõ (dùng `TryCalculateRequirement`) |

### 3.2 Integration test (handler + DB tạm)

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| MI-01 | Kế hoạch đã duyệt, chưa lập lệnh | Nhu cầu = BOM × số kế hoạch |
| MI-02 | Lập lệnh một phần | Nhu cầu kế hoạch giảm, nhu cầu lệnh tăng, **tổng không đổi** |
| MI-03 | Xuất NVL cho lệnh | Nhu cầu lệnh giảm đúng số xuất; tồn giảm; thiếu không đổi |
| MI-04 | Hủy lệnh | Nhu cầu trở về kế hoạch |
| MI-05 | Sửa số lượng dòng kế hoạch | Nhu cầu và thiếu tính lại |
| MI-06 | Sửa ngày dòng kế hoạch | Ngày cần, hạn đặt, thứ tự phân bổ đổi |
| MI-07 | Kích hoạt BOM phiên bản mới | Phần chưa lập lệnh theo BOM mới; lệnh cũ giữ nguyên |
| MI-08 | Đóng / hủy kế hoạch | Nhu cầu phần chưa lập lệnh biến mất |
| MI-09 | Đơn mua `ORDERED` có ngày giao | Vào "đang đặt"; hoàn thành phiếu nhập → chuyển sang tồn, không tính hai lần |
| MI-10 | Đơn mua nhận một phần | "Đang đặt" = đặt − đã nhận |
| MI-11 | Phiếu nhập `DRAFT` | Vào "đang kiểm nhận", không vào tồn |
| MI-12 | Phiếu chuyển `IN_TRANSIT` | Vào "đang chuyển đến" của kho đích; nhận hàng → vào tồn |
| MI-13 | Hai kế hoạch dùng chung NVL | Kế hoạch sớm được cấp trước |
| MI-14 | Thành phẩm mất BOM | Liệt kê riêng, không làm lỗi phép tính |

### 3.3 API test

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| MA-01 | Sales gọi `/mrp/overview` | 403 |
| MA-02 | Kho không có quyền | 400, thông báo không có quyền kho |
| MA-03 | `fromDate > toDate` | 400 `VALIDATION_FAILED` |
| MA-04 | Kế hoạch không tồn tại | 400 "Không tìm thấy kế hoạch sản xuất" |
| MA-05 | Không có nhu cầu nào | 200, danh sách rỗng |
| MA-06 | Dữ liệu ví dụ file 02 | Số khớp bảng 6.2, 6.3 |
| MA-07 | Gợi ý chuyển kho | Chỉ gồm kho người dùng có quyền |
| MA-08 | Tài khoản bị khóa | Bị chặn |

### 3.4 System test (đầu-cuối trên giao diện)

| ID | Kịch bản |
|---|---|
| MS-01 | Lập kế hoạch → thấy thiếu và hạn đặt → lập đơn mua có ngày giao → trạng thái "Đủ khi hàng về" → nhập kho → "Sẵn sàng" → lập lệnh → xuất NVL |
| MS-02 | Thiếu ở kho sản xuất, có tồn ở kho khác → lập phiếu chuyển → nhận hàng → "Sẵn sàng" |
| MS-03 | Dời ngày sản xuất sớm lên → hạn đặt chuyển sang Trễ |
| MS-04 | Thêm kế hoạch thứ hai có ngày sớm hơn → kế hoạch đầu chuyển từ Đủ sang Thiếu, màn hình cho biết NVL đang cấp cho đâu |
| MS-05 | Hồi quy: lập / duyệt kế hoạch, lập lệnh, xuất NVL, nhập thành phẩm, đơn mua, chuyển kho vẫn chạy như trước |
