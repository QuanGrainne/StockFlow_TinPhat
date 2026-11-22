# Phụ lục 01c – Danh sách bảng database (sinh tự động từ schema thật)

- **Nguồn:** database tạm dựng bằng toàn bộ EF migration của nhánh `chore/xoa-bang-chua-dung` (47 migration), đọc `information_schema` và `pg_catalog`, ngày 19/11/2026. Database tạm đã xoá sau khi đọc; không đọc `stockflow_dev`.
- **Tổng:** 54 bảng nghiệp vụ trong schema `stockflow` (không tính `__EFMigrationsHistory`), 555 cột, 147 khoá ngoại, 21 cột unique (không tính unique index có điều kiện), 3 CHECK constraint (đều ở `mst_order_settings`).
- So với ERD trong tài liệu (`SEP_490_Group82(bản sao).docx`, mục 3.1.8, 54 entity): tài liệu còn `InboundCost`, `InboundCostAllocation`, `ReturnProcessing` (đã xoá ngày 19/11) và thiếu 3 bảng MRP.

| # | Nhóm | Bảng | Số cột | Cột cho phép rỗng | Khoá chính | FK ra | Được tham chiếu | Unique | Ghi chú |
|---|---|---|---:|---:|---|---:|---:|---|---|
| 1 | Master Data | `mst_product_categories` | 4 | 3 | category_id | 0 | 1 |  |  |
| 2 | Master Data | `mst_products` | 24 | 21 | product_id | 2 | 24 | product_code |  |
| 3 | Master Data | `mst_product_images` | 6 | 4 | image_id | 1 | 0 |  | Không có code đọc / ghi (ảnh lưu ở mst_products.image_url) |
| 4 | Master Data | `mst_units` | 3 | 2 | unit_id | 0 | 6 |  |  |
| 5 | Master Data | `mst_unit_conversions` | 5 | 2 | conversion_id | 3 | 0 |  | Không có code đọc / ghi (quy đổi lưu JSON trong mst_products) |
| 6 | Master Data | `mst_business_partners` | 19 | 18 | partner_id | 0 | 8 | partner_code |  |
| 7 | Master Data | `mst_warehouses` | 6 | 5 | warehouse_id | 0 | 17 | warehouse_code |  |
| 8 | Master Data | `mst_warehouse_locations` | 5 | 3 | location_id | 1 | 8 |  | Chỉ đọc; không API / seed tạo dòng (vị trí thực tế là cột text mst_products.location_name) |
| 9 | Master Data | `mst_boms` | 7 | 5 | bom_id | 1 | 3 |  |  |
| 10 | Master Data | `dtl_bom_items` | 6 | 2 | bom_item_id | 3 | 0 |  |  |
| 11 | Master Data | `mst_order_settings` | 18 | 1 | setting_id | 1 | 0 |  | Có CHECK singleton (setting_id = 1), order_code_rule, return_time_limit_days |
| 12 | Master Data | `mst_debt_warning_settings` | 10 | 1 | setting_id | 1 | 0 |  |  |
| 13 | Security / RBAC | `sec_users` | 10 | 9 | user_id | 0 | 31 | username |  |
| 14 | Security / RBAC | `sec_roles` | 3 | 2 | role_id | 0 | 2 | role_name |  |
| 15 | Security / RBAC | `sec_permissions` | 5 | 4 | permission_id | 0 | 1 | permission_code |  |
| 16 | Security / RBAC | `jnc_role_permissions` | 2 | 0 | role_id, permission_id | 2 | 0 |  |  |
| 17 | Security / RBAC | `jnc_user_roles` | 3 | 1 | user_id, role_id | 2 | 0 |  |  |
| 18 | Security / RBAC | `jnc_user_warehouse_access` | 3 | 1 | user_id, warehouse_id | 2 | 0 |  |  |
| 19 | Inventory | `mst_inventory_lots` | 5 | 3 | lot_id | 1 | 8 |  | Chỉ nhập thành phẩm tạo lô; nhập hàng mua không ghi lô; không ghi hạn dùng |
| 20 | Inventory | `trx_inventory_balances` | 8 | 5 | inventory_id | 4 | 0 |  |  |
| 21 | Inventory | `trx_inventory_transactions` | 14 | 10 | transaction_id | 5 | 0 |  |  |
| 22 | Inventory | `trx_stocktakes` | 9 | 6 | stocktake_id | 2 | 1 | stocktake_code |  |
| 23 | Inventory | `dtl_stocktake_items` | 14 | 11 | stocktake_item_id | 6 | 0 |  |  |
| 24 | Inventory | `trx_inventory_disposals` | 8 | 5 | disposal_id | 3 | 1 | disposal_code |  |
| 25 | Inventory | `dtl_inventory_disposal_items` | 7 | 4 | disposal_item_id | 4 | 0 |  |  |
| 26 | Purchase / Goods Receipt | `trx_purchase_orders` | 14 | 8 | po_id | 4 | 3 | po_code |  |
| 27 | Purchase / Goods Receipt | `dtl_purchase_order_items` | 6 | 0 | po_item_id | 2 | 0 |  |  |
| 28 | Purchase / Goods Receipt | `trx_goods_receipts` | 11 | 7 | gr_id | 4 | 2 | gr_code |  |
| 29 | Purchase / Goods Receipt | `dtl_goods_receipt_items` | 14 | 11 | gr_item_id | 4 | 1 |  |  |
| 30 | Purchase / Goods Receipt | `trx_purchase_returns` | 14 | 10 | purchase_return_id | 4 | 1 | return_code |  |
| 31 | Purchase / Goods Receipt | `dtl_purchase_return_items` | 9 | 5 | pr_item_id | 3 | 0 |  |  |
| 32 | Sales / Stock Issue | `mst_price_books` | 23 | 14 | price_book_id | 1 | 2 |  |  |
| 33 | Sales / Stock Issue | `dtl_price_book_items` | 5 | 1 | price_book_item_id | 2 | 0 |  |  |
| 34 | Sales / Stock Issue | `trx_orders` | 23 | 14 | order_id | 6 | 6 | order_code |  |
| 35 | Sales / Stock Issue | `dtl_order_items` | 11 | 2 | order_item_id | 3 | 2 |  |  |
| 36 | Sales / Stock Issue | `trx_stock_issues` | 13 | 10 | stock_issue_id | 5 | 1 | issue_code |  |
| 37 | Sales / Stock Issue | `dtl_stock_issue_items` | 7 | 5 | si_item_id | 4 | 0 |  |  |
| 38 | Sales / Stock Issue | `trx_credit_limit_requests` | 15 | 12 | request_id | 4 | 1 | request_code | Bảng duy nhất có concurrency token (status, sales_order_id) |
| 39 | Sales / Stock Issue | `trx_credit_limit_histories` | 9 | 3 | history_id | 3 | 0 |  |  |
| 40 | Production | `trx_production_plans` | 14 | 6 | production_plan_id | 4 | 3 | plan_code |  |
| 41 | Production | `dtl_production_plan_items` | 8 | 2 | production_plan_item_id | 3 | 0 |  |  |
| 42 | Production | `trx_production_orders` | 15 | 11 | production_order_id | 5 | 6 | production_order_code |  |
| 43 | Production | `dtl_production_order_items` | 7 | 1 | production_order_item_id | 3 | 2 |  |  |
| 44 | Production | `trx_production_material_requirements` | 15 | 10 | requirement_id | 4 | 1 |  |  |
| 45 | Production | `trx_production_reports` | 9 | 6 | report_id | 2 | 1 |  |  |
| 46 | Production | `trx_finished_goods_receipts` | 16 | 9 | fgr_id | 8 | 0 | fgr_code, report_id |  |
| 47 | MRP | `trx_mrp_runs` | 12 | 1 | mrp_run_id | 1 | 2 | run_code | Thêm 17/11, chưa có trong ERD của tài liệu |
| 48 | MRP | `dtl_mrp_run_lines` | 11 | 1 | mrp_run_line_id | 2 | 0 |  | Thêm 17/11, chưa có trong ERD của tài liệu |
| 49 | MRP | `dtl_mrp_run_demands` | 11 | 2 | mrp_run_demand_id | 5 | 0 |  | Thêm 17/11, chưa có trong ERD của tài liệu |
| 50 | Stock Transfer | `trx_stock_transfers` | 10 | 6 | stock_transfer_id | 3 | 1 | transfer_code |  |
| 51 | Stock Transfer | `dtl_stock_transfer_items` | 12 | 9 | transfer_item_id | 5 | 0 |  |  |
| 52 | Returns | `trx_return_requests` | 16 | 8 | return_request_id | 4 | 1 | return_code |  |
| 53 | Returns | `dtl_return_request_items` | 9 | 4 | return_item_id | 3 | 0 |  |  |
| 54 | Finance | `trx_financial_transactions` | 12 | 9 | tx_id | 2 | 0 |  |  |
