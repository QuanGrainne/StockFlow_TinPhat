# SPEC — Mục lục

Bộ SPEC cho toàn bộ Use Case trong Report 3 bản revised (UC-01 – UC-90), đã đồng bộ phần bán hàng theo mô hình thực tế của nhóm (chốt Trường hợp A & phân quyền theo chức năng ngày 12/11/2026). Mỗi file có đủ 16 mục, phân biệt yêu cầu (Expected) và hiện trạng code (Existing).

- Hiện trạng lấy từ nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026.
- Số trong bảng là số Functional Requirement theo từng hiện trạng.

| Module | Use Case | Nội dung | FR | Có | Một phần | Khác tài liệu | Chưa có | Ngoài tài liệu |
|---|---|---|---|---|---|---|---|---|
| [auth](auth/spec.md) | UC-01, UC-02, UC-03 | Xác thực: đăng nhập, đăng xuất, đổi mật khẩu | 7 | 3 | 2 | 1 | 1 | 0 |
| [accounts](accounts/spec.md) | UC-04 – UC-09 | Quản lý tài khoản nhân viên | 6 | 1 | 4 | 0 | 1 | 0 |
| [roles-permissions](roles-permissions/spec.md) | UC-10 – UC-14 | Quản lý vai trò và phân quyền (module & chức năng `FEAT_*`) | 7 | 3 | 2 | 1 | 1 | 0 |
| [warehouse-access](warehouse-access/spec.md) | UC-15 – UC-17 | Phân quyền kho và cô lập dữ liệu theo kho | 5 | 1 | 2 | 0 | 2 | 0 |
| [pending-orders](pending-orders/spec.md) | UC-18 – UC-22 | Quản lý đơn đặt hàng (`BOOKING`, giữ hàng không trừ tồn) | 7 | 5 | 2 | 0 | 0 | 0 |
| [order-consolidation](order-consolidation/spec.md) | UC-23 – UC-27 | Gộp đơn đặt hàng, thanh toán và xử lý hóa đơn | 7 | 2 | 3 | 0 | 2 | 0 |
| [sales-stock-issue](sales-stock-issue/spec.md) | UC-35, UC-36 | Xuất kho bán hàng & Hóa đơn POS (Trường hợp A) | 6 | 3 | 2 | 0 | 1 | 0 |
| [sales-returns](sales-returns/spec.md) | UC-28, UC-41, UC-42, UC-79 – UC-82 | Trả hàng bán | 9 | 1 | 3 | 3 | 1 | 1 |
| [sales-credit](sales-credit/spec.md) | UC-29, UC-62 – UC-66 | Công nợ khách hàng, theo dõi bán hàng và duyệt tín dụng | 7 | 0 | 3 | 0 | 4 | 0 |
| [purchase-orders](purchase-orders/spec.md) | UC-30 | Quản lý đơn mua hàng | 7 | 3 | 2 | 1 | 0 | 1 |
| [goods-receipt](goods-receipt/spec.md) | UC-31 – UC-34, UC-67 – UC-71 | Nhập hàng, chi phí nhập và theo dõi mua hàng | 10 | 1 | 3 | 1 | 4 | 1 |
| [stock-transfer](stock-transfer/spec.md) | UC-37, UC-38 | Chuyển kho | 8 | 2 | 2 | 2 | 2 | 0 |
| [stocktake](stocktake/spec.md) | UC-39, UC-40, UC-75 | Kiểm kê và duyệt điều chỉnh tồn | 9 | 1 | 3 | 1 | 3 | 1 |
| [inventory-disposal](inventory-disposal/spec.md) | UC-43, UC-76 | Hủy hàng tồn kho | 4 | 0 | 0 | 0 | 4 | 0 |
| [production](production/spec.md) | UC-44 – UC-50, UC-58 – UC-61 | Sản xuất: lệnh sản xuất, xuất vật tư, nhập thành phẩm | 9 | 0 | 0 | 0 | 9 | 0 |
| [master-data](master-data/spec.md) | UC-51 – UC-57 | Danh mục: hàng hóa, đơn vị, đối tác, hạn mức, kho, BOM | 8 | 1 | 5 | 0 | 1 | 1 |
| [inventory-monitoring](inventory-monitoring/spec.md) | UC-72 – UC-74, UC-77, UC-78 | Theo dõi tồn kho và cảnh báo | 5 | 0 | 2 | 0 | 3 | 0 |
| [finance-reports](finance-reports/spec.md) | UC-83 – UC-90 | Thu chi và báo cáo | 9 | 2 | 0 | 2 | 5 | 0 |
| **Tổng** | UC-01 – UC-90 |  | 130 | 29 | 40 | 12 | 44 | 5 |
