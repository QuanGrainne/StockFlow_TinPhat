# 00 — Kế hoạch triển khai Production Planning

- **Ngày:** 14/11/2026. **Người phụ trách:** Ninh. **Nhánh:** `feature/production-planning` (đang trùng `dev` tại `abd436e`, đã fetch, `dev` không có commit mới).
- **Đầu vào:** `specs/production-planning-analysis/01..07` và các quyết định đã chốt ngày 14/11/2026 (file 06 mục 3: phương án mặc định cho Q1–Q12, phương án A ở file 07).
- **Phạm vi lượt này:** Phase 0, Phase 1, Phase 2. Phase 3 (frontend), 4 (kiểm thử), 5 (nghiệm thu) làm sau khi được xác nhận.

## 1. Đối chiếu tài liệu phân tích với source code

| Nội dung trong tài liệu | Kiểm tra lại trên code | Kết quả |
|---|---|---|
| Bảng `trx_production_plans`, `dtl_production_plan_items`, cột `trx_production_orders.production_plan_id` đã có | `StockFlowDbContext.cs` dòng 1675–1759, migration `20261114083944_AddProductionPlans` | Khớp |
| Chưa có handler, API, màn hình nào dùng kế hoạch | Tìm `ProductionPlan` trong `Application/Features`, `API/Controllers`, `src/features/production` | Khớp (0 kết quả) |
| `feat-prod-plan` mang nghĩa "Lập lệnh sản xuất" | `FeatureConstants.cs:65`, `ProductionController` | Khớp |
| Một lệnh không có hai dòng cùng thành phẩm | `ProductionOrderRules.cs:66` | Khớp |
| Sinh mã chứng từ qua `ITransactionCodeGenerator` + sequence | `TransactionCodeGenerator.cs` chưa có loại kế hoạch | Khớp; cần thêm loại `PRODUCTION_PLAN` |
| **Điểm mới phát hiện:** mã quyền `PROD_APPROVE` phân biệt được Manager và Production Accountant | `FeatureConstants.DeriveModulePermissionCodes`: với vai trò **đã lưu ma trận chức năng**, tick bất kỳ chức năng nào của phân hệ PROD là có đủ `PROD_READ/CREATE/UPDATE/DELETE/APPROVE`. Vai trò **chưa cấu hình** dùng `PermissionConstants.GetDefaultPermissionCodes` (Production Accountant: `PROD_READ` + `PROD_UPDATE`) | **Không khớp giả định.** Việc tách quyền duyệt phải làm bằng chức năng (`[RequireFeature]`), không bằng `PROD_APPROVE` (xem K3) |
| **Điểm mới phát hiện:** cơ chế chống ghi đồng thời | Không handler nào khóa dòng; `IStockFlowDbContext` không có hàm khóa; Application chỉ tham chiếu `Microsoft.EntityFrameworkCore` (không có `FromSql`) | Cần thêm một hàm khóa vào `IStockFlowDbContext` (mục 4, R1) |
| Lập lệnh theo kế hoạch dùng lại được logic lập lệnh | `ProductionOrderRules.PopulateItemsAndRequirementsAsync` nhận `SaveProductionOrderRequest`, tự kiểm BOM, tính nhu cầu, hỗ trợ chỉnh định mức | Khớp, tái sử dụng nguyên trạng |
| Sửa lệnh đang có có thể làm vượt kế hoạch | `UpdateProductionOrderCommand` cho đổi thành phẩm và số lượng khi lệnh `NOT_STARTED` | Phải thêm kiểm tra cho lệnh thuộc kế hoạch (BR-PP-20) |

## 2. Quyết định kỹ thuật (do người triển khai chọn, có thể đổi)

Hai việc còn mở ở file 06 được chốt như sau vì phát hiện ở mục 1 buộc phải dùng chức năng để tách quyền:

| # | Quyết định | Lý do |
|---|---|---|
| K1 | Thêm 2 chức năng: `feat-production-plans` "Kế hoạch sản xuất" (xem, lập, sửa, gửi duyệt, hủy kế hoạch chưa duyệt của mình) và `feat-production-plan-approval` "Duyệt kế hoạch sản xuất" (duyệt, từ chối, sửa kế hoạch đã duyệt, hủy, đóng) | `PROD_APPROVE` không phân biệt được vai trò. Cùng cách với `feat-credit-approvals` đang có. Tên khác hẳn `feat-prod-plan` để không nhầm. Không đổi tên mã cũ vì ma trận đã lưu trong DB |
| K2 | Mặc định: Manager có cả hai; Production Accountant (`ROLE_PRODUCTION`) có `feat-production-plans`; Admin có tất cả | Q1, Q2 đã chốt |
| K3 | Mã quyền: xem `PROD_READ`; lập, sửa, gửi duyệt, hủy `PROD_UPDATE`; duyệt, từ chối, đóng `PROD_APPROVE`; lập lệnh từ kế hoạch `PROD_CREATE` + `feat-prod-plan` | Giữ quy ước mỗi API khai `[RequirePermission]`; chặn thực tế nằm ở `[RequireFeature]`. **Đã sửa khi kiểm thử Phase 2:** bản đầu dùng `PROD_CREATE`/`PROD_DELETE` cho lập / hủy kế hoạch, nhưng vai trò Production Accountant chưa cấu hình ma trận chỉ có `PROD_READ` + `PROD_UPDATE` (`PermissionConstants.GetDefaultPermissionCodes`) nên bị 403. Đổi sang `PROD_UPDATE`, đúng quy ước sẵn có "thao tác ghi của Production Accountant dùng PROD_UPDATE"; không sửa quyền mặc định của vai trò |
| K4 | Lập lệnh từ kế hoạch là API riêng `POST /api/production/plans/{id}/orders`, body dùng lại `SaveProductionOrderRequest` | Không sửa `CreateProductionOrderCommand` đang chạy (Q4: vẫn cho lập lệnh trực tiếp) |
| K5 | Chống ghi đồng thời bằng khóa tư vấn PostgreSQL theo giao dịch (`pg_advisory_xact_lock`), khóa theo từng kế hoạch, qua hàm mới `IStockFlowDbContext.AcquireTransactionLockAsync` | Không thêm package, không đổi schema. Mọi thao tác ghi lên một kế hoạch và việc sửa lệnh thuộc kế hoạch chạy tuần tự |
| K6 | Số đã lập lệnh = tổng số lượng trên dòng lệnh của các lệnh thuộc kế hoạch, **trừ lệnh `CANCELLED`**. Lệnh đóng sớm (`COMPLETED` nhưng thiếu số) vẫn tính đủ số đã lập | BR-PP-10. Lệnh đóng sớm không trả số về kế hoạch; muốn làm thêm thì Manager tăng số trên kế hoạch |
| K7 | Lý do từ chối và hủy được nối vào cuối `notes`: `[Từ chối dd/MM/yyyy HH:mm - Tên] lý do`. Lý do tối đa 200 ký tự. Khi tổng vượt 500 ký tự, giữ 500 ký tự cuối | Q đã chốt "ghi vào notes"; cột chỉ có 500 ký tự |
| K8 | API chi tiết trả kèm danh sách thao tác được phép (`AllowedActions`) do backend tính theo trạng thái và chức năng của người dùng | Frontend không tự quyết định trạng thái nghiệp vụ |
| K9 | Không phân trang phía server cho danh sách kế hoạch | Theo cách các danh sách sản xuất hiện có đang làm |
| K10 | Không lọc sản phẩm theo loại (thành phẩm / NVL) | Code lập lệnh hiện cũng chỉ kiểm "đang hoạt động" + "có BOM đang áp dụng"; chưa có tập giá trị `product_type` được xác nhận |

## 3. Danh sách chức năng và Use Case

| # | Chức năng | UC | Phase |
|---|---|---|---|
| F1 | Danh sách kế hoạch (lọc trạng thái, kỳ, từ khóa) | UC-PP-01 | 2 |
| F2 | Chi tiết kế hoạch kèm số đã lập lệnh, còn lại, đã nhập kho, danh sách lệnh, thao tác được phép | UC-PP-01 | 2 |
| F3 | Lập kế hoạch (DRAFT) | UC-PP-02 | 2 |
| F4 | Sửa kế hoạch (toàn bộ khi DRAFT/REJECTED; hạn chế khi APPROVED) | UC-PP-02 | 2 |
| F5 | Nhu cầu NVL dự kiến: theo kế hoạch đã lưu và xem trước khi đang soạn | UC-PP-03 | 2 |
| F6 | Gửi duyệt | UC-PP-04 | 2 |
| F7 | Duyệt / từ chối | UC-PP-04 | 2 |
| F8 | Hủy kế hoạch | UC-PP-06 | 2 |
| F9 | Đóng kế hoạch | UC-PP-06 | 2 |
| F10 | Lập lệnh sản xuất từ kế hoạch (một phần / toàn bộ, nhiều lần, không vượt số còn lại) | UC-PP-05 | 2 |
| F11 | Chặn sửa lệnh thuộc kế hoạch làm vượt số kế hoạch | UC-PP-05, BR-PP-20 | 2 |
| F12 | Hiện mã kế hoạch trên lệnh sản xuất | UC-PP-01 | 2 (DTO), 3 (UI) |
| F13 | Màn hình kế hoạch, thêm mục menu, ma trận phân quyền | — | 3 |

Thứ tự phụ thuộc: Phase 1 (trạng thái, sequence) → F3 → F1, F2 → F4, F5 → F6 → F7 → F10, F11 → F8, F9.

## 4. File dự kiến tạo / sửa

### Phase 1 — Database và Domain

| Hành động | File |
|---|---|
| Tạo | `StockFlow.Domain/Entities/ProductionPlanStatus.cs` |
| Tạo | `StockFlow.Domain/Entities/TrxProductionPlan.Status.cs` (partial: `Can*`, `Mark*`) |
| Tạo | Migration `AddProductionPlanCodeSequence` (chỉ `CREATE SEQUENCE stockflow.seq_production_plan_code`) |
| Sửa | `StockFlow.Infrastructure/Services/TransactionCodeGenerator.cs` (loại `PRODUCTION_PLAN`, tiền tố `KHSX`) |

Không thêm bảng, cột, index. Không động tới migration cũ, seed, appsettings.

### Phase 2 — Backend

| Hành động | File |
|---|---|
| Sửa | `Application/Common/Interfaces/IStockFlowDbContext.cs`, `Infrastructure/Persistence/StockFlowDbContext.cs` (hàm `AcquireTransactionLockAsync`) |
| Sửa | `Application/Features/Roles/Common/FeatureConstants.cs` (2 chức năng mới + mặc định theo vai trò) |
| Tạo | `Application/Features/Production/DTOs/ProductionPlanDtos.cs` |
| Tạo | `Application/Features/Production/Helpers/ProductionPlanRules.cs`, `ProductionPlanReader.cs` |
| Tạo | `Commands/`: `CreateProductionPlanCommand`, `UpdateProductionPlanCommand`, `SubmitProductionPlanCommand`, `ApproveProductionPlanCommand`, `RejectProductionPlanCommand`, `CancelProductionPlanCommand`, `CloseProductionPlanCommand`, `CreateProductionOrderFromPlanCommand` |
| Tạo | `Queries/`: `GetProductionPlansQuery`, `GetProductionPlanByIdQuery`, `GetPlanMaterialRequirementsQuery`, `PreviewPlanMaterialRequirementsQuery` |
| Tạo | `API/Controllers/ProductionPlansController.cs` (`api/production/plans`) |
| Sửa | `Commands/UpdateProductionOrderCommand.cs` (F11) |
| Sửa | `Helpers/ProductionReader.cs`, `DTOs/ProductionDtos.cs` (thêm mã kế hoạch vào DTO lệnh, tham số tùy chọn ở cuối) |
| Sửa | `API/Controllers/ProductionController.cs` (cho chức năng kế hoạch dùng API tra cứu thành phẩm) |

### Phase 3 — Frontend (chưa làm)

`src/features/production-plans/` hoặc trong `src/features/production/` (screens, components, services, types); `src/lib/navigation/navbar.ts`; `AppLayout.tsx`; `src/app/(dashboard)/production/plans/page.tsx`; `features/admin/services/permissionService.ts` (mặc định chức năng phía frontend).

## 5. Rủi ro

| # | Rủi ro | Loại | Cách xử lý |
|---|---|---|---|
| R1 | Hai người lập lệnh từ cùng kế hoạch cùng lúc làm vượt số còn lại | Kỹ thuật | K5: khóa theo kế hoạch trong giao dịch; đọc lại số đã lập sau khi có khóa |
| R2 | Vai trò đã lưu ma trận chức năng (có `FEAT__CONFIGURED`) sẽ **không** tự có 2 chức năng mới | Vận hành | Admin phải tick trong màn Phân quyền chức năng; màn này cần Phase 3 mới hiện 2 mục mới. Vai trò chưa cấu hình dùng mặc định ngay |
| R3 | Sửa lệnh thuộc kế hoạch (đổi thành phẩm, tăng số) làm vượt kế hoạch | Nghiệp vụ | F11 |
| R4 | `notes` 500 ký tự bị cắt khi từ chối / hủy nhiều lần | Dữ liệu | K7; khoảng trống G2 ở file 07 đã ghi nhận |
| R5 | BOM bị ngừng sau khi kế hoạch được duyệt | Nghiệp vụ | Lập lệnh vẫn kiểm BOM đang áp dụng (logic có sẵn) và báo lỗi |
| R6 | Không có project test tự động; thêm xUnit cần thêm package | Quy trình | Phase 2 kiểm thử bằng chạy API thật trên DB tạm. Đề xuất thêm project test ở Phase 4, cần nhóm duyệt package |
| R7 | Báo cáo Report 3 chưa có UC-PP / BR-PP | Tài liệu | Nhóm cấp mã chính thức trước khi PR |
| R8 | Migration tự chạy khi API khởi động | Vận hành | Migration chỉ `CREATE SEQUENCE IF NOT EXISTS`, chạy lại an toàn, có `Down` |

## 6. Cần Product Owner xác nhận (không chặn Phase 1–2)

1. K1–K3: tên và cách tách 2 chức năng kế hoạch.
2. K6: lệnh đóng sớm không trả số lượng thiếu về kế hoạch.
3. K7: cách ghi lý do vào `notes`.
4. Tiền tố mã kế hoạch `KHSX` (ví dụ `KHSX00001`).
5. Đưa UC-PP-01..06, BR-PP-01..24 vào Report 3.

## 7. Tiêu chí nghiệm thu của Phase 1–2

- `dotnet build StockFlow.sln` 0 lỗi, số cảnh báo không tăng.
- Migration mới chạy được trên DB tạm, chạy lại và `Down` được; `dotnet ef migrations add` kiểm tra không có thay đổi model bị sót.
- Các API mới chạy đúng trên DB tạm theo bộ kịch bản ở báo cáo Phase 2, gồm lập lệnh đồng thời và người không có quyền.
- Các API sản xuất cũ (lập, sửa, hủy lệnh) vẫn chạy.
