# SPEC — Sản xuất: lệnh sản xuất, xuất vật tư, nhập thành phẩm

- **Module:** `production`  •  **Use Case:** UC-44 – UC-50, UC-58 – UC-61
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Manager tạo và theo dõi lệnh sản xuất; nhu cầu vật tư được tính từ BOM đang áp dụng. Production Accountant xem lệnh, xuất nguyên vật liệu theo số thực giao và ghi nhận thành phẩm nhập kho.

## 2. Scope

**Trong phạm vi**
- Xem lệnh sản xuất (UC-44), nhu cầu và tình trạng xuất vật tư (UC-45)
- Xuất vật tư, xuất bổ sung, điều chỉnh số thực xuất (UC-46 – UC-48)
- Nhập thành phẩm, ghi thành phẩm lỗi (UC-49, UC-50)
- Manager quản lý lệnh và theo dõi (UC-58 – UC-61)

**Ngoài phạm vi**
- Định nghĩa BOM (specs/master-data)
- Giám sát máy móc, ghi tiêu hao của công nhân (SRS 5.3: ngoài phạm vi)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Production Accountant | Quyền xem lệnh, xuất vật tư, nhập thành phẩm + quyền kho | Không được xem giá mua, giá vốn, giá bán (BR-39) |
| Manager | Quyền quản lý sản xuất |  |

## 4. Preconditions and Postconditions

**Preconditions**
- Thành phẩm có BOM đang áp dụng (UC-58)
- Lệnh ở Not Started hoặc In Progress (UC-46); In Progress (UC-49)

**Postconditions**
- Lệnh được lưu; vật tư xuất làm tồn giảm; thành phẩm nhập làm tồn tăng và cập nhật tiến độ

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-30 | Chỉ tạo lệnh cho thành phẩm có BOM Active; mỗi thành phẩm tối đa một BOM Active. |
| BR-31 | Nhu cầu vật tư = SL kế hoạch × định mức × (1 + tỷ lệ hao hụt); hỗ trợ tính ngược 2 chiều giữa định mức / 1 đv và tổng SL NVL cần. |
| BR-32 | Mọi lần xuất vật tư tham chiếu mã lệnh; giữ lũy kế đã xuất và số thiếu. |
| BR-33 | Tồn vật tư giảm theo số thực xuất; không vượt tồn khả dụng. |
| BR-34 | Xuất bổ sung làm lũy kế vượt nhu cầu phải có lý do. |
| BR-35 | Khi lũy kế thành phẩm nhận vượt SL kế hoạch của lệnh, hiện hộp thoại cảnh báo xác nhận `[Có] / [Không]`; xác nhận `[Có]` cho phép lưu phiếu nhập. |
| BR-36 | Thành phẩm đạt vào kho thành phẩm; thành phẩm lỗi ghi riêng. |
| BR-37 | Thành phẩm cần nhiều vật tư hơn đã xuất: cảnh báo, bắt nhập ghi chú, gắn cờ cho Manager, không chặn. |
| BR-38 | Trạng thái lệnh: Not Started → In Progress (lần xuất đầu) → Completed (khi mọi thành phẩm trong lệnh đạt đủ SL kế hoạch). Chỉ hủy lệnh chưa xuất vật tư. |
| BR-39 | Production Accountant không xem giá. |
| BR-42 | Đang kiểm kê thì không xác nhận xuất vật tư. |
| BR-51 | Cho phép điều chỉnh định mức NVL (sửa 2 chiều, thêm/xóa dòng NVL) ngay khi lập lệnh hoặc trên lệnh kèm lý do điều chỉnh; chỉ áp dụng cho lệnh đó, không đổi BOM gốc. |

**Ghi chú hành vi hiện tại (Existing; làm rõ, không phải BR mới):**
- Khi lập lệnh, hệ thống sao chép định mức NVL từ BOM Active vào lệnh (`trx_production_material_requirements`). Vì vậy sửa BOM sau đó, hoặc kích hoạt BOM phiên bản khác, **không làm đổi định mức của lệnh đã tạo**.
- BOM đã dùng trong bất kỳ lệnh nào (ở bảng `trx_production_orders` hoặc ở từng dòng thành phẩm `dtl_production_order_items`) không sửa, không xóa được (BR-06); chỉ ngừng áp dụng hoặc tạo phiên bản mới.
- Lệnh đã Completed hoặc Cancelled không sửa lệnh, không điều chỉnh định mức, không xuất NVL, không nhập thành phẩm; chưa có thao tác mở lại lệnh.
- Lỗi dữ liệu dòng NVL của BOM được báo kèm số dòng, ví dụ "Dòng 3: nguyên vật liệu trùng với dòng 1…".

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-PROD-01 | Manager tạo lệnh (hỗ trợ 1 lệnh chứa nhiều thành phẩm `dtl_production_order_items`): chọn các thành phẩm, hiện BOM từng thành phẩm, sửa định mức 2 chiều / thêm xóa NVL ngay trên lệnh; lưu Not Started | Có | Hỗ trợ đa thành phẩm trên 1 lệnh và tùy chỉnh định mức trực tiếp |
| FR-PROD-02 | Sửa lệnh Not Started, hủy lệnh chưa xuất, đóng sớm lệnh In Progress kèm lý do | Có | Đã có API và UI |
| FR-PROD-03 | Production Accountant xem danh sách (kèm trạng thái `Đã lập đủ PX`, `Đã lập đủ PN`) và chi tiết lệnh, không có dữ liệu giá | Có | Đã có API và UI, tuân thủ BR-39 |
| FR-PROD-04 | Xem nhu cầu, đã xuất, còn thiếu, tồn theo kho theo từng thành phẩm | Có | Đã có API và UI |
| FR-PROD-05 | Xuất vật tư: chọn thành phẩm & SL sản xuất đợt này để tự tính SL xuất; lần đầu chuyển lệnh In Progress | Có | Đã có API và UI |
| FR-PROD-06 | Xuất bổ sung cùng mã lệnh; bắt lý do khi vượt nhu cầu | Có | Đã có API và UI |
| FR-PROD-07 | Nhập thành phẩm theo từng thành phẩm trong lệnh: số đạt, lô, ngày sản xuất, số lỗi và lý do; cảnh báo `[Có]/[Không]` khi vượt kế hoạch | Có | Đã có API và UI |
| FR-PROD-08 | Đủ SL kế hoạch cho tất cả thành phẩm trong lệnh thì lệnh Completed | Có | Đã có API và UI |
| FR-PROD-09 | Manager theo dõi vật tư và thành phẩm | Có | Đã có API và UI |

## 7. Non-functional Requirements

- **NFR-01.** Giao diện web cho máy tính, độ phân giải tối thiểu 1366×768; hỗ trợ Chrome, Edge, Firefox bản ổn định (SRS 4.1, 4.2.5).
- **NFR-02.** 95% yêu cầu thường hoàn thành trong 2 giây; thao tác giao dịch trả kết quả trong 3 giây (SRS 4.2.2).
- **NFR-03.** Mọi API phải kiểm tra quyền chức năng và quyền kho ở server; ẩn nút trên giao diện không được coi là phân quyền (SRS 4.2.4, BR-02).
- **NFR-04.** Giao dịch lỗi không được cập nhật dở dang; chỉ báo thành công khi transaction đã commit (SRS 4.2.3).
- **NFR-05.** Thay đổi nhạy cảm phải có nhật ký audit gồm người thực hiện, thời gian, thao tác, giá trị trước và sau (BR-49). **Existing:** hệ thống chưa có bảng audit.
- **NFR-06.** Thông báo hệ thống: SRS yêu cầu tiếng Anh theo mã MSG01–MSG65. **Existing:** toàn bộ thông báo bằng tiếng Việt. Cần nhóm chốt (xem Open Questions).

## 8. Validation Rules

| Trường | Quy tắc (Expected) | Hiện trạng FE / BE |
|---|---|---|
| SL kế hoạch | > 0 | Chưa có |
| Hạn | Không ở quá khứ | Chưa có |
| Số xuất vật tư | ≥ 0, ≤ tồn khả dụng | Chưa có |
| Số thành phẩm | > 0, lũy kế ≤ kế hoạch, có lô | Chưa có |

## 9. Main Flow

1. Manager tạo lệnh sản xuất từ BOM đang áp dụng
2. Production Accountant mở lệnh, chọn kho vật tư
3. Nhập số thực xuất từng vật tư, xác nhận
4. Hệ thống trừ tồn, cập nhật lũy kế và số thiếu; lệnh In Progress
5. Xưởng giao thành phẩm; nhập số đạt, lô, ngày sản xuất
6. Hệ thống cộng tồn thành phẩm, cập nhật tiến độ; đủ kế hoạch thì Completed

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A46.1 Xuất bổ sung | Chọn Supplementary, nhập số và lý do |
| A46.2 Xuất thiếu | Nhập số thấp hơn; giữ số thiếu cho lần sau |
| A49.1 Thành phẩm lỗi | Nhập số lỗi và lý do; không vào tồn bán được |
| A49.2 Cảnh báo vật tư | Bắt nhập ghi chú; gắn cờ cho Manager |
| A58.1 Quản lý lệnh | Sửa, hủy, đóng sớm theo trạng thái |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E44.1 | Lệnh không tồn tại hoặc đã hủy | MSG16 |
| E46.1 | Mã lệnh sai hoặc lệnh Completed / Canceled | Không ghi nhận |
| E46.2 | Số âm, vượt tồn, thiếu lý do xuất bổ sung | MSG39, MSG40 |
| E46.3 | Vật tư đang kiểm kê | MSG50 |
| E49.1 | Vượt SL kế hoạch | MSG42 |
| E58.1 | Thành phẩm chưa có BOM Active | MSG58 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| — | Toàn bộ API sản xuất | — | UC-44 – UC-50, UC-58 – UC-61 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_production_orders | Lệnh sản xuất | Có bảng, không có code |
| trx_production_material_requirements | Nhu cầu, đã xuất, còn thiếu | Có bảng, không có code |
| trx_finished_goods_receipts | Nhập thành phẩm | Có bảng, không có code |
| trx_production_reports | Báo cáo sản lượng | Có bảng; SRS revised không mô tả |
| trx_stock_issues (production_order_id) | Phiếu xuất vật tư | Có cột, không dùng |

## 14. Acceptance Criteria

- **AC-PROD-01.** Không tạo được lệnh cho thành phẩm chưa có BOM Active.
- **AC-PROD-02.** Nhu cầu vật tư đúng công thức BR-31.
- **AC-PROD-03.** Xuất vật tư làm tồn giảm đúng và lệnh chuyển In Progress ở lần đầu.
- **AC-PROD-04.** Lũy kế thành phẩm không vượt kế hoạch.
- **AC-PROD-05.** Production Accountant không thấy cột giá.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-PROD-01 | Tạo lệnh, kiểm tra nhu cầu vật tư | Đúng BR-31 | Unit |
| TS-PROD-02 | Xuất vật tư lần đầu, xuất bổ sung vượt nhu cầu | Trạng thái và lý do đúng | Integration |
| TS-PROD-03 | Nhập thành phẩm đủ kế hoạch | Lệnh Completed | Integration |
| TS-PROD-04 | Nhập thành phẩm vượt kế hoạch | Bị từ chối | Unit |
| TS-PROD-05 | Xem lệnh bằng tài khoản Production | Không có dữ liệu giá | System |

## 16. Dependencies and Constraints

- specs/master-data (BOM, hàng, kho)
- IInventoryLedger
- specs/stocktake
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Toàn bộ nhóm sản xuất chưa có xử lý backend; ba màn hình production hiện dùng dữ liệu giả, trái quy định "dữ liệu giả không dùng trong màn hình thật".
2. Mọi test scenario ở trạng thái chưa kiểm thử được.
3. Bảng trx_production_reports có trong database nhưng SRS revised không còn mô tả.
4. Cần nhóm chốt phạm vi nghiệm thu cho nhóm chức năng này.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Domain/Entities/TrxProductionOrder.cs, TrxProductionMaterialRequirement.cs, TrxFinishedGoodsReceipt.cs (chỉ có entity)`

**Frontend**
- `StockFlow_Frontend/src/features/production/screens/*.tsx (dữ liệu giả)`
