# 01 – System Discovery (Phase 1)

- **Dự án:** StockFlow – Order & Inventory Management System, Công ty TNHH Tín Phát (SEP490-G82).
- **Ngày khảo sát:** 19/11/2026. **Người phụ trách:** Ninh (dùng Claude Code).
- **Phạm vi Phase 1:** chỉ khảo sát và báo cáo. **Không viết test, không sửa code, không đổi database, không cài package.** Không có test nào được chạy trong Phase 1; mọi số "đạt" bên dưới là kết quả các lần chạy trước, được ghi rõ nguồn.
- **Ba nguồn đối chiếu:**

| Nguồn | Bản dùng |
|---|---|
| Tài liệu | `docs/SEP_490_Group82(bản sao).docx`: Report 3 – SRS, 99 UC (34 UC có đặc tả chi tiết), BR-01 – BR-52, BR-PP-01 – BR-PP-24, MSG01 – MSG74, 63 hình. Lần sửa cuối trong "Record of Changes": 16/11/2026, "sửa SRS theo source code nhánh dev" |
| Spec | `specs/` (18 module, lập 12/11/2026 theo commit `dbb58c0`), `specs/production-planning-*` (UC-PP, BR-PP), `specs/mrp` (UC-MRP, BR-MRP tạm) |
| Code | Nhánh `chore/xoa-bang-chua-dung` = `origin/dev` `3c864d7` + 2 commit xoá 3 bảng (19/11/2026) |

- **Phụ lục:**
  - [01a_UC_DOC_SPEC_CODE_MATRIX.md](01a_UC_DOC_SPEC_CODE_MATRIX.md): đối chiếu 99 UC giữa tài liệu, spec và code.
  - [01b_API_INVENTORY.md](01b_API_INVENTORY.md): 200 endpoint, sinh tự động từ controller.
  - [01c_DATABASE_INVENTORY.md](01c_DATABASE_INVENTORY.md): 54 bảng, sinh tự động từ schema thật.
  - [01d_REPORT3_CHANGES.md](01d_REPORT3_CHANGES.md): đề xuất sửa Report 3 theo quyết định và phần bổ sung MRP.

### Cập nhật 19/11/2026 – quyết định sau khi trình Discovery

| # | Quyết định | Ảnh hưởng đến test |
|---|---|---|
| D1 | Kiểm kê, huỷ hàng **không cần Manager duyệt** | UC-75, UC-76 ngoài phạm vi. UC-39, UC-43 test theo "hoàn thành là điều chỉnh / trừ kho ngay" |
| D2 | **Bỏ UC-34, UC-42** khỏi phạm vi | Ca test của 2 UC ghi Skipped kèm lý do |
| D3 | **Bổ sung MRP** vào Report 3 | Test MRP theo UC-100 – UC-105, BR-MRP-01 – 33 đề xuất ở 01d |
| D4 | `docs/UnitTest.xlsx` **không phải** mẫu test chính thức | Ca test, kết quả viết ở `specs/qa` |

- O1 – O4 đã chốt cùng ngày theo phương án mặc định: BR-46 theo code, bỏ lý do từng dòng ở BR-43, bỏ UC-81, đổi tên UC-70.
- Nội dung D1 – D3, O1 – O4 đã được áp vào `docs/SEP_490_Group82(bản sao).docx` (xem [01d](01d_REPORT3_CHANGES.md) mục 5).
- Còn mở: O5 / Q1 (package test).

---

## A. Tổng quan hệ thống

### A.1 Kiến trúc thực tế

```
Trình duyệt ──HTTP/JSON──> Next.js 16 (StockFlow_Frontend, cổng 3000)
                              │  lib/api/client.ts (JWT trong localStorage)
                              ▼
                          ASP.NET Core 9 Web API (StockFlow.API, cổng 5000)
                              │  Controller mỏng → MediatR → Handler
                              ▼
                          StockFlow.Application (CQRS, FluentValidation, IInventoryLedger)
                              │  IStockFlowDbContext (repository + unit of work)
                              ▼
                          StockFlow.Infrastructure (EF Core 9 + Npgsql) ──> PostgreSQL, schema stockflow
                          StockFlow.Domain (entity, trạng thái, CostingPolicy, MrpPolicy, ProductionPolicy)
```

- **Clean Architecture, 4 project.** Hướng phụ thuộc: API → Application → Domain; Infrastructure → Application, Domain.
- **192 handler** (`IRequestHandler`), **41 validator** FluentValidation chạy qua `ValidationBehavior` (lỗi trả 400 `VALIDATION_FAILED`).
- **41 file** có `BeginTransactionAsync`. `ExceptionHandlingMiddleware` bắt lỗi chung.
- **Phân quyền:**
  - `FallbackPolicy` bắt buộc đăng nhập.
  - Mỗi action khai `[RequirePermission("MODULE_ACTION")]`, `[RequireAdmin]` hoặc `[RequireFeature]`.
  - Quyền đọc từ database ở mỗi request (`IUserPermissionService`).
  - Cô lập kho kiểm trong handler (`ICurrentUserService.HasWarehouseAccessAsync`).
- **Khởi động API:** tự chạy migration còn thiếu và `DatabaseSeeder` (5 vai trò, 5 tài khoản, kho id 3–6 hoạt động). Vì vậy **mọi lần chạy API đều có thể sửa database nó trỏ tới**.
- **Triển khai:** `deploy/compose.yml` có 4 dịch vụ `db` (postgres:18), `api`, `web`, `caddy`. Máy dev hiện tại **không có Docker**; có PostgreSQL 18.6 cài sẵn.

### A.2 Công nghệ và phiên bản

| Tầng | Thành phần | Phiên bản |
|---|---|---|
| Backend | .NET | net9.0 |
| | MediatR | 14.2.0 |
| | FluentValidation.DependencyInjectionExtensions | 11.9.2 |
| | EF Core / Design | 9.0.10 |
| | Npgsql.EntityFrameworkCore.PostgreSQL | 9.0.4 |
| | JwtBearer / System.IdentityModel.Tokens.Jwt | 9.0.10 / 8.2.1 |
| | BCrypt.Net-Next | 4.0.3 |
| | Swashbuckle | 6.9.0 |
| Frontend | Next.js / React | ^16.4.3 / 19.3.0 |
| | antd / Tailwind / TypeScript | ^6.6.6 / ^4 / ^5 |
| | lucide-react / xlsx / eslint | ^1.57.0 / ^0.18.5 / ^9 |
| Database | PostgreSQL | 18.6 (máy dev), postgres:18 (deploy) |

Không có thư viện test nào trong cả backend lẫn frontend (xem mục F).

---

## B. Danh sách module và chức năng

Khảo sát được **17 module nghiệp vụ**:

| # | Module | UC (tài liệu) | Backend (controller) | Frontend (route) | Spec |
|---|---|---|---|---|---|
| 1 | Xác thực, tài khoản | UC-01 – UC-09 | Auth (4), Staff (5) | `/login`, `/staff` | auth, accounts |
| 2 | Vai trò, quyền, quyền kho | UC-10 – UC-17 | Roles (9), WarehousePermissions (5), Warehouses (7) | `/roles`, `/roles/permissions`, `/roles/warehouses` | roles-permissions, warehouse-access |
| 3 | Đặt hàng (booking) | UC-18 – UC-22, UC-24 | SalesBookings (8) | `/sales-booking` | pending-orders, order-consolidation |
| 4 | Bán hàng POS, hoá đơn | UC-23, UC-25, UC-26, UC-35, UC-36, UC-63, UC-65 | Orders (5) | `/pos`, `/orders`, `/orders/[id]` | order-consolidation, sales-stock-issue |
| 5 | Tín dụng, công nợ khách hàng | UC-27, UC-29, UC-55, UC-62, UC-64, UC-66, UC-98 | CreditRequests (7), Customers (19), DebtWarningSettings (2) | `/approvals`, `/customers` | sales-credit |
| 6 | Bảng giá | UC-91 | PriceBooks (9) | `/price-books` | (không có) |
| 7 | Đặt hàng nhập | UC-30, UC-68 | PurchaseOrders (10) | `/purchase-orders`, `/purchase-orders/create` | purchase-orders |
| 8 | Nhập hàng, trả hàng nhập, nhà cung cấp | UC-31 – UC-34, UC-67, UC-69 – UC-71, UC-85 | Purchases (6), PurchaseReturns (7), Suppliers (12) | `/purchases`, `/purchase-returns`, `/suppliers` | goods-receipt |
| 9 | Hàng hoá, danh mục | UC-51 – UC-54, UC-56, UC-99 | Products (12) | `/products` | master-data |
| 10 | Tồn kho, kiểm kê, huỷ hàng | UC-39, UC-40, UC-43, UC-72 – UC-78 | Stocktakes (6), Disposals (7), Products (thẻ kho, điều chỉnh tồn) | `/stocktakes`, `/disposals` | stocktake, inventory-disposal, inventory-monitoring |
| 11 | Chuyển kho | UC-37, UC-38, UC-74 | Transfers (9) | `/transfers` | stock-transfer |
| 12 | Trả hàng bán | UC-28, UC-41, UC-42, UC-79 – UC-82 | SalesReturns (7) | `/sales-returns`, tab trả hàng ở POS | sales-returns |
| 13 | Sản xuất, BOM | UC-44 – UC-50, UC-57 – UC-61 | Production (14), ProductionBoms (7) | `/production`, `/production/material-issues`, `/production/finished-goods`, `/bom` | production |
| 14 | Kế hoạch sản xuất | UC-92 – UC-96 | ProductionPlans (12) | `/production/plans`, `/production/plan-approvals` | production-planning-* |
| 15 | Hoạch định NVL (MRP) | (không có trong tài liệu) | Mrp (8) | `/production/mrp` | mrp |
| 16 | Tài chính, báo cáo | UC-83 – UC-90 | Phiếu thu / chi trong Customers, Suppliers | (không có trang báo cáo; `/reports` chuyển về `/dashboard`) | finance-reports |
| 17 | Cài đặt | UC-97 | OrderSettings (2), DebtWarningSettings | `/settings/orders` | (không có) |

Ngoài ra có Health (1 endpoint) và trang `/dashboard`. Trang này là bảng quản trị (đếm nhân viên, vai trò, kho), không phải dashboard quản lý của UC-90.

**Frontend:** 42 route (`page.tsx`), 18 thư mục `features/`, 48 màn hình trong `switch` của `AppLayout`. Có 5 route chỉ chuyển hướng: `/inventory`, `/reports`, `/warehouses`, `/products/price-books`, `/products/pricing`.

---

## C. Danh sách Use Case

Tài liệu có **99 UC** (UC-01 – UC-99), gồm 34 UC cha có đặc tả chi tiết (mục 2.2.3) và 65 UC con chỉ có mô tả (mục 2.2.2). Chi tiết từng UC xem [01a](01a_UC_DOC_SPEC_CODE_MATRIX.md).

| Kết luận đối chiếu code (sau D1, D2, O1 – O4) | Số UC |
|---|---:|
| Khớp | 35 |
| Cần chạy thử | 28 |
| Một phần | 19 |
| Lệch | 3 |
| Lỗi | 2 |
| Chưa có code | 7 |
| Ngoài phạm vi | 5 |
| **Tổng** | **99** |

Bản trước quyết định có 3 UC "Tài liệu mâu thuẫn" (UC-72, UC-75, UC-76). Sau D1 không còn UC nào ở trạng thái này. MRP được đề xuất thành UC-100 – UC-105 (chưa tính vào 99).

**Theo vai trò trong tài liệu:**
- Mọi người dùng: UC-01 – UC-03.
- Admin: UC-04 – UC-17, UC-97 (cùng Manager).
- Sales Accountant: UC-18 – UC-29, UC-35, UC-36, UC-41, UC-42.
- Warehouse Accountant: UC-30 – UC-34, UC-37 – UC-40, UC-43.
- Production Accountant: UC-44 – UC-50, UC-93 (cùng Manager).
- Manager: UC-51 – UC-99.

Code đặt tên vai trò là `Admin`, `Manager`, `SalesStaff`, `WarehouseStaff`, `ProductionStaff`. Tài khoản seed: `admin`, `manager01`, `sales01`, `whstaff01`, `prodstaff01`.

---

## D. Danh sách API

- **200 endpoint** trong **26 controller**. Chi tiết: [01b](01b_API_INVENTORY.md).
- Nhiều nhất: Customers 19, Production 14, Suppliers / Products / ProductionPlans 12, PurchaseOrders 10.
- **10 endpoint chỉ cần đăng nhập, không khai quyền riêng:**
  - Hợp lý: `GET /api/auth/me`, `POST /api/auth/change-password`, `GET /api/auth/permissions`, `GET /api/roles/my-features`, `GET /api/warehouses/my-warehouses`.
  - Cần xem lại (mọi tài khoản đều đọc được): `GET /api/order-settings`, `GET /api/suppliers/warehouses`, `GET /api/warehousepermissions/facilities`, `GET /api/warehouses`, `GET /api/warehouses/{id}`.
- **Không có endpoint báo cáo** (công nợ tổng hợp, nhập – xuất – tồn, doanh thu, lợi nhuận, chi phí, dashboard KPI).
- **Không có endpoint duyệt** kiểm kê hay huỷ hàng.
- Swagger có tại `/swagger`. Repo **không có Postman collection**: thư mục `postman/` chỉ có file biến `workspace.globals.yaml` và chưa được commit.

---

## E. Danh sách Database Tables

- **54 bảng** trong schema `stockflow` (không tính `__EFMigrationsHistory`). Chi tiết: [01c](01c_DATABASE_INVENTORY.md).
- Số liệu lấy từ database tạm dựng bằng toàn bộ 47 migration của nhánh hiện tại, đọc `information_schema` và `pg_catalog`. Database tạm đã xoá sau khi đọc; **không đọc `stockflow_dev`**.

| Nhóm | Số bảng |
|---|---:|
| Master Data | 12 |
| Security / RBAC | 6 |
| Inventory | 7 |
| Purchase / Goods Receipt | 6 |
| Sales / Stock Issue | 8 |
| Production | 7 |
| MRP | 3 |
| Stock Transfer | 2 |
| Returns | 2 |
| Finance | 1 |

**Ràng buộc:**

| Loại | Số lượng | Ghi chú |
|---|---:|---|
| Cột | 555 | |
| Khoá ngoại | 147 | Không có khoá ngoại nhiều cột |
| Cột unique | 21 | Không tính unique index có điều kiện, ví dụ `uq_mst_boms_active_product` |
| CHECK constraint | 3 | Đều ở `mst_order_settings`. **Không có CHECK nào chặn số lượng, tiền âm** |
| `HasIndex` trong DbContext | 40 | |
| Sequence sinh mã | 23 | |
| Cột concurrency token | 2 | Đều ở `trx_credit_limit_requests`. **Bảng tồn kho không có khoá lạc quan / bi quan** |

**Bảng có vấn đề sử dụng:**
- Không có code đọc / ghi: `mst_product_images`, `mst_unit_conversions`.
- Có code đọc nhưng không có cách tạo dữ liệu: `mst_warehouse_locations`. Vị trí thực tế là cột chữ `mst_products.location_name`.
- Dùng một phần: `mst_inventory_lots`. Chỉ nhập thành phẩm tạo lô; nhập hàng mua không ghi lô; không nơi nào ghi hạn dùng.
- Đã xoá ngày 19/11: `trx_inbound_costs`, `dtl_inbound_cost_allocations`, `trx_return_processing`.

**So với ERD trong tài liệu** (mục 3.1.8, 54 entity):
- Tài liệu còn `InboundCost`, `InboundCostAllocation`, `ReturnProcessing`.
- Tài liệu thiếu `trx_mrp_runs`, `dtl_mrp_run_lines`, `dtl_mrp_run_demands`.
- Các bảng còn lại khớp tên.

---

## F. Test hiện có

| Loại | Có gì | Kết quả gần nhất (không chạy lại ở Phase 1) |
|---|---|---|
| Backend unit | 2 chương trình console tự viết, **nằm ngoài solution**, không dùng xUnit: `specs/mrp/unit-tests` (`MrpPolicy`, MU-01..38) và `specs/production-planning-implementation/unit-tests` (chính sách kế hoạch sản xuất) | MRP 38/38 (18/11); kế hoạch SX 79/79 (15/11, theo `04-testing-report.md`) |
| Backend integration (database thật) | **Không có** project nào. Không có WebApplicationFactory hay Testcontainers | – |
| API | Script PowerShell gọi API thật trên database tạm (`env.ps1 -DbName`, từ chối `stockflow_dev`, API Release ở cổng 5196): `pptest.ps1`, `pptest2`–`pptest5.ps1` (kế hoạch SX), `mrptest.ps1` (MRP) | Kế hoạch SX: 4 file `results*.json` ghi 101 ca đạt (15–16/11); MRP 37/37 (18/11) |
| Postman | Chỉ có `postman/globals/workspace.globals.yaml`, chưa commit; không có collection | – |
| Frontend unit / component | **Không có**: không có jest, vitest hay testing-library; `package.json` chỉ có `dev`, `build`, `start`, `lint` | – |
| System / E2E | **Không có**: không có Playwright hay Cypress | – |
| Tài liệu test | `docs/UnitTest.xlsx` (chưa commit; mẫu Report 5 với các sheet Login, Function, TestCase, System Test, Integration Test; mới điền phần Login, UTCID01…). `reportPlanTest.md` (chưa commit; bản nháp 06/11 theo Report 3 cũ, BR-01 – BR-56) | – |

Như vậy:
- Chỉ **kế hoạch sản xuất** và **MRP** có test tự động, và chúng nằm ngoài solution.
- 15 module còn lại chưa có test tự động nào.

---

## G. Các chức năng chưa được triển khai

Tài liệu (bản 16/11) vẫn để những UC sau trong phạm vi. Mục 5.3 "Out of scope" không loại UC nào trong số này.

| UC | Chức năng | Ghi chú |
|---|---|---|
| UC-26 | Sinh QR thanh toán | POS chỉ hiện "Chưa cấu hình tài khoản ngân hàng…" |
| UC-34, UC-70 (một phần) | Phân bổ chi phí nhập | Bảng đã xoá ngày 19/11. **D2: ngoài phạm vi** (UC-70 đề xuất đổi tên, O4) |
| UC-42, UC-81 | Phân loại hàng trả (Restock / Repair / Scrap) | `Condition` luôn `GOOD`; bảng đã xoá ngày 19/11. **D2: UC-42 ngoài phạm vi**; UC-81 đề xuất bỏ (O3) |
| UC-75 | Duyệt điều chỉnh kiểm kê | **D1: ngoài phạm vi** |
| UC-76 | Duyệt huỷ hàng | **D1: ngoài phạm vi** |
| UC-78 | Cảnh báo hạn dùng | Không thu hạn dùng |
| UC-86 – UC-90 | Báo cáo công nợ, nhập – xuất – tồn, doanh thu – lợi nhuận, chi phí, dashboard quản lý | Không có API, không có màn hình |
| BR-27 | Bắt buộc số lô / hạn dùng khi nhập | Không có cờ theo dõi lô |
| BR-49 | Nhật ký thay đổi (audit trail) | Không có bảng audit; chỉ vài chỗ ghi người / thời gian |
| BR-18 | Kỳ hạn nợ, quá hạn | Chưa thấy trong code |

**Chức năng dùng dữ liệu giả:**
- Không màn hình thật nào dùng mock.
- Còn một chỗ dự phòng không ai gọi tới: `features/admin/services/permissionService.ts` (`INITIAL_PERMISSION_MODULES` cho `getPermissionMatrix`).
- Hai chú thích đã cũ:
  - `Header.tsx:164` nói "service rơi về dữ liệu mock", trong khi `staffService` không còn dùng mock.
  - `CreateTransferScreen.tsx:492` ghi "Import mock Excel file", trong khi chức năng nhập Excel là thật.

---

## H. Sai lệch giữa Tài liệu, Spec và Source Code

### H.1 Code đã có nhưng tài liệu chưa cập nhật (thay đổi sau 16/11)

| # | Thay đổi trong code | Ngày | Tài liệu |
|---|---|---|---|
| H1-1 | **MRP**: 8 API, màn `/production/mrp`, 3 bảng | 17–18/11 | Không có UC, BR, màn hình hay entity nào |
| H1-2 | Thời gian giao của hàng hoá (`lead_time_days`), ngày giao dự kiến của đơn đặt hàng nhập (`expected_date`) | 17/11 | Chưa có |
| H1-3 | Kho xuất NVL ở cấp kế hoạch (`trx_production_plans.warehouse_id`) | 18/11 | UC-92 chỉ nêu kho nhận ở từng dòng |
| H1-4 | Xoá 3 bảng chi phí nhập, xử lý hàng trả | 19/11 | ERD còn 3 entity; UC-34, UC-42 vẫn trong phạm vi |

### H.2 Tài liệu ghi một đằng, code làm một nẻo

| # | Tài liệu | Code | Mức ảnh hưởng |
|---|---|---|---|
| H2-1 | UC-34, BR-28: phân bổ chi phí nhập, tính vào MAC | Không có; bảng đã xoá | Cao (UC "Medium" nhưng ảnh hưởng giá vốn) |
| H2-2 | UC-42, BR-20, UC-79 (A79.2), UC-81: phân loại hàng trả | Không có | Trung bình |
| H2-3 | BR-27: hàng theo dõi lô phải có số lô, hạn dùng khi nhập; MSG "Lot / expiry required" | Nhập hàng không ghi lô; `lotNumber` bị bỏ qua | Trung bình |
| H2-4 | BR-43: mỗi dòng chênh lệch kiểm kê phải có lý do | Không có trường lý do | Trung bình |
| H2-5 | ERD: `ProductImage` (nhiều ảnh, một ảnh chính), `WarehouseLocation` (vị trí trong kho), `ReturnProcessing` ("dùng khi nhập lại kho") | 1 ảnh lưu file và `image_url`; vị trí là cột chữ; `ReturnProcessing` không có code (nay đã xoá) | Thấp |
| H2-6 | UC-26, BR-14: QR chứa đúng số tiền và mã giao dịch | Không sinh QR | Thấp |
| H2-7 | UC-86 – UC-90: báo cáo, dashboard, xuất .xlsx / .pdf | Không có | Cao (5 UC) |
| H2-8 | UC-96, BR-PP-22 – 24: đóng kế hoạch thì không đổi lệnh | S-01: lệnh của kế hoạch đã đóng vẫn tăng được số lượng (`specs/production-planning-implementation/08-spec-code-review.md`) | Trung bình |

### H.3 Tài liệu tự mâu thuẫn (cần nhóm chốt trước khi viết test case)

Lần sửa ngày 16/11 đã đổi UC-39, UC-43, UC-83 theo code, nhưng **chưa sửa các UC / BR liên quan**:

| # | Chỗ đã sửa theo code | Chỗ còn mô tả cũ | Trạng thái (19/11) |
|---|---|---|---|
| H3-1 | UC-39: hoàn thành kiểm kê là cân bằng ngay. ERD: trạng thái DRAFT / BALANCED / CANCELLED | UC-72 A72.3, UC-75, BR-43: "chỉ điều chỉnh tồn sau khi Manager duyệt", có Reject / Request Recount, trạng thái "Waiting for Approval" | **Đã chốt (D1)**; nội dung sửa ở 01d mục 1 |
| H3-2 | UC-43: hoàn thành huỷ hàng là trừ kho ngay | UC-72 A72.4, UC-76, BR-44: "chỉ trừ kho sau khi Manager duyệt" | **Đã chốt (D1)**; nội dung sửa ở 01d mục 1 |
| H3-3 | UC-83 A83.1: Manager sửa thời gian, phương thức, ghi chú hoặc huỷ phiếu thu | BR-46: "phiếu đã ghi không được sửa; sai thì lập phiếu đảo" | Chờ xác nhận (O1) |
| H3-4 | UC-31 (luồng chính) không còn bước nhập lô / hạn dùng | BR-27 và thông báo "Lot / expiry required" vẫn còn | Chưa chốt (chưa hỏi) |

### H.4 Spec (12/11) đã cũ so với tài liệu (16/11)

| # | Spec | Tài liệu và code hiện tại |
|---|---|---|
| H4-1 | Không có spec cho UC-91 (bảng giá), UC-97 (cài đặt), UC-98 (điều chỉnh nợ), UC-99 (nhập hàng hoá từ file, điều chỉnh tồn) | Tài liệu đã có đặc tả, code đã có |
| H4-2 | stocktake, inventory-disposal: mong đợi bước duyệt | Tài liệu UC-39, UC-43: hoàn thành ngay |
| H4-3 | sales-returns: mong đợi kho nhận rồi mới hoàn tất | Tài liệu UC-28, UC-41: hoàn tất ngay, có trả nhanh |
| H4-4 | roles-permissions: nhiều vai trò cho một tài khoản | Tài liệu: một vai trò |
| H4-5 | auth (UC-03), production (UC-44 – UC-50, dữ liệu giả), master-data (UC-57 BOM), order-consolidation (UC-27), sales-credit (UC-64), inventory-disposal (UC-43) ghi "chưa có" | Code đã có |
| H4-6 | MRP chỉ có ở `specs/mrp` với mã tạm UC-MRP, BR-MRP-01 – 29 | Tài liệu chưa có |

### H.5 Tài liệu trong repo đã cũ

| # | File | Điểm cũ |
|---|---|---|
| H5-1 | `CLAUDE.md` | Dẫn BR-55 (VAT), BR-56 (chặn khi kiểm kê), BR-39 / BR-40 (chuyển kho) theo bản cũ; bản hiện hành là BR-45, BR-42, BR-40 / BR-41. Ghi "SRS gọi trạng thái chuyển kho là PENDING_ISSUE / COMPLETED", nhưng ERD tài liệu nay đã dùng DRAFT / IN_TRANSIT / RECEIVED / CANCELLED. Ghi "`docs/Report3.docx` đã bị xoá", nhưng repo vẫn đang theo dõi `docs/report3.docx` (14/11) |
| H5-2 | `database/stockflow.sql`, `database/@startuml StockFlow_Full_ERD.txt` | Bản thiết kế cũ, 39 bảng (đã bỏ 3 bảng ngày 19/11), thiếu 15 bảng so với database thật; kiểu dữ liệu theo SQL Server (NVARCHAR, DATETIME). Bản sinh từ schema thật: `database/StockFlow_Full_ERD.puml` (chưa commit) |
| H5-3 | `docs/audit/Report03_SPEC_vs_CODE.md` (13/11) | Nhiều UC ghi "NOT IMPLEMENTED" nay đã có code (xem [01a](01a_UC_DOC_SPEC_CODE_MATRIX.md)) |
| H5-4 | `reportPlanTest.md` (06/11) | Theo Report 3 cũ (BR-01 – BR-56) và nhánh `feature/sale-khachhang` |

---

## I. Đánh giá rủi ro kiểm thử

| # | Rủi ro | Ảnh hưởng | Cách giảm |
|---|---|---|---|
| R1 | **Không có hạ tầng test** trong solution và frontend. Mọi framework đề xuất (xUnit, Moq / NSubstitute, FluentAssertions, Microsoft.AspNetCore.Mvc.Testing, Vitest / Jest, Testing Library, Playwright) đều là **package mới** | Theo quy tắc dự án (`00-principles.md` mục 4), phải được nhóm duyệt trước khi thêm. Đây là điểm chặn của Phase 3 trở đi | Xin duyệt danh sách package ở Phase 2 (câu hỏi Q1) |
| R2 | **Không có Docker** trên máy dev | Không dùng được Testcontainers | Dùng PostgreSQL 18.6 tại máy với database tạm cho mỗi lượt chạy (như `env.ps1`) |
| R3 | API **tự chạy migration và seeder** khi khởi động; `npm run dev` **tự đăng nhập admin** | Chạy nhầm database là sửa dữ liệu dev; test E2E có thể chạy nhầm bằng quyền admin | Luôn trỏ database tạm; script từ chối `stockflow_dev`; E2E đặt `NEXT_PUBLIC_DEV_AUTO_LOGIN=false` |
| R4 | **Tồn kho không có khoá đồng thời** (không concurrency token, không `FOR UPDATE`) | Ca bán đồng thời sản phẩm cuối cùng, hai request hoàn thành cùng lúc khả năng cao sẽ **Failed** | Thiết kế ca concurrency chạy song song thật (nhiều HttpClient); ghi defect, không tự sửa |
| R5 | POS chỉ kiểm / trừ **một dòng tồn mỗi hàng** | Thành phẩm có nhiều lô dễ báo sai "không đủ tồn" hoặc làm lệch thẻ kho | Ca kiểm thử riêng: nhập thành phẩm 2 lô rồi bán |
| R6 | **Tài liệu tự mâu thuẫn** (H.3) | Không xác định được kết quả mong đợi cho UC-39, UC-43, UC-72, UC-75, UC-76, UC-84, BR-43, BR-44, BR-46 | **19/11:** đã chốt phần kiểm kê, huỷ hàng (D1). Còn BR-46 (O1), BR-43 lý do từng dòng (O2), BR-27 (H3-4) |
| R7 | **UC-34, UC-42 vẫn trong phạm vi** của tài liệu nhưng bảng đã xoá | Test case cho 2 UC này sẽ luôn Blocked hoặc Failed | **19/11:** đã chốt bỏ (D2); ca test ghi Skipped. Report 3 cần sửa theo 01d mục 2 |
| R8 | Giờ lưu kiểu `timestamp without time zone`, theo giờ Việt Nam | Ca biên ngày (00:00, cuối tháng, kỳ MRP) dễ sai khi máy test khác múi giờ | Cố định múi giờ máy test; thêm ca biên ngày |
| R9 | Dữ liệu seed cố định: kho id 3–6, mật khẩu `TinPhat@2026` (seeder) khác `StockFlow@123` (`seed.sql`) | Test phụ thuộc id cứng | Tạo dữ liệu test riêng có tiền tố mã; chỉ dùng seed cho tài khoản và vai trò |
| R10 | Tài liệu test (`docs/UnitTest.xlsx`) và Postman **chưa được commit** | Không truy vết được phiên bản ca test | Nhóm quyết định nơi lưu chính thức (câu hỏi Q5) |
| R11 | 10 endpoint chỉ cần đăng nhập (mục D) | Có thể lộ cấu hình, danh sách kho cho mọi vai trò | Đưa vào ca kiểm thử phân quyền (IDOR, kiểm soát truy cập) |
| R12 | Next.js 16 có thay đổi lớn (`AGENTS.md`) | Công cụ E2E, component test cần tương thích | Đọc `node_modules/next/dist/docs/` trước khi cấu hình |

---

## J. Đề xuất Test Strategy

1. **Căn cứ mong đợi:**
   - Tài liệu bản 16/11 là nguồn chính.
   - Chỗ tài liệu mâu thuẫn hoặc thiếu (H.1, H.3) thì chờ nhóm chốt. Chưa chốt thì ca test ghi **Blocked**, không tự chọn.
   - Spec 12/11 chỉ dùng làm tham khảo.
2. **Ưu tiên theo rủi ro:**

| Mức | Phạm vi |
|---|---|
| Critical | Toàn vẹn tồn kho (khớp `trx_inventory_balances` với tổng `trx_inventory_transactions`); POS: tồn, hạn mức, thanh toán, công nợ; nhập hàng: MAC, công nợ NCC; chuyển kho; trả hàng bán: tồn, công nợ; phân quyền và cô lập kho |
| High | Xuất NVL, nhập thành phẩm, kế hoạch sản xuất, MRP, kiểm kê, huỷ hàng, phiếu thu / chi, điều chỉnh nợ |
| Medium | Danh mục, bảng giá, cài đặt, đặt hàng (booking) |
| Low | Hiển thị, bộ lọc |

3. **Các cấp test:**

| Cấp | Cách làm đề xuất | Cần duyệt |
|---|---|---|
| Unit | xUnit cho Domain thuần (`CostingPolicy`, `MrpPolicy`, `ProductionPolicy`, `Can*` / `Mark*`) và 41 validator. **Chuyển** 2 bộ console hiện có (MRP, kế hoạch SX) vào cùng project test, không viết trùng | xUnit (+ FluentAssertions nếu muốn) |
| Integration | Handler chạy với `StockFlowDbContext` thật trên database PostgreSQL tạm, dựng bằng migration, **không dùng EF InMemory**. Dữ liệu mỗi ca có tiền tố riêng; kiểm số liệu giữa các bảng sau commit; kiểm rollback | Như trên + `Microsoft.EntityFrameworkCore` đã có |
| API | **Cách A:** WebApplicationFactory + HttpClient trong xUnit (cần `Microsoft.AspNetCore.Mvc.Testing` 9.x). **Cách B:** giữ kiểu script PowerShell đang dùng (không thêm package, nhưng báo cáo và CI kém hơn) | Cách A cần duyệt |
| System / E2E | Playwright chạy Next.js và API thật trên database tạm, cho 7 luồng liên module (mục 11 của prompt) | `@playwright/test` |
| Regression | Gom các bộ trên theo module; mỗi lần sửa lỗi chạy lại module bị ảnh hưởng và luồng liên module liên quan | – |

4. **Dữ liệu test:**
   - Mỗi lượt chạy dựng một database tạm từ migration rồi xoá sau khi chạy.
   - Tài khoản và vai trò lấy từ seeder.
   - Hàng hoá, khách hàng, NCC, BOM, tồn đầu tạo bằng API hoặc handler, mã có tiền tố riêng cho từng nhóm ca.
5. **Báo cáo:**
   - Tách rõ Passed / Failed / Blocked / Skipped / Not Run.
   - Ca Blocked ghi lý do (thiếu chức năng, tài liệu mâu thuẫn).
   - Ghi song song vào mẫu `docs/UnitTest.xlsx` nếu đó là mẫu Report 5 chính thức.

---

## K. Kế hoạch triển khai từng Phase

| Phase | Việc | Kết quả | Điều kiện để bắt đầu |
|---|---|---|---|
| 1 | Discovery (xong) | File 01, 01a, 01b, 01c | – |
| 2 | Test Strategy, ma trận truy vết, thiết kế test case | `02_REQUIREMENT_TRACEABILITY_MATRIX.md`, `03_TEST_STRATEGY.md`, `04_TEST_CASES_SUMMARY.md` | Nhóm trả lời Q1 – Q5 |
| 3 | Unit test | Project test backend; chuyển 2 bộ console vào; (frontend nếu được duyệt) | Package được duyệt (Q1) |
| 4 | Integration test (PostgreSQL thật) | Ca IT-INV, IT-SAL, IT-TRF, IT-PRO, rollback, concurrency, phân quyền | Phase 3 xong hạ tầng |
| 5 | API test | Theo [01b](01b_API_INVENTORY.md), ưu tiên Critical / High | Chốt cách A hay B (Q1) |
| 6 | System / E2E | 7 luồng liên module | Playwright được duyệt (Q1) |
| 7 | Regression | Bộ hồi quy theo module | Phase 3–6 |
| 8 | Non-functional | Hiệu năng (ngưỡng chờ nhóm chốt), bảo mật (IDOR, phân quyền, injection), độ tin cậy | Nhóm chốt ngưỡng |
| 9 | Hoàn thiện automation | Script chạy một lệnh, hướng dẫn môi trường | – |
| 10 | Báo cáo | 05 – 11 | – |

### Câu hỏi cần nhóm trả lời trước Phase 2 (kèm đề xuất mặc định)

> **Trạng thái 19/11/2026:**
> - Q2 phần kiểm kê / huỷ hàng: đã trả lời (D1). Phần phiếu thu chuyển thành O1.
> - Q3, Q4, Q5: đã trả lời (D2, D3, D4).
> - **Q1 còn mở.**
>
> Các câu hỏi gốc giữ nguyên bên dưới để truy vết.

1. **Q1 – Package test.** Có duyệt các package sau không?
   - Backend: xUnit, `Microsoft.AspNetCore.Mvc.Testing` 9.x, và FluentAssertions (tuỳ chọn).
   - Frontend: Playwright (Vitest / Testing Library để sau).
   - *Đề xuất:* duyệt xUnit + Mvc.Testing + Playwright; chưa thêm thư viện mock (dùng database thật thay cho mock).
2. **Q2 – Mâu thuẫn trong tài liệu (H.3).** Kiểm kê, huỷ hàng có bước Manager duyệt không? Phiếu thu đã ghi có được sửa / huỷ không?
   - *Đề xuất:* theo code hiện tại (không duyệt; phiếu thu sửa / huỷ được) và sửa UC-72, UC-75, UC-76, BR-43, BR-44, BR-46 cho khớp.
3. **Q3 – UC-34, UC-42.** Đưa vào mục 5.3 "Out of scope" hay hoàn tác việc xoá bảng?
   - *Đề xuất:* đưa vào "Out of scope"; ca test của 2 UC ghi Skipped kèm lý do.
4. **Q4 – MRP, thời gian giao, kho xuất NVL của kế hoạch (H.1).** Có bổ sung vào Report 3 trước khi test không?
   - *Đề xuất:* bổ sung UC, BR chính thức cho MRP. Trong lúc chờ, test theo `specs/mrp`.
5. **Q5 – Nơi lưu tài liệu test.** `docs/UnitTest.xlsx` có phải mẫu Report 5 chính thức không? Có commit vào repo không?
   - *Đề xuất:* có; ca test viết ở `specs/qa`, kết quả điền sang file Excel.

---

## Trả lời các câu hỏi cuối Phase 1

| Câu hỏi | Trả lời |
|---|---|
| Khảo sát được bao nhiêu module? | 17 module nghiệp vụ (mục B) |
| Có bao nhiêu Use Case? | 99 (UC-01 – UC-99), 34 có đặc tả chi tiết. Ngoài ra MRP có trong code và spec nhưng chưa có UC trong tài liệu |
| Có bao nhiêu API? | 200 endpoint, 26 controller |
| Có bao nhiêu database table? | 54 bảng nghiệp vụ (+ `__EFMigrationsHistory`) |
| Có bao nhiêu project test hiện có? | 0 project test trong solution. Ngoài solution có 2 chương trình console tự kiểm tra (MRP, kế hoạch SX) và 6 script PowerShell gọi API |
| Phần nào đã có Unit Test? | `MrpPolicy` (38 ca), chính sách kế hoạch sản xuất (79 ca), đều ở dạng console |
| Phần nào đã có Integration Test? | Không có (chưa có test nào chạy handler với database thật mà không qua HTTP) |
| Phần nào đã có API Test? | Kế hoạch sản xuất (`pptest*.ps1`, 101 ca đạt theo file kết quả) và MRP (`mrptest.ps1`, 37 ca), chạy với API và database tạm |
| Phần nào đã có System / E2E Test? | Không có |
| Còn thiếu những gì? | Hạ tầng test (R1); test cho 15 / 17 module; test frontend; E2E; test concurrency và phân quyền. Report 3 cần được sửa theo 01d (D1, D2) và bổ sung MRP (D3) |
| Cần làm gì tiếp theo? | (Cập nhật 19/11) Nhóm duyệt và dán 01d vào Report 3; trả lời O1 – O4 và Q1; sau đó bắt đầu Phase 2 |

## Tự kiểm

- **(a) Giả định:**
  - File `SEP_490_Group82(bản sao).docx` là bản sao mới nhất của Report 3 Google Doc. Ngày sửa file là 19/11, mục thay đổi cuối là 16/11.
  - Nhánh `chore/xoa-bang-chua-dung` đại diện cho code hiện tại.
- **(b) Cần hỏi nhóm:** Q1 – Q5.
- **(c) Chỗ không chắc:**
  - Các kết luận đều từ đọc tĩnh; UC ghi "Cần chạy thử" chưa có bằng chứng chạy.
  - Ba điểm UC-19, UC-23, UC-25 lấy theo audit 13/11, chưa kiểm lại.
  - Phần đọc tài liệu dựa trên chữ trích từ file `.docx`; chưa xem 63 hình (sơ đồ UC, luồng màn hình, ERD).
- **(d) UC/BR:** toàn bộ UC-01 – UC-99, BR-01 – BR-52, BR-PP-01 – BR-PP-24; MRP (UC-MRP, BR-MRP tạm).
