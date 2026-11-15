# 01 — Phân tích ERD cho Lập kế hoạch sản xuất

- **Ngày:** 14/11/2026. **Nguồn:** model EF và migration trên nhánh `dev` (commit `abd436e`), gồm migration `20261114083944_AddProductionPlans`.
- **Lưu ý về tài liệu ERD:** `database/stockflow.sql` và file PlantUML **chưa có** hai bảng kế hoạch và cũng chưa có `dtl_production_order_items`. Phân tích này dựa trên schema thật do migration tạo ra, không dựa trên hai file đó.
- Chỉ phân tích. Không sửa ERD, code hay database.

## 1. Hai bảng mới

### trx_production_plans — đầu kế hoạch

| Cột | Kiểu | Bắt buộc | Vai trò |
|---|---|---|---|
| production_plan_id | integer, tự tăng | Có | Khóa chính |
| plan_code | varchar(30), duy nhất | Có | Mã kế hoạch |
| plan_name | varchar(150) | Có | Tên kế hoạch |
| plan_date | timestamp | Có | Ngày lập |
| period_start, period_end | date | Có | Kỳ kế hoạch |
| status | varchar(20) | Có | Trạng thái; **chưa có tập giá trị nào được định nghĩa** |
| created_by | integer → sec_users | Có | Người lập |
| approved_by | integer → sec_users | Không | Người duyệt |
| approval_date | timestamp | Không | Thời điểm duyệt |
| notes | varchar(500) | Không | Ghi chú |

### dtl_production_plan_items — dòng kế hoạch

| Cột | Kiểu | Bắt buộc | Vai trò |
|---|---|---|---|
| production_plan_item_id | integer, tự tăng | Có | Khóa chính |
| production_plan_id | integer → trx_production_plans | Có | Thuộc kế hoạch nào |
| product_id | integer → mst_products | Có | Thành phẩm cần sản xuất |
| planned_quantity | numeric(18,2) | Có | Số lượng kế hoạch |
| planned_start_date, planned_end_date | date | Có | Thời gian dự kiến của dòng |
| warehouse_id | integer → mst_warehouses | Không | Kho nhận thành phẩm |
| notes | varchar(500) | Không | Ghi chú dòng |

Không có ràng buộc duy nhất trên (kế hoạch, sản phẩm), nên **một sản phẩm có thể xuất hiện ở nhiều dòng** của cùng một kế hoạch.

## 2. Các bảng liên quan và vai trò trong quy trình

| Bảng | Vai trò | Dùng cho kế hoạch thế nào |
|---|---|---|
| mst_products | Thành phẩm và nguyên vật liệu | Dòng kế hoạch trỏ tới thành phẩm; định mức trỏ tới vật tư |
| mst_boms | Định mức của thành phẩm; tối đa một bản đang áp dụng mỗi thành phẩm (chỉ mục duy nhất có điều kiện) | Kiểm tra thành phẩm có BOM đang áp dụng; nguồn tính nhu cầu vật tư |
| dtl_bom_items | Vật tư, định mức mỗi đơn vị, tỷ lệ hao hụt | Tính nhu cầu vật tư dự kiến của kế hoạch |
| mst_warehouses | Kho | Kho nhận thành phẩm của dòng kế hoạch; kho vật tư để xem tồn |
| trx_production_orders | Đầu lệnh sản xuất; có `production_plan_id` (cho phép rỗng) | Liên kết lệnh với kế hoạch ở mức đầu phiếu |
| dtl_production_order_items | Dòng thành phẩm của lệnh: sản phẩm, BOM, số kế hoạch, số thực tế | Số đã lập lệnh và số đã sản xuất theo sản phẩm |
| trx_production_material_requirements | Nhu cầu, đã xuất, còn thiếu của từng vật tư theo lệnh và dòng lệnh | Chỉ có sau khi lập lệnh; không lưu nhu cầu ở mức kế hoạch |
| trx_production_reports | Báo cáo sản lượng theo mẻ; phiếu nhập thành phẩm bắt buộc tham chiếu | Không liên quan trực tiếp tới kế hoạch |
| trx_finished_goods_receipts | Phiếu nhập thành phẩm theo lệnh, dòng lệnh, kho | Số thành phẩm thực nhận để đo tiến độ kế hoạch |
| trx_stock_issues, dtl_stock_issue_items | Phiếu xuất vật tư cho lệnh | Không liên quan trực tiếp |
| trx_inventory_balances | Tồn theo kho, vị trí, hàng, lô | Tồn vật tư để cảnh báo thiếu; tồn thành phẩm để tham khảo khi lập kế hoạch |

## 3. Quan hệ khóa

```
sec_users 1 ──< trx_production_plans (created_by)
sec_users 1 ──< trx_production_plans (approved_by, tùy chọn)
trx_production_plans 1 ──< dtl_production_plan_items
mst_products 1 ──< dtl_production_plan_items
mst_warehouses 1 ──< dtl_production_plan_items (tùy chọn)
trx_production_plans 1 ──< trx_production_orders (production_plan_id, tùy chọn)
trx_production_orders 1 ──< dtl_production_order_items ──> mst_products, mst_boms
trx_production_orders 1 ──< trx_production_material_requirements
trx_production_orders 1 ──< trx_finished_goods_receipts
```

Mọi khóa ngoại của hai bảng mới đều không xóa dây chuyền. Kế hoạch còn dòng chi tiết hoặc còn lệnh liên kết thì database từ chối xóa.

## 4. Dữ liệu có sẵn và dữ liệu phải tính

| Thông tin | Có sẵn | Phải tính | Cách tính |
|---|---|---|---|
| Sản phẩm, số lượng, thời gian, kho nhận của từng dòng kế hoạch | Có | | |
| Người lập, người duyệt, thời điểm duyệt | Có | | |
| Thành phẩm có BOM đang áp dụng không | | Có | Tra `mst_boms` theo sản phẩm, `is_active` |
| Nhu cầu vật tư dự kiến của kế hoạch | | Có | Σ theo dòng: số lượng × định mức × (1 + hao hụt), cộng dồn theo vật tư. Công thức đã có ở `ProductionPolicy.CalculateRequirement` |
| Tồn vật tư và số thiếu | | Có | So nhu cầu với `trx_inventory_balances` của kho vật tư |
| Số đã lập lệnh của kế hoạch | | Có, **chỉ theo sản phẩm** | Σ `dtl_production_order_items.planned_quantity` của các lệnh có `production_plan_id`, không tính lệnh đã hủy |
| Số còn lại chưa lập lệnh | | Có, chỉ theo sản phẩm | Số kế hoạch − số đã lập lệnh |
| Số thành phẩm đã nhập kho | | Có | Σ `dtl_production_order_items.actual_quantity` hoặc phiếu nhập thành phẩm |
| Lệnh nào thuộc **dòng** kế hoạch nào | | **Không tính được** khi một sản phẩm có nhiều dòng | Xem file 07 |

## 5. Nghiệp vụ hai bảng hỗ trợ được

- Lập kế hoạch cho một kỳ, gồm nhiều thành phẩm, mỗi thành phẩm có số lượng và thời gian riêng.
- Chia một thành phẩm thành nhiều đợt (nhiều dòng cùng sản phẩm, khác thời gian).
- Chỉ định kho nhận thành phẩm cho từng dòng.
- Ghi nhận một lần duyệt (người duyệt, thời điểm).
- Liên kết nhiều lệnh sản xuất với một kế hoạch.
- Lập kế hoạch trước khi có lệnh sản xuất.

## 6. Giới hạn của ERD hiện tại

| # | Giới hạn | Hệ quả |
|---|---|---|
| G1 | Lệnh chỉ liên kết với kế hoạch ở đầu phiếu, không tới dòng kế hoạch | Không biết lệnh phục vụ dòng nào khi một sản phẩm có nhiều dòng (chi tiết ở file 07) |
| G2 | Không có cột lý do từ chối, lý do hủy, người và thời điểm gửi duyệt | Chỉ ghi được vào `notes`; không truy vết được quá trình duyệt |
| G3 | Không có `updated_at`, `updated_by` | Không biết ai sửa kế hoạch lần cuối |
| G4 | `status` là chuỗi tự do, không có ràng buộc | Phải định nghĩa hằng trạng thái trong code |
| G5 | Không có CHECK cho số lượng > 0, ngày kết thúc ≥ ngày bắt đầu | Phải kiểm tra trong validator (toàn dự án không dùng CHECK) |
| G6 | Chưa có sequence và loại chứng từ cho mã kế hoạch | Cần bổ sung khi làm API tạo kế hoạch |
| G7 | Không liên kết với đơn đặt hàng của khách | Không truy được kế hoạch sinh ra từ nhu cầu đơn hàng nào |
| G8 | Không lưu kho vật tư và nhu cầu vật tư ở mức kế hoạch | Nhu cầu phải tính lại mỗi lần xem; kết quả đổi theo BOM hiện hành |
| G9 | Không có năng lực sản xuất (máy, ca, xưởng) | Không kiểm tra được quá tải; `workshop` chỉ có ở lệnh, dạng chữ tự do |
