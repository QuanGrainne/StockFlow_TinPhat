# 01 — Rà soát hệ thống hiện có (Phase 1)

- **Ngày:** 16/11/2026. **Code rà soát:** nhánh `feature/production-planning`, commit `7be06ca` (đã gộp `dev` tới `ba8bb07`).
- **Tính chất:** chỉ đọc. Không sửa code, không tạo bảng, API hay migration.
- **Cách làm:** đọc entity (`StockFlow.Domain/Entities`), handler (`StockFlow.Application/Features`), controller (`StockFlow.API/Controllers`), ánh xạ bảng (`StockFlow.Infrastructure/Persistence/StockFlowDbContext.cs`) và grep toàn bộ Application + Domain.
- **Ký hiệu trạng thái:** **Có** / **Một phần** / **Chưa có**. "Xác nhận" nghĩa là đã đọc code; "Suy ra" nghĩa là kết luận từ việc tìm kiếm không thấy.
- Đường dẫn tính từ `StockFlow_Backend/`. `Features/` là `StockFlow.Application/Features/`.

Tài liệu này thay cho bản khảo sát ngày 16/11 ở `specs/production/mrp-analysis/01-current-state.md`, và sửa một kết luận sai của bản đó (mục C, dòng "hàng tạm giữ").

## A. Kế hoạch sản xuất

| Nội dung | Trạng thái | Bằng chứng |
|---|---|---|
| Bảng đầu kế hoạch | Có | `trx_production_plans` (`TrxProductionPlan`; DbContext dòng 1699): `plan_code`, `plan_name`, `plan_date`, `period_start`, `period_end`, `status`, `created_by`, `approved_by`, `approval_date`, `notes`, `updated_at`, `updated_by` |
| Bảng dòng kế hoạch | Có | `dtl_production_plan_items` (`DtlProductionPlanItem`; dòng 1752): `product_id`, `planned_quantity`, `planned_start_date`, `planned_end_date`, `warehouse_id` (kho nhận, tùy chọn), `notes` |
| Lập, sửa, gửi duyệt, duyệt, từ chối, hủy, đóng | Có | `Features/Production/Commands/*ProductionPlanCommand.cs`; API `api/production/plans` (`ProductionPlansController`): `POST /`, `PUT /{id}`, `POST /{id}/submit`, `/approve`, `/reject`, `/cancel`, `/close` |
| Trạng thái | Có | `ProductionPlanStatus`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CLOSED`, `CANCELLED`; luật chuyển ở `TrxProductionPlan.Status.cs` |
| Ngày bắt đầu, kết thúc | Có, theo dòng | `planned_start_date`, `planned_end_date` kiểu `date`; validator buộc nằm trong kỳ (`ProductionPlanRules.cs`) |
| Lịch sản xuất theo ngày | **Chưa có** | Không có entity lịch, ca, công đoạn. Suy ra từ danh sách entity |
| Thành phẩm và số lượng | Có | Mỗi thành phẩm một dòng trong một kế hoạch (validator); chỉ `FINISHED`, `SEMI_FINISHED` (`ProductionPlanRules.ProducibleProductTypes`) |
| Sửa sau khi duyệt | Có, hạn chế | `UpdateProductionPlanCommand`: người có quyền duyệt đổi số lượng (không thấp hơn số đã lập lệnh), ngày dòng, kho nhận, ghi chú, thêm dòng có BOM; không đổi tên, kỳ |
| Kế hoạch đổi thì nhu cầu NVL đổi | Có, vì tính khi xem | `GetPlanMaterialRequirementsQuery` → `ProductionPlanReader.MaterialRequirementsAsync`; API `GET api/production/plans/{id}/material-requirements?warehouseId=`. Không lưu kết quả |
| Liên kết kế hoạch – lệnh | Có | `trx_production_orders.production_plan_id`; số đã lập lệnh tính bằng `ProductionPlanRules.OrderedQuantitiesAsync` (không tính lệnh `CANCELLED`) |

## B. BOM

| Nội dung | Trạng thái | Bằng chứng |
|---|---|---|
| Đầu BOM | Có | `mst_boms` (`MstBom`; dòng 565): `product_id`, `bom_name`, `version`, `is_active`, `created_at`, `description` |
| Dòng BOM | Có | `dtl_bom_items` (`DtlBomItem`; dòng 130): `material_id`, `quantity` (định mức), `unit_id`, `wastage_rate` |
| API | Có | `ProductionBomsController` |
| Đơn vị của dòng | Có | Luôn là đơn vị cơ sở của NVL: `BomRules.ReplaceItems` gán `UnitId = material.BaseUnitId` |
| Quy đổi đơn vị | Một phần | Bảng `mst_unit_conversions` (dòng 796) có, nhưng không handler nào đọc (grep `MstUnitConversions` trong `Features`: 0 kết quả) |
| Phiên bản | Có | `version` tăng dần (`BomRules.NextVersionAsync`); mỗi thành phẩm tối đa một BOM đang áp dụng (`BomRules.ActivateAsync`, chỉ mục `uq_mst_boms_active_product`) |
| Ngày hiệu lực | **Chưa có** | `MstBom` không có cột ngày hiệu lực |
| Hao hụt | Có | `wastage_rate` 0–100%; công thức `ProductionPolicy.CalculateRequirement` (BR-31) |
| BOM nhiều cấp | **Chưa có** | `BomRules.ValidateAsync` không kiểm loại hàng của NVL; phân rã một cấp ở `ProductionPlanReader` và `ProductionOrderRules` |
| Thiếu hoặc sai BOM | Có | Kế hoạch: lưu nháp được, chặn khi gửi duyệt và khi duyệt (`ProductionPlanRules.ValidateReadyForApprovalAsync`). Lệnh: bắt buộc BOM đang áp dụng (`ProductionOrderRules.PopulateItemsAndRequirementsAsync`) |

## C. Tồn kho

| Nội dung | Trạng thái | Bằng chứng |
|---|---|---|
| Số dư tồn | Có | `trx_inventory_balances` (`TrxInventoryBalance`; dòng 1331): `warehouse_id`, `location_id`, `product_id`, `lot_id`, `quantity`, `unit_cost` |
| Kho, vị trí | Có | `mst_warehouses`, `mst_warehouse_locations` |
| Thẻ kho | Có | `trx_inventory_transactions` (dòng 1415): `transaction_type`, `quantity`, `reference_type`, `reference_id`, `transaction_date`, `balance_after`. Loại dùng cho sản xuất: `PRODUCTION_ISSUE`, `PRODUCTION_RECEIPT`; bán: `ISSUE_SALE`. Ghi qua `IInventoryLedger` |
| Tồn hiện có theo kho | Có | `ProductionStockOps.AvailableAsync`: cộng mọi vị trí và lô của một kho |
| Hàng tạm giữ cho đơn đặt của khách | **Có, tính động** | `SalesBookingOps.ReservedQtyAsync` (`Features/SalesBookings/Common/SalesBookingOps.cs:245`): số đặt − số đã giao của đơn đặt còn mở. POS trừ số này khi thiết lập `AllowSellingReservedStock = false` (`CreatePosOrderCommand.cs:334–364`). Không có cột hay bảng lưu |
| Giữ chỗ NVL cho sản xuất | **Chưa có** | Không có code hay bảng nào giữ NVL cho kế hoạch hoặc lệnh |
| Tồn khả dụng cho sản xuất | Một phần | Xuất NVL so với tồn hiện có (`CreateMaterialIssueCommand`, BR-33), không trừ phần giữ cho lệnh khác hay cho đơn đặt |
| Nhu cầu NVL đã chụp của lệnh | Có | `trx_production_material_requirements` (dòng 1566): `required_qty`, `issued_qty`, `shortage_qty` |
| Kiểm thiếu NVL khi lập lệnh | Có (mới từ `f1a0879`) | `ProductionOrderRules` dòng 131–209: gộp nhu cầu theo NVL, so tồn kho được chọn; thiếu thì trả lỗi tiền tố `[CONFIRM_SHORTAGE]`, người dùng xác nhận mới lưu, cảnh báo ghi vào ghi chú lệnh |
| Chuyển kho | Có | `trx_stock_transfers` trạng thái `DRAFT`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`; dòng có `issued_quantity`, `received_quantity`; API `api/Transfers` |
| Hàng lỗi, bị khóa | Một phần | Hàng lỗi lúc nhập không vào tồn (chỉ `accepted_qty`). Không có trạng thái chất lượng trên số dư tồn. Xuất hủy qua `Features/Disposals` |
| Lô, hạn dùng | Một phần | `mst_inventory_lots.expiry_date`; xuất NVL không xét hạn (`ProductionStockOps.IssueAsync` trừ dòng tồn lớn trước) |
| Khóa khi kiểm kho | Có | `StocktakeGuard.CheckAsync` (BR-42) |

**Tồn dùng được cho sản xuất, theo code hiện tại:** toàn bộ `quantity` trong `trx_inventory_balances` của kho xuất, không phân biệt lô hay hạn dùng.

## D. Mua hàng và nhập hàng

| Nội dung | Trạng thái | Bằng chứng |
|---|---|---|
| Đơn đặt hàng nhập | Có | `trx_purchase_orders` (dòng 1211): `po_code`, `partner_id`, `warehouse_id`, `status`, `order_date`, `discount_amount`, `total_amount`, `notes`, `merged_into_po_id`. API `api/purchase-orders` |
| Dòng đơn | Có | `dtl_purchase_order_items` (dòng 1268): `product_id`, `ordered_qty`, `unit_price`, `discount_percent`. Không có cột đơn vị (theo đơn vị cơ sở) |
| Trạng thái đơn | Có | `PurchaseOrderHelper`: `DRAFT`, `ORDERED`, `PARTIAL`, `COMPLETED`, `CANCELLED` |
| Số đã nhận | Có, tính động | Tổng dòng phiếu nhập `COMPLETED` có `purchase_order_id` (`PurchaseOrderHelper.RecalculateStatusAsync`, `PurchaseOrderQueries.cs:119–132`) |
| Số còn chờ | Một phần | Tính được = đặt − đã nhận; chưa có hàm dùng chung trả theo NVL |
| **Ngày giao dự kiến** | **Chưa có** | `TrxPurchaseOrder` chỉ có `order_date`. `specs/purchase-orders/spec.md` (FR-PUR-02, dòng 54, 123, 154) ghi Report 3 yêu cầu trường này nhưng code thiếu |
| Ngày nhận thực tế | Có | `trx_goods_receipts.received_date` |
| Nhận từng phần | Có | Trạng thái `PARTIAL`; nhập ngay từ đơn đặt: `ReceivePurchaseOrderCommand` (`POST api/purchase-orders/{id}/receive`, mới từ `f1a0879`) |
| Hủy đơn, kết thúc đơn | Có | `POST /{id}/cancel`, `/{id}/finish` |
| Phiếu nhập | Có | `trx_goods_receipts` trạng thái `DRAFT`, `COMPLETED`, `CANCELLED`; dòng có `received_qty`, `accepted_qty`, `defective_qty`, `damaged_qty`. Tồn tăng khi `COMPLETED` (`CompletePurchaseCommand`) |
| Nhà cung cấp | Có | `mst_business_partners`; API `api/Suppliers` |
| Thời gian giao của nhà cung cấp | **Chưa có** | grep `lead.?time`: 0 kết quả |
| Điền sẵn đơn đặt từ NVL thiếu | Có | Trang đặt hàng nhập nhận `?products=id:sl` (`CreatePurchaseScreen.tsx`); được gọi từ màn Lập lệnh sản xuất và màn Duyệt kế hoạch |

**Kết luận:** biết được **số lượng** NVL đang đặt, không biết **ngày về**. Vì vậy hàng đang đặt chưa thể đưa vào MRP theo thời gian một cách tin cậy.

## E. Dữ liệu gốc hàng hóa

| Nội dung | Trạng thái | Bằng chứng |
|---|---|---|
| Phân loại hàng | Có | `mst_products.product_type`: `FINISHED`, `SEMI_FINISHED`, `RAW_MATERIAL`, `GOODS`; hàng chưa có loại được coi là thành phẩm |
| Đơn vị cơ sở | Có | `mst_products.base_unit_id` → `mst_units` |
| Kho mặc định | **Chưa có** | Chỉ có `location_name` dạng chữ |
| Tồn tối thiểu, tối đa, điểm đặt hàng | Một phần | Cột `min_safe_stock`, `max_safe_stock`, `reorder_point` có và nhập được (`Features/Products`); chưa phép tính sản xuất hay mua hàng nào dùng |
| Hàng – nhà cung cấp | **Chưa có** | Không có bảng liên kết; nhà cung cấp chỉ gắn ở đơn mua và phiếu nhập |
| Thời gian mua hàng | **Chưa có** | Không có cột |

## F. Phân quyền

`[RequirePermission]` + `[RequireFeature]` (`StockFlow.API/Authorization`). Chức năng liên quan trong `FeatureConstants`: `feat-production-plans`, `feat-production-plan-approval`, `feat-prod-plan`, `feat-prod-issue`, `feat-prod-receipt`, `feat-purchase-orders`. Quyền kho qua `ICurrentUserService.HasWarehouseAccessAsync`.

## G. Lệch giữa code và tài liệu

| # | Tài liệu | Ghi | Code |
|---|---|---|---|
| 1 | `specs/purchase-orders/spec.md` FR-PUR-02 | Đơn đặt có ngày giao dự kiến | Chưa có cột |
| 2 | `specs/production/spec.md` BR-33 | Xuất NVL không vượt "tồn khả dụng" | So với tồn hiện có, không trừ phần giữ |
| 3 | `specs/production/mrp-analysis/01-current-state.md` dòng 13 | "Không có giữ chỗ tồn kho" | Bán hàng có hàng tạm giữ tính động (`ReservedQtyAsync`); sản xuất thì chưa có |
| 4 | `specs/production-planning-implementation/02` | Lập lệnh không kiểm thiếu NVL | Từ `f1a0879`: có kiểm và bắt xác nhận |
| 5 | `database/stockflow.sql`, PlantUML | Sơ đồ ERD | Thiếu bảng kế hoạch sản xuất và các cột thêm sau |
| 6 | `specs/production-planning-analysis/04` mục 5 | Dự báo nhu cầu nằm ngoài phạm vi | MRP theo kế hoạch không trái mục này; dự báo thống kê thì vẫn ngoài phạm vi |

## H. Không xác nhận được từ code

| # | Nội dung |
|---|---|
| U1 | Tín Phát có sản xuất nhiều cấp (bán thành phẩm → thành phẩm) không |
| U2 | Thời gian giao thực tế của từng NVL |
| U3 | Xưởng nghỉ ngày nào |
| U4 | Sản xuất lấy NVL từ một kho cố định hay nhiều kho |
| U5 | NVL có đồng thời được bán không (khi đó hàng tạm giữ của đơn đặt cũng là nhu cầu cạnh tranh) |
| U6 | MRP có UC nào trong Report 3 bản Google Doc không (chưa đọc được bản này) |
