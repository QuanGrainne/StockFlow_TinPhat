# 07 — Phân tích khoảng trống ERD

Tài liệu này chỉ **nêu khoảng trống và khuyến nghị**. Không có thay đổi ERD, migration hay code nào được thực hiện. Mọi thay đổi cần chủ dự án quyết định.

> **Cập nhật 14/11/2026:** Ninh đã chốt **phương án A** (mỗi thành phẩm một dòng trong một kế hoạch, Q3) và ghi lý do từ chối/hủy vào `notes`. Thay đổi database duy nhất cần có khi triển khai là sequence sinh mã kế hoạch. Chưa có thay đổi nào được thực hiện.

## 1. Kết luận ngắn

ERD hiện tại **đủ** để triển khai sáu Use Case đề xuất **với điều kiện** mỗi thành phẩm chỉ có một dòng trong một kế hoạch (Q3, file 06). Khi đó không cần đổi cấu trúc bảng; chỉ cần thêm sequence sinh mã kế hoạch.

Nếu nhóm muốn một thành phẩm có nhiều dòng (nhiều đợt) trong một kế hoạch, ERD **thiếu** liên kết từ lệnh tới dòng kế hoạch và cần bổ sung một cột.

## 2. Khoảng trống chính: lệnh không liên kết tới dòng kế hoạch

**Hiện trạng**

- `trx_production_orders.production_plan_id` liên kết lệnh với **đầu** kế hoạch.
- Không có `production_plan_item_id` ở `trx_production_orders` hay `dtl_production_order_items`.
- Một lệnh chứa nhiều thành phẩm (`dtl_production_order_items`), mỗi thành phẩm một dòng.

**Hệ quả**

Số đã lập lệnh chỉ tính được theo cặp (kế hoạch, sản phẩm). Ví dụ kế hoạch có hai dòng cùng sản phẩm A: đợt 1 là 60, đợt 2 là 40. Một lệnh 50 A thuộc kế hoạch này không cho biết nó phục vụ đợt nào, nên không tính được số còn lại của từng đợt.

### Các phương án

| | Phương án A — Không đổi ERD | Phương án B — Thêm cột ở dòng lệnh | Phương án C — Thêm cột ở đầu lệnh |
|---|---|---|---|
| Nội dung | Thêm quy tắc nghiệp vụ: mỗi thành phẩm một dòng trong một kế hoạch (kiểm trong validator) | Thêm `production_plan_item_id` (cho phép rỗng) vào `dtl_production_order_items`, khóa ngoại tới `dtl_production_plan_items` | Thêm `production_plan_item_id` (cho phép rỗng) vào `trx_production_orders` |
| Thay đổi database | Không | Một cột, một khóa ngoại, một chỉ mục | Một cột, một khóa ngoại, một chỉ mục |
| Tính số còn lại | Theo (kế hoạch, sản phẩm); chính xác vì mỗi sản phẩm một dòng | Theo từng dòng kế hoạch; chính xác trong mọi trường hợp | Chỉ đúng khi lệnh có một thành phẩm |
| Chia đợt trong kế hoạch | Không; chia bằng nhiều lệnh, mỗi lệnh có hạn riêng | Có | Có, nhưng mỗi lệnh chỉ phục vụ một dòng |
| Khớp với lệnh nhiều thành phẩm | Có | Có | **Không**: một lệnh nhiều thành phẩm không gắn được với nhiều dòng kế hoạch |
| Ảnh hưởng code đang chạy | Không | Nhỏ: cột rỗng với lệnh cũ; lệnh tạo lệnh cần gán thêm | Tương tự B nhưng mâu thuẫn mô hình |
| Rủi ro | Kế hoạch kém linh hoạt nếu nhà máy thật sự lập theo đợt | Có thể lệch giữa `production_plan_id` ở đầu lệnh và kế hoạch của dòng; cần kiểm tra nhất quán khi lưu | Mô hình sai với cấu trúc lệnh hiện tại |

**Khuyến nghị:** bắt đầu bằng **phương án A**. Nó không đổi database, khớp với quy tắc "một lệnh không có hai dòng cùng thành phẩm" đang có, và đủ cho quy mô StockFlow. Chọn **phương án B** nếu chủ dự án xác nhận cần lập kế hoạch theo đợt. **Không khuyến nghị phương án C** vì lệnh hiện là chứng từ nhiều thành phẩm.

Chuyển từ A sang B về sau vẫn làm được: cột mới cho phép rỗng, dữ liệu cũ điền lại được theo (kế hoạch, sản phẩm) vì khi đó mỗi sản phẩm chỉ có một dòng.

## 3. Các khoảng trống khác

| # | Khoảng trống | Ảnh hưởng tới Use Case | Cách xử lý không đổi ERD | Nếu đổi ERD | Mức cần thiết |
|---|---|---|---|---|---|
| G2 | Không có cột lý do từ chối, lý do hủy | UC-PP-04, UC-PP-06 | Nối lý do vào `notes` (500 ký tự) | Thêm `rejection_reason`, `cancel_reason` | Trung bình. `notes` dùng chung dễ bị ghi đè |
| G2 | Không có người và thời điểm gửi duyệt | UC-PP-04 | Không lưu | Thêm `submitted_by`, `submitted_at` | Thấp |
| G3 | Không có `updated_at`, `updated_by` | UC-PP-02 khi sửa kế hoạch đã duyệt | Không lưu vết | Thêm hai cột | Thấp đến trung bình, tùy câu trả lời Q5 |
| G6 | Chưa có sequence và tiền tố mã kế hoạch | UC-PP-02 | **Không có**: bắt buộc bổ sung khi triển khai | Thêm sequence (ví dụ `seq_production_plan_code`) bằng migration; tiền tố theo quy ước của nhóm | **Bắt buộc** khi làm API tạo kế hoạch |
| G5 | Không có CHECK cho số lượng và ngày | UC-PP-02 | Kiểm trong FluentValidation, như các module khác | — | Không cần đổi |
| G4 | `status` không ràng buộc giá trị | Mọi UC | Hằng `ProductionPlanStatus` trong Domain, như `ProductionOrderStatus` | — | Không cần đổi |
| G8 | Không lưu kho vật tư và nhu cầu vật tư của kế hoạch | UC-PP-03 | Người dùng chọn kho khi xem; tính lại mỗi lần | Bảng nhu cầu vật tư của kế hoạch | Không khuyến nghị: tăng độ phức tạp, số liệu dễ lệch khi BOM đổi |
| G7 | Không liên kết với đơn đặt hàng | Ngoài phạm vi | — | Bảng liên kết kế hoạch – đơn hàng | Không cần, trừ khi Q11 được chọn |
| G9 | Không có năng lực sản xuất | Ngoài phạm vi | — | — | Không cần |
| G10 | Lệnh sản xuất không có cột kho nhận | UC-PP-05: kho nhận ở dòng kế hoạch không truyền được xuống lệnh | Dùng làm gợi ý trên màn nhập thành phẩm, tra ngược qua `production_plan_id` và sản phẩm | Thêm kho nhận vào dòng lệnh | Thấp |

## 4. Điểm ngoài cấu trúc bảng cần lưu ý

1. **Tài liệu ERD lệch với database thật.** `database/stockflow.sql` và file PlantUML chưa có `trx_production_plans`, `dtl_production_plan_items`, `dtl_production_order_items`. Nên cập nhật khi nhóm chốt thiết kế. Việc này nằm ngoài phạm vi phân tích nên chưa làm.
2. **Mã chức năng `feat-prod-plan` đang mang nghĩa "Lập lệnh sản xuất".** Kế hoạch sản xuất cần mã chức năng riêng; đặt tên thế nào và có đổi tên mã cũ hay không là quyết định của nhóm vì ảnh hưởng dữ liệu phân quyền đã lưu.
3. **Quyền duyệt.** Bộ mã quyền hiện có `PROD_APPROVE`. Có dùng lại cho duyệt kế hoạch hay tách mã riêng tùy câu trả lời Q1 và Q2.

## 5. Tổng hợp thay đổi tối thiểu theo từng lựa chọn

| Lựa chọn của chủ dự án | Thay đổi database cần có |
|---|---|
| Mỗi thành phẩm một dòng (mặc định), lý do ghi vào `notes` | Chỉ thêm sequence mã kế hoạch |
| Như trên, muốn lưu lý do từ chối và hủy riêng | Thêm sequence + 1 đến 2 cột ở `trx_production_plans` |
| Cho phép nhiều đợt cùng thành phẩm | Thêm sequence + cột `production_plan_item_id` ở `dtl_production_order_items` |
