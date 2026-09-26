# DOGFOOD Architecture Documentation

## 1. System Overview

DOGFOOD is designed as a high-performance **modular monolith**. It delivers a complete hackathon management, submission, judging, and community voting lifecycle while operating entirely within local or containerized infrastructure without external cloud services.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                   |
+-----------------------------------------------------------------------------------+
                                          |
                     +--------------------+--------------------+
                     | HTTP (Port 3000)                        | HTTP/JSON (Port 4000)
                     v                                         v
        +-------------------------+               +-------------------------+
        |   Web Frontend (Next.js) |               |  Backend API (Express)  |
        |   - App Router          | -- Client --> |  - Security & CORS      |
        |   - Offline System Font |    fetch      |  - Central Error Trap   |
        |   - Minimal Footprint   |               |  - Health/Domain Svc    |
        +-------------------------+               +-------------------------+
                                                               |
                                                  Connection Pool (node-postgres)
                                                               v
                                                  +-------------------------+
                                                  |   PostgreSQL 16 (DB)    |
                                                  |   - Relational DDL      |
                                                  |   - Persistent Volume   |
                                                  +-------------------------+
```

---

## 2. Why a Modular Monolith?

Rather than decomposing into microservices (such as the reference Hibiscus architecture which separated `sso`, `event-service`, `podium-service`, `battlepass-service`), DOGFOOD implements a **modular monolith** for the following architectural reasons:

1. **Self-Hosting Simplicity**: Organizers can deploy and run the entire platform with a single `docker compose up --build` command without managing service discovery, distributed tracing, network mesh, or cross-service auth tokens.
2. **Deterministic Offline Execution**: A unified backend eliminates inter-service HTTP latency, complex distributed failure modes, and external cloud dependencies.
3. **Transactional Integrity**: Multi-table operations (such as judge scoring, vote deduplication, and team membership validation) execute within ACID PostgreSQL transactions.
4. **Shared Domain Contracts**: TypeScript interfaces and DTOs in `packages/shared` are directly consumed by both the web frontend and backend API.

---

## 3. Component Details

### Frontend (`apps/web`)
- **Framework**: Next.js 14 with App Router (`src/app/`).
- **Styling**: Vanilla CSS (`src/styles/globals.css`) with standard CSS variables, responsive design, and a system font stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`).
- **Offline Guarantee**: Zero external Google Fonts, CDNs, or telemetry scripts are loaded.
- **Routing**: Clean route hierarchy (`/`, `/login`, `/register`, `/dashboard`) with custom Error Boundary (`error.tsx`), Loading (`loading.tsx`), and 404 (`not-found.tsx`).
- **API Client Layer**: Typed client (`src/lib/apiClient.ts`) communicating with the backend API.

### Backend (`apps/api`)
- **Runtime**: Node.js + Express + TypeScript.
- **Layered Architecture**:
  - `config/`: Validated environment variables (`env.ts`) and database pool (`database.ts`).
  - `middleware/`: Helmet security headers, origin-restricted CORS, sanitized JSON request logging, and centralized error handler.
  - `routes/`: Mounted under `/api/v1`, routing to dedicated controllers.
  - `controllers/`: HTTP parsing and status orchestration without domain logic.
  - `services/`: Core application logic and orchestration.
  - `repositories/`: Direct database queries using parameterized SQL.
  - `validators/`: Zod request schema validation middleware.

### Database Tooling Choice: `node-postgres` (`pg`)
We evaluated Prisma, Kysely, and node-postgres (`pg`):
- **Decision**: `node-postgres` (`pg`) with a clean repository pattern and SQL migration runner.
- **Rationale**:
  - **Zero Binary Download Risk**: Prisma downloads external query engine binaries during postinstall, which frequently fails in air-gapped, offline, or restricted Docker network environments.
  - **Predictable Performance**: `pg` is the battle-tested, lightweight foundation of the Node.js ecosystem with minimal overhead.
  - **Auditable SQL**: Pure SQL migrations in `db/migrations/` provide full visibility into indexes, constraints, and triggers.

### Docker Infrastructure
- **Unified Compose**: `docker-compose.yml` orchestrates `db`, `api`, and `web`.
- **Health-Checked Dependency Graph**: `api` waits for `db` to pass `pg_isready`; `web` waits for `api` to report healthy.
- **Data Persistence**: Named volume `dogfood_pgdata` persists database state across container rebuilds.
- **Automatic Seeding**: `docker/init-db.sql` automatically configures the database on first boot.

---

## 4. Request & Error Flow

```
1. Client Request
      │
2. Helmet Security Headers (nosniff, CSP, frameguard)
      │
3. Origin-Restricted CORS Validation
      │
4. Body Parser with Size Limits (100kb default)
      │
5. Sanitized Structured Request Logger (excludes passwords/tokens/cookies)
      │
6. Request Schema Validator (Zod) ──[Invalid]──> 400 Bad Request
      │
7. Controller ──> Service ──> Repository ──> PostgreSQL
      │
8. Centralized Error Handler (AppError)
      └── Safe JSON Response (No stack traces or internal DB leaks in production)
```

---

## 5. Security & Privacy Baseline (Phase 1)

1. **Security Headers**: Managed by Helmet with strict Content-Security-Policy.
2. **CORS**: Explicit whitelist from `CORS_ORIGIN`, rejecting arbitrary cross-site access.
3. **Resource Protection**: Body size limits prevent memory exhaustion denial-of-service.
4. **Data Sanitization**: Logs output structured metadata (`method`, `url`, `statusCode`, `durationMs`) while suppressing authorization tokens and request payloads.
