# Checklist refactor cấu trúc (chép vào docs/refactor/CHECKLIST.md)

Nhánh: `chore/structure-standard` (từ `dev`). Người phụ trách: ____  Ngày bắt đầu: ____

## Đường cơ sở (ghi trước khi sửa)
- [x] `dotnet build`: 0 lỗi, 0 cảnh báo
- [x] `npm run lint`: 202 lỗi / 214 cảnh báo có sẵn (chỉ yêu cầu không thêm lỗi mới)
- [x] `npm run build`: đạt; đã lưu danh sách route (37 route, khối 39 dòng trong đầu ra build)
- [x] Số "trước": `as DbContext` ở Application: 21 | import `from '@/app'`: 13 (+1 `import('@/app/...')` động) | `*Client.tsx` trong `app/`: 15. Sau Giai đoạn 1: cả ba bằng 0

## T0 – Rule và checklist
- [x] Đủ 6 file trong `.claude/rules/`  - [x] Có file checklist này  - [x] Không sửa file cũ  - [x] Commit  - [x] **Xác nhận: Đạt**

## T1 – Xoá code không dùng (backend)
- [x] grep không còn IRepository / IUnitOfWork / GenericRepository / UnitOfWork
- [x] Đã gỡ 2 dòng DI  - [x] build đạt  - [x] msbuild.log ra khỏi git, .gitignore đã chặn
- [x] Đã hỏi nhóm về `.specify/` và `.claude/skills/speckit-*`  - [x] Commit  - [x] **Xác nhận: Đạt**

## T2 – Transaction một API
- [x] `as DbContext` = 0  - [x] `dbContext != null` = 0  - [x] Số BeginTransaction trước = sau
- [x] Đọc diff rollback/commit từng file  - [x] build đạt  - [x] Commit  - [x] **Xác nhận: Đạt**

## T3 – Chuyển màn hình vào features/<module>/screens
- [x] Không còn `*Client.tsx` trong `app/` (trừ mục chờ hỏi)  - [x] page.tsx chỉ còn dynamic import
- [x] Danh sách route trước = sau  - [x] lint không lỗi mới  - [x] Dùng git mv  - [x] Mở thử 3 màn hình
- [x] Commit  - [x] **Xác nhận: Đạt**

## T4 – Gỡ phụ thuộc ngược, chuyển thành phần riêng
- [x] `from '@/app` = 0  - [x] `src/components/` chỉ còn thành phần dùng chung  - [x] AppLayout đã sang `components/layout/`
- [x] Route trước = sau  - [x] lint không lỗi mới  - [x] Commit  - [x] **Xác nhận: Đạt**

## T5 – Đồng bộ file AI và tài liệu
- [x] Hết "Next.js 15"  - [x] Hết "Modular Monolith"  - [x] Hết trùng "## 6"  - [x] Đường dẫn trong tài liệu tồn tại thật
- [x] Chỉ file .md/.cursorrules thay đổi  - [x] Commit  - [x] **Xác nhận: Đạt**

## Tổng kết
- [x] Bảng Trước/Sau  - [x] Bảng tầng ↔ thư mục dán vào SDS 1.2  - [x] Dòng AI_LOG cho từng đầu việc  - [x] Quyết định push/PR: Sẵn sàng tạo PR

---

# Giai đoạn 2 – Dọn phần thừa và đồng nhất cấu trúc

Nhánh: `feature/price-book` (theo yêu cầu người phụ trách). Đường cơ sở GĐ2: `dotnet build` 0 cảnh báo; lint 202 lỗi / 197 cảnh báo; 37 route; `find-unreachable.js`: 38 file / 12.012 dòng không với tới được từ `app/`.

## T6 – File và thư mục rác
- [x] Xoá prototype `stockflow-oims---phân-quyền-admin/`, gitlink `.archify-bin`, `StockFlow.API.http`, 5 file `public/*.svg`, `docs/Report3.docx`, `create_order_settings.sql`, `database/add_order_type_migration.sql`
- [x] `seed_pos_products.sql` → `database/`; `prompt.md` → `docs/archive/`  - [x] grep từng mục = 0  - [x] Build + route không đổi  - [x] Commit

## T7 – Backend: code chết
- [x] Xoá `DomainException`, `AuditableEntity`, `BaseEntity` (grep 0, kể cả Migrations)  - [x] `dotnet build` 0 cảnh báo  - [x] Commit

## T8 – Frontend: file không ai dùng
- [x] Xoá 38 file (nhóm 1: 18, nhóm 2: 3, nhóm 3 prototype: 17)  - [x] `find-unreachable` sau: 0 file
- [x] `tsc --noEmit` 0 lỗi  - [x] Lint không lỗi mới (142/138)  - [x] Route không đổi  - [x] Commit

## T9 – Một cách nạp trang
- [x] 11 trang chuyển sang `LazyAppLayout` (kể cả `orders/[id]`)  - [x] Rule 20 + CLAUDE.md mô tả đúng "khung + bảng màn hình"
- [x] Route không đổi  - [x] 6 trang trả 200 qua `npm run dev` (chưa kiểm bằng mắt)  - [x] Commit

## T10 – Phần khung ra khỏi features/roles
- [x] `Header`, `Sidebar`, `FeatureGuard` → `components/layout/`; `navbar`, `currentRole` → `lib/navigation/`  - [x] grep đường dẫn cũ = 0  - [x] Commit

## T11 – Tách features/roles
- [x] admin → `features/admin/`  - [x] products → `features/products/` (`productService` cũ đổi tên `goodsCatalogService.ts`)
- [x] production → `features/production/`, BOM → `features/bom/`  - [x] `features/roles/` không còn  - [x] Mỗi module một commit

## T12 – Backend tuỳ chọn
- [x] B1: tách 7 file handler riêng lẻ thành 17 file + `SalesReturnOps.cs`; 10 file handler gộp giữ nguyên (ngoại lệ ghi ở rule 10)
- [x] B2.1: `IInventoryLedger` + `InventoryLedger` (lõi chuyển nguyên văn từ `PurchaseStockOps`)
- [x] B2.2: `Create/CompletePurchaseCommand` dùng ledger (thêm `transactionDate`)  - [ ] Đối chiếu số dư trên DB (`b22-reconcile.sql`)
- [ ] B2.3 (POS dùng ledger): để sau
- [ ] **B4 (xmin + thử lại khi xung đột): code đã viết, CHƯA tạo migration `AddInventoryBalanceXmin`** (Smart App Control chặn `dotnet ef` trên máy này) – tạo trên máy khác, kiểm `migrations script` chỉ có dòng `__EFMigrationsHistory`, thử 2 đơn POS song song, rồi mới commit
  - 12/11/2026: code B4 đã commit `6054c0b` trên `feature/price-book` (chưa merge dev). `dotnet ef` chạy được trên máy này → tạo migration `20261112144741_AddInventoryBalanceXmin` trong worktree `C:se9StockFlow_B4` (nhánh `feature/price-book`). `migrations script AllowQuickSalesReturn AddInventoryBalanceXmin` chỉ có INSERT `__EFMigrationsHistory` (không ALTER TABLE). dotnet build 0/0. Chưa commit; chưa thử 2 đơn POS song song

## T13 – Đồng bộ tài liệu
- [x] `AI_CODING_RULES.md`: bỏ `date-fns`, sửa mục 5.9/5.10/5.11, đường dẫn `GoodsCatalogScreen`, trỏ `.claude/rules/`
- [x] `CLAUDE.md`: bỏ mục graphify, sửa đường dẫn đổi ở T6–T11, thêm mục Structure standard, mô tả `IInventoryLedger`
- [x] `.cursorrules`: bỏ `Report3.docx`, trỏ `.claude/rules/`  - [x] `docs/architecture.md`: cây thư mục theo kết quả
- [ ] Link Google Doc Report 3 + số BR hiện hành (chờ người phụ trách)  - [ ] Cột "Người" trong AI_LOG (chờ người phụ trách)
- [x] Mọi đường dẫn nêu trong tài liệu tồn tại thật  - [x] `git diff` chỉ gồm file tài liệu

---

# Giai đoạn 3 – Gỡ phụ thuộc ngược, đưa luật vào Domain

Nhánh: `fix/frontend` (theo yêu cầu người phụ trách, đã có code mới nhất). Ngày bắt đầu: 12/11/2026.

## T14 – Đường cơ sở (chỉ đo, không sửa code)
- [x] `dotnet build StockFlow_Backend/StockFlow.sln`: 0 lỗi, 0 cảnh báo
- [x] `npm run lint`: 133 lỗi / 136 cảnh báo (269 vấn đề, có sẵn)
- [x] `npm run build`: đạt; 40/40 trang tĩnh; 39 route:
  `/`, `/_not-found`, `/apple-icon.png`, `/bom`, `/customers`, `/dashboard`, `/icon.png`, `/inventory`, `/login`, `/orders`, `/orders/[id]` (◐), `/pos`, `/price-books`, `/production`, `/production/import`, `/production/logs`, `/products`, `/products/price-books`, `/products/pricing`, `/purchase-orders`, `/purchase-orders/create`, `/purchase-returns`, `/purchase-returns/create`, `/purchases`, `/purchases/create`, `/reports`, `/roles`, `/roles/permissions`, `/roles/warehouses`, `/sales-booking`, `/sales-returns`, `/settings/orders`, `/staff`, `/stocktakes`, `/stocktakes/create`, `/suppliers`, `/transfers`, `/transfers/create`, `/warehouses`
- [x] Import ngược / vi phạm (đếm số file):

| Chỉ số | Lệnh | Số | File |
|---|---|---|---|
| `src/lib` import `@/features` hoặc `@/components` | `grep -rlE "from ['\"]@/(features\|components)" src/lib` | 1 | `lib/navigation/currentRole.ts` |
| `src/components` (ngoài `layout/`) import `@/features` | `grep -rlE "from ['\"]@/features" src/components --exclude-dir=layout` | 2 | `components/filters/TimeRangeFilter.tsx`, `components/FormHeaderUserBar.tsx` |
| `fetch(` ngoài `lib/api/client.ts` | `grep -rlE "\bfetch\(" src \| grep -v lib/api/client.ts` | 1 | `app/(auth)/login/page.tsx` |
| `features/admin` còn dùng `mockData` | `grep -rl mockData src/features/admin` (trừ chính file data) | 2 | `services/staffService.ts`, `services/permissionService.ts` |
| Literal `"IN_TRANSIT"\|"RECEIVED"\|"CANCELLED"\|"DRAFT"` trong `Application/Features/Transfers` | `grep -rnoE` | 18 | Cancel 4, Complete 2, Create 2, Receive 2, Update 1, UpdateNotes 2, TransferDtos 1, GetTransferById 2, GetTransfers 2 |
| `transfer.Status = "..."` trong Transfers | `grep -rnE "\.Status\s*=\s*\""` | 3 | Cancel:88, Complete:79, Receive:116 |

- [x] **Xác nhận T14:** Đạt (OK T14)

## T15 – Gỡ lib import ngược features
- [x] `lib/auth/roles.ts` chứa `UserRole`; `features/admin/types` import + re-export  - [x] `src/lib` không còn `from '@/features|@/components'` (1 → 0)  - [x] lint 133/136 (không đổi), build đạt, route không đổi  - [x] **Xác nhận:** Đạt (OK T15)

## T16 – Gỡ components (ngoài layout) import ngược features
- [x] 6 hàm ngày thuần → `lib/utils/date.ts` (git mv); `transfers/utils/dateUtils.ts` giữ `getDefaultReceiveDate`, `validateReceiveAfterTransfer` + `export *`  - [x] `FormHeaderUserBar` → `components/layout/` (git mv)  - [x] `src/components` ngoài `layout/` không còn `from '@/features'` (2 → 0)  - [x] lint 133/136 (không đổi), build đạt, route không đổi  - [x] `docs/architecture.md:98` còn đường dẫn cũ → đã sửa ở T22  - [x] **Xác nhận:** Đạt (OK T16)

## T17 – login/page.tsx dùng fetch trực tiếp
- [x] Trả lời 3 câu; chọn **B** (giữ fetch, ghi ngoại lệ)  - [x] Chú thích đầu `login/page.tsx` + dòng ngoại lệ ở rule 20 mục 6  - [x] lint 133/136, build đạt, route không đổi  - [x] Thử mức API (curl): đúng → 200 có token (cả khi kèm token rác); sai → 400 `{message}`; token hỏng gọi `/api/Staff` → 401. Chưa thử chuyển hướng trên trình duyệt  - [x] **Xác nhận:** Đạt (OK T17)

## T18 – features/admin còn mockData
- [x] Bảng hàm ↔ endpoint ↔ màn hình (mọi hàm đã gọi API thật; mock chỉ còn là dự phòng)  - [x] Bỏ dự phòng mock: getStaffList, updateStaff, toggleStaffStatus, resetStaffPassword, getWarehouseFacilities (giữ cache localStorage), updateWarehousePermissions, getRoleDefinitions, mảng cục bộ kho/vai trò/nhân viên  - [x] `.catch` ở Header, CreatePurchase, CreateTransfer; try/catch đặt lại mật khẩu ở StaffAccounts  - [x] Hàm giữ lại (getMyWarehouseFacilities, getPermissionMatrix/save/getAllowedModuleKeys) có chú thích `// CÒN DỰ PHÒNG MOCK KHI API LỖI` (thay `CHƯA NỐI API`, đã duyệt); 4 hàm legacy getUsers… ghi "chưa có màn hình gọi"  - [x] File dùng mockData 2 → 1 (permissionService, chỉ `INITIAL_PERMISSION_MODULES`)  - [x] lint 131/136 (−2 lỗi), build đạt, route không đổi  - [ ] Thử tay màn Nhân viên, Vai trò, Phân quyền kho (người phụ trách)  - [x] **Xác nhận:** Đạt (OK T18)

## T19 – Tách GoodsCatalogScreen (chỉ làm khi có OK T19)
- [x] Bảng khối con + đề xuất 7 lát; duyệt lát 1–5 (không tách Modal 1 Tạo/Sửa – 93 tên; lát 6–7 để sau)
- [x] Lát 1: kiểu → `products/types/goodsCatalog.ts`; hàm thuần → `components/catalog/goodsCatalogUtils.ts`; dữ liệu mặc định → `components/catalog/goodsCatalogDefaults.ts`. Screen 6.060 → 5.512 dòng; diff nguyên văn chỉ khác 7 chữ `export`; screen re-export tên cũ. lint 131/136, build đạt, route không đổi  - [x] Thử trang Hàng hoá (OK lát 1)
- [x] Lát 2: `components/catalog/CustomCombobox.tsx`, `components/catalog/KiotSelectWithSearch.tsx`. Screen 5.512 → 5.250 dòng; diff nguyên văn chỉ khác 2 chữ `export`. lint 131/136, build đạt, route không đổi  - [x] Thử trang Hàng hoá (OK lát 2)
- [x] Lát 3: `catalog/QuickCreateCategoryModal.tsx` (10 prop), `QuickCreateLocationModal.tsx` (6), `QuickCreateBrandModal.tsx` (4); điều kiện mở ở lại màn hình, JSX bên trong giống hệt; bỏ 3 icon không còn dùng (Tag, MapPin, Sparkles). Screen 5.250 → 5.071 dòng. lint 131/136, build đạt, route không đổi  - [x] Thử trang Hàng hoá (OK lát 3)
- [x] Lát 4: `catalog/GoodsCatalogPagination.tsx` (12 prop), JSX 104 dòng giống hệt; bỏ 4 icon chevron không còn dùng. Screen 5.071 → 4.978 dòng. lint 131/136, build đạt, route không đổi  - [x] Thử trang Hàng hoá (OK lát 4)
- [x] Lát 5: `catalog/CostScopeConfirmModal.tsx` (14 prop); thân IIFE cũ (271 dòng) thành thân component, giống hệt; điều kiện `costConfirmModalOpen &&` ở lại màn hình; bỏ 2 icon không còn dùng (Building, Globe). Screen 4.978 → 4.722 dòng. lint 131/136, build đạt, route không đổi  - [x] Thử trang Hàng hoá (OK lát 5)
- Tổng T19 lát 1–5: GoodsCatalogScreen 6.060 → 4.722 dòng (−1.338); 10 file mới; lát 6–7 và Modal 1 chưa tách
- [x] **Xác nhận:** Đạt (OK lát 1–5)

## T24 – Sửa vi phạm cấu trúc FE (phương án (a), sau T19)
- [x] 23 import `transfers/utils/dateUtils` → `@/lib/utils/date` (23 file, mỗi file 1 dòng; tên import đều có trong lib; `transfers` tự dùng file của mình nên giữ). lint 131/136, build đạt, route không đổi
- [x] (thay bằng phương án B) Đưa thành phần dùng chéo (InvoicePreviewModal, PurchaseFilterSidebar, AddFromCategoryPopover, CustomerFormModal, StockCardDocumentModal) lên `src/components/` nếu không phụ thuộc service feature
  - Phân tích: cả 5 đều phụ thuộc feature (service hoặc types) → không đưa lên `components/`. Chọn **phương án B**: cổng công khai `features/<m>/index.ts` cho `orders`, `purchases`, `customers`; 10 import chéo đổi sang `@/features/<m>`
- [x] check-structure.js: import chéo components/screens 10 → 0 (bỏ khỏi KNOWN); còn 2 ngoại lệ (EntityLinks, fetch ở login). lint 131/136, build đạt, route không đổi  - [x] Rule 20 + CLAUDE.md ghi quy tắc cổng công khai  - [x] **Xác nhận:** Đạt (OK T24)

## T20 – Trạng thái phiếu chuyển kho thành phương thức Domain
- [x] Bảng điều kiện trạng thái được duyệt (OK bảng T20; thay cả Query/DTO; phương thức ở file partial riêng)  - [x] `Domain/Entities/TransferStatus.cs`  - [x] `TrxStockTransfer.Status.cs`: IsInTransit/IsReceived/CanEdit/CanIssue/CanReceive/CanCancel/CanEditReceiveNotes/Mark*  - [x] Literal 18 → 0; `transfer.Status = "` 3 → 0; Begin/Commit/Rollback ở Create 3 = 3  - [x] dotnet build 0/0; lint 131/136; build FE đạt, route không đổi  - [ ] Thử 4 kịch bản (người phụ trách)  - [x] **Xác nhận:** Đạt (OK T20)

## T21 – Giá vốn MAC vào Domain
- [x] `Domain/Services/CostingPolicy.cs` (thân hàm nguyên văn, diff 29 dòng = 0)  - [x] `GoodsReceiptHelper` chỉ gọi sang (giữ chữ ký; nơi gọi duy nhất `InventoryLedger.cs:48` không đổi)  - [x] 9 bộ số cũ = mới (mã tạm ngoài repo)  - [x] dotnet build 0/0; lint 131/136; build FE đạt, route không đổi  - [ ] So giá vốn 2 phiếu nhập (người phụ trách)  - [x] **Xác nhận:** Đạt (OK T21)

## T22 – Đồng bộ tài liệu AI/rule
- [x] Rule 10 + CLAUDE.md: IStockFlowDbContext = Repository + UoW; Domain gồm Entities, hằng trạng thái, Can*/Mark* (partial), Domain/Services; luật có DB ở handler/helper/ledger; InventoryLedger ở Application/Common/Inventory  - [x] Rule 20 + CLAUDE.md: hướng phụ thuộc, `components/layout` được import features; 10 import components chéo + utils chéo ghi là ngoại lệ đã biết; sửa mô tả `pos` (đã dùng LazyAppLayout + children)  - [x] `docs/architecture.md` sửa đường dẫn FormHeaderUserBar, lib/utils, cách nạp `pos` (mục treo từ T16)  - [x] 21 đường dẫn nêu trong tài liệu tồn tại thật  - [x] Chỉ file .md  - [x] **Xác nhận:** Đạt (OK T22)

## T23 – Tổng kết
- [x] Bảng Trước/Sau (dưới)  - [x] `docs/refactor/tools/check-structure.js` (Node thuần; `--list`, `--strict`)  - [x] `graphify update .` — đã cài Python 3.12 (winget, phạm vi user) + `graphifyy` 0.9.107 (pip --user); kết quả 4.587 nút / 12.899 cạnh / 155 cụm trong `graphify-out/` (đã gitignore)  - [x] Danh sách file theo việc + 10 dòng "Hạn chế đã biết" (trong báo cáo T23)  - [x] **Xác nhận:** Đạt (OK T23; `EntityLinks.tsx` ghi là ngoại lệ đã biết theo phương án A)

| Chỉ số | Trước (T14) | Sau (T23) |
|---|---|---|
| `dotnet build` | 0 lỗi / 0 cảnh báo | 0 lỗi / 0 cảnh báo |
| `npm run lint` | 133 lỗi / 136 cảnh báo | 131 lỗi / 136 cảnh báo |
| `npm run build`, số route | Đạt, 39 | Đạt, 39 (danh sách giống hệt) |
| `lib` → features/components | 1 | 0 |
| `components` (ngoài layout) → features | 2 (grep `from`) — thực tế 3, tính cả `import()` động ở `links/EntityLinks.tsx` | 1 (`EntityLinks.tsx`, chưa xử lý) |
| `fetch(` ngoài client | 1 | 1 (ngoại lệ đã ghi ở rule 20) |
| File `features/admin` dùng mockData | 2 | 1 (chỉ hàm chưa có màn hình gọi) |
| Literal trạng thái chuyển kho | 18 | 0 |
| `transfer.Status = "..."` | 3 | 0 |
| Import chéo components/screens giữa feature | (chưa đo) | 10 (đều là ngoại lệ đã biết) |

## T25 – Dọn tên "KiotViet" khỏi code (plan: `docs/plans/PLAN_don-ten-kiotviet.md`)
- [x] Đường cơ sở: dotnet build 0 lỗi / 2 cảnh báo (NU1900); lint 116 lỗi / 107 cảnh báo; build FE đạt, 46 trang; "kiot" FE 85 dòng, BE 21 dòng
- [x] Bước 1: `orders/components/KiotVietOrderDetail.tsx` → `OrderDetailPanel.tsx` (git mv, 3 file, 10 dòng)  - [x] Thử `/orders` mở rộng dòng + `/orders/[id]` (người phụ trách)
- [x] Bước 2: `products/components/catalog/KiotSelectWithSearch.tsx` → `SearchableCreatableSelect.tsx` (git mv, 2 file, 10 dòng)  - [x] Thử dropdown Nhóm hàng/Thương hiệu/Vị trí: tìm + chọn + xoá + Tạo mới (người phụ trách)
- [x] Bước 3–5: comment FE nhóm Bán hàng (21 dòng/16 file), Mua hàng–Kho (24/16), Hàng hóa–Bảng giá–dùng chung (20/8); chỉ dòng comment, số dòng thêm = xoá
- [x] Bước 6: comment BE 16 dòng/12 file; giữ 5 dòng nói KiotViet là nguồn dữ liệu (IImageStorage, ImportProductsCommand, LocalImageStorage)
- [x] Bước 7: "kiot" FE 85 → 0, BE 21 → 5; không còn tên component cũ; dotnet build 0/2 (giống mốc); lint 116/107 (giống mốc); build FE đạt, route giống mốc; check-structure --strict: không vi phạm mới; tổng diff 56 file, +101/−101
- Ghi chú: dòng T19 lát 2 ở trên vẫn ghi tên cũ `KiotSelectWithSearch.tsx` vì là lịch sử, không sửa
- [x] **Xác nhận:** (người phụ trách)
