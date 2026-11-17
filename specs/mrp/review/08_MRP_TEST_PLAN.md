# 08 — Kế hoạch kiểm thử (Phase 6)

Repo chưa có project test tự động. Kế hoạch sản xuất đang dùng console harness (`specs/production-planning-implementation/unit-tests`) và script PowerShell gọi API thật trên database tạm (`api-tests`). MRP theo cùng cách cho tới khi nhóm duyệt thêm package test.

Dữ liệu chung của các ca (trừ khi ghi khác): hôm nay 16/11/2026; kho K; Bàn A cần 5 kg gỗ / cái; Ghế B cần 2 kg gỗ / cái; hao hụt 0; thời gian giao của gỗ 3 ngày; tồn an toàn 0.

## 1. Kịch bản theo yêu cầu

| ID | Kịch bản | Điều kiện trước | Dữ liệu vào | Kết quả mong đợi | Quy tắc | Ưu tiên |
|---|---|---|---|---|---|---|
| MRP-T01 | Kế hoạch có BOM hợp lệ | KH-1 đã duyệt: Bàn A 100 cái, bắt đầu 20/11. Tồn gỗ 0 | Chạy MRP tới 30/11, kho K | Nhu cầu gỗ ngày 20/11 = 500 | BR-MRP-01, 03 | Cao |
| MRP-T02 | Kế hoạch có thành phẩm thiếu BOM | KH-1 có Bàn A (có BOM) và sản phẩm X (BOM bị ngừng sau khi duyệt) | Chạy MRP | Tính đủ cho Bàn A; X nằm trong danh sách thiếu BOM; không lỗi | BR-MRP-05 | Cao |
| MRP-T03 | Nhiều kế hoạch dùng chung NVL | KH-1: Bàn A 100 ngày 20/11; KH-2: Ghế B 200 ngày 20/11 | Chạy MRP | Nhu cầu gỗ ngày 20/11 = 900 (cộng dồn) | BR-MRP-04 | Cao |
| MRP-T04 | Đủ tồn | Như T01, tồn gỗ 600 | Chạy MRP | Không thiếu; tồn dự phóng ngày 20/11 = 100; không có đề xuất | Mục 4 file 03 | Cao |
| MRP-T05 | Thiếu tồn | Như T01, tồn gỗ 300 | Chạy MRP | Thiếu 200 ngày 20/11; đề xuất 200, ngày đặt 17/11 | BR-MRP-18, 23 | Cao |
| MRP-T06 | Đơn đặt về trước ngày cần | Bàn A 100 ngày 20/11, Ghế B 200 ngày 22/11; tồn 300; đơn đặt 250 kg, ngày giao 19/11, trạng thái `ORDERED` | Chạy MRP | Ngày 20/11 không thiếu (tồn 50); ngày 22/11 thiếu 350, ngày đặt 19/11 | BR-MRP-11 | Cao |
| MRP-T07 | Đơn đặt về sau ngày cần | Như T06 nhưng ngày giao 21/11 | Chạy MRP | Ngày 20/11 thiếu 200 (đặt 17/11); ngày 22/11 thiếu 150 (đặt 19/11) | BR-MRP-13 | Cao |
| MRP-T08 | Nhận hàng từng phần | Như T06; đã hoàn thành phiếu nhập 100 kg của đơn đó (đơn `PARTIAL`) | Chạy MRP | Tồn 400; hàng về theo lịch còn 150; không tính 100 kg hai lần; ngày 22/11 thiếu 350 | BR-MRP-11 (tránh trùng) | Cao |
| MRP-T09 | NVL đã được cấp cho kế hoạch khác | KH-2 cần 250 kg ngày 19/11; Bàn A 100 ngày 20/11; Ghế B 200 ngày 22/11; tồn 300 | Chạy MRP | KH-2 đủ; Bàn A thiếu 450; Ghế B thiếu 400; tổng thiếu 850 | BR-MRP-21 | Cao |
| MRP-T10 | Nhiều kho | Tồn gỗ kho K 100, kho L 500; kế hoạch cần 500 ngày 20/11 | (a) Chạy với kho K; (b) chạy với nhóm K + L | (a) Thiếu 400; kho L hiện ở gợi ý chuyển kho. (b) Không thiếu | BR-MRP-16 | Trung bình |
| MRP-T11 | Khác đơn vị tính | BOM dùng đơn vị cơ sở (kg); hàng hóa có khai báo quy đổi bao = 50 kg | Chạy MRP | Mọi số theo kg; bảng quy đổi không ảnh hưởng kết quả | Mục 1 file 03 | Thấp |
| MRP-T12 | Đổi số lượng sau khi chạy | Đã chạy MRP (T05). Manager sửa Bàn A từ 100 lên 150 | Mở lại lần chạy cũ; rồi chạy lại | Lần cũ báo lỗi thời, số cũ giữ nguyên. Lần mới: nhu cầu 750, thiếu 450 | File 04 mục 3 | Cao |
| MRP-T13 | Đổi ngày sau khi chạy | Đã chạy MRP (T05). Dời Bàn A từ 20/11 lên 18/11 | Chạy lại | Thiếu 200 ngày 18/11; ngày đặt 15/11 đã qua → trạng thái Trễ, ngày sớm nhất hàng về 19/11 | BR-MRP-24 | Cao |
| MRP-T14 | Đổi phiên bản BOM | KH-1 Bàn A 100, đã lập lệnh 40. Kích hoạt BOM v2: 6 kg gỗ / cái | Chạy MRP | Phần chưa lập lệnh: 60 × 6 = 360. Phần lệnh: giữ nhu cầu đã chụp 40 × 5 = 200. Tổng 560 | BR-MRP-02, 06 | Cao |
| MRP-T15 | Hủy kế hoạch | Đã chạy MRP (T05). Hủy KH-1 (chưa có lệnh) | Chạy lại | Không còn nhu cầu từ KH-1; lần cũ báo lỗi thời | BR-MRP-02 | Cao |
| MRP-T16 | Hủy đơn đặt | Như T06; sau đó hủy đơn đặt 250 kg | Chạy lại | Hàng về theo lịch = 0; ngày 20/11 thiếu 200; ngày 22/11 thiếu 400 | BR-MRP-11 | Cao |
| MRP-T17 | Không đạt tồn an toàn | Như T06, tồn an toàn của gỗ 100 (nếu bật Q5) | Chạy MRP | Ngày 20/11 đề xuất 50; ngày 22/11 đề xuất 400; tổng 450 | BR-MRP-20 | Trung bình |
| MRP-T18 | Đổi thời gian giao | Như T05; đổi thời gian giao của gỗ từ 3 thành 5 ngày | Chạy lại | Số đề xuất không đổi (200); ngày đặt 15/11 → Trễ | BR-MRP-23, 24 | Trung bình |

Các con số trên khớp với ví dụ ở file 03 mục 6.

## 2. Kịch bản bổ sung

| ID | Kịch bản | Kết quả mong đợi | Ưu tiên |
|---|---|---|---|
| MRP-T19 | Lập lệnh một phần từ kế hoạch | Tổng nhu cầu NVL trước và sau khi lập lệnh bằng nhau | Cao |
| MRP-T20 | Xuất NVL cho lệnh | Tồn và nhu cầu cùng giảm; lượng thiếu không đổi | Cao |
| MRP-T21 | Hủy lệnh thuộc kế hoạch | Nhu cầu trở về phần kế hoạch; tổng không đổi | Cao |
| MRP-T22 | Đơn đặt không có ngày giao | Hiện ở "đang đặt, chưa rõ ngày"; không trừ vào thiếu | Cao |
| MRP-T23 | Đơn đặt quá ngày giao mà chưa về | Tính là về hôm nay, có cảnh báo đơn trễ | Trung bình |
| MRP-T24 | Phiếu nhập `DRAFT` | Không tính vào tồn | Cao |
| MRP-T25 | Phiếu chuyển `IN_TRANSIT` tới kho đang xét | Tính là hàng đang về; sau khi nhận thì nằm trong tồn, không tính hai lần | Trung bình |
| MRP-T26 | Lô hết hạn | Không tính vào tồn đầu kỳ | Trung bình |
| MRP-T27 | NVL chưa có thời gian giao | Có số thiếu, không có ngày đặt, trạng thái riêng | Cao |
| MRP-T28 | NVL ngừng kinh doanh | Có nhu cầu, không có trong đề xuất mua, có cảnh báo | Trung bình |
| MRP-T29 | Kế hoạch chờ duyệt | Mặc định không tính; bật ô chọn thì tính | Trung bình |
| MRP-T30 | Kế hoạch Nháp, Bị từ chối, Đã đóng, Đã hủy | Không tính | Cao |
| MRP-T31 | Người dùng không có quyền kho | Bị từ chối | Cao |
| MRP-T32 | Vai trò không có chức năng MRP | 403 | Cao |
| MRP-T33 | `periodEnd` trước hôm nay, hoặc quá 366 ngày | 400 `VALIDATION_FAILED` | Trung bình |
| MRP-T34 | Không có kế hoạch nào trong kỳ | Lần chạy rỗng, không lỗi | Trung bình |
| MRP-T35 | Hai người chạy cùng lúc | Hai lần chạy riêng, mã khác nhau, kết quả giống nhau | Trung bình |
| MRP-T36 | Lỗi khi đang lưu lần chạy | Không còn lại bản ghi dở | Trung bình |
| MRP-T37 | Số lượng rất lớn | Trả lỗi rõ, không lỗi 500 | Trung bình |
| MRP-T38 | Mở đơn đặt từ đề xuất 252,5 | Đơn đặt điền sẵn 253 | Trung bình |
| MRP-T39 | Hồi quy | Lập, duyệt kế hoạch; lập lệnh; xuất NVL; duyệt hoàn thành; đơn đặt; nhập hàng; chuyển kho vẫn chạy như trước | Cao |

## 3. Phân tầng

| Tầng | Phạm vi | Ca |
|---|---|---|
| Unit (`MrpPolicy`) | Tồn dự phóng, nhu cầu ròng, phân bổ, ngày đặt, gom tháng / tuần | T04–T07, T09, T13, T17, T18, T27 và bốn trường hợp ở file 03 mục 6 |
| Tích hợp (handler + database tạm) | Đọc nhu cầu, đọc nguồn, tránh tính trùng, lưu lần chạy | T01–T03, T08, T10, T14–T16, T19–T26, T36 |
| API | Quyền, validation, định dạng phản hồi | T31–T35, T37 |
| Hệ thống (giao diện) | Chạy MRP → xem thiếu → mở đơn đặt → nhập hàng → chạy lại hết thiếu | T12, T38, T39 |

Quy tắc chạy thử: dùng database tạm, không dùng `stockflow_dev`; ngày trong dữ liệu thử đặt theo "hôm nay + N" để không hỏng khi qua ngày.
