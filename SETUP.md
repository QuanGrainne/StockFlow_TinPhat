# StockFlow --- Development Environment Setup

This document defines the development environment for StockFlow team
members and AI coding agents (including Antigravity). Read it before
installing dependencies or changing project configuration.

## 1. Project and Technology Stack

-   Frontend: Next.js, React, TypeScript, App Router
-   Backend: ASP.NET Core Web API, C#
-   Architecture: Clean Architecture (4 layers, feature-organized
    CQRS via MediatR)
-   ORM: Entity Framework Core
-   Database: PostgreSQL
-   Database GUI: pgAdmin 4

The frontend must communicate with the backend through HTTP APIs. It
must never connect directly to PostgreSQL.

## 2. Required Software and Versions

  -----------------------------------------------------------------------------------
  Component               Team baseline /         Notes
                          requirement             
  ----------------------- ----------------------- -----------------------------------
  Git                     Installed version       Clone, pull, commit

  .NET SDK                .NET 9; current         Follow `global.json` if present
                          verified version        
                          `9.0.308`               

  EF Core CLI             `9.0.20`                Verified global-tool version; also
  (`dotnet-ef`)                                   pin as a local tool in the
                                                  repository

  EF Core project         `9.0.20` baseline       Keep
  packages                                        `Microsoft.EntityFrameworkCore.*`
                                                  package versions aligned

  Npgsql EF Core provider Version compatible with Pin the selected version in the
                          EF Core 9               project

  PostgreSQL Server       `18.6` current          Default port `5432`
                          development baseline    

  pgAdmin 4               Installed stable        PostgreSQL GUI
                          version                 

  Node.js                 Follow repository pin;  Check `.nvmrc`, `.node-version`, or
                          otherwise use an LTS    documentation
                          version compatible with 
                          the pinned Next.js      
                          version                 

  npm                     Bundled with selected   Use committed lockfile
                          Node.js unless          
                          repository specifies    
                          otherwise               

  Editor                  Visual Studio 2022 or   Install required extensions
                          Visual Studio Code      

  Antigravity             Developer-installed     Must follow this document and
                          version                 repository config
  -----------------------------------------------------------------------------------

### Version policy

-   Use .NET 9 for the backend.
-   Use EF Core 9.x and `dotnet-ef` `9.0.20` for the current team
    baseline.
-   Keep all `Microsoft.EntityFrameworkCore.*` packages on the same
    selected version.
-   Choose an Npgsql provider version compatible with EF Core 9 and pin
    it in the project file.
-   Do not upgrade major versions, change the database provider, or
    regenerate lockfiles without team approval.
-   Once committed, `global.json`, `.config/dotnet-tools.json`,
    `.csproj` files, `package.json`, and package lockfiles are the
    source of truth.

## 3. .NET SDK and EF Core CLI

Check installed SDKs:

``` cmd
dotnet --list-sdks
```

The current development machine has verified SDK `9.0.308`.

Check EF Core CLI:

``` cmd
dotnet ef --version
dotnet tool list --global
```

Expected CLI version:

``` text
Entity Framework Core .NET Command-line Tools
9.0.20
```

The current machine has `dotnet-ef` `9.0.20` installed globally. Global
tools are per-user and are not shared by Git.

### Pin the EF Core CLI for the team

Run these commands from the repository root. Create a manifest only if
`.config/dotnet-tools.json` does not already exist:

``` cmd
dotnet new tool-manifest
dotnet tool install dotnet-ef --version 9.0.20
```

If the manifest already exists and contains `dotnet-ef`, update it
instead:

``` cmd
dotnet tool update dotnet-ef --version 9.0.20
```

Verify the local tool:

``` cmd
dotnet tool list --local
```

Commit `.config/dotnet-tools.json` to Git. After cloning or pulling,
each developer runs:

``` cmd
dotnet tool restore
dotnet tool list --local
```

Use the repository-pinned local tool for team work. Do not assume a
global tool installation configures another developer's machine.

## 4. Install and Verify PostgreSQL

Official Windows download: https://www.postgresql.org/download/windows/

Current development baseline: - PostgreSQL Server `18.6` - Host:
`localhost` - Port: `5432` - Administrative username: `postgres` - Local
development database: `stockflow_dev`

During installation, set a password for `postgres`, store it securely,
and keep port `5432` unless it is already occupied. Install pgAdmin 4 if
offered.

pgAdmin 4 download: https://www.pgadmin.org/download/

### Verify PostgreSQL

``` cmd
psql --version
```

Expected for the current baseline:

``` text
psql (PostgreSQL) 18.6
```

If `psql` is not recognized, check whether this folder exists and is
included in the PATH environment variable:

``` text
C:\Program Files\PostgreSQL\18\bin
```

You can test the executable directly:

``` cmd
"C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

Check the PostgreSQL Windows service by opening `services.msc` and
confirming that the PostgreSQL service is `Running`.

### Verify a connection

``` cmd
psql -h localhost -p 5432 -U postgres -d postgres
```

Enter the password configured during installation, then run:

``` sql
SELECT version();
```

Exit with:

``` text
\q
```

## 5. Create the Local Development Database

Create a local database named `stockflow_dev` in pgAdmin 4:

1.  Connect to the local PostgreSQL server.
2.  Right-click **Databases**.
3.  Select **Create → Database**.
4.  Set **Database** to `stockflow_dev`.
5.  Set **Owner** to `postgres`, or to the local owner agreed upon by
    the team.
6.  Save.

If it already exists, do not create it again. Alternatively, from a user
with permission to create databases:

``` sql
CREATE DATABASE stockflow_dev;
```

The database may remain empty during initial setup. Do not manually
create business tables. Later schema changes will be managed through
reviewed EF Core migrations. Each developer may use a separate local
database; one developer's `localhost` database is not automatically
available to other developers.

## 6. Connection String and Credentials

The connection string key is `StockFlowDb`.

Example local connection string:

``` text
Host=localhost;Port=5432;Database=stockflow_dev;Username=postgres;Password=YOUR_PASSWORD
```

Never commit a real password to Git. Use .NET User Secrets for local
development or an appropriate environment variable.

After the API project exists, run from its directory if User Secrets
have not already been initialized:

``` cmd
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:StockFlowDb" "Host=localhost;Port=5432;Database=stockflow_dev;Username=postgres;Password=YOUR_PASSWORD"
```

Replace the placeholder locally. Follow the actual API project's
configuration if it differs.

## 7. EF Core and Npgsql Packages

The backend should use compatible references to: -
`Microsoft.EntityFrameworkCore` -
`Microsoft.EntityFrameworkCore.Design` -
`Npgsql.EntityFrameworkCore.PostgreSQL`

For the current baseline, use EF Core `9.0.20` and a compatible Npgsql
provider version. Inspect existing `.csproj` files before adding or
changing package references. Do not add duplicate packages or upgrade
dependencies automatically.

The CLI version does not by itself determine the EF Core runtime
version. The EF Core project packages and Npgsql provider must also be
compatible.

## 8. Migrations --- Later Development Stage

EF Core migrations work with PostgreSQL through the Npgsql provider.
They generate schema changes from the configured EF Core model.

Only after the backend projects, `DbContext`, entity configurations,
provider, and connection string are implemented and reviewed should the
team create or apply migrations.

Typical commands, assuming these project paths exist:

``` cmd
dotnet ef migrations add InitialCreate --project src/StockFlow.Infrastructure --startup-project src/StockFlow.API --output-dir Persistence/Migrations
dotnet ef database update --project src/StockFlow.Infrastructure --startup-project src/StockFlow.API
```

Confirm paths and design-time configuration before running them.

During initial scaffolding: - Do not create business entities, tables,
migrations, or seed data unless explicitly requested. - Do not delete or
recreate a database to fix an error without team approval. - Coordinate
changes to migrations that have already been shared or applied. - Commit
reviewed migration files when schema changes are intentionally
introduced.

## 9. Frontend Setup

Use the Node.js version specified by the repository, and use the
committed package lockfile. From the frontend directory:

``` cmd
npm ci
npm run dev
```

Build using the script defined by the repository, typically:

``` cmd
npm run build
```

Do not change package managers or regenerate lockfiles without team
approval.

## 10. Clone / Pull Checklist

After cloning or pulling the repository:

1.  Read this document and the root `README.md`.
2.  Check .NET SDK: `dotnet --list-sdks`.
3.  Restore repository-pinned tools: `dotnet tool restore`.
4.  Verify local EF CLI: `dotnet tool list --local` and
    `dotnet ef --version`.
5.  Check PostgreSQL: `psql --version`.
6.  Confirm the PostgreSQL service is running and `stockflow_dev`
    exists.
7.  From the backend solution directory, run `dotnet restore` and
    `dotnet build`.
8.  From the frontend directory, run `npm ci` and the configured build
    script.

Only report a command as successful if it was actually run and its
result was checked.

## 11. Instructions for Antigravity and AI Coding Agents

Before making changes:

1.  Read this document and the root `README.md`.
2.  Inspect `global.json`, `.config/dotnet-tools.json`, backend
    `.csproj` files, `frontend/package.json`, and package lockfiles.
3.  Compare installed tools with repository-pinned versions.
4.  Report missing prerequisites or version mismatches before installing
    or upgrading software.
5.  Preserve the existing architecture, folder structure, database
    provider, package manager, and pinned dependency versions.
6.  Do not upgrade .NET, EF Core, Npgsql, Next.js, or other dependencies
    without explicit team approval.
7.  Never expose or commit credentials.
8.  Do not implement business functionality, business entities, tables,
    migrations, seed data, or external integrations during initial
    scaffolding unless explicitly requested.
9.  Do not replace PostgreSQL with SQL Server or add another database
    provider.
10. Do not claim software was installed, a build passed, or a database
    connection succeeded unless verified.
11. If a requirement conflicts with the repository, explain the conflict
    before making broad or destructive changes.

## 12. Initial Scaffolding Scope

This document covers environment setup and development conventions only.
During initial scaffolding, prepare the repository structure and verify
the toolchain. Do not implement business workflows, business entities,
database schema, migrations, seed records, or integrations until
explicitly approved.

## 13. Run with Docker (optional)

Docker is an **optional** second way to run StockFlow. Team members
without Docker keep the normal workflow (local PostgreSQL +
`dotnet run` + `npm run dev`); the Docker files are never read by
`dotnet` or `npm`.

### What runs

`deploy/compose.yml` starts four containers (project name `stockflow`):

| Service | Image / source | Role |
|---|---|---|
| `db` | `postgres:18` | Database, data kept in the `pgdata` volume |
| `api` | `StockFlow_Backend/Dockerfile` | ASP.NET Core 9 API on port 8080 inside Docker |
| `web` | `StockFlow_Frontend/Dockerfile` | Next.js (`next start`) on port 3000 inside Docker |
| `caddy` | `caddy:2` + `deploy/caddy/Caddyfile` | Single entry point: `/api/*` to `api`, everything else to `web` |

The browser only talks to `http://localhost:8080`, so the API and the
web share one address and no CORS setup is needed. The web image is
built with `NEXT_PUBLIC_API_URL=""`, which makes the browser call
`/api/...` on the same address.

### First start

```bash
cp deploy/.env.example deploy/.env      # once; deploy/.env is gitignored
docker compose -f deploy/compose.yml up -d --build --wait
```

Open <http://localhost:8080> and sign in with a seeded account
(`admin`, password from `DatabaseSeeder`).

On first start the API applies all EF Core migrations to the empty
database and runs `DatabaseSeeder` (roles, warehouses, users, categories,
units, suppliers, default price book). The resulting schema was checked
against a team development database: same tables, columns, sequences
and unique keys.

### Everyday commands

```bash
docker compose -f deploy/compose.yml up -d --build --wait   # start / rebuild after pulling code
docker compose -f deploy/compose.yml ps                     # status
docker compose -f deploy/compose.yml logs -f api            # follow API log
docker compose -f deploy/compose.yml stop                   # stop, keep data
docker compose -f deploy/compose.yml down                   # remove containers, keep data
```

`docker compose ... down -v` also deletes the `pgdata` volume, which means
**every record in the Docker database**. Use it only to reset a test
database on purpose.

### Settings (`deploy/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `stockflow_dev` / `stockflow` / dev value | Read only when the `pgdata` volume is created |
| `DB_PORT` | `5433` | Host port for pgAdmin/psql (`127.0.0.1:5433`), separate from a local PostgreSQL on 5432 |
| `JWT_SECRET_KEY` | dev value | JWT signing key, at least 32 characters |
| `HTTP_PORT` | `8080` | Port of the site |
| `HTTP_BIND` | `127.0.0.1` | `0.0.0.0` lets other machines on the LAN open the site (demo) |

Change `POSTGRES_PASSWORD` and `JWT_SECRET_KEY` before the stack is
reachable by anyone else. Never commit `deploy/.env`.

### Notes

- The Docker database is separate from your local `stockflow_dev`
  database; the two never share data.
- After changing backend or frontend code, rebuild with
  `up -d --build`. For day-to-day coding, `dotnet run` / `npm run dev`
  give faster reloads.
- On Windows, Hyper-V reserves random port ranges above 49152. If a port
  in `deploy/.env` fails with "access permissions", pick another one
  (check with `netsh int ipv4 show excludedportrange protocol=tcp`).
