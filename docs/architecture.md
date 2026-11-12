# StockFlow — Architecture Overview

## System Overview

StockFlow is an Order & Inventory Management System for Tin Phát Company.
The backend is **Clean Architecture with 4 projects, organized by feature, CQRS with MediatR**.
The frontend is **Next.js App Router, feature-based**. They talk only over HTTP (JWT bearer).
Detailed rules: [`.claude/rules/10-backend-structure.md`](../.claude/rules/10-backend-structure.md) and [`.claude/rules/20-frontend-structure.md`](../.claude/rules/20-frontend-structure.md).

---

## Backend Architecture (Clean Architecture)

```
┌────────────────────────────────────────────────────────┐
│                   StockFlow.API                        │
│  (Controllers, Authorization, Middleware, DI, Swagger) │
└────────────┬───────────────────────┬───────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────┐   ┌──────────────────────────────┐
│ StockFlow.         │   │  StockFlow.Infrastructure     │
│ Application        │◄──│  (EF Core DbContext, Npgsql,  │
│ (MediatR CQRS,     │   │   Migrations, Seeder,         │
│  FluentValidation, │   │   Jwt/CurrentUser/Permission/ │
│  DTOs, Behaviors,  │   │   document-code services)     │
│  Inventory ledger) │   └──────────────┬───────────────┘
└────────────┬───────┘                  │
             │                          │
             ▼                          ▼
┌─────────────────────────────────────────────┐
│               StockFlow.Domain              │
│  (Entities only: Mst*, Trx*, Dtl*, Sec*,    │
│   Jnc* — zero external dependencies)        │
└─────────────────────────────────────────────┘
```

### Folder layout
```
StockFlow_Backend/
├── StockFlow.Domain/Entities                one class per table
├── StockFlow.Application/
│   ├── Common/                              Result<T>, PaginatedResult, VietnamTime
│   │   ├── Interfaces/                      IStockFlowDbContext, ICurrentUserService, IInventoryLedger, ...
│   │   └── Inventory/                       InventoryLedger, StockKey, StockRef
│   ├── Behaviors/                           ValidationBehavior
│   ├── Features/<Module>/                   Commands/  Queries/  DTOs/  Helpers/
│   └── DependencyInjection.cs
├── StockFlow.Infrastructure/
│   ├── Persistence/                         StockFlowDbContext, Migrations/, DatabaseSeeder
│   ├── Services/                            CurrentUserService, JwtTokenGenerator, BcryptPasswordHasher,
│   │                                        TransactionCodeGenerator, UserPermissionService
│   └── DependencyInjection.cs
└── StockFlow.API/                           Controllers/  Authorization/  Middleware/  Program.cs
```

### Layer Rules
| Layer | Depends On | Key Packages |
|-------|-----------|--------------|
| Domain | *nothing* | — |
| Application | Domain | MediatR, FluentValidation, EF Core (via `IStockFlowDbContext`) |
| Infrastructure | Application, Domain | Npgsql.EF, EF.Design |
| API | Application, Infrastructure | Swashbuckle, JwtBearer |

### Request Flow
```
HTTP Request
  → ExceptionHandlingMiddleware
  → Authorization (FallbackPolicy + [RequirePermission])
  → Controller (thin)
  → MediatR.Send(Command/Query)
  → ValidationBehavior (FluentValidation)
  → Handler (IStockFlowDbContext, transactions via BeginTransactionAsync)
      └─ stock movements → IInventoryLedger (balance + stock-card row)
  → Result<T> → Ok / BadRequest(new { message })
```

---

## Frontend Architecture (Next.js App Router + Feature-based)

```
src/
├── app/                      # Routing only (page.tsx files)
│   ├── (auth)/login/
│   ├── (dashboard)/<route>/  # list pages render <LazyAppLayout initialScreen="..." />
│   └── pos/
│
├── features/<module>/        # admin, bom, customers, orders, pos, price-books, production,
│   ├── screens/              #   products, purchase-orders, purchase-returns, purchases,
│   ├── components/           #   sales-bookings, sales-returns, settings, stocktakes,
│   ├── services/             #   suppliers, transfers
│   └── types/  utils/  hooks/
│
├── components/               # Shared only
│   ├── layout/               # AppLayout, LazyAppLayout, Header, Sidebar, FeatureGuard, FormHeaderUserBar
│   ├── filters/  inputs/  links/
│   └── ProductThumb, ImageLightbox, brand/
│
└── lib/
    ├── api/                  # client.ts — the only HTTP client
    ├── auth/  navigation/    # navbar.ts (NAV_GROUPS), currentRole.ts
    ├── warehouse/  print/  ui/  utils/   # utils/date.ts (hàm ngày dùng chung)
```

Page loading path: `page.tsx → LazyAppLayout → AppLayout (Header + Sidebar + permission check) → switch (activeScreen) → features/<module>/screens/<Module>Screen`.
`orders/[id]` and `pos` pass their screen to `LazyAppLayout` as `children`; create pages (`*/create`) load their own screen with `next/dynamic`.

---

## Database

- **Engine**: PostgreSQL 15+
- **Provider**: Npgsql Entity Framework Core
- **Database name**: `stockflow_dev` (development), schema `stockflow`
- **Migrations**: Managed by EF Core, stored in `StockFlow.Infrastructure/Persistence/Migrations/`; applied automatically at API startup together with `DatabaseSeeder`.

---

## Technology Versions

| Technology | Version |
|-----------|---------|
| .NET / ASP.NET Core | 9.0 |
| EF Core | 9.0.x |
| Npgsql.EF | 9.0.x |
| MediatR | 14.x |
| FluentValidation | 11.x |
| Swashbuckle | 6.x |
| Next.js | 16.x |
| React | 19.x |
| antd | 6.x |
| Tailwind CSS | 4.x |
| TypeScript | 5.x |

---

## Key Design Decisions

1. **No repositories / unit of work** — handlers use `IStockFlowDbContext` (EF Core) directly; transactions only via `IStockFlowDbContext.BeginTransactionAsync`.
2. **Railway-oriented results** — Handlers return `Result<T>` instead of throwing exceptions for expected failures.
3. **MediatR pipeline** — `ValidationBehavior` runs FluentValidation before every handler, no manual validator calls.
4. **CQRS** — Commands mutate state, Queries read state; separation enforced by MediatR.
5. **Shared inventory ledger** — every stock movement updates `trx_inventory_balances` and appends one `trx_inventory_transactions` row through `IInventoryLedger` (moving-average cost).
6. **Warehouse isolation** — handlers check `ICurrentUserService.HasWarehouseAccessAsync`; permissions are resolved from the DB per request.
