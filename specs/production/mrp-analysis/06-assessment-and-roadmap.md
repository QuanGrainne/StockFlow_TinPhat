# 06 — Đánh giá và kế hoạch triển khai (Phần 10)

## 1. Đánh giá hiện trạng

StockFlow đã có khoảng một nửa nền của MRP: kế hoạch sản xuất có ngày theo dòng, BOM có phiên bản và hao hụt, công thức nhu cầu, cộng dồn NVL theo kế hoạch, so tồn theo kho. Phần còn thiếu tập trung ở ba chỗ: **thời gian** (lead time, ngày hàng về, lịch làm việc), **gộp nhiều kế hoạch** (phân bổ), và **nguồn dự kiến** (đơn mua, chuyển kho). Chi tiết ở `01-current-state.md`.

## 2. Tái sử dụng được

| Thành phần | Vị trí |
|---|---|
| Công thức nhu cầu, chống tràn số | `Domain/Services/ProductionPolicy.cs` (`CalculateRequirement`, `TryCalculateRequirement`) |
| Phân rã BOM và cộng dồn theo NVL | `Features/Production/Helpers/ProductionPlanReader.cs` (`MaterialRequirementsAsync`) |
| Số đã lập lệnh, số còn lại | `ProductionPlanRules.OrderedQuantitiesAsync` |
| Nhu cầu còn phải xuất của lệnh | Bảng `trx_production_material_requirements` |
| Tồn theo kho | `ProductionStockOps.AvailableAsync` |
| Số đã nhận của đơn mua | `PurchaseOrderHelper.RecalculateStatusAsync` (cách tính) |
| Quyền kho, quyền chức năng | `ICurrentUserService`, `[RequireFeature]` |
| Giao diện | `PlanMaterialRequirementsPanel`, `ProductionFilterSidebar`, `ProductionDialog` |

## 3. Còn thiếu và phân loại

| Hạng mục | Phân loại |
|---|---|
| Ngày cần cho từng nhu cầu (phương án A) | MUST |
| Gộp nhu cầu của mọi kế hoạch đã duyệt + lệnh đang mở | MUST |
| Phân bổ mềm theo ngày, tính thiếu theo mốc | MUST |
| Lead time trên NVL (`mst_products.lead_time_days`) | MUST |
| Hạn đặt hàng, trạng thái Trễ | MUST |
| Màn NVL thiếu + trạng thái sẵn sàng của dòng kế hoạch | MUST |
| Ngày giao dự kiến trên đơn mua; tính hàng đang đặt | SHOULD (MUST nếu chọn tính nguồn dự kiến, Q-M5) |
| Hàng đang chuyển kho, đang kiểm nhận (cột thông tin) | SHOULD |
| Loại lô hết hạn khỏi tồn khả dụng | SHOULD |
| Gợi ý mua, gợi ý chuyển kho | SHOULD |
| Lịch chuẩn bị NVL | SHOULD |
| Thời gian kiểm nhận, đệm an toàn, ngày nghỉ hằng tuần | SHOULD |
| Ngày nghỉ lễ | NICE TO HAVE |
| Nhu cầu theo ngày (phương án B) | NICE TO HAVE |
| BOM nhiều cấp | NICE TO HAVE (phụ thuộc U1) |
| Giữ chỗ cứng | NICE TO HAVE |
| NVL – nhà cung cấp, lead time theo nhà cung cấp | NICE TO HAVE |
| Tự tạo đơn mua / phiếu chuyển từ gợi ý | NICE TO HAVE |
| Lưu ảnh chụp kết quả MRP | NICE TO HAVE |
| Nhu cầu theo công đoạn (phương án C) | Ngoài phạm vi |

## 4. Thay đổi cần thiết

| Lớp | MUST | SHOULD |
|---|---|---|
| Database | 1 cột `mst_products.lead_time_days` | 1 cột `trx_purchase_orders.expected_date`; 2–3 cột cấu hình |
| Backend | `MrpPolicy` (Domain), `MrpReader`, 3 query (tổng hợp, theo kế hoạch, thiếu), `MrpController`; thêm trường lead time vào API hàng hóa | Query lịch chuẩn bị, sẵn sàng, gợi ý; thêm ngày giao vào API đơn mua (module `PurchaseOrders`) |
| Frontend | Ô lead time ở form hàng hóa; màn MRP (tab Nhu cầu, tab Thiếu); cột mới ở tab Nhu cầu NVL của kế hoạch | Ô ngày giao ở form đơn mua; tab Lịch chuẩn bị, tab Sẵn sàng; mục menu + ma trận quyền nếu chọn chức năng riêng |

Lưu ý: form hàng hóa và đơn mua thuộc module của thành viên khác. Cần báo trước và ghi rõ trong PR.

## 5. Rủi ro nếu triển khai không đúng

| # | Rủi ro | Hậu quả | Giảm thiểu |
|---|---|---|---|
| 1 | Tính trùng nhu cầu giữa kế hoạch và lệnh | Thiếu ảo, mua thừa | BR-MRP-02; ca MI-02 kiểm tổng không đổi |
| 2 | Tính trùng nguồn giữa đơn mua và tồn sau khi nhập | Đủ ảo | "Đang đặt" = đặt − đã nhận; ca MI-09 |
| 3 | Coi hàng đang đặt không có ngày là nguồn chắc chắn | Kế hoạch báo đủ nhưng tới ngày không có NVL | Không dùng đơn không ngày để xóa cảnh báo |
| 4 | Hai con số "thiếu" khác nhau giữa tab cũ và MRP | Người dùng mất tin vào số liệu | Quyết định Q-M3 trước khi làm |
| 5 | Lead time bỏ trống hàng loạt | Không ra hạn đặt | Trạng thái "Chưa có lead time", có bộ lọc để bổ sung dần |
| 6 | Ngầm coi ngày lịch là ngày làm việc | Hạn đặt sai quanh cuối tuần, lễ | Ghi rõ cách tính trên màn hình; cấu hình ngày nghỉ |
| 7 | Làm giữ chỗ cứng quá sớm | Phá luồng bán hàng, chuyển kho, xuất hủy đang chạy | Để NICE TO HAVE |
| 8 | Truy vấn nặng khi dữ liệu lớn | Màn chậm | Gom truy vấn; giới hạn khoảng ngày |
| 9 | Mở rộng phạm vi so với Report 1 / Report 3 | Không bảo vệ được yêu cầu | Nhóm xác nhận MRP thuộc phạm vi nào trước khi code (Q-M11) |

## 6. Thứ tự triển khai đề xuất

| Giai đoạn | Nội dung | Đổi DB | Độ phức tạp |
|---|---|---|---|
| 0 | Chốt Q-M1..Q-M11; cấp mã UC / BR; cập nhật Report 3 | Không | Thấp |
| 1 | `MrpPolicy` thuần + unit test: ngày cần, phân bổ mềm, thiếu theo mốc (chỉ với tồn kho) | Không | Trung bình |
| 2 | Lead time trên NVL; hạn đặt hàng; API tổng hợp, theo kế hoạch, thiếu; màn MRP hai tab | 1 cột | Trung bình |
| 3 | Ngày giao trên đơn mua; nguồn dự kiến (đơn mua, chuyển kho); cột đang kiểm nhận; loại lô hết hạn | 1 cột | Trung bình |
| 4 | Lịch chuẩn bị; trạng thái sẵn sàng; gợi ý mua / chuyển; cấu hình kiểm nhận, đệm, ngày nghỉ tuần | 2–3 cột | Trung bình |
| 5 (tùy chọn) | Ngày nghỉ lễ; phương án B; BOM nhiều cấp; giữ chỗ cứng | Bảng mới | Cao |

Giai đoạn 1–2 là mức tối thiểu để gọi là MRP: có nhu cầu theo thời gian, thiếu sau phân bổ, hạn đặt hàng. Mỗi giai đoạn dừng ở cổng chờ xác nhận, theo `.claude/rules/40-refactor-safety.md`.

## 7. Ước lượng độ phức tạp

| Phần | Mức | Lý do |
|---|---|---|
| Phép tính phân bổ và ngày | Trung bình | Thuần, kiểm thử được bằng unit test |
| Gom nhu cầu và nguồn từ nhiều module | Trung bình | Đọc 6–7 bảng, dễ tính trùng |
| Thay đổi schema | Thấp | Cột cho phép rỗng |
| Giao diện | Trung bình | Một màn nhiều tab, theo mẫu có sẵn |
| BOM nhiều cấp, giữ chỗ cứng | Cao | Ảnh hưởng module đang chạy |

Không ước lượng theo ngày công vì chưa chốt phạm vi.

## 8. Quyết định cần chủ dự án xác nhận

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| Q-M1 | Khi nhiều kế hoạch tranh một NVL, ưu tiên theo gì? | Ngày cần sớm trước; cùng ngày thì lệnh trước kế hoạch |
| Q-M2 | Kế hoạch Chờ duyệt có được tính vào nhu cầu chung không? | Không tính mặc định; có ô chọn để xem thử |
| Q-M3 | Tab Nhu cầu NVL hiện có của kế hoạch: đổi sang số sau phân bổ, hay giữ và ghi chú? | Đổi sang số sau phân bổ, giữ cột "tồn thực tế" |
| Q-M4 | Lead time của nhà cung cấp tính theo ngày lịch hay ngày làm việc? | Ngày lịch |
| Q-M5 | Hàng đã đặt chưa về có được tính là nguồn không? | Có, chỉ khi đơn có ngày giao dự kiến ≤ ngày cần; hiển thị tách khỏi tồn |
| Q-M6 | Số đề xuất mua có cộng thêm để đạt tồn an toàn (`min_safe_stock`) không? | Không ở giai đoạn đầu; chỉ mua đủ phần thiếu |
| Q-M7 | Gợi ý chuyển kho có trừ phần kho nguồn cần cho nhu cầu của chính nó không? | Có |
| Q-M8 | Cấu hình kiểm nhận / đệm / ngày nghỉ đặt ở đâu? | Thêm cột vào `mst_order_settings` |
| Q-M9 | MRP dùng lại chức năng kế hoạch sản xuất hay là chức năng riêng? Thủ kho có xem được không? | Dùng lại `feat-production-plans` / `feat-production-plan-approval`; thủ kho chưa xem |
| Q-M10 | NVL ngừng kinh doanh trong BOM: chỉ cảnh báo hay chặn duyệt kế hoạch? | Chỉ cảnh báo |
| Q-M11 | MRP thuộc phạm vi nào của Report 1 (FE-01..FE-09) và mã UC / BR nào trong Report 3? | UNKNOWN — nhóm quyết định; chưa code trước khi có |
| Q-M12 | Tín Phát có sản xuất nhiều cấp không (U1)? Sản xuất lấy NVL từ một kho hay nhiều kho (U5)? NVL có bán trực tiếp không (U4)? | UNKNOWN — cần hỏi chủ dự án |

## 9. Tự kiểm

- **(a) Giả định:** kết quả MRP tính khi xem, không lưu (theo quyết định Q8 / G8 đã chốt cho kế hoạch sản xuất); khảo sát trên nhánh `feature/production-planning`.
- **(b) Cần hỏi lại nhóm:** Q-M1..Q-M12.
- **(c) Chỗ không chắc:**
  - Các kết luận "Chưa có" dựa trên grep trong `StockFlow.Application` và `StockFlow.Domain`; chưa rà frontend ngoài `features/production`.
  - Chưa đọc Report 3 bản Google Doc hiện hành nên chưa biết MRP đã có UC nào chưa.
  - Ví dụ tính chưa được chạy bằng code vì chưa có code MRP.
- **(d) UC/BR liên quan:** UC-PP-01..06, BR-PP-09..15 (mã tạm); UC-45, UC-46, UC-57, UC-59; BR-31, BR-33, BR-42. BR-MRP-01..11 là mã tạm đề xuất.
