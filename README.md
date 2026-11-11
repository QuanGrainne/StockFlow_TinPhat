# StockFlow — Order & Inventory Management System

Hệ thống quản lý đơn hàng và kho hàng cho Công ty TNHH Tín Phát.

## Quick Start

### Prerequisites
- .NET 9 SDK
- Node.js 22+
- PostgreSQL 15+
- pgAdmin 4 (optional)

### 1. Setup Database
Create a PostgreSQL database named `stockflow_dev`:
```sql
CREATE DATABASE stockflow_dev;
```

Update the connection string in `StockFlow_Backend/StockFlow.API/appsettings.Development.json`:
```json
"StockFlowDb": "Host=localhost;Port=5432;Database=stockflow_dev;Username=postgres;Password=your_password"
```

### 2. Run the Backend
```powershell
cd StockFlow_Backend
dotnet build
dotnet run --project StockFlow.API
```
API available at: http://localhost:5000  
Swagger UI: http://localhost:5000/swagger

### 3. Run the Frontend
```powershell
cd StockFlow_Frontend
npm install
npm run dev
```
Frontend available at: http://localhost:3000

### 4. Verify
- `GET http://localhost:5000/api/health` → `{ "status": "healthy" }`
- Browser: `http://localhost:3000` → redirects to login page

## Project Structure
```
Project_TinPhat/
├── StockFlow_Backend/    # ASP.NET Core Web API (Clean Architecture)
├── StockFlow_Frontend/   # Next.js App Router (TypeScript)
├── database/             # ERD SQL and ad-hoc seed scripts
└── docs/                 # Requirements & Architecture docs (docs/archive/prompt.md: original scaffold instructions)
```

See [`docs/architecture.md`](docs/architecture.md) for detailed architecture overview.

## Technology Stack
- **Backend**: ASP.NET Core 9, EF Core 9, PostgreSQL, MediatR, FluentValidation
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5
- **Database**: PostgreSQL 15 via Npgsql

## Team
SEP490 — Tin Phát Company Project
