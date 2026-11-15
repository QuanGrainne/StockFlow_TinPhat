# 04 — Danh sách Use Case đề xuất

## 1. Quy ước mã

Report 3 hiện đánh số tới UC-90 và code đã dùng thêm BR-51, BR-52. Mình không biết các số tiếp theo đã được nhóm cấp cho ai, nên dùng mã tạm **UC-PP-xx** và **BR-PP-xx**. Nhóm đổi sang số chính thức khi đưa vào Report 3.

> **Cập nhật 14/11/2026:** Ninh đã chốt sáu Use Case dưới đây cùng các phương án mặc định Q1–Q12 (file 06 mục 3). "Người lập kế hoạch" là Production Accountant hoặc Manager.

## 2. Use Case được chọn

| Mã | Tên | Actor chính | Lý do giữ |
|---|---|---|---|
| UC-PP-01 | Xem kế hoạch sản xuất | Manager, Production Accountant | Danh sách và chi tiết kèm tiến độ (đã lập lệnh, còn lại, đã nhập kho) |
| UC-PP-02 | Lập / sửa kế hoạch sản xuất | Người lập kế hoạch | Nghiệp vụ lõi; gộp tạo và sửa vì cùng form và cùng quy tắc |
| UC-PP-03 | Kiểm tra nhu cầu nguyên vật liệu dự kiến | Người lập kế hoạch, người duyệt | Giá trị chính của kế hoạch; được UC-PP-02 và UC-PP-04 gọi tới |
| UC-PP-04 | Gửi duyệt và phê duyệt / từ chối kế hoạch | Người lập (gửi), Manager (duyệt) | Kiểm soát trước khi tiêu tốn vật tư; ERD đã có cột duyệt |
| UC-PP-05 | Lập lệnh sản xuất từ kế hoạch | Manager | Cầu nối sang Production Execution; mở rộng UC-59 đang có |
| UC-PP-06 | Hủy / đóng kế hoạch | Manager | Kết thúc vòng đời khi không làm tiếp |

Quan hệ giữa các Use Case:

```
UC-PP-02 ──include──► UC-PP-03
UC-PP-04 ──include──► UC-PP-03
UC-PP-05 ──extend───► UC-59 Manage Production Order (đang có)
UC-PP-01 hiển thị kết quả của UC-PP-05 và của Production Execution
```

## 3. Chức năng đã xem xét nhưng không tách thành Use Case riêng

| Chức năng | Quyết định | Lý do |
|---|---|---|
| Xem danh sách và xem chi tiết | Gộp vào UC-PP-01 | Hai bước của cùng một thao tác tra cứu |
| Tạo và chỉnh sửa | Gộp vào UC-PP-02 | Cùng form; khác nhau chỉ ở điều kiện trạng thái |
| Gửi duyệt, phê duyệt, từ chối | Gộp vào UC-PP-04 | Một luồng duyệt, hai actor |
| Kiểm tra khả năng đáp ứng vật tư | Gộp vào UC-PP-03 | Là phần so sánh nhu cầu với tồn của cùng màn hình |
| Theo dõi số đã lập lệnh và còn lại | Gộp vào UC-PP-01 | Là số liệu tính toán hiển thị ở chi tiết kế hoạch, không có thao tác riêng |
| Hủy và đóng kế hoạch | Gộp vào UC-PP-06 | Cùng mục đích kết thúc kế hoạch, khác điều kiện |

## 4. Ranh giới với các Use Case đang có

| Use Case đang có | Không trùng vì |
|---|---|
| UC-57 Manage BOM | Kế hoạch chỉ **đọc** BOM đang áp dụng, không sửa |
| UC-59 Manage Production Order | Kế hoạch không tạo, sửa, hủy lệnh. UC-PP-05 chỉ mở form lập lệnh có sẵn với dữ liệu điền trước và gắn mã kế hoạch |
| UC-45 View Material Requirement & Issue Status | UC-45 là nhu cầu **của lệnh** và số đã xuất. UC-PP-03 là nhu cầu **dự kiến của kế hoạch**, chưa có phiếu xuất |
| UC-46 – UC-50 Xuất vật tư, nhập thành phẩm | Kế hoạch không đổi tồn kho |
| UC-60, UC-61 Theo dõi vật tư và thành phẩm | Theo dõi ở mức lệnh. UC-PP-01 tổng hợp ở mức kế hoạch |

## 5. Phạm vi không đưa vào

Dự báo nhu cầu, lập lịch theo năng lực, tự sinh lệnh khi duyệt, tự sinh đơn mua vật tư, duyệt nhiều cấp, liên kết kế hoạch với đơn đặt hàng của khách. Lý do ở file 03 mục 3.

## 6. Điều kiện để triển khai

| Use Case | Triển khai được với ERD hiện tại? |
|---|---|
| UC-PP-01 | Được, nếu chốt "mỗi sản phẩm một dòng trong một kế hoạch". Nếu không, cần đổi ERD (file 07) |
| UC-PP-02 | Được. Cần thêm sequence mã kế hoạch |
| UC-PP-03 | Được, tái sử dụng phần tính nhu cầu đang có |
| UC-PP-04 | Được ở mức tối thiểu. Lý do từ chối phải ghi vào `notes` |
| UC-PP-05 | Được ở mức đầu phiếu. Cần sửa lệnh tạo lệnh để nhận và gán mã kế hoạch |
| UC-PP-06 | Được |
