# Phụ lục 01a – Đối chiếu 99 Use Case: Tài liệu ↔ Spec ↔ Code

- **Tài liệu:** `docs/SEP_490_Group82(bản sao).docx`, Report 3 – SRS. Mục "Record of Changes" mới nhất ngày 16/11/2026: "sửa SRS theo source code nhánh dev", thêm UC-91 – UC-99, BR-51, BR-52, BR-PP-01 – BR-PP-24.
- **Spec:** thư mục `specs/` (18 module), lập ngày 12/11/2026 theo commit `dbb58c0` và bản Report 3 cũ hơn (tab `Report3_revised`). Có thêm `specs/production-planning-*` (UC-PP, BR-PP) và `specs/mrp` (UC-MRP, BR-MRP tạm).
- **Code:** nhánh `chore/xoa-bang-chua-dung` (= `origin/dev` `3c864d7` + 2 commit xoá 3 bảng), ngày 19/11/2026.
- **Cách làm:** đọc tĩnh. Danh sách endpoint lấy từ [01b_API_INVENTORY.md](01b_API_INVENTORY.md); bảng lấy từ [01c_DATABASE_INVENTORY.md](01c_DATABASE_INVENTORY.md). Trạng thái "Cần chạy thử" nghĩa là code có chức năng nhưng chưa chạy kiểm chứng trong đợt này. Không UC nào được ghi "Đạt" vì Phase 1 không chạy test.
- **Lưu ý về audit cũ:** `docs/audit/Report03_SPEC_vs_CODE.md` (13/11) đã cũ. Ví dụ, sản xuất, hủy hàng, duyệt tín dụng, đổi mật khẩu khi đó ghi "NOT IMPLEMENTED" nhưng nay đã có code. Phụ lục này chỉ dùng audit đó làm gợi ý, các kết luận bên dưới đã kiểm lại trên code hiện tại trừ chỗ ghi "(theo audit 13/11, chưa kiểm lại)".

## Quy ước cột "Kết luận"

| Giá trị | Nghĩa |
|---|---|
| Khớp | Code có chức năng, đúng mô tả tài liệu (chưa chạy thử) |
| Cần chạy thử | Code có chức năng; có điểm cần chạy mới kết luận được |
| Một phần | Code làm được một phần yêu cầu của tài liệu |
| Lệch | Code làm khác tài liệu |
| Lỗi | Đọc code thấy lỗi cụ thể (chưa chạy tái hiện) |
| Chưa có code | Tài liệu yêu cầu, code không có |
| Tài liệu mâu thuẫn | Tài liệu tự nói hai ý ngược nhau; cần nhóm chốt |
| Ngoài phạm vi | Nhóm đã chốt bỏ khỏi phạm vi (quyết định D1, D2 ngày 19/11/2026, xem [01d](01d_REPORT3_CHANGES.md)); ca test ghi Skipped |

Cột "Spec" ghi file spec phủ UC và ghi "spec cũ" khi spec nói khác tài liệu bản 16/11.

## Bảng đối chiếu

| UC | Tên | Tài liệu | Spec | Code (bằng chứng) | Kết luận |
|---|---|---|---|---|---|
| UC-01 | Login | Đặc tả 2.2.3.1 | auth | `POST /api/auth/login` (AllowAnonymous), trang `/login` | Cần chạy thử (BR-01: đăng nhập bằng username / email / mã NV) |
| UC-02 | Logout | Đặc tả 2.2.3.2 | auth | Frontend xoá token; JWT không thu hồi được phía server | Một phần |
| UC-03 | Change Password | Đặc tả 2.2.3.3 | auth (spec cũ: "chưa có") | `POST /api/auth/change-password` + màn đổi mật khẩu | Khớp |
| UC-04 | Manage Accounts | Đặc tả 2.2.3.4 | accounts | `/api/staff` (5 endpoint), trang `/staff` | Một phần (BR-49 nhật ký thay đổi chưa có) |
| UC-05 | View Accounts | Mô tả | accounts | `GET /api/staff` | Cần chạy thử |
| UC-06 | Search Accounts | Mô tả | accounts | Lọc trên màn `/staff` | Cần chạy thử |
| UC-07 | Add New Account | Mô tả | accounts | `POST /api/staff` | Cần chạy thử (BR-05 chính sách mật khẩu) |
| UC-08 | Update Account | Mô tả | accounts | `UpdateStaffCommand.cs:163` xoá toàn bộ quyền kho rồi mới thêm lại; request thiếu `AssignedWarehouses` thì tài khoản mất hết kho. Có đoạn map cứng tên kho K001–K004 | Lỗi |
| UC-09 | Activate / Deactivate Account | Mô tả | accounts | `/api/staff` | Cần chạy thử |
| UC-10 | Manage Roles & Permissions | Đặc tả 2.2.3.5 | roles-permissions | `/api/roles` (9 endpoint), trang `/roles`, `/roles/permissions` | Một phần (BR-49) |
| UC-11 | View Roles | Mô tả | roles-permissions | `GET /api/roles` | Cần chạy thử |
| UC-12 | Create / Update Role | Mô tả | roles-permissions | `/api/roles`; mã vai trò lưu kèm mô tả (ERD tài liệu đã ghi nhận) | Khớp |
| UC-13 | Configure Role Permissions | Mô tả | roles-permissions | `/api/roles` (ma trận quyền) | Cần chạy thử |
| UC-14 | Assign Roles to User | Mô tả | roles-permissions (spec cũ: nhiều vai trò) | Mỗi tài khoản 1 vai trò | Khớp (tài liệu 16/11 đã sửa thành 1 vai trò) |
| UC-15 | Manage Warehouse Access | Đặc tả 2.2.3.6 | warehouse-access | `/api/warehousepermissions` (5), trang `/roles/warehouses` | Một phần (BR-49) |
| UC-16 | View Warehouse Access | Mô tả | warehouse-access | `GET /api/warehousepermissions…` | Cần chạy thử |
| UC-17 | Assign Warehouse Access | Mô tả | warehouse-access | `UpdateWarehouseAccessCommand` | Cần chạy thử |
| UC-18 | Manage Pending Orders | Đặc tả 2.2.3.7 | pending-orders | `/api/sales-bookings` (8), trang `/sales-booking` | Khớp |
| UC-19 | Create Pending Order | Mô tả | pending-orders | `POST /api/sales-bookings` | Cần chạy thử (theo audit 13/11: giá lấy từ client) |
| UC-20 | View Pending Orders | Mô tả | pending-orders | `GET /api/sales-bookings`, `/reserved` | Cần chạy thử |
| UC-21 | Update Pending Order | Mô tả | pending-orders | `PUT /api/sales-bookings/{id}`, `PATCH …/info` | Cần chạy thử |
| UC-22 | Cancel Pending Order | Mô tả | pending-orders | `POST /api/sales-bookings/{id}/cancel` | Cần chạy thử |
| UC-23 | Consolidate Orders & Process Sales Invoice | Đặc tả 2.2.3.8 | order-consolidation | `POST /api/orders/pos`, `POST /api/sales-bookings/merge`, trang `/pos` | Cần chạy thử (theo audit 13/11: không chặn xuất vượt số còn lại của đơn đặt, chưa kiểm lại) |
| UC-24 | Select Orders to Consolidate | Mô tả | order-consolidation | `POST /api/sales-bookings/merge` (cùng khách, cùng kho, BR-10) | Cần chạy thử |
| UC-25 | Record Customer Payment | Mô tả | order-consolidation | Thanh toán trong `POST /api/orders/pos` | Cần chạy thử (theo audit 13/11: lệch làm tròn giảm giá % giữa FE và BE) |
| UC-26 | Generate Payment QR Code | Mô tả | order-consolidation | `PosScreen.tsx:1768`: chọn chuyển khoản chỉ hiện "Chưa cấu hình tài khoản ngân hàng…", không sinh QR | Chưa có code |
| UC-27 | Request Credit Approval | Mô tả | order-consolidation (spec cũ: "chưa có") | `POST /api/credit-requests`, `GET …/mine` | Khớp |
| UC-28 | Create Sales Return | Đặc tả 2.2.3.9 | sales-returns (spec cũ: phiếu chờ kho nhận) | `/api/sales-returns` (7): hoàn tất ngay, có trả nhanh không hoá đơn | Khớp |
| UC-29 | View Customer Debt | Đặc tả 2.2.3.10 | sales-credit | Màn Khách hàng: dư nợ, lịch sử | Một phần (BR-18 kỳ hạn / quá hạn: chưa thấy trong code) |
| UC-30 | Manage Purchase Orders | Đặc tả 2.2.3.11 | purchase-orders | `/api/purchase-orders` (10), trang `/purchase-orders`. Có thêm **ngày giao dự kiến** (17/11), tài liệu chưa có | Khớp (+ trường mới chưa vào tài liệu) |
| UC-31 | Process Inbound Goods Receipt | Đặc tả 2.2.3.12 | goods-receipt | `/api/purchases` (6). Không ghi lô / hạn dùng: `lotNumber` bị bỏ qua (`PurchaseItemMapper.cs:61`), màn không có ô nhập lô | Lệch (BR-27) |
| UC-32 | Record Defective / Missing Goods | Mô tả | goods-receipt (spec cũ: "cột luôn 0") | `DefectQuantity` trên dòng phiếu nhập; SL lỗi không vào kho, không tính tiền | Một phần (hàng thiếu chưa có) |
| UC-33 | Return Goods to Supplier | Mô tả | goods-receipt | `/api/purchasereturns` (7), trang `/purchase-returns` | Khớp (BR-24) |
| UC-34 | Allocate Inbound Costs | **Đặc tả đầy đủ 2.2.3.13** | goods-receipt: "chưa có" | Không có code. Bảng `trx_inbound_costs`, `dtl_inbound_cost_allocations` **đã xoá ngày 19/11** (nhánh `chore/xoa-bang-chua-dung`) | Ngoài phạm vi (D2, 19/11; sửa Report 3 theo [01d](01d_REPORT3_CHANGES.md) mục 2) |
| UC-35 | Process Sales Stock Issue | Đặc tả 2.2.3.14 | sales-stock-issue | `POST /api/orders/pos`. Không khoá đồng thời tồn kho; mỗi hàng chỉ kiểm / trừ **một dòng tồn** (`CreatePosOrderCommand.cs:307`) | Cần chạy thử (rủi ro cao: bán đồng thời, hàng nhiều lô) |
| UC-36 | Adjust Actual Sales Issue Quantity | Mô tả | sales-stock-issue | Giao một phần đơn đặt → `DELIVERING` (BR-17) | Cần chạy thử |
| UC-37 | Process Stock Transfer | Đặc tả 2.2.3.15 | stock-transfer | `/api/transfers` (9). Nhận ở kho đích cộng vào dòng tồn không lô (`TransferStockOps.cs:93`) | Cần chạy thử |
| UC-38 | Record Transfer Discrepancy | Mô tả | stock-transfer | `ReceiveTransferCommand.cs:63,99`: không chặn SL nhận **lớn hơn** SL xuất | Lỗi |
| UC-39 | Conduct Stocktake | Đặc tả 2.2.3.16 | stocktake (spec cũ: phải duyệt) | `/api/stocktakes` (6): hoàn thành là cân bằng ngay, gộp, hủy | Khớp (D1: không duyệt; sửa UC-72, UC-75, BR-43 theo 01d mục 1) |
| UC-40 | Record Stocktake Discrepancy | Mô tả | stocktake | Không có trường lý do chênh lệch trong `Features/Stocktakes`; ghi số và giá trị chênh lệch từng dòng, ghi chú cho cả phiếu | Khớp (O2, 19/11: BR-43 bỏ yêu cầu lý do từng dòng) |
| UC-41 | Process Customer Returns | Đặc tả 2.2.3.17 | sales-returns | Thực hiện cùng UC-28: cộng kho, giảm nợ, hoàn tiền | Một phần (BR-20 phân loại chưa có) |
| UC-42 | Categorize Return Items | Mô tả | sales-returns: "chưa có" | `Condition` luôn `GOOD` (`SalesReturnCommands.cs:201`). Bảng `trx_return_processing` **đã xoá ngày 19/11** | Ngoài phạm vi (D2, 19/11) |
| UC-43 | Process Inventory Disposal | Đặc tả 2.2.3.18 | inventory-disposal (spec cũ: phải duyệt) | `/api/disposals` (7): hoàn thành là trừ kho ngay | Khớp (D1: không duyệt; sửa UC-72, UC-76, BR-44 theo 01d mục 1) |
| UC-44 | View Production Orders | Đặc tả 2.2.3.19 | production (spec cũ: dữ liệu giả) | `GET /api/production/orders`, trang `/production` | Khớp |
| UC-45 | View Material Requirement & Issue Status | Đặc tả 2.2.3.20 | production | `GET /api/production/orders/{id}`, `requirement-preview` | Khớp |
| UC-46 | Process Material Stock Issue | Đặc tả 2.2.3.21 | production | `POST /api/production/material-issues`, trang `/production/material-issues` | Khớp |
| UC-47 | Issue Supplementary Materials | Mô tả | production | Cùng endpoint xuất NVL (cấp bổ sung, BR-34) | Cần chạy thử |
| UC-48 | Adjust Actual Material Issue Quantity | Mô tả | production | Cùng endpoint xuất NVL | Cần chạy thử |
| UC-49 | Record Finished Goods Receipt | Đặc tả 2.2.3.22 | production | `POST /api/production/finished-goods-receipts`; tạo lô thành phẩm (không ghi hạn dùng) | Khớp |
| UC-50 | Record Defective Finished Goods | Mô tả | production | SL lỗi trong `FinishedGoodsRules` | Khớp |
| UC-51 | Manage Master Data | Đặc tả 2.2.3.23 | master-data | Nhiều màn: hàng hoá, khách hàng, NCC, BOM | Một phần (xem UC-52 – UC-57) |
| UC-52 | Manage Product / Material | Mô tả | master-data | `/api/products` (12), trang `/products`. Có thêm **thời gian giao hàng** (17/11), tài liệu chưa có. Không có cờ "theo dõi lô" | Một phần |
| UC-53 | Manage Unit / Conversion | Mô tả | master-data | Đơn vị: chỉ `GET /api/products/units`. Quy đổi lưu JSON trong hàng hoá; bảng `mst_unit_conversions` không dùng (ERD tài liệu có ghi nhận) | Một phần |
| UC-54 | Manage Customer / Supplier | Mô tả | master-data | `/api/customers` (19), `/api/suppliers` (12). Lỗi "sửa ghi đè dư nợ" (audit 13/11) không còn thấy: dư nợ chỉ đổi qua phiếu và điều chỉnh | Cần chạy thử |
| UC-55 | Set Credit Limit | Mô tả | master-data | `PATCH /api/customers/{id}/credit-limit`, `…/batch`, lịch sử hạn mức | Khớp |
| UC-56 | Manage Warehouse & Location | Mô tả | master-data | Kho: `/api/warehouses` (Admin). Vị trí là cột chữ `mst_products.location_name`; bảng `mst_warehouse_locations` không có code tạo dòng | Lệch (ERD tài liệu mô tả bảng vị trí) |
| UC-57 | Manage BOM / Material Norm | Mô tả | master-data (spec cũ: "chưa có") | `/api/production/boms` (7), trang `/bom` | Khớp |
| UC-58 | Manage Production | Đặc tả 2.2.3.24 | production | `/api/production/*` (14) | Khớp |
| UC-59 | Manage Production Order (extends UC-58) | Mô tả | production | `approve`, `close`, `cancel`, `adjust-norms` (BR-51); tạo lệnh chỉ từ kế hoạch | Khớp |
| UC-60 | Track Production Materials | Mô tả | production | Chi tiết lệnh: cần / đã xuất / thiếu | Cần chạy thử |
| UC-61 | Track Finished Goods Receipt | Mô tả | production | Trang `/production/finished-goods` | Khớp |
| UC-62 | Manage Sales & Credit | Đặc tả 2.2.3.25 | sales-credit | Các màn hoá đơn, đặt hàng, duyệt tín dụng, khách hàng | Một phần (xem UC-63 – UC-66) |
| UC-63 | Track Sales Orders | Mô tả | sales-credit | `/api/orders`, trang `/orders` | Cần chạy thử |
| UC-64 | Approve Credit Request | Mô tả | sales-credit (spec cũ: "chưa có") | `POST /api/credit-requests/{id}/approve`, `/reject`, trang `/approvals` | Khớp |
| UC-65 | Track Outbound Fulfillment | Mô tả | sales-credit | Trạng thái `DELIVERING` của đơn đặt | Cần chạy thử |
| UC-66 | View Customer Debt & Overdue | Mô tả | sales-credit | Có dư nợ; chưa thấy kỳ hạn / quá hạn (BR-18) | Một phần |
| UC-67 | Purchasing & Receiving | Đặc tả 2.2.3.26 | goods-receipt | Các màn đặt hàng, nhập hàng, trả hàng nhập, NCC | Một phần |
| UC-68 | Track Purchase Orders & Receipts | Mô tả | goods-receipt | `/purchase-orders`, `/purchases` | Cần chạy thử |
| UC-69 | Track Defective / Returned Goods | Mô tả | goods-receipt | SL lỗi trên phiếu nhập, trả hàng nhập | Một phần |
| UC-70 | Track Landed Cost & MAC | Mô tả | goods-receipt | Có bảng tính giá vốn BQ của phiếu nhập (`PurchaseCostingReader`); không có chi phí nhập | Khớp (O4, 19/11: đổi tên "Track Moving Average Cost", bỏ phần chi phí nhập) |
| UC-71 | View Supplier Payable | Mô tả | goods-receipt | Màn NCC: công nợ, phiếu chi | Một phần (hạn thanh toán) |
| UC-72 | Manage Inventory | Đặc tả 2.2.3.27 | inventory-monitoring | Tồn theo kho, thẻ kho, chuyển kho | Một phần (mâu thuẫn A72.3 / A72.4 đã chốt theo D1; còn thiếu cảnh báo hạn dùng UC-78) |
| UC-73 | View Multi-Warehouse Inventory | Mô tả | inventory-monitoring | Tồn từng kho trong Hàng hoá, `GET /api/products/{id}/stock-card` | Khớp |
| UC-74 | Track Stock Transfers | Mô tả | inventory-monitoring | Trang `/transfers` | Khớp |
| UC-75 | Approve Stocktake Adjustment | Mô tả | stocktake: "chưa có" | Không có endpoint duyệt; kiểm kê cân bằng ngay | Ngoài phạm vi (D1, 19/11) |
| UC-76 | Approve Inventory Disposal | Mô tả | inventory-disposal: "chưa có" | Không có endpoint duyệt; hủy hàng trừ kho ngay | Ngoài phạm vi (D1, 19/11) |
| UC-77 | View Reorder Point Alerts | Mô tả | inventory-monitoring: "chưa có" | Bộ lọc "Dưới định mức tồn" (`LowStockOnly`, `GetProductsQuery.cs:178`) | Một phần (không có màn cảnh báo riêng) |
| UC-78 | View Expiry Alerts | Mô tả | inventory-monitoring: "chưa có" | Không có; không nơi nào ghi hạn dùng (`expiry_date`) | Chưa có code |
| UC-79 | Manage Returns | Đặc tả 2.2.3.28 | sales-returns | Danh sách trả hàng bán / trả hàng nhập | Một phần (A79.2 cần phân loại) |
| UC-80 | Track Return Requests | Mô tả | sales-returns | `GET /api/sales-returns` | Khớp |
| UC-81 | Track Restock / Repair / Scrap | Mô tả | sales-returns | Không có phân loại | Ngoài phạm vi (O3, 19/11: bỏ cùng UC-42) |
| UC-82 | Track Refund / Debt Adjustment | Mô tả | sales-returns | `POST /api/sales-returns/{id}/refunds` | Cần chạy thử |
| UC-83 | Manage Finance & Reports | Đặc tả 2.2.3.29 | finance-reports | Phiếu thu / chi có; báo cáo không có | Một phần |
| UC-84 | Create Receipt Voucher | Mô tả | finance-reports | `POST /api/customers/{id}/payments`, sửa, hủy phiếu thu | Khớp (O1, 19/11: BR-46 sửa theo code; phiếu chi NCC không sửa / huỷ được) |
| UC-85 | Create Payment Voucher | Mô tả | finance-reports | Phiếu chi NCC (`/api/suppliers/{id}/payments`) | Cần chạy thử |
| UC-86 | View Debt Report | Mô tả | finance-reports | Không có API báo cáo; chỉ xem công nợ từng đối tác | Chưa có code |
| UC-87 | View Inventory Report | Mô tả | finance-reports | Không có báo cáo nhập – xuất – tồn; chỉ thẻ kho từng hàng | Chưa có code |
| UC-88 | View Revenue & Profit Report | Mô tả | finance-reports | Không có | Chưa có code |
| UC-89 | View Cost Report | Mô tả | finance-reports | Không có | Chưa có code |
| UC-90 | View Management Dashboard | Mô tả | finance-reports | Trang `/dashboard` là bảng quản trị (đếm nhân viên, vai trò, kho), không có KPI; `/reports`, `/inventory` chỉ chuyển hướng về `/dashboard` | Chưa có code |
| UC-91 | Manage Price Books | Đặc tả 2.2.3.30 | **Không có spec** | `/api/price-books` (9), trang `/price-books` | Khớp |
| UC-92 | Manage Production Plans | Đặc tả 2.2.3.31 | production-planning-* (UC-PP, BR-PP-01 – 24) | `/api/production/plans` (12), trang `/production/plans`, `/plan-approvals`. Có thêm **kho xuất NVL ở cấp kế hoạch** (18/11), tài liệu chưa có | Khớp (+ trường mới chưa vào tài liệu) |
| UC-93 | Create & Submit Production Plan | Mô tả | production-planning-* | Có; đã có bộ test API `pptest*.ps1` | Khớp |
| UC-94 | Approve / Reject Production Plan | Mô tả | production-planning-* | Có | Khớp |
| UC-95 | Create Production Orders from Plan | Mô tả | production-planning-* | Có | Khớp |
| UC-96 | Close / Cancel Production Plan | Mô tả | production-planning-* | Có. Điểm S-01 (`08-spec-code-review.md`): lệnh của kế hoạch đã đóng vẫn tăng được số lượng | Lệch (BR-PP-22 – 24) |
| UC-97 | Configure Order & Debt-warning Settings | Đặc tả 2.2.3.32 | **Không có spec** | `/api/order-settings`, `/api/settings/debt-warning`, trang `/settings/orders` | Khớp |
| UC-98 | Adjust Customer / Supplier Debt | Đặc tả 2.2.3.33 | **Không có spec** | `…/debt-adjustments` cho khách hàng và NCC | Khớp |
| UC-99 | Import Products & Adjust Stock | Đặc tả 2.2.3.34 | **Không có spec** | `POST /api/products/import`, `POST /api/products/{id}/stock-adjustments` | Khớp |

## Ngoài 99 UC: có trong code nhưng tài liệu chưa có

| Chức năng | Code | Spec | Tài liệu |
|---|---|---|---|
| Hoạch định nhu cầu NVL (MRP) | 8 API `/api/production/mrp/*`, trang `/production/mrp`, 3 bảng `trx_mrp_runs`, `dtl_mrp_run_lines`, `dtl_mrp_run_demands` (17–18/11) | `specs/mrp` (UC-MRP, BR-MRP-01 – 29 tạm) | Không có (0 lần nhắc "MRP"). **D3:** đề xuất bổ sung UC-100 – UC-105, BR-MRP-01 – 33, MSG75 – MSG81 ([01d](01d_REPORT3_CHANGES.md) mục 3) |
| Thời gian giao của hàng hoá, ngày giao dự kiến của đơn đặt | `mst_products.lead_time_days`, `trx_purchase_orders.expected_date` (17/11) | `specs/mrp` | Không có |
| Kho xuất NVL ở cấp kế hoạch | `trx_production_plans.warehouse_id` (18/11) | Chưa rõ | Không có |
| Xoá 3 bảng chi phí nhập, xử lý hàng trả | Migration `DropInboundCostAndReturnProcessing` (19/11) | Spec goods-receipt, sales-returns đã ghi "đã xoá bảng" | ERD tài liệu vẫn còn 3 entity |

## Thống kê

Cập nhật sau các quyết định ngày 19/11/2026 (D1: kiểm kê, huỷ hàng không duyệt; D2: bỏ UC-34, UC-42; O1 – O4 theo phương án mặc định):

| Kết luận | Số UC | Trước quyết định |
|---|---:|---:|
| Khớp | 35 | 33 |
| Cần chạy thử | 28 | 28 |
| Một phần | 19 | 19 |
| Lệch | 3 | 4 |
| Lỗi | 2 | 2 |
| Chưa có code | 7 | 10 |
| Tài liệu mâu thuẫn | 0 | 3 |
| Ngoài phạm vi | 5 (UC-34, UC-42, UC-75, UC-76, UC-81) | 0 |
| **Tổng** | **99** | **99** |

Số liệu được đếm bằng script từ cột "Kết luận" (lấy cụm từ đứng đầu ô).
