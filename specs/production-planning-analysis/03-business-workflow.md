# 03 — Quy trình nghiệp vụ lập kế hoạch sản xuất

Tài liệu này là **đề xuất từ phân tích**. Các điểm đánh dấu **[Cần xác nhận]** được gom ở cuối file 06.

> **Cập nhật 14/11/2026:** Ninh đã chốt phương án mặc định cho mọi điểm [Cần xác nhận] (file 06 mục 3). Đọc các đề xuất mặc định dưới đây là nghiệp vụ áp dụng.

## 1. Quy trình đề xuất từ đầu đến cuối

```
1. Lập kế hoạch (Nháp)
   Chọn kỳ, thêm các thành phẩm, số lượng, thời gian, kho nhận
        │
2. Kiểm tra nhu cầu vật tư dự kiến
   Hệ thống tính từ BOM đang áp dụng, so với tồn kho, cảnh báo thiếu
        │
3. Gửi duyệt ──► 4. Manager duyệt hoặc từ chối
                        │ duyệt
5. Lập lệnh sản xuất từ kế hoạch (toàn bộ hoặc một phần số lượng)
   Lệnh mang mã kế hoạch; phần còn lại vẫn nằm trên kế hoạch
        │
6. Thực hiện lệnh (đã có sẵn): xuất vật tư → sản xuất → nhập thành phẩm
        │
7. Theo dõi kế hoạch: đã lập lệnh, còn lại, đã nhập kho
        │
8. Đóng kế hoạch khi đã lập đủ lệnh và các lệnh kết thúc, hoặc hủy phần chưa làm
```

Bước 6 là phần Production Execution đang có. Kế hoạch chỉ đứng trước nó và không thay đổi cách lệnh vận hành.

## 2. Phân tích 12 câu hỏi nghiệp vụ

| # | Câu hỏi | Phương án đề xuất | Lý do | Dữ liệu dùng | ERD hỗ trợ? | Điều chỉnh tối thiểu |
|---|---|---|---|---|---|---|
| 1 | Lập kế hoạch dựa trên yếu tố nào | Người lập tự quyết định số lượng. Hệ thống **hiển thị để tham khảo**: tồn thành phẩm, số khách đang đặt, tồn vật tư. Không tự đề xuất số lượng | StockFlow không có dự báo nhu cầu hay năng lực máy. Tự động hóa ở đây vượt quy mô dự án | `trx_inventory_balances`, đơn đặt hàng còn mở, BOM | Có cho phần tham khảo. Không có năng lực sản xuất | Không cần đổi ERD. Năng lực sản xuất để ngoài phạm vi |
| 2 | Một kế hoạch chứa nhiều sản phẩm | Có | Đúng với cách lập kế hoạch theo kỳ | `dtl_production_plan_items` | Có | — |
| 3 | Một sản phẩm chia nhiều đợt | **[Cần xác nhận]** Đề xuất mặc định: **mỗi sản phẩm một dòng trong một kế hoạch**; chia đợt thực hiện bằng cách lập nhiều lệnh từ dòng đó | Đơn giản, khớp với quy tắc "một lệnh không có hai dòng cùng sản phẩm", và tính được số còn lại mà không đổi ERD | Dòng kế hoạch, dòng lệnh | Có, nếu thêm quy tắc không trùng sản phẩm. Nếu cho nhiều dòng cùng sản phẩm thì thiếu liên kết dòng | Phương án A ở file 07 |
| 4 | Một kế hoạch tạo nhiều lệnh | Có | Sản xuất thường chia theo tuần hoặc theo xưởng | `trx_production_orders.production_plan_id` | Có | — |
| 5 | Lập lệnh theo một phần số lượng | Có | Hỗ trợ sản xuất cuốn chiếu, thiếu vật tư thì làm trước một phần | Số kế hoạch, số đã lập lệnh | Có (theo sản phẩm) | — |
| 6 | Kế hoạch 100, mới lập lệnh 60 | Số còn lại 40 được **tính**, không lưu: 100 − tổng số trên các lệnh chưa hủy của kế hoạch cho sản phẩm đó. Hiển thị ở chi tiết kế hoạch và chặn lập vượt | Tránh lưu số trùng lặp dễ lệch | Dòng kế hoạch, dòng lệnh, trạng thái lệnh | Có, với điều kiện ở câu 3 | — |
| 7 | Đổi số lượng sau khi đã có lệnh | Cho sửa kế hoạch đã duyệt ở mức hạn chế: số mới **không thấp hơn số đã lập lệnh**; không xóa dòng đã có lệnh. Tăng số lượng **[Cần xác nhận]** có phải duyệt lại không | Giữ cho số còn lại không âm; lệnh đã lập không bị mồ côi | Như câu 6 | Có | Nếu cần lưu vết thay đổi thì thiếu `updated_at`, `updated_by` |
| 8 | Từ chối hoặc hủy khi đã có lệnh | Từ chối chỉ xảy ra trước khi duyệt nên chưa thể có lệnh. Hủy kế hoạch đã duyệt: **chỉ khi không còn lệnh đang mở**; lệnh đã hoàn thành vẫn giữ liên kết. Kế hoạch còn lệnh đang chạy thì dùng "Đóng kế hoạch" để bỏ phần chưa lập lệnh | Không hủy dây chuyền các lệnh đang sản xuất; mỗi lệnh có quy tắc hủy riêng (chỉ hủy khi chưa xuất vật tư) | Trạng thái lệnh | Có | — |
| 9 | Kiểm tra BOM khi lập kế hoạch | Có. Thành phẩm chưa có BOM đang áp dụng: cho lưu nháp kèm cảnh báo, **không cho gửi duyệt** | Lập lệnh bắt buộc có BOM, nên chặn sớm để kế hoạch duyệt xong là lập lệnh được | `mst_boms.is_active` | Có | — |
| 10 | Tính tổng vật tư dự kiến | Có, tính khi xem, không lưu | Là giá trị chính của việc lập kế hoạch trước; công thức đã có | BOM, `ProductionPolicy` | Có | — |
| 11 | Cảnh báo thiếu vật tư trước khi duyệt | Có, **chỉ cảnh báo, không chặn**. Người duyệt thấy danh sách vật tư thiếu | Thiếu vật tư lúc lập kế hoạch là bình thường vì còn thời gian mua; chặn sẽ làm kế hoạch vô dụng | Tồn vật tư theo kho được phân quyền | Có. Không biết kho vật tư nào áp dụng cho kế hoạch | Cho người dùng chọn kho khi xem, giống màn lập lệnh; không cần cột mới |
| 12 | Chọn kho nhận thành phẩm theo dòng | Có, tùy chọn. Khi lập lệnh từ kế hoạch, kho này là gợi ý cho phiếu nhập thành phẩm | Cột đã có và cho phép rỗng | `dtl_production_plan_items.warehouse_id` | Có một phần: lệnh sản xuất không có cột kho, kho chỉ chọn lúc nhập thành phẩm | Không đổi ERD; dùng làm giá trị gợi ý |

## 3. Những gì đề xuất **không** đưa vào StockFlow

- Dự báo nhu cầu và tự đề xuất số lượng sản xuất.
- Lập lịch theo năng lực máy, ca, xưởng.
- Tự sinh lệnh sản xuất khi kế hoạch được duyệt.
- Tự sinh đơn mua vật tư từ kế hoạch.
- Duyệt nhiều cấp.

Lý do chung: ERD không có dữ liệu cho các phần này và chúng vượt quy mô của hệ thống.
