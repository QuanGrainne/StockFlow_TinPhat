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

## T13 – Đồng bộ tài liệu
- [x] `AI_CODING_RULES.md`: bỏ `date-fns`, sửa mục 5.9/5.10/5.11, đường dẫn `GoodsCatalogScreen`, trỏ `.claude/rules/`
- [x] `CLAUDE.md`: bỏ mục graphify, sửa đường dẫn đổi ở T6–T11, thêm mục Structure standard, mô tả `IInventoryLedger`
- [x] `.cursorrules`: bỏ `Report3.docx`, trỏ `.claude/rules/`  - [x] `docs/architecture.md`: cây thư mục theo kết quả
- [ ] Link Google Doc Report 3 + số BR hiện hành (chờ người phụ trách)  - [ ] Cột "Người" trong AI_LOG (chờ người phụ trách)
- [x] Mọi đường dẫn nêu trong tài liệu tồn tại thật  - [x] `git diff` chỉ gồm file tài liệu
