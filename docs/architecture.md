# StockFlow — Architecture Overview

## System Overview

StockFlow is an Order & Inventory Management System for Tin Phát Company.  
It follows a **Modular Monolith** backend architecture with a **Next.js App Router** frontend.

---

## Backend Architecture (Clean Architecture / Modular Monolith)

```
┌────────────────────────────────────────────────────────┐
│                   StockFlow.API                        │
│  (HTTP, Middleware, DI Bootstrap, Swagger)             │
└────────────┬───────────────────────┬───────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────┐   ┌──────────────────────────────┐
│ StockFlow.          │   │  StockFlow.Infrastructure     │
│ Application         │   │  (EF Core, Npgsql, Repos,    │
│ (MediatR CQRS,      │◄──│   UnitOfWork, Migrations)    │
│  FluentValidation,  │   └──────────────────────────────┘
│  DTOs, Behaviors)   │
└────────────┬────────┘
             │
             ▼
┌─────────────────────────────────────┐
│         StockFlow.Domain             │
│  (Entities, Interfaces, Exceptions,  │
│   Enums — zero external dependencies)│
└─────────────────────────────────────┘
```

### Layer Rules
| Layer | Depends On | Key Packages |
|-------|-----------|--------------|
| Domain | *nothing* | — |
| Application | Domain | MediatR, FluentValidation |
| Infrastructure | Application, Domain | Npgsql.EF, EF.Design |
| API | Application, Infrastructure | Swashbuckle, JwtBearer |

### Request Flow
```
HTTP Request
  → ExceptionHandlingMiddleware
  → Controller
  → MediatR.Send(Command/Query)
  → ValidationBehavior (FluentValidation)
  → Handler
  → Repository / DbContext (PostgreSQL)
  → Response DTO
```

---

## Frontend Architecture (Next.js App Router + Feature-based)

```
src/
├── app/            # Next.js routing (App Router)
│   ├── (auth)/     # Login — no sidebar layout
│   └── (dashboard)/# Protected pages — sidebar layout
│
├── features/       # Business domain modules
│   └── {feature}/
│       ├── components/  # Feature-specific React components
│       └── hooks/       # Feature-specific data hooks (SWR/React Query)
│
├── shared/         # Cross-cutting UI concerns
│   ├── components/ui/        # Reusable base components
│   ├── components/layout/    # Sidebar, Navbar
│   └── hooks/               # Global hooks (useDebounce, useLocalStorage, etc.)
│
└── lib/            # Infrastructure
    ├── api/        # Fetch-based API client
    ├── auth/       # AuthContext (JWT, localStorage)
    └── types/      # Global TypeScript types
```

---

## Database

- **Engine**: PostgreSQL 15+
- **Provider**: Npgsql Entity Framework Core
- **Database name**: `stockflow_dev` (development)
- **Migrations**: Managed by EF Core, stored in `StockFlow.Infrastructure/Persistence/Migrations/`

---

## Technology Versions

| Technology | Version |
|-----------|---------|
| .NET | 9.0 |
| ASP.NET Core | 9.0 |
| EF Core | 9.0.x |
| Npgsql.EF | 9.0.x |
| MediatR | 14.x |
| FluentValidation | 12.x |
| Swashbuckle | 6.x |
| Next.js | 15.x |
| React | 19.x |
| TypeScript | 5.x |

---

## Key Design Decisions

1. **No Tailwind at this stage** — Vanilla CSS modules / global CSS until the design system is defined.
2. **Soft delete** — Entities have `IsDeleted` flag; `GenericRepository` filters deleted records automatically.
3. **Railway-oriented results** — Handlers return `Result<T>` instead of throwing exceptions for expected failures.
4. **MediatR pipeline** — `ValidationBehavior` runs FluentValidation before every handler, no manual validator calls.
5. **CQRS** — Commands mutate state, Queries read state; separation enforced by MediatR.
