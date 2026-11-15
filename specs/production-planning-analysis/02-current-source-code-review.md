# 02 — Khảo sát mã nguồn hiện tại

- **Nhánh:** `dev`, commit `abd436e`. Đọc tĩnh, không chạy thử trong lần này và không sửa code.
- **Đường dẫn gốc:** backend `StockFlow_Backend/StockFlow.Application/Features/Production/`, frontend `StockFlow_Frontend/src/features/production/`.

## 1. Những gì đang có trong module sản xuất

| Thành phần | Hiện có |
|---|---|
| Controller | `ProductionController` (`/api/production`), `ProductionBomsController` (`/api/production/boms`) |
| Lệnh sản xuất | Tạo, sửa, hủy, đóng sớm, điều chỉnh định mức; một lệnh chứa nhiều thành phẩm |
| Nhu cầu vật tư | Tính từ BOM đang áp dụng khi lập lệnh; xem trước nhu cầu, tồn và thiếu theo kho |
| Xuất vật tư | Phiếu xuất theo lệnh, xuất bổ sung |
| Nhập thành phẩm | Phiếu nhập theo dòng thành phẩm, kho, vị trí, lô; kiểm tra trước khi nhập |
| BOM | Tạo, sửa, kích hoạt, ngừng, xóa |
| Domain | `ProductionOrderStatus` (NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED), `TrxProductionOrder.Status.cs` (`Can*`, `Mark*`), `ProductionPolicy.CalculateRequirement` |
| Frontend | 5 màn: lệnh sản xuất, lập lệnh, xuất vật tư, nhập thành phẩm, BOM |

## 2. Những gì đang có cho kế hoạch sản xuất

| Thành phần | Hiện có | Bằng chứng |
|---|---|---|
| Bảng và migration | Có | `Migrations/20261114083944_AddProductionPlans.cs` |
| Entity | Có | `Domain/Entities/TrxProductionPlan.cs`, `DtlProductionPlanItem.cs` |
| DbSet | Có | `IStockFlowDbContext.cs`, `StockFlowDbContext.cs` |
| Cột liên kết ở lệnh | Có, **không code nào ghi** | `TrxProductionOrder.ProductionPlanId`; `SaveProductionOrderRequest` không có trường kế hoạch |
| Command, Query, DTO, Validator | Không | Tìm `ProductionPlan` trong `Application/Features`: 0 kết quả |
| Endpoint | Không | Hai controller sản xuất không có route kế hoạch |
| Màn hình, service frontend | Không | Tìm trong `src/features/production`: 0 kết quả |
| Hằng trạng thái, phương thức chuyển trạng thái | Không | Không có file `ProductionPlanStatus` |
| Mã quyền, mã chức năng | Không có riêng | Xem mục 4 |
| Sequence sinh mã kế hoạch | Không | `TransactionCodeGenerator` không có loại chứng từ kế hoạch |

## 3. Bảng đánh giá theo chức năng

| Chức năng | Đã có trong source code | Mức độ hoàn thiện | Bằng chứng |
|---|---|---|---|
| Create Production Plan | Không | NOT IMPLEMENTED | Chỉ có entity và bảng |
| View Production Plan | Không | NOT IMPLEMENTED | Không có query hay màn hình |
| Update Production Plan | Không | NOT IMPLEMENTED | — |
| Approve Production Plan | Không | NOT IMPLEMENTED | Có cột `approved_by`, `approval_date`; không có code |
| Generate Production Order | Một phần: tạo lệnh **độc lập** đã có, tạo **từ kế hoạch** chưa có | PARTIAL | `Commands/CreateProductionOrderCommand.cs` không nhận và không gán `ProductionPlanId` |
| Calculate Material Requirements | Có cho **một thành phẩm** hoặc **một lệnh**; chưa có cho cả kế hoạch | PARTIAL | `Queries/GetRequirementPreviewQuery.cs`, `Helpers/ProductionReader.RequirementPreviewAsync`, `Domain/Services/ProductionPolicy.cs` |
| Theo dõi số đã lập lệnh và còn lại theo kế hoạch | Không | NOT IMPLEMENTED | — |
| Kiểm tra thành phẩm có BOM đang áp dụng | Có, ở lập lệnh | IMPLEMENTED (cho lệnh) | `Helpers/ProductionOrderRules.PopulateItemsAndRequirementsAsync` |

## 4. Điểm cần lưu ý khi thiết kế tiếp

1. **Tên chức năng `feat-prod-plan` đã bị dùng cho việc khác.** Trong `FeatureConstants.cs` nó có nhãn "Lập lệnh sản xuất" và đang gác các API tạo, sửa, hủy, đóng lệnh. Màn `/production/create` cũng dùng mã này. Kế hoạch sản xuất cần mã chức năng riêng, nếu không sẽ lẫn với lập lệnh. Mức đánh giá: NEED REVIEW.
2. **Lệnh sản xuất là chứng từ nhiều dòng.** `dtl_production_order_items` giữ sản phẩm, BOM, số kế hoạch, số thực tế của từng thành phẩm. Cột `trx_production_orders.product_id` và `planned_quantity` ở đầu phiếu chỉ còn là giá trị đại diện (sản phẩm đầu tiên, tổng số lượng). Mọi phép tính tiến độ kế hoạch phải đọc ở dòng lệnh.
3. **Một lệnh không cho hai dòng cùng sản phẩm** (`ProductionOrderRules`: "Mỗi thành phẩm chỉ được chọn một dòng"). Kế hoạch thì cho phép. Hai quy tắc này cần được dung hòa khi sinh lệnh từ kế hoạch.
4. **Phần tính nhu cầu vật tư tái sử dụng được.** `RequirementPreviewAsync` trả về định mức, nhu cầu, tồn và thiếu cho một thành phẩm tại một kho. Kế hoạch chỉ cần gọi lặp theo dòng rồi cộng dồn theo vật tư.
5. **Phân quyền hiện tại:** Manager lập và điều hành lệnh; Production Accountant chỉ xem, xuất vật tư, nhập thành phẩm. Chưa có vai trò nào được gán việc lập hay duyệt kế hoạch.
6. **Tài liệu:** `specs/production/spec.md` mô tả lệnh sản xuất là đã có đủ; không nhắc tới kế hoạch. Report 3 chưa có Use Case cho kế hoạch sản xuất.
