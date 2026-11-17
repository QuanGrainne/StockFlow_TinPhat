# 02 — Báo cáo Phase 2: Backend API và Business Logic

- **Ngày:** 15/11/2026. **Nhánh:** `feature/production-planning` (chưa commit, chưa push).
- **Phạm vi:** UC-PP-01..06 (mã tạm), quy tắc BR-PP theo `specs/production-planning-analysis/06-business-rules.md` và các quyết định K1–K10 ở `00-implementation-plan.md`.
- **Kết quả:** build 0 lỗi 0 cảnh báo; **57/57 kịch bản API đạt** trên DB tạm; không có lỗi 500.

## 1. API mới — `api/production/plans`

| Method | Route | Use Case | `[RequirePermission]` | `[RequireFeature]` | Kiểm thêm trong handler |
|---|---|---|---|---|---|
| GET | `/` | UC-PP-01 danh sách (lọc `statuses`, `fromDate`, `toDate`, `search`) | PROD_READ | plans, approval, feat-prod-plan | — |
| GET | `/{id}` | UC-PP-01 chi tiết + tiến độ + `actions` | PROD_READ | plans, approval, feat-prod-plan | — |
| POST | `/` | UC-PP-02 lập (DRAFT) | PROD_UPDATE | plans, approval | Thành phẩm đang hoạt động; kho nhận thuộc quyền |
| PUT | `/{id}` | UC-PP-02 sửa | PROD_UPDATE | plans, approval | DRAFT/REJECTED: toàn bộ; APPROVED: chỉ người có quyền duyệt, sửa hạn chế |
| POST | `/{id}/submit` | UC-PP-04 gửi duyệt | PROD_UPDATE | plans, approval | Mọi thành phẩm có BOM đang áp dụng |
| POST | `/{id}/approve` | UC-PP-04 duyệt | PROD_APPROVE | approval | Chỉ PENDING_APPROVAL |
| POST | `/{id}/reject` | UC-PP-04 từ chối | PROD_APPROVE | approval | Bắt buộc lý do |
| POST | `/{id}/cancel` | UC-PP-06 hủy | PROD_UPDATE | plans, approval | Chưa duyệt: người lập hoặc người duyệt; đã duyệt: người duyệt + không còn lệnh chưa hủy |
| POST | `/{id}/close` | UC-PP-06 đóng | PROD_APPROVE | approval | Chỉ APPROVED |
| GET | `/{id}/material-requirements?warehouseId=` | UC-PP-03 (đã lưu) | PROD_READ | plans, approval, feat-prod-plan | Kho phải thuộc quyền |
| POST | `/material-requirements/preview` | UC-PP-03 (đang soạn) | PROD_READ | plans, approval | Kho phải thuộc quyền |
| POST | `/{id}/orders` | UC-PP-05 lập lệnh từ kế hoạch | PROD_CREATE | feat-prod-plan | APPROVED; không vượt số còn lại; khóa theo kế hoạch |

`plans` = `feat-production-plans`, `approval` = `feat-production-plan-approval`. Body lập lệnh dùng lại `SaveProductionOrderRequest` của UC-59 (hỗ trợ cả chỉnh định mức BR-51).

### Thay đổi ở API cũ

| API | Thay đổi | Lý do |
|---|---|---|
| `PUT /api/production/orders/{id}` | Lệnh thuộc kế hoạch: giữ khóa kế hoạch và chặn nếu thành phẩm ngoài kế hoạch hoặc vượt số còn lại (không tính chính lệnh đó) | BR-PP-20; không có thì sửa lệnh vượt được kế hoạch. Lệnh không thuộc kế hoạch không đổi hành vi |
| `GET /api/production/orders`, `/orders/{id}` | DTO thêm `productionPlanId`, `productionPlanCode` (tham số tùy chọn ở cuối record) | Truy vết lệnh về kế hoạch; frontend cũ bỏ qua trường mới |
| `GET /api/production/lookups/products` | Thêm 2 chức năng kế hoạch vào `[RequireFeature]` | Production Accountant cần tìm thành phẩm khi lập kế hoạch |
| `POST /api/production/orders` (lập lệnh trực tiếp) | Không đổi | Q4: vẫn cho lập lệnh không qua kế hoạch |

## 2. Phân quyền

| Vai trò (mặc định, chưa cấu hình ma trận) | Chức năng mới | Được làm |
|---|---|---|
| Admin | Tất cả | Mọi thao tác |
| Manager | `feat-production-plans`, `feat-production-plan-approval` (+ `feat-prod-plan` có sẵn) | Lập, duyệt, từ chối, sửa sau duyệt, hủy, đóng, lập lệnh |
| Production Accountant (`ROLE_PRODUCTION`) | `feat-production-plans` | Xem, lập, sửa (DRAFT/REJECTED), gửi duyệt, hủy kế hoạch chưa duyệt của mình |
| Sales, Warehouse | Không | Không xem được (403) |

Cùng một luật được dùng ở hai nơi qua `ProductionPlanPermissions.Check*`: command dùng để chặn, query chi tiết dùng để trả `actions` (`canEdit`, `isLimitedEdit`, `canSubmit`, `canApprove`, `canReject`, `canCancel`, `canClose`, `canCreateOrder`). Frontend chỉ đọc cờ này, không tự suy ra trạng thái.

## 3. Lập lệnh từ kế hoạch: xử lý yêu cầu đặc biệt

| Yêu cầu | Cách làm | Kịch bản |
|---|---|---|
| Chỉ từ kế hoạch đủ điều kiện | `TrxProductionPlan.CanCreateOrder()` = APPROVED | PP-46 |
| Toàn bộ hoặc một phần | Mỗi thành phẩm nhập số ≤ số còn lại | PP-28, PP-32 |
| Không vượt số còn lại | `ProductionPlanRules.ValidateOrderQuantitiesAsync` (Q7: chặn) | PP-30, PP-33 |
| Nhiều lệnh từ một dòng | Số đã lập = tổng dòng lệnh chưa hủy theo thành phẩm (BR-PP-10) | PP-32 |
| Không trùng khi gửi nhiều lần / đồng thời | `IStockFlowDbContext.AcquireTransactionLockAsync` (`pg_advisory_xact_lock`) theo khóa `production-plan:{id}`; số đã lập đọc lại sau khi có khóa. Mọi thao tác ghi lên kế hoạch và sửa lệnh thuộc kế hoạch dùng cùng khóa | PP-44: 5 request đồng thời × 30, còn 70 → đúng 2 thành công |
| Cập nhật số đã thực hiện | Không lưu; tính khi đọc (đã lập, còn lại, đã nhập kho). Hủy lệnh tự trả số về kế hoạch | PP-29, PP-43, PP-57 |
| Không đổi lệnh đã tạo | Lập lệnh mới chỉ thêm bản ghi; đóng / hủy kế hoạch không động tới lệnh | PP-46 |
| Không tự đổi trạng thái kế hoạch | Kế hoạch không tự chuyển khi lập đủ lệnh (Q9) | PP-32 (vẫn APPROVED, `canCreateOrder=false`) |

## 4. File đã tạo / sửa

**Tạo (Phase 2):**
- `StockFlow.API/Controllers/ProductionPlansController.cs`
- `StockFlow.Application/Features/Production/DTOs/ProductionPlanDtos.cs`
- `StockFlow.Application/Features/Production/Helpers/ProductionPlanRules.cs` (validator dùng chung, `ProductionPlanPermissions`, tính số đã lập, ghi lý do)
- `StockFlow.Application/Features/Production/Helpers/ProductionPlanReader.cs`
- `Commands/`: `CreateProductionPlanCommand`, `UpdateProductionPlanCommand`, `SubmitProductionPlanCommand`, `ApproveProductionPlanCommand`, `RejectProductionPlanCommand`, `CancelProductionPlanCommand`, `CloseProductionPlanCommand`, `CreateProductionOrderFromPlanCommand`
- `Queries/`: `GetProductionPlansQuery`, `GetProductionPlanByIdQuery`, `GetPlanMaterialRequirementsQuery`, `PreviewPlanMaterialRequirementsQuery`
- `specs/production-planning-implementation/api-tests/` (`pptest.ps1`, `pptest2.ps1`, `env.ps1`)

**Sửa:**
- `StockFlow.Application/Common/Interfaces/IStockFlowDbContext.cs`, `StockFlow.Infrastructure/Persistence/StockFlowDbContext.cs`: thêm `AcquireTransactionLockAsync`
- `StockFlow.Application/Features/Roles/Common/FeatureConstants.cs`: 2 chức năng mới + mặc định Manager / Production Accountant
- `Commands/UpdateProductionOrderCommand.cs`, `Helpers/ProductionReader.cs`, `DTOs/ProductionDtos.cs`, `API/Controllers/ProductionController.cs`

Không thêm package. Không có `any`/`console.log` (không đổi frontend). Không đổi URL hay route cũ.

## 5. Kiểm thử

**Cách chạy:** API build Debug chạy trên DB tạm `stockflow_verify_pp` (tạo mới, API tự migrate + seed, xóa sau khi xong), cổng 5196. `api-tests/env.ps1 -DbName <db>` đặt biến môi trường (từ chối `stockflow_dev`), rồi chạy `pptest.ps1` và `pptest2.ps1`. Repo chưa có project test tự động; thêm xUnit cần thêm package nên để Phase 4 xin duyệt.

**Kết quả: 57 kịch bản, 57 đạt, 0 lỗi.** Log API: 0 unhandled exception; 7 dòng `ValidationException` đúng là các ca validation cố ý (PP-02..06, 08, 10).

| Nhóm | Kịch bản | Đạt |
|---|---|---|
| Phân quyền | PP-01 Sales 403; PP-19, PP-45 Production Accountant gọi duyệt / đóng 403; PP-27 Production Accountant lập lệnh 403; PP-36 Production Accountant sửa kế hoạch đã duyệt bị chặn; PP-47 hủy kế hoạch của người khác bị chặn | 6/6 |
| Validation | PP-02 không có dòng; PP-03 số lượng 0; PP-04 ngày dòng ngược; PP-05 dòng ngoài kỳ; PP-06 trùng thành phẩm; PP-07 thành phẩm không tồn tại; PP-08 kỳ ngược; PP-09 kho không thuộc quyền; PP-10 quá 2 chữ số thập phân | 9/9 |
| Lập, sửa, gửi duyệt, duyệt | PP-11 lập (KHSX00001, DRAFT); PP-12 cảnh báo thiếu BOM; PP-13 gửi duyệt bị chặn khi thiếu BOM; PP-14 sửa nháp; PP-15 gửi duyệt; PP-16 không sửa khi chờ duyệt; PP-17, PP-18 `actions` theo người dùng; PP-20, PP-21 từ chối (bắt buộc lý do, ghi vào ghi chú); PP-22 sửa và gửi lại; PP-23 duyệt (ghi người, thời điểm) | 12/12 |
| Nhu cầu NVL | PP-24 cộng dồn MAT1 = 252,5, MAT2 = 55, thiếu 45; PP-25 kho không có quyền bị chặn; PP-26 xem trước khi đang soạn, thành phẩm thiếu BOM liệt kê riêng | 3/3 |
| Lập lệnh từ kế hoạch | PP-28 lập một phần; PP-29 đã lập / còn lại; PP-30 vượt số còn lại; PP-31 thành phẩm ngoài kế hoạch; PP-32 lập nhiều lần + nhiều thành phẩm một lệnh; PP-33 hết số còn lại; PP-34, PP-35 sửa lệnh thuộc kế hoạch; PP-43 hủy lệnh trả số; **PP-44 đồng thời**; PP-50 số lượng lớn (1.000.000, còn 0,01); PP-57 lệnh từ kế hoạch chạy tiếp xuất NVL + nhập thành phẩm, kế hoạch hiện đã nhập 10 | 11/11 |
| Sửa kế hoạch đã duyệt | PP-37 thấp hơn số đã lập; PP-38 đổi tên; PP-39 xóa dòng có lệnh; PP-40 thêm dòng thiếu BOM; PP-41 tăng số + thêm dòng (vẫn APPROVED) | 5/5 |
| Hủy, đóng | PP-42 hủy khi còn lệnh; PP-46 đóng, không lập thêm, lệnh cũ giữ nguyên; PP-48 người lập hủy nháp; PP-49 hủy kế hoạch đã duyệt khi mọi lệnh đã hủy | 4/4 |
| Danh sách, hồi quy | PP-51 lọc trạng thái; PP-52 tìm theo mã, tổng đã lập 110 / 55%; PP-53, PP-54 lập / sửa lệnh trực tiếp vẫn chạy; PP-55 danh sách lệnh có mã kế hoạch; PP-56 tra cứu thành phẩm | 6/6 |

Đối chiếu DB sau kiểm thử: kế hoạch 1, FG1 kế hoạch 120, tổng dòng lệnh chưa hủy 110 (không vượt).

**Lỗi tìm thấy và đã sửa trong lúc kiểm thử:** lập / hủy kế hoạch dùng `PROD_CREATE` / `PROD_DELETE` làm Production Accountant bị 403 → đổi sang `PROD_UPDATE` (K3).

## 6. Hạn chế và rủi ro còn lại

| # | Nội dung | Mức |
|---|---|---|
| L1 | Vai trò đã lưu ma trận chức năng không tự có 2 chức năng mới; Admin phải tick. Màn Phân quyền chức năng (frontend) chưa có 2 mục này → cần Phase 3 | Trung bình |
| L2 | `features/admin/services/permissionService.ts` (`PROD_FEATS`, mặc định phía frontend) chưa có 2 chức năng mới → cần đồng bộ ở Phase 3 | Thấp |
| L3 | Ghi chú 500 ký tự: lý do từ chối / hủy nhiều lần sẽ cắt phần đầu (K7) | Thấp |
| L4 | Lệnh đóng sớm vẫn tính đủ số đã lập (K6), cần PO xác nhận | Thấp |
| L5 | Chưa có test tự động (unit / integration bằng xUnit); kịch bản hiện là script gọi API thật | Trung bình |
| L6 | Kế hoạch dùng `hashtext` cho khóa tư vấn: hai khóa khác nhau có thể trùng băm (rất hiếm), hậu quả chỉ là chờ thêm, không sai dữ liệu | Rất thấp |

## 7. Phát hiện ngoài phạm vi (không sửa)

- `mst_products.product_type` có giá trị `FINISHED` / `RAW_MATERIAL`, nhưng lập lệnh (UC-59) và kế hoạch đều không lọc theo loại. Nên hỏi nhóm có chặn chọn NVL làm thành phẩm không.
- `GetRequirementPreviewQuery` (UC-59) im lặng bỏ tồn khi kho không thuộc quyền, còn API kế hoạch báo lỗi. Hai cách khác nhau; nên thống nhất.

## 8. Tự kiểm

- **(a) Giả định:** K1–K10 ở `00-implementation-plan.md`; Production Accountant mặc định không có `PROD_CREATE` là thiết kế có chủ đích của nhóm nên không sửa.
- **(b) Cần hỏi nhóm:** K1 tên 2 chức năng; K6 lệnh đóng sớm; K7 cách ghi lý do; tiền tố `KHSX`; mã UC/BR chính thức trong Report 3.
- **(c) Chỗ không chắc:** hành vi khi Admin đã cấu hình ma trận cho Admin (không có 2 chức năng mới cho tới khi tick) chưa chạy thử vì seed không cấu hình ma trận.
- **(d) UC/BR:** UC-PP-01..06; BR-PP-01..24; dùng lại UC-59, BR-31, BR-51 (đang có).
