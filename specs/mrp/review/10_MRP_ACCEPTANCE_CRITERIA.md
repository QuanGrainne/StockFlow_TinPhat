# 10 — Tiêu chí nghiệm thu và kết luận rà soát

## A. Tiêu chí nghiệm thu chức năng

Đánh số theo tám mục tiêu của yêu cầu. "Bắt buộc" là điều kiện để coi MRP đã xong; "Tùy chọn" có thể làm sau.

| # | Mục tiêu | Tiêu chí | Kiểm bằng | Mức |
|---|---|---|---|---|
| AC-01 | Tính nhu cầu NVL từ kế hoạch và BOM | Nhu cầu = số lượng × định mức × (1 + hao hụt), cộng dồn theo NVL trên mọi kế hoạch đã duyệt và lệnh đang mở; không tính trùng phần đã lập lệnh | MRP-T01, T03, T14, T19 | Bắt buộc |
| AC-02 | Nhu cầu theo tháng, tuần, ngày | Xem được tổng nhu cầu từng NVL theo ngày, theo tuần, theo tháng; tổng ba cách xem bằng nhau | MRP-T03 + kiểm tổng | Bắt buộc |
| AC-03 | Tồn tại từng ngày cần | Có bảng tồn dự phóng theo ngày cho từng NVL; khớp tính tay ở file 03 mục 6 | MRP-T04..T07 | Bắt buộc |
| AC-04 | Xét đơn đặt và ngày về | Đơn có ngày giao dự kiến được cộng đúng ngày; đơn về sau ngày cần không che thiếu; đơn không có ngày không được trừ | MRP-T06, T07, T08, T22 | Bắt buộc (sau khi có cột ngày giao) |
| AC-05 | Phát hiện thiếu trước khi sản xuất | Với mỗi NVL thiếu: ngày thiếu đầu tiên, số thiếu, kế hoạch / lệnh bị ảnh hưởng | MRP-T05, T09 | Bắt buộc |
| AC-06 | Tính ngày phải mua | Ngày đặt = ngày cần − thời gian giao; ngày đặt đã qua thì báo Trễ; NVL chưa có thời gian giao thì báo riêng | MRP-T05, T13, T18, T27 | Bắt buộc |
| AC-07 | Đề xuất số lượng mua | Số đề xuất bằng nhu cầu ròng; mở được đơn đặt điền sẵn; hệ thống không tự tạo đơn | MRP-T05, T17, T38 | Bắt buộc |
| AC-08 | Tính lại khi kế hoạch hoặc BOM đổi | Chạy lại cho số mới; lần chạy cũ báo lỗi thời và giữ nguyên số | MRP-T12..T16 | Bắt buộc (phần báo lỗi thời cần lưu lịch sử) |
| AC-09 | Lịch sử | Xem lại được các lần chạy | Tab Lịch sử | Tùy chọn (theo Q8) |
| AC-10 | Tồn an toàn | Đề xuất bù tới mức tồn an toàn | MRP-T17 | Tùy chọn (theo Q5) |
| AC-11 | Nhiều kho | Chạy theo một kho hoặc nhóm kho; gợi ý tồn ở kho khác | MRP-T10 | Bắt buộc cho một kho; nhóm kho tùy chọn |

## B. Tiêu chí kỹ thuật (theo Definition of Done của dự án)

- [ ] `dotnet build StockFlow_Backend/StockFlow.sln` đạt, số cảnh báo không tăng.
- [ ] `npm run lint` không thêm lỗi mới; `npm run build` đạt, chỉ thêm route MRP.
- [ ] Không thêm package; không `any`; không `console.log` sót.
- [ ] Mọi API mới có `[RequirePermission]`; có kiểm quyền kho.
- [ ] MRP không thay đổi tồn kho, không tự tạo hay duyệt chứng từ.
- [ ] Các luồng đang chạy không đổi hành vi: kế hoạch, lệnh, xuất NVL, đơn đặt, nhập hàng, chuyển kho (MRP-T39).
- [ ] Migration lên, xuống, lên lại được; dữ liệu cũ nguyên vẹn.
- [ ] Có mã UC / BR trong Report 3; ca kiểm thử trong Report 5; sơ đồ và ERD đã cập nhật.
- [ ] Người khác đã review; có dòng nhật ký AI.

## C. Kết luận rà soát

### 1. Mức sẵn sàng tổng thể

**Sẵn sàng một phần.** Phần đầu vào về sản xuất đã đủ: kế hoạch có ngày theo dòng, BOM có phiên bản và hao hụt, công thức nhu cầu, nhu cầu còn phải xuất của lệnh, tồn theo kho. Phần về thời gian và nguồn cung chưa có: thời gian giao, ngày giao dự kiến, dự phóng tồn theo ngày, gộp nhiều kế hoạch. Theo file 02: 2 yêu cầu đã có, 12 có một phần, 6 chưa có.

Có thể bắt đầu ngay bộ tính (WP02) vì nó không cần đổi database. Kết quả theo thời gian chỉ tin được sau khi có hai cột mới và người dùng đã nhập dữ liệu vào đó.

### 2. Thành phần dùng lại được

| Thành phần | Vị trí |
|---|---|
| Công thức nhu cầu, chống tràn số | `Domain/Services/ProductionPolicy.cs` |
| Phân rã BOM, cộng dồn theo NVL | `Features/Production/Helpers/ProductionPlanReader.cs` |
| Số đã lập lệnh, thành phẩm thiếu BOM | `Features/Production/Helpers/ProductionPlanRules.cs` |
| Nhu cầu còn phải xuất của lệnh | Bảng `trx_production_material_requirements` |
| Kiểm thiếu NVL theo kho | `Features/Production/Helpers/ProductionOrderRules.cs` (dòng 131–209) |
| Tồn theo kho | `Features/Production/Helpers/ProductionStockOps.cs` |
| Cách tính số đã nhận của đơn đặt | `Features/PurchaseOrders/Helpers/PurchaseOrderHelper.cs` |
| Mẫu "hàng tạm giữ tính động" | `Features/SalesBookings/Common/SalesBookingOps.cs` |
| Mở đơn đặt điền sẵn | Trang đặt hàng nhập, tham số `?products=id:sl&notes=` |
| Phân quyền, quyền kho, mã chứng từ | `RequirePermission`, `RequireFeature`, `ICurrentUserService`, `ITransactionCodeGenerator` |

### 3. Khoảng trống chặn triển khai

1. Chưa có thời gian giao của NVL → không tính được ngày đặt.
2. Chưa có ngày giao dự kiến của đơn đặt → hàng đang đặt không đưa vào dự phóng được.
3. Chưa có phần gom nhu cầu nhiều kế hoạch theo ngày và dự phóng tồn.
4. Chưa có quyết định nghiệp vụ và mã UC / BR trong Report 3.

### 4. Thứ tự triển khai khuyến nghị

Chốt quyết định → WP02 (bộ tính) song song WP01 (dữ liệu) → WP03 (API) song song WP04 (giao diện) → WP05 → WP06. Chi tiết ở file 09.

### 5. Thay đổi database đề xuất

| Mức | Thay đổi |
|---|---|
| Bắt buộc | `mst_products.lead_time_days`; `trx_purchase_orders.expected_date` |
| Nếu chốt lưu lịch sử | `trx_mrp_runs`, `dtl_mrp_run_lines`, sequence mã lần chạy |
| Tùy chọn | Truy vết nhu cầu, ngày nghỉ, hàng – nhà cung cấp, ngày hiệu lực BOM |

### 6. Độ phức tạp và phụ thuộc

Tổng thể mức **trung bình**. Phần khó nhất là đọc nguồn và nhu cầu mà không tính trùng (WP03). Phụ thuộc ngoài nhóm kế hoạch sản xuất: module Hàng hóa và module Đặt hàng nhập phải thêm trường; `StockFlowDbContext` là file dùng chung.

### 7. Câu hỏi cần chủ dự án quyết định

Mười hai câu ở file 03 mục 7. Bốn câu ảnh hưởng thiết kế nhiều nhất:

| # | Câu hỏi | Vì sao quan trọng |
|---|---|---|
| Q11 | MRP thuộc UC nào trong Report 3? | Quy tắc dự án không cho tự thêm UC, bảng, endpoint khi chưa có trong Report 3 |
| Q8 | Có lưu lịch sử lần chạy không? | Quyết định có hai bảng mới hay không |
| Q6 | Hàng đang đặt có tính là nguồn không? | Quyết định có thêm cột ngày giao và sửa module Đặt hàng nhập |
| Q3 | Sản xuất lấy NVL từ kho nào? | Quyết định cách chọn kho khi chạy |

## D. Giới hạn của bản rà soát

- **Đã xác nhận bằng đọc code:** các mục có đường dẫn file ở file 01.
- **Suy ra từ tìm kiếm không thấy:** "chưa có thời gian giao", "chưa có lịch làm việc", "chưa có giữ chỗ NVL cho sản xuất". Phạm vi tìm là `StockFlow.Application` và `StockFlow.Domain`.
- **Chưa làm:** chưa đọc Report 3 bản Google Doc; chưa xem dữ liệu thật trong database; các ví dụ số được tính tay, chưa chạy bằng code vì chưa có code MRP.
- **Không thuộc bản này:** dự báo nhu cầu bằng thống kê từ lịch sử bán hàng. MRP ở đây tính từ kế hoạch sản xuất đã lập.

**Chưa bắt đầu code. Chờ duyệt bản rà soát và xác nhận quy tắc nghiệp vụ.**
