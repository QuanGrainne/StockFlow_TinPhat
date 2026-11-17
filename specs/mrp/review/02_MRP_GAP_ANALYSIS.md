# 02 — Phân tích khoảng trống (Phase 2)

Phân loại dựa trên logic nghiệp vụ đã đọc trong code (file 01), không dựa trên việc bảng có tồn tại hay không.

- **EXISTING:** đã có, dùng lại được.
- **PARTIAL:** có nhưng phải bổ sung.
- **MISSING:** chưa có.
- **UNKNOWN:** không xác nhận được.

| No. | Yêu cầu | Hiện có | Còn thiếu | Ảnh hưởng | Khuyến nghị | Phân loại |
|---|---|---|---|---|---|---|
| 1 | Có BOM cho thành phẩm | BOM đầu + dòng, định mức, hao hụt; kiểm BOM khi gửi duyệt, duyệt, lập lệnh | — | — | Dùng lại `ProductionPlanRules.ProductsWithoutActiveBomAsync` | EXISTING |
| 2 | Phiên bản và ngày hiệu lực BOM | Có phiên bản, một bản đang áp dụng | Ngày hiệu lực | Không tính được "BOM nào áp dụng vào ngày X"; MRP luôn dùng bản đang áp dụng lúc chạy | Giữ cách hiện tại; ghi phiên bản BOM đã dùng vào kết quả MRP. Ngày hiệu lực là tùy chọn | PARTIAL |
| 3 | Duyệt kế hoạch | Đủ vòng đời, phân quyền người lập / người duyệt | — | — | MRP chỉ lấy kế hoạch `APPROVED` (và tùy chọn `PENDING_APPROVAL`) | EXISTING |
| 4 | Lịch sản xuất theo ngày | Ngày bắt đầu, kết thúc theo dòng kế hoạch | Sản lượng từng ngày, ca, công đoạn | Không biết ngày nào dùng bao nhiêu NVL trong một dòng dài ngày | Giai đoạn đầu: toàn bộ NVL của dòng cần vào ngày bắt đầu. Chia theo ngày là tùy chọn | PARTIAL |
| 5 | Tính nhu cầu thô | Một kế hoạch: `MaterialRequirementsAsync`, cộng dồn theo NVL, tách tổng và phần chưa lập lệnh | Gộp nhiều kế hoạch; gắn ngày cần | Mỗi kế hoạch thấy riêng, không thấy tổng theo thời gian | Viết phần gom mới dùng lại công thức `ProductionPolicy.CalculateRequirement` | PARTIAL |
| 6 | Tồn khả dụng | Tồn hiện có theo kho | Trừ lô hết hạn; trừ hàng tạm giữ của đơn đặt (nếu NVL cũng được bán) | Có thể tính thừa tồn | Định nghĩa "tồn dùng được" trong MRP (file 03, BR-MRP-04) | PARTIAL |
| 7 | Giữ chỗ / phân bổ NVL | Chỉ có hàng tạm giữ tính động cho đơn đặt bán hàng | Phân bổ NVL cho kế hoạch, lệnh | Nhiều kế hoạch cùng tính trên một lượng tồn | Phân bổ tính động theo ngày cần, cùng kiểu với `ReservedQtyAsync`; không khóa tồn | MISSING |
| 8 | Hàng đang đặt mua | Trạng thái đơn, số đặt, số đã nhận (tính động) | Hàm trả số còn chờ theo NVL và kho | Chưa lấy được nguồn sắp về | Viết hàm đọc dùng chung, theo cách `RecalculateStatusAsync` đang tính | PARTIAL |
| 9 | Ngày giao dự kiến | Không có | Cột ngày trên đơn đặt | **Chặn** việc tính hàng đang đặt theo thời gian | Thêm cột; Report 3 đã yêu cầu trường này (FR-PUR-02) | MISSING |
| 10 | Thời gian giao của nhà cung cấp | Không có | Số ngày giao theo NVL | **Chặn** việc tính ngày phải đặt hàng | Thêm một cột trên hàng hóa | MISSING |
| 11 | Tồn an toàn | Cột `min_safe_stock` có và nhập được | Chưa phép tính nào dùng | Không có lượng dự phòng trong đề xuất mua | Dùng cột có sẵn, theo quyết định Q5 (file 03) | PARTIAL |
| 12 | Quy đổi đơn vị | BOM và đơn mua đều theo đơn vị cơ sở; bảng quy đổi có nhưng không dùng | — | Không ảnh hưởng nếu mọi thứ theo đơn vị cơ sở | MRP tính theo đơn vị cơ sở; không cần quy đổi | PARTIAL |
| 13 | Tồn nhiều kho | Số dư theo kho; quyền kho | Kho NVL của kế hoạch | Không biết kế hoạch lấy NVL kho nào | Người dùng chọn kho hoặc nhóm kho khi chạy MRP | PARTIAL |
| 14 | Phát hiện thiếu NVL | Theo một kế hoạch; theo một lệnh (kèm xác nhận) | Thiếu theo ngày, sau khi gộp mọi nhu cầu | Thiếu bị phát hiện muộn hoặc bị che | Phần lõi của MRP | PARTIAL |
| 15 | Dự phóng tồn theo ngày | Không có | Toàn bộ | Không biết ngày nào tồn âm | Phần lõi của MRP | MISSING |
| 16 | Nhu cầu NVL theo tháng | Không có | Gom theo tháng, tuần | Không có số để lên ngân sách mua | Gom từ kết quả theo ngày | MISSING |
| 17 | Đề xuất mua | Điền sẵn đơn đặt từ danh sách NVL (`?products=id:sl`) | Số lượng và ngày đặt do hệ thống tính | Người dùng tự tính | Tính trong MRP, mở đơn đặt bằng cơ chế điền sẵn đang có | PARTIAL |
| 18 | Tính lại MRP | Nhu cầu kế hoạch tính lại mỗi lần xem | Chạy lại toàn bộ; báo kết quả cũ đã lỗi thời | — | Mỗi lần chạy là một bản mới; so `updated_at` của kế hoạch để báo lỗi thời | PARTIAL |
| 19 | Lịch sử và truy vết MRP | Không có | Lưu lần chạy và kết quả | Không xem lại được "lúc đó thiếu gì" | Hai bảng lần chạy (file 06) | MISSING |
| 20 | Phân quyền | Có cơ chế quyền, chức năng, quyền kho | Chức năng riêng cho MRP (nếu cần) | — | Dùng lại chức năng kế hoạch, hoặc thêm một mục menu | PARTIAL |

## Tổng hợp

| Phân loại | Số yêu cầu |
|---|---|
| EXISTING | 2 |
| PARTIAL | 12 |
| MISSING | 6 |
| UNKNOWN | 0 (các điểm chưa rõ về nghiệp vụ nằm ở file 01 mục H) |

## Khoảng trống chặn việc triển khai

1. **Thời gian giao của NVL (số 10):** không có thì không ra ngày phải đặt hàng.
2. **Ngày giao dự kiến của đơn đặt (số 9):** không có thì hàng đang đặt chỉ hiện làm thông tin, không trừ vào thiếu.
3. **Gom nhu cầu nhiều kế hoạch theo ngày và dự phóng tồn (số 5, 14, 15):** chưa có code, là phần lõi phải viết.
4. **Quyết định nghiệp vụ:** phạm vi trong Report 3, kho NVL, có tính kế hoạch chờ duyệt không (file 03 mục 7).
