# 03 — Logic nghiệp vụ MRP đề xuất (Phase 3)

Mọi quy tắc là **đề xuất**, mã BR-MRP-xx là mã tạm, chưa có trong Report 3. Cột "Loại" ghi **Bắt buộc** hoặc **Tùy chọn**.

## 1. Khái niệm

| Tên | Ký hiệu | Ý nghĩa |
|---|---|---|
| Nhu cầu thô | GR(t) | NVL cần cho sản xuất vào ngày t |
| Hàng về theo lịch | SR(t) | NVL đang đặt hoặc đang chuyển, dự kiến vào kho ngày t |
| Tồn dự phóng | PAB(t) | Tồn dự kiến cuối ngày t |
| Tồn an toàn | SS | Mức tồn không muốn xuống dưới |
| Nhu cầu ròng | NR(t) | Lượng phải bổ sung để PAB(t) không dưới SS |
| Hàng cần về | POR(t) | Lượng đề xuất nhận vào ngày t |
| Ngày đặt | Release(t) | Ngày phải gửi đơn để hàng về kịp ngày t |
| Thời gian giao | LT | Số ngày từ lúc đặt tới lúc hàng vào kho |

Mọi số lượng theo **đơn vị cơ sở** của NVL, làm tròn 2 chữ số như `ProductionPolicy.QuantityScale`.

## 2. Nhu cầu thô

**Công thức (đã có trong code, BR-31):**

```
Nhu cầu của một dòng = Số lượng sản xuất × Định mức × (1 + Hao hụt % / 100)
```

| Mã | Quy tắc | Loại |
|---|---|---|
| BR-MRP-01 | Dùng `ProductionPolicy.CalculateRequirement`, không viết công thức thứ hai | Bắt buộc |
| BR-MRP-02 | Nguồn nhu cầu: (a) kế hoạch `APPROVED`: phần **chưa lập lệnh** của từng dòng; (b) lệnh `NOT_STARTED`, `IN_PROGRESS`: `shortage_qty` (còn phải xuất) trong `trx_production_material_requirements`. Phần đã lập lệnh của kế hoạch không tính lần hai | Bắt buộc |
| BR-MRP-03 | Ngày cần: kế hoạch lấy `planned_start_date` của dòng; lệnh chưa bắt đầu thuộc kế hoạch lấy ngày bắt đầu của dòng kế hoạch tương ứng; lệnh khác lấy `start_date`; ngày cần đã qua thì tính là hôm nay | Bắt buộc |
| BR-MRP-04 | Cùng NVL, cùng ngày, từ nhiều thành phẩm hoặc nhiều kế hoạch: cộng dồn | Bắt buộc |
| BR-MRP-05 | Thành phẩm không có BOM đang áp dụng: bỏ khỏi phép tính và liệt kê riêng | Bắt buộc |
| BR-MRP-06 | BOM dùng là bản đang áp dụng lúc chạy; kết quả ghi lại phiên bản đã dùng | Bắt buộc |
| BR-MRP-07 | Kế hoạch `PENDING_APPROVAL` chỉ được tính khi người dùng chọn | Tùy chọn (Q2) |
| BR-MRP-08 | Chia nhu cầu của dòng đều theo các ngày từ bắt đầu tới kết thúc | Tùy chọn |
| BR-MRP-09 | NVL là hàng có BOM riêng: giai đoạn đầu tính như NVL mua ngoài và gắn cảnh báo | Bắt buộc (phân rã nhiều cấp là tùy chọn) |

## 3. Nguồn cung

| Mã | Quy tắc | Loại |
|---|---|---|
| BR-MRP-10 | Tồn đầu kỳ = tổng `quantity` trong `trx_inventory_balances` của kho (hoặc nhóm kho) được chọn, trừ lô có `expiry_date` trước ngày chạy | Bắt buộc |
| BR-MRP-11 | Hàng về theo lịch gồm: (a) đơn đặt `ORDERED`, `PARTIAL` **có ngày giao dự kiến**: số đặt − số đã nhận, vào ngày giao dự kiến; (b) phiếu chuyển `IN_TRANSIT` tới kho đang xét: `issued_quantity`, vào ngày chạy + số ngày chuyển mặc định | Bắt buộc cho (a) khi đã có cột ngày; (b) tùy chọn |
| BR-MRP-12 | Đơn đặt **không có** ngày giao dự kiến: hiện ở cột "đang đặt, chưa rõ ngày", không cộng vào SR | Bắt buộc |
| BR-MRP-13 | Hàng về sau ngày cần không được trừ vào nhu cầu của ngày đó (tự đúng nhờ tính theo từng ngày) | Bắt buộc |
| BR-MRP-14 | Ngày giao dự kiến đã qua mà hàng chưa về: coi là về hôm nay và gắn cảnh báo "đơn trễ" | Bắt buộc |
| BR-MRP-15 | Phiếu nhập `DRAFT` (đang kiểm nhận) không phải tồn; hiện ở cột thông tin | Bắt buộc |
| BR-MRP-16 | Không cộng tồn kho khác vào kho đang xét; tồn kho khác chỉ dùng cho gợi ý chuyển kho | Bắt buộc |
| BR-MRP-17 | Nếu NVL cũng được bán và thiết lập không cho bán hàng tạm giữ: trừ `SalesBookingOps.ReservedQtyAsync` khỏi tồn đầu kỳ | Tùy chọn (Q7) |

**Tránh tính trùng:**
- Hàng đã nhập (phiếu `COMPLETED`) đã nằm trong tồn; "đang đặt" chỉ là phần chưa nhận.
- Phiếu chuyển đã nhận nằm trong tồn kho đích; chỉ phiếu `IN_TRANSIT` mới là hàng đang về.
- Nhu cầu của lệnh dùng `shortage_qty` (đã trừ phần đã xuất), vì phần đã xuất đã ra khỏi tồn.

## 4. Tồn dự phóng và nhu cầu ròng

Tính theo từng NVL, từng kho (hoặc nhóm kho), từng ngày t từ ngày chạy tới hết kỳ:

```
PAB(0)   = Tồn đầu kỳ
Trước(t) = PAB(t−1) + SR(t) − GR(t)
NR(t)    = max(0, SS − Trước(t))
POR(t)   = NR(t)                      (đặt đúng bằng lượng thiếu)
PAB(t)   = Trước(t) + POR(t)
```

| Mã | Quy tắc | Loại |
|---|---|---|
| BR-MRP-18 | Ngày thiếu đầu tiên của NVL là ngày t nhỏ nhất có NR(t) > 0 | Bắt buộc |
| BR-MRP-19 | Kết quả hiện cả hai dòng: tồn dự phóng **nếu không mua thêm** (có thể âm) và tồn dự phóng **sau đề xuất** | Bắt buộc |
| BR-MRP-20 | SS lấy từ `mst_products.min_safe_stock`; rỗng thì bằng 0 | Tùy chọn (Q5); mặc định SS = 0 |
| BR-MRP-21 | Phân bổ cho từng kế hoạch, lệnh: nhu cầu có ngày cần sớm hơn được cấp nguồn trước; cùng ngày thì lệnh trước kế hoạch, rồi theo thời điểm tạo. Dùng để hiện "kế hoạch nào thiếu" | Bắt buộc (Q1) |
| BR-MRP-22 | Phân bổ là số tính ra, không khóa tồn, không chặn xuất kho | Bắt buộc |

## 5. Đề xuất mua

```
Ngày cần hàng về  = t (ngày có NR > 0) − Đệm an toàn
Ngày đặt          = Ngày cần hàng về − LT
```

| Mã | Quy tắc | Loại |
|---|---|---|
| BR-MRP-23 | LT lấy từ thời gian giao của NVL. Chưa khai báo thì không tính ngày đặt, gắn trạng thái "chưa có thời gian giao" | Bắt buộc |
| BR-MRP-24 | Ngày đặt trước hôm nay: trạng thái **Trễ**, kèm ngày sớm nhất hàng có thể về = hôm nay + LT | Bắt buộc |
| BR-MRP-25 | Ngày đặt rơi vào ngày nghỉ thì lùi về ngày làm việc liền trước. Khi chưa cấu hình ngày nghỉ, mọi ngày là ngày làm việc và màn hình ghi rõ điều này | Bắt buộc (cấu hình ngày nghỉ là tùy chọn) |
| BR-MRP-26 | Gộp đề xuất: các POR của cùng NVL có ngày đặt trong cùng một tuần gộp thành một dòng, lấy ngày đặt sớm nhất | Tùy chọn |
| BR-MRP-27 | Số đề xuất làm tròn lên số nguyên khi mở đơn đặt (ô số lượng đơn đặt chỉ nhận số nguyên) | Bắt buộc |
| BR-MRP-28 | MRP không tự tạo, không tự duyệt đơn đặt. Người dùng mở đơn đặt điền sẵn rồi tự lưu | Bắt buộc |
| BR-MRP-29 | NVL ngừng kinh doanh: vẫn tính nhu cầu, không đưa vào đề xuất mua, gắn cảnh báo sửa BOM | Bắt buộc |

## 6. Ví dụ kiểm chứng bằng số

Dữ liệu: hôm nay 16/11/2026. Bàn A 100 cái bắt đầu 20/11 (5 kg gỗ / cái); Ghế B 200 cái bắt đầu 22/11 (2 kg gỗ / cái). Hao hụt 0. Tồn gỗ 300 kg. LT gỗ 3 ngày. Đệm an toàn 0.

Nhu cầu thô: 20/11 = 100 × 5 = **500**; 22/11 = 200 × 2 = **400**. Tổng 900.

### Trường hợp 1: không có đơn đang đặt, SS = 0

| Ngày | GR | SR | Trước | NR = POR | PAB | Ngày đặt |
|---|---|---|---|---|---|---|
| 16–19/11 | 0 | 0 | 300 | 0 | 300 | |
| 20/11 | 500 | 0 | −200 | **200** | 0 | 17/11 |
| 21/11 | 0 | 0 | 0 | 0 | 0 | |
| 22/11 | 400 | 0 | −400 | **400** | 0 | 19/11 |

Tổng đề xuất 600 = 900 − 300. Đúng.

### Trường hợp 2: có đơn 250 kg, ngày giao dự kiến 19/11 (về trước ngày cần)

| Ngày | GR | SR | Trước | NR = POR | PAB | Ngày đặt |
|---|---|---|---|---|---|---|
| 19/11 | 0 | 250 | 550 | 0 | 550 | |
| 20/11 | 500 | 0 | 50 | 0 | 50 | |
| 22/11 | 400 | 0 | −350 | **350** | 0 | 19/11 |

Tổng đề xuất 350 = 900 − 300 − 250. Đúng.

### Trường hợp 3: đơn 250 kg đó giao ngày 21/11 (về sau ngày cần đầu tiên)

| Ngày | GR | SR | Trước | NR = POR | PAB | Ngày đặt |
|---|---|---|---|---|---|---|
| 20/11 | 500 | 0 | −200 | **200** | 0 | 17/11 |
| 21/11 | 0 | 250 | 250 | 0 | 250 | |
| 22/11 | 400 | 0 | −150 | **150** | 0 | 19/11 |

250 kg về ngày 21/11 không cứu được ngày 20/11 (BR-MRP-13), nhưng giảm lượng thiếu ngày 22/11.

### Trường hợp 4: như trường hợp 2, thêm SS = 100

| Ngày | GR | SR | Trước | NR = POR | PAB |
|---|---|---|---|---|---|
| 19/11 | 0 | 250 | 550 | 0 | 550 |
| 20/11 | 500 | 0 | 50 | **50** | 100 |
| 22/11 | 400 | 0 | −300 | **400** | 100 |

Tổng đề xuất 450 = 350 + 100 tồn an toàn. Đúng.

### Phân bổ khi có thêm kế hoạch khác (BR-MRP-21)

Thêm kế hoạch KH-2 cần 250 kg gỗ ngày 19/11, tồn 300, không có đơn đang đặt: KH-2 nhận 250 (đủ); Bàn A nhận 50, thiếu 450; Ghế B thiếu 400. Tổng thiếu 850 = (250 + 900) − 300.

## 7. Quyết định cần chủ dự án xác nhận

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| Q1 | Khi nhiều kế hoạch tranh một NVL, ưu tiên theo gì? | Ngày cần sớm trước; cùng ngày thì lệnh trước kế hoạch |
| Q2 | Kế hoạch chờ duyệt có tính vào nhu cầu không? | Không; có ô chọn để xem thử |
| Q3 | Sản xuất lấy NVL từ kho nào? | Người dùng chọn kho khi chạy MRP |
| Q4 | Thời gian giao tính theo ngày lịch hay ngày làm việc? | Ngày lịch |
| Q5 | Có dùng `min_safe_stock` làm tồn an toàn trong MRP không? | Không ở giai đoạn đầu (SS = 0) |
| Q6 | Hàng đang đặt có tính là nguồn không? | Có, chỉ khi đơn có ngày giao dự kiến |
| Q7 | NVL có được bán không; có trừ hàng tạm giữ của đơn đặt khách không? | Chưa rõ; mặc định không trừ |
| Q8 | Có cần lưu lịch sử các lần chạy MRP không? | Có, hai bảng (file 06) |
| Q9 | Có cần cấu hình ngày nghỉ không? | Chưa; ghi rõ giả định mọi ngày là ngày làm việc |
| Q10 | MRP dùng lại quyền của kế hoạch sản xuất hay là chức năng riêng? | Một mục menu riêng, mặc định cho Manager và Kế toán sản xuất |
| Q11 | MRP thuộc UC nào trong Report 3? | Chưa rõ; nhóm cấp mã trước khi code |
| Q12 | Tín Phát có sản xuất nhiều cấp không? | Chưa rõ; giai đoạn đầu một cấp |
