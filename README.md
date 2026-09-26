# DOGFOOD Hackathon Platform

DOGFOOD is an open-source, self-hosted hackathon submission, judging, and community voting platform. It is engineered from the ground up to run reliably in containerized or local environments with **zero external cloud runtime dependencies** and full offline capability.

---

## Current Project Status: Phase 2 (Local Authentication & RBAC)

- **Completed**:
  - **Foundational Architecture**: Next.js App Router frontend, Express modular backend, PostgreSQL 16 schema.
  - **Local Authentication**: 100% self-hosted auth engine with Argon2id password hashing, server-managed sessions, and secure HttpOnly cookies (`/api/v1/auth/register`, `/login`, `/logout`, `/me`).
  - **Backend-Enforced RBAC**: Centralized role guard pipeline supporting `ADMIN`, `ORGANIZER`, `JUDGE`, and `PARTICIPANT` roles with standard `401 Unauthorized` and `403 Forbidden` responses.
  - **Security Protections**: Brute-force rate limiting, timing-safe user enumeration defense, session fixation protection, mass-assignment defense, and immutable audit logging.
  - **Interactive Frontend**: Next.js client session management (`AuthContext`), interactive login, registration, and dashboard with a live RBAC route verification console.
  - **Testing**: 28 automated unit and integration tests across authentication, RBAC, rate-limiting, and security headers.
- **In Progress / Next Phase**:
  - Phase 3: Hackathon Event Lifecycle & Registration Workflows.

---

## Local Demo Accounts (Offline Testing)

The platform includes deterministic, seeded demo accounts for each role to facilitate offline evaluation:

| Role | Email | Password | Permissions Scope |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@dogfood.local` | `AdminPass123!` | System configuration, user management, unrestricted platform access |
| **ORGANIZER** | `organizer@dogfood.local` | `OrganizerPass123!` | Hackathon configuration, criteria rubrics, judge assignment runs, ranking |
| **JUDGE** | `judge@dogfood.local` | `JudgePass123!` | Evaluation console, assigned submissions queue, criteria scoring |
| **PARTICIPANT** | `participant@dogfood.local` | `ParticipantPass123!` | Team creation/joining, project submissions, community voting |

*Note: Demo passwords are stored strictly as Argon2id hashes in PostgreSQL.*

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose** (optional for local npm development, required for containerized deployment)

---

## Quick Start with Docker

To build and launch the entire platform (Web + API + PostgreSQL) with automated database seeding:

```bash
docker compose up --build
```

### Access Endpoints:
- **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **Sign In**: [http://localhost:3000/login](http://localhost:3000/login)
- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
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

2. **Build shared types**:
   ```bash
   npm run build:shared
   ```

3. **Start API in development**:
   ```bash
   npm run dev:api
   ```

4. **Start Web in development**:
   ```bash
   npm run dev:web
   ```

---

## Running Tests & Type Checks

```bash
# Run unit & integration test suites (28 tests across auth, rbac, rate-limit, health, security)
npm test

# Run TypeScript typechecks across all workspaces
npm run typecheck

# Build all packages and applications
npm run build
```

---

## License

This project is licensed under the [MIT License](LICENSE).
