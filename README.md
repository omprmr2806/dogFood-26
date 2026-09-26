# DOGFOOD Hackathon Platform

DOGFOOD is an open-source, self-hosted hackathon submission, judging, and community voting platform. It is engineered from the ground up to run reliably in containerized or local environments with **zero external cloud runtime dependencies** and full offline capability.

---

## Current Project Status: Phase 1 (Foundational Architecture)

- **Completed**:
  - Foundational modular monolith workspace structure (`apps/web`, `apps/api`, `packages/shared`).
  - Next.js 14 frontend foundation with App Router, offline system font stack, error boundary, and placeholder navigation routes (`/`, `/login`, `/register`, `/dashboard`).
  - Node.js + Express + TypeScript backend foundation with Helmet security headers, restricted CORS, centralized error handling, and structured request logging.
  - PostgreSQL 16 connection pooling (`pg`) and foundational schema migration setup (`db/migrations/`).
  - Docker Compose multi-container configuration (`web`, `api`, `db`) with automated database initialization (`docker/init-db.sql`).
  - Unit and integration test suites validating `/api/v1/health` and database connectivity reporting.
  - Strict startup environment variable validation via Zod.
- **In Progress / Planned**:
  - Phase 2: Authentication & RBAC (Local Argon2/Bcrypt + JWT sessions).
  - Phase 3+: Event management, teams, submissions, rubrics, judging normalization, and voting.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose** (optional for local npm development, required for containerized deployment)

---

## Quick Start with Docker

To build and launch the entire platform (Web + API + PostgreSQL) with a single command:

```bash
docker compose up --build
```

### Access Endpoints:
- **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **API Health Check**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
- **PostgreSQL**: `localhost:5432` (`dogfood_db`)

### Stopping Docker:

```bash
# Stop containers while preserving data volume
docker compose down

# Stop containers and remove volumes
docker compose down -v
```

---

## Local Development (Without Docker)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Build shared types**:
   ```bash
   npm run build:shared
   ```

4. **Start API in development**:
   ```bash
   npm run dev:api
   ```

5. **Start Web in development**:
   ```bash
   npm run dev:web
   ```

---

## Running Tests & Type Checks

```bash
# Run unit & integration test suites
npm test

# Run TypeScript typechecks across all workspaces
npm run typecheck

# Build all packages and applications
npm run build
```

---

## License

This project is licensed under the [MIT License](LICENSE).
