# 01 — Khảo sát hiện trạng (Phần 1)

- **Ngày:** 16/11/2026. **Nhánh khảo sát:** `feature/production-planning` (commit `7c39693` + phần R-05 chưa commit).
- **Cách làm:** đọc entity trong `StockFlow.Domain/Entities`, handler trong `StockFlow.Application/Features`, và grep toàn bộ `StockFlow.Application` + `StockFlow.Domain`. Không sửa code.
- **Ký hiệu:** **Đã có** / **Một phần** / **Chưa có** / **Chưa hoàn chỉnh** (có nhưng thiếu so với nhu cầu MRP).

Đường dẫn dưới đây tính từ `StockFlow_Backend/`. `Features/` là `StockFlow.Application/Features/`.

## 1. Bảng đối chiếu nghiệp vụ với code và database

| # | Nghiệp vụ MRP cần | Hiện trạng | Bằng chứng | Ghi chú cho MRP |
|---|---|---|---|---|
| 1 | Kế hoạch sản xuất (đầu phiếu) | **Đã có** | Bảng `trx_production_plans` (`TrxProductionPlan`): mã, tên, `period_start`, `period_end`, `status`, người lập / duyệt, `updated_at` | Vòng đời DRAFT → PENDING_APPROVAL → APPROVED → CLOSED / CANCELLED (`ProductionPlanStatus`, `TrxProductionPlan.Status.cs`) |
| 2 | Chi tiết kế hoạch | **Đã có** | `dtl_production_plan_items` (`DtlProductionPlanItem`): `product_id`, `planned_quantity`, `planned_start_date`, `planned_end_date`, `warehouse_id` (kho nhận, tùy chọn) | Mỗi thành phẩm một dòng (validator trong `ProductionPlanRules.cs`). Ngày là `DateOnly`, theo dòng |
| 3 | BOM có phiên bản | **Đã có** | `mst_boms.version`, `is_active`; `BomRules.NextVersionAsync`, `BomRules.ActivateAsync`; chỉ mục duy nhất `uq_mst_boms_active_product` | Mỗi thành phẩm tối đa một BOM đang áp dụng. Không có ngày hiệu lực |
| 4 | Định mức và hao hụt | **Đã có** | `dtl_bom_items.quantity` (numeric 18,4), `wastage_rate` (0–100%); công thức `ProductionPolicy.CalculateRequirement` (BR-31) | Nhu cầu = SL × định mức × (1 + hao hụt / 100), làm tròn 2 chữ số |
| 5 | Đơn vị tính của BOM | **Đã có** | `BomRules.ReplaceItems`: `UnitId = material.BaseUnitId` | Dòng BOM luôn dùng đơn vị cơ sở của NVL |
| 6 | Quy đổi đơn vị | **Một phần** | Bảng `mst_unit_conversions` (`MstUnitConversion`) có trong schema, nhưng **không handler nào dùng** (grep `MstUnitConversions` trong `Features`: 0 kết quả) | MRP nên tính toàn bộ theo đơn vị cơ sở, không cần quy đổi |
| 7 | Xác định NVL của thành phẩm | **Đã có** | BOM đang áp dụng → `DtlBomItems`; `ProductionPlanRules.ProductsWithoutActiveBomAsync` | |
| 8 | BOM nhiều cấp | **Chưa có** | `BomRules.ValidateAsync` chỉ kiểm NVL tồn tại và đang hoạt động, **không kiểm loại hàng**; phân rã chỉ một cấp (`ProductionPlanReader.MaterialRequirementsAsync`, `ProductionOrderRules.PopulateItemsAndRequirementsAsync`) | Bán thành phẩm có thể nằm trong BOM như một NVL, nhưng hệ thống không phân rã tiếp xuống BOM của nó |
| 9 | Tính nhu cầu NVL theo kế hoạch | **Đã có** | `GetPlanMaterialRequirementsQuery`, `PreviewPlanMaterialRequirementsQuery`, `ProductionPlanReader.MaterialRequirementsAsync`; API `GET /api/production/plans/{id}/material-requirements` | Cộng dồn theo NVL cho **một** kế hoạch, theo tổng và theo số còn lại chưa lập lệnh. **Không có chiều thời gian**, không gộp nhiều kế hoạch |
| 10 | Nhu cầu NVL của lệnh sản xuất | **Đã có** | Bảng `trx_production_material_requirements`: `required_qty`, `issued_qty`, `shortage_qty`, `norm_per_unit`, `is_adjusted` | Nhu cầu được chụp lại khi lập lệnh; `shortage_qty` = còn phải xuất |
| 11 | Tồn kho hiện tại | **Đã có** | `trx_inventory_balances` (kho, vị trí, hàng, lô, số lượng, giá vốn); `ProductionStockOps.AvailableAsync` cộng mọi vị trí / lô của một kho | Tồn là tồn thực tế. **Không trừ** phần đã hứa cho lệnh / kế hoạch khác; **không lọc** lô hết hạn |
| 12 | Kho và vị trí | **Đã có** | `mst_warehouses`, `mst_warehouse_locations`; quyền kho qua `ICurrentUserService.HasWarehouseAccessAsync` | Kế hoạch không có kho NVL; người dùng chọn kho khi xem tồn (quyết định Q8, Q10) |
| 13 | Giữ chỗ / phân bổ NVL | **Chưa có** | grep `reserv`, `allocat`, "giữ chỗ" trong Application + Domain: chỉ có phân bổ tiền thanh toán (`CreateCustomerPaymentCommand`) và phân bổ chi phí nhập (`DtlInboundCostAllocation`) | Không có bảng hay cột nào giữ chỗ tồn kho |
| 14 | Thời gian cung ứng NVL (lead time) | **Chưa có** | grep `lead.?time`: 0 kết quả. `MstProduct`, `MstBusinessPartner` không có cột nào về thời gian giao | Phải bổ sung dữ liệu |
| 15 | Ngày giao dự kiến của đơn mua | **Chưa có** | `TrxPurchaseOrder` chỉ có `order_date`; `DtlPurchaseOrderItem` không có ngày; grep `ExpectedDate`, `DeliveryDate`: 0 kết quả | Biết **số lượng** đang đặt, không biết **khi nào** về |
| 16 | Số đang đặt mua chưa về | **Một phần** | Đơn mua `ORDERED` / `PARTIAL` (`PurchaseOrderHelper`); số đã nhận tính từ phiếu nhập `COMPLETED` gắn `purchase_order_id` (`PurchaseOrderHelper.RecalculateStatusAsync`) | Tính được số còn chờ = đặt − đã nhận theo (đơn mua, hàng). Chưa có hàm dùng chung trả về số này |
| 17 | Kiểm nhận hàng mua | **Một phần** | Phiếu nhập có trạng thái `DRAFT` → `COMPLETED` (`CompletePurchaseCommand`); dòng phiếu có `received_qty`, `accepted_qty`, `defective_qty`, `damaged_qty` | Tồn chỉ tăng khi phiếu `COMPLETED`, theo `accepted_qty`. Không có trạng thái "đang kiểm nhận" riêng, không có thời gian kiểm nhận |
| 18 | Hàng đang chuyển kho | **Đã có** | `trx_stock_transfers` trạng thái `IN_TRANSIT` (`TransferStatus`), dòng có `issued_quantity` | Có thể tính là nguồn sắp về kho đích. Không có ngày dự kiến đến |
| 19 | Lô, hạn sử dụng | **Một phần** | `mst_inventory_lots.expiry_date`, `mfg_date`. Chỉ màn chi tiết đơn hàng đọc `ExpiryDate` (`GetOrderDetailQuery`) | Xuất NVL (`ProductionStockOps.IssueAsync`) không ưu tiên hay loại lô theo hạn |
| 20 | Hàng lỗi, không đạt | **Một phần** | Phiếu nhập ghi `defective_qty`, `damaged_qty`; xuất hủy hàng lỗi (`Features/Disposals`) | Không có trạng thái chất lượng trên tồn kho. Hàng trong `trx_inventory_balances` đều được coi là dùng được |
| 21 | Lịch sản xuất theo ngày / công đoạn | **Chưa có** | Không có entity công đoạn, máy, ca. Kế hoạch chỉ có ngày bắt đầu / kết thúc theo dòng; lệnh có `start_date`, `end_date`, `workshop` (chữ tự do) | |
| 22 | Lịch làm việc, ngày nghỉ | **Chưa có** | grep `holiday`, `calendar`: 0 kết quả | |
| 23 | Kiểm NVL trước khi sản xuất | **Một phần** | Xem trước nhu cầu khi lập lệnh (`GetRequirementPreviewQuery`); chặn xuất quá tồn (`CreateMaterialIssueCommand`, BR-33); chặn khi đang kiểm kho (`StocktakeGuard`, BR-42) | Lập và bắt đầu lệnh **không** bị chặn khi thiếu NVL; thiếu chỉ là cảnh báo (BR-PP-15) |
| 24 | Lệnh sản xuất | **Đã có** | `trx_production_orders`, `dtl_production_order_items`, liên kết `production_plan_id`; xuất NVL `trx_stock_issues` loại `PRODUCTION`; nhập thành phẩm `trx_finished_goods_receipts` | |
| 25 | Mức tồn an toàn của NVL | **Một phần** | `mst_products.min_safe_stock`, `max_safe_stock`, `reorder_point` có trong danh mục hàng (`Features/Products`) | Chưa được dùng trong phép tính sản xuất nào |
| 26 | Nhà cung cấp của NVL | **Chưa có** | Không có bảng liên kết hàng – nhà cung cấp; nhà cung cấp chỉ gắn ở đơn mua / phiếu nhập (`partner_id`) | Đề xuất mua không tự chọn được nhà cung cấp, trừ khi suy từ lần mua gần nhất |
| 27 | Phân quyền | **Đã có** | `[RequirePermission]`, `[RequireFeature]`; chức năng `feat-production-plans`, `feat-production-plan-approval`, `feat-prod-plan`, `feat-prod-issue`, `feat-prod-receipt` (`FeatureConstants.cs`) | MRP cần quyết định dùng lại hay thêm chức năng mới |

## 2. Kết luận hiện trạng

- StockFlow đã có **phần lõi của phép tính MRP một cấp**: BOM có phiên bản và hao hụt, công thức nhu cầu, cộng dồn theo NVL cho một kế hoạch, so với tồn một kho.
- Phần **chưa có** là mọi thứ liên quan tới thời gian và nguồn cung: lead time, ngày hàng về, lịch làm việc, giữ chỗ, gộp nhiều kế hoạch, BOM nhiều cấp.
- Hiện tại nhu cầu của kế hoạch được **tính khi xem, không lưu** (quyết định Q8 và G8 ở `specs/production-planning-analysis`). MRP giai đoạn đầu nên giữ cách này.

## 3. UNKNOWN (không kết luận được từ code)

| # | Nội dung | Vì sao chưa rõ |
|---|---|---|
| U1 | Tín Phát có sản xuất nhiều cấp (bán thành phẩm → thành phẩm) trong thực tế không | Code cho phép loại `SEMI_FINISHED` nhưng không có dữ liệu mẫu hay quy trình nào dùng |
| U2 | Thời gian giao hàng thực tế của từng NVL / nhà cung cấp | Không có dữ liệu trong hệ thống |
| U3 | Xưởng có nghỉ thứ Bảy, Chủ nhật, lễ không | Không có lịch làm việc |
| U4 | NVL của sản xuất có đồng thời được bán trực tiếp không (`is_direct_sale`) | Nếu có, đơn bán cũng là nhu cầu cạnh tranh với sản xuất |
| U5 | Sản xuất lấy NVL từ một kho cố định hay nhiều kho | Phiếu xuất NVL chọn kho tự do; kế hoạch không ghi kho NVL |
