# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

StockFlow (OIMS) is an order and inventory management system for Công ty TNHH Tín Phát (capstone SEP490-G82). The backend is ASP.NET Core 9 and the frontend is Next.js. They talk only over HTTP. All UI text and most code comments are in Vietnamese.

**Required reading before feature work:** [AI_CODING_RULES.md](AI_CODING_RULES.md) (mandatory architecture and UI rules; `.cursorrules` points to it) and the business specs in `docs/Report1.docx` (scope FE-01..FE-09) and `docs/Report3.docx` (SRS: use cases UC-xx, screen specs, business rules BR-01..BR-56). Python is not installed. To read a `.docx`, extract `word/document.xml` with PowerShell `System.IO.Compression.ZipFile` into the scratchpad.

## Commands

Backend (from `StockFlow_Backend/`):
```powershell
dotnet build StockFlow.sln
dotnet run --project StockFlow.API            # http://localhost:5000, Swagger at /swagger
dotnet tool restore                           # restores pinned dotnet-ef 9.0.20 (.config/dotnet-tools.json at repo root)
dotnet ef migrations add <Name> --project StockFlow.Infrastructure --startup-project StockFlow.API --output-dir Persistence/Migrations
```
Pending migrations and `DatabaseSeeder.SeedAsync` run automatically when the API starts (`Program.cs`). There is no need to run `dotnet ef database update` manually.

Local config goes in `StockFlow.API/appsettings.Development.json`. Copy it from `appsettings.Development.json.example`. It needs `ConnectionStrings:StockFlowDb` (PostgreSQL, db `stockflow_dev`) and `Jwt:Issuer/Audience/SecretKey`.

Frontend (from `StockFlow_Frontend/`):
```powershell
npm ci
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

There is no automated test project in either backend or frontend. Verify changes by building, linting, and exercising the API via Swagger or the UI.

## Version note

The project uses **Next.js 16**, React 19.3, **antd 6**, and Tailwind 4 (via `@tailwindcss/turbopack`, with `cacheComponents` enabled in `next.config.ts`). Per `StockFlow_Frontend/AGENTS.md`, this Next.js has breaking changes. Read the guides in `node_modules/next/dist/docs/` before using Next APIs. Backend NuGet packages must stay on 9.x (the machine may have a .NET 10 SDK that pulls 10.x packages). Do not upgrade dependencies without team approval.

## Backend architecture

Clean Architecture with four projects. Dependency direction: API → Application → Domain, and Infrastructure → Application/Domain.

- **Domain/Entities** has one class per DB table. Names mirror the table prefixes:
  - `Mst*`: master data.
  - `Trx*`: transaction headers.
  - `Dtl*`: line items.
  - `Sec*`: security.
  - `Jnc*`: junction tables.
- **Application/Features/<Module>/** holds `Commands/`, `Queries/`, `DTOs/`, and sometimes `Helpers/`. A command or query `record` and its `IRequestHandler` live in the same file.
  - Handlers return `Result<T>` (`Application/Common/Result.cs`).
  - FluentValidation validators run automatically via `ValidationBehavior`.
- **Data access pattern:** handlers inject `IStockFlowDbContext` (`Application/Common/Interfaces`) and use EF Core directly.
  - A new entity must be added in three places: as a `DbSet` on `IStockFlowDbContext`, on `StockFlowDbContext`, and in a migration.
- **StockFlowDbContext** (Infrastructure/Persistence) is a large scaffold-style file. All tables are in schema `stockflow`. Column mapping is snake_case via explicit `HasColumnName` in `OnModelCreating`. Follow that pattern for new columns.
- **Document codes** come from Postgres sequences (`GetNextSequenceValueAsync("stockflow.seq_...")`). They are formatted by `ITransactionCodeGenerator` or per-module helpers, using prefixes and rules (SEQUENTIAL/DATETIME/RANDOM) from the `MstOrderSetting` row with id 1.
- **Inventory model:**
  - Stock on hand lives in `TrxInventoryBalances`, keyed by warehouse, location, product, and lot.
  - Every stock movement must also append a `TrxInventoryTransactions` row (type, reference_type/reference_id, created_by).
- **Timestamps** are `timestamp without time zone`, with `Npgsql.EnableLegacyTimestampBehavior` on. Modules store Vietnam local time (see `TransferHelper.GetVietnamTime`).
- **Controllers** are thin: build a command or query, call `_mediator.Send`, then map `IsSuccess` to `Ok` or `BadRequest(new { message })`.
- **Authorization** (`StockFlow.API/Authorization/RequirePermissionAttribute.cs`):
  - A `FallbackPolicy` requires an authenticated user on every endpoint. Only login and health are `[AllowAnonymous]`.
  - Each action declares `[RequirePermission("MODULE_ACTION")]`. Codes come from `PermissionConstants`: modules AUTH/BOM/PARTNER/PURCHASE/SALES/STOCK/PROD/FIN/GOODS, actions READ/CREATE/UPDATE/DELETE/APPROVE.
  - Use `[RequireAdmin]` for account, role, permission-matrix and warehouse-access writes (UC-01/07/10).
  - Permissions are resolved from the DB per request by `IUserPermissionService`, not from the token. Admin always passes; a locked user has no permissions; a role with no matrix falls back to `GetDefaultPermissionCodes`.
  - New endpoints must declare a permission.
- **Warehouse isolation** goes through `ICurrentUserService.HasWarehouseAccessAsync` / `GetAuthorizedWarehouseIdsAsync`, which read `jnc_user_warehouse_access` from the DB; Admin sees all active warehouses.
  - Handlers check it explicitly. Purchases check the receipt's warehouse; POS checks the selling warehouse; Transfers check the source warehouse for create/update/issue/cancel and the destination warehouse for receive.
  - Use `ICurrentUserService.UserId` for `CreatedBy`. Never hard-code 1.

## Frontend architecture

- Each route is `src/app/(dashboard)/<module>/page.tsx`. It lazy-loads `<Module>Screen.tsx` from `src/features/<module>/screens` via `next/dynamic` with `ssr: false`.
- Feature code lives in `src/features/<module>/{components,screens,services,types,utils}`.
- Feature-specific sidebars and modals live in `src/features/<module>/components/`. Shared components live in `src/components/`. Layout lives in `src/components/layout/AppLayout.tsx`. Top navigation is the `NAV_ITEMS` array in `src/components/Navbar.tsx`.
- `src/lib/api/client.ts` is the only HTTP client. It reads the JWT from `localStorage` (`stockflow_token`).
  - Under `npm run dev` it **auto-logs in as `admin` / `TinPhat@2026`** only if this browser has never logged in. Disable with `NEXT_PUBLIC_DEV_AUTO_LOGIN=false`.
  - A 401 on an existing session clears the session and redirects to `/login`.
  - The Header role/staff switcher is hidden unless `NEXT_PUBLIC_ENABLE_ROLE_SWITCHER=true` (`src/lib/auth/flags.ts`). Even when shown it only changes the UI, because the backend authorizes by the real JWT.
  - Default passwords differ by source: `TinPhat@2026` is used by the seeder and staff-creation code paths, and `database/seed.sql` uses `StockFlow@123`.
- `src/lib/warehouse/useActiveWarehouse.ts` holds the globally selected warehouse, KiotViet "branch" style, stored in localStorage.
  - Active warehouses are hard-coded there as ids 3–6 (K001 Gia Lâm, K002 Đông Anh, K003 Hà Đông, K004 Hoàn Kiếm). They match `DatabaseSeeder`, where ids 1–2 are inactive.
- UI must match the Goods Catalog module (`GoodsCatalogScreen.tsx`, `ProductFilterSidebar.tsx`). [AI_CODING_RULES.md](AI_CODING_RULES.md) §5 is the spec:
  - Colors: brand `#0071BA`, table header `#e8f2ff`.
  - Use antd `Table`/`Button`/`Pagination`/`Tag`, plus a per-module `.stockflow-<module>-table` CSS block in `globals.css`.
  - Modals are custom-built; do not use antd `Modal`.
  - Icons come from `lucide-react`; no `react-icons` and no `moment`.
  - Code must be strict TypeScript with no `any`.

## Database files

- `database/stockflow.sql` is the full ERD as SQL and `database/@startuml StockFlow_Full_ERD.txt` is the PlantUML source. Use them for reference only. The live schema is owned by EF migrations; never hand-edit the schema.
- `database/seed.sql`, `seed_pos_products.sql`, and `create_order_settings.sql` are ad-hoc data scripts.
- Roles: Admin, Manager, SalesStaff, WarehouseStaff, ProductionStaff.

## Domain notes

- **Stock transfer** (UC-33, BR-39/BR-40, screen 3.2.5.8) uses two-step confirmation:
  1. The source warehouse issues the goods: source stock is deducted and the transfer is `IN_TRANSIT`.
  2. The destination warehouse confirms receipt: destination stock is added. The received quantity may differ from the issued quantity.
  - The code uses statuses `DRAFT → IN_TRANSIT → RECEIVED` (plus `CANCELLED`, which restores source stock). The SRS calls them `PENDING_ISSUE / IN_TRANSIT / COMPLETED`.
- **Warehouse data isolation** (`jnc_user_warehouse_access`): non-admin users may only see or act on their assigned warehouses.
- All money values are net of VAT (BR-55). While a stocktake is active, inbound and outbound transactions for that warehouse are blocked (BR-56).

## Git

Feature branches are named `feature/<module>` (e.g. `feature/chuyen-hang`) and merge into `dev`, then `main` via PR. Commit messages are short and often Vietnamese (`feat: ...`, `Suppliers: ...`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
