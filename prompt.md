# Task: Set Up the StockFlow Project Structure Using PostgreSQL

Act as a senior software architect and full-stack engineer. Set up the initial project structure for StockFlow, an Order and Inventory Management System for Tin Phat Company.

The purpose of this task is to create a clean, maintainable, buildable foundation before implementing business features.

**Do not implement business functionality or create the business database schema yet.**

## 1. Technology Stack

### Frontend
- Next.js with App Router
- React
- TypeScript

### Backend
- ASP.NET Core Web API
- C#
- Entity Framework Core

### Database
- PostgreSQL as the only primary database
- Npgsql Entity Framework Core provider
- pgAdmin 4 as the optional graphical database management tool

## 2. Backend Architecture: Clean Architecture

The backend follows Clean Architecture principles organized by feature, divided into 4 layers/projects:

### StockFlow.Domain
- **Purpose**: The heart of the system — pure business logic with no external dependencies
- **Contains**: Entities, Value Objects, Domain Events, Repository Interfaces, Domain Exceptions, Enums
- **Rules**: No references to other projects; no NuGet packages except those needed for C# language features

### StockFlow.Application
- **Purpose**: Orchestrates use cases using CQRS + MediatR pattern
- **Contains**: Commands, Queries, Handlers, DTOs, Validators (FluentValidation), Application Interfaces
- **Dependencies**: StockFlow.Domain
- **NuGet**: MediatR, FluentValidation

### StockFlow.Infrastructure
- **Purpose**: Implements repository interfaces; communicates with external systems
- **Contains**: EF Core DbContext, Repository Implementations, Migrations, External Service Clients
- **Dependencies**: StockFlow.Application, StockFlow.Domain
- **NuGet**: Npgsql.EntityFrameworkCore.PostgreSQL, Microsoft.EntityFrameworkCore.Design

### StockFlow.API
- **Purpose**: Entry point — HTTP layer, DI wiring, middleware
- **Contains**: Controllers, Middleware (exception handling), Program.cs, appsettings.json
- **Dependencies**: StockFlow.Application, StockFlow.Infrastructure
- **NuGet**: Swashbuckle.AspNetCore, Microsoft.AspNetCore.Authentication.JwtBearer

## 3. Root Directory Structure

```
Project_TinPhat/
├── StockFlow_Backend/       # ASP.NET Core solution
│   ├── StockFlow.sln
│   ├── StockFlow.API/
│   ├── StockFlow.Application/
│   ├── StockFlow.Domain/
│   └── StockFlow.Infrastructure/
├── StockFlow_Frontend/      # Next.js App Router project
│   ├── src/
│   │   ├── app/             # App Router pages and layouts
│   │   ├── features/        # Feature-based modules
│   │   ├── shared/          # Shared components, hooks, utils
│   │   └── lib/             # API client, config, types
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── architecture.md
│   └── Report1.docx
│   └── Report3.docx
└── prompt.md                # This file
```

## 4. Backend Detailed Structure

```
StockFlow_Backend/
├── StockFlow.sln
├── StockFlow.Domain/
│   ├── Common/
│   │   ├── BaseEntity.cs        # Base class with Id, CreatedAt, UpdatedAt, IsDeleted
│   │   └── AuditableEntity.cs  # Extends BaseEntity with CreatedBy, UpdatedBy
│   ├── Entities/               # (empty for now — business entities added per feature)
│   ├── Enums/                  # (empty for now)
│   ├── Interfaces/
│   │   ├── IRepository.cs      # Generic repository contract
│   │   └── IUnitOfWork.cs      # Unit of Work contract
│   └── Exceptions/
│       └── DomainException.cs  # Base domain exception
│
├── StockFlow.Application/
│   ├── DependencyInjection.cs  # Registers MediatR + FluentValidation
│   ├── Common/
│   │   ├── Result.cs           # Railway-oriented result type
│   │   └── PaginatedResult.cs  # Pagination wrapper
│   ├── Behaviors/
│   │   └── ValidationBehavior.cs  # MediatR pipeline: runs validators before handler
│   ├── Features/               # (empty — one subfolder per business feature)
│   ├── Interfaces/             # Application service contracts
│   └── DTOs/                   # Shared DTOs
│
├── StockFlow.Infrastructure/
│   ├── DependencyInjection.cs  # Registers DbContext + Repositories
│   ├── Persistence/
│   │   ├── StockFlowDbContext.cs   # EF Core DbContext (Npgsql/PostgreSQL)
│   │   ├── Configurations/         # IEntityTypeConfiguration<T> classes
│   │   └── Migrations/             # EF Core migrations (auto-generated)
│   ├── Repositories/
│   │   ├── GenericRepository.cs    # Generic IRepository<T> implementation (soft-delete)
│   │   └── UnitOfWork.cs           # IUnitOfWork implementation
│   ├── Services/               # External service implementations
│   └── Identity/               # Auth/JWT helpers
│
└── StockFlow.API/
    ├── Program.cs              # App bootstrap, DI, middleware pipeline
    ├── appsettings.json        # Connection strings, JWT config
    ├── appsettings.Development.json
    ├── Controllers/
    │   └── HealthController.cs # GET /api/health — liveness probe
    ├── Middleware/
    │   └── ExceptionHandlingMiddleware.cs  # Global error handler → structured JSON
    ├── Extensions/             # Service extension methods
    └── Filters/                # Action filters
```

## 5. Frontend Detailed Structure

```
StockFlow_Frontend/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout (fonts, global providers)
│   │   ├── page.tsx           # Home/dashboard redirect
│   │   ├── (auth)/            # Auth route group (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   └── (dashboard)/       # Protected routes (with sidebar)
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── products/page.tsx
│   │       ├── inventory/page.tsx
│   │       ├── orders/page.tsx
│   │       ├── suppliers/page.tsx
│   │       └── reports/page.tsx
│   │
│   ├── features/              # Feature-based business modules
│   │   ├── auth/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   └── reports/
│   │
│   ├── shared/                # Cross-cutting UI concerns
│   │   ├── components/
│   │   │   ├── ui/            # Base UI components (Button, Input, Modal, etc.)
│   │   │   ├── layout/        # Sidebar, Navbar, etc.
│   │   │   └── data-display/  # Table, Badge, etc.
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Pure utility functions
│   │
│   └── lib/                   # Infrastructure / config
│       ├── api/               # Axios/fetch API client
│       ├── auth/              # Auth context, token management
│       └── types/             # Global TypeScript types
│
├── public/
├── package.json
└── tsconfig.json
```

## 6. Database Configuration

- **Provider**: PostgreSQL via Npgsql
- **Connection string key**: `StockFlowDb`
- **Default database name**: `stockflow_dev`
- **Registration**: `UseNpgsql()` in `StockFlow.Infrastructure/DependencyInjection.cs`
- **Migrations assembly**: `StockFlow.Infrastructure`

Example connection string in `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "StockFlowDb": "Host=localhost;Port=5432;Database=stockflow_dev;Username=postgres;Password=yourpassword"
  }
}
```

## 7. Scope — What NOT To Do Yet

- Do **not** create business entity classes (Product, Order, Warehouse, etc.)
- Do **not** create EF migrations
- Do **not** implement full authentication/authorization
- Do **not** implement business CRUD operations
- Do **not** create API controllers beyond HealthController

## 8. Verification Steps

After scaffolding is complete:
1. `dotnet build StockFlow.sln` → **Build succeeded, 0 Errors, 0 Warnings**
2. `dotnet run --project StockFlow.API` → API starts on `http://localhost:5000` or `https://localhost:5001`
3. `GET http://localhost:5000/api/health` → `{ "status": "healthy", "timestamp": "..." }`
4. `npm run dev` in `StockFlow_Frontend/` → Next.js starts on `http://localhost:3000`

## 9. Documentation

Create:
- `docs/architecture.md` — describes the layer structure, data flow, and technology choices
- `README.md` at project root — quick-start guide for developers
