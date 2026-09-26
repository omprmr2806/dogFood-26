# DOGFOOD Hackathon Platform

DOGFOOD is an open-source, self-hosted hackathon submission, judging, and community voting platform. It is engineered from the ground up to run reliably in containerized or local environments with **zero external cloud runtime dependencies** and full offline capability.

> **Version: 1.0.0** — Production-ready release. All core phases complete.

---

## Project Status: v1.0.0 — Complete

All phases have been implemented, verified, and committed:

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Foundation + Docker + PostgreSQL | ✅ |
| 2 | Local Authentication + RBAC | ✅ |
| 3 | Hackathon/Event Management + Registration | ✅ |
| 4 | Teams + Membership | ✅ |
| 5 | Submissions + Public Gallery | ✅ |
| 6 | Judge Management + Assignment Engine | ✅ |
| 7 | Judging Rubrics + Scoring Console | ✅ |
| 8 | Score Normalization + Rankings | ✅ |
| 9 | Community Voting + Anti-Abuse | ✅ |
| 10 | Results + Leaderboard + Exports + Audit | ✅ |
| 11 | Security Hardening | ✅ |
| 12 | Acceptance Test Suite | ✅ |
| 13 | Documentation | ✅ |
| 14 | UI/UX Redesign | ✅ |
| 15 | Final Release | ✅ |

**Complete Feature Highlights:**

- **100% Offline** — no external cloud service dependencies at runtime
- **Local Auth** — Argon2id password hashing, server-managed sessions, HttpOnly cookies
- **Backend RBAC** — `ADMIN`, `ORGANIZER`, `JUDGE`, `PARTICIPANT` enforced server-side
- **Event Lifecycle** — `DRAFT → OPEN → RUNNING → JUDGING → COMPLETED → ARCHIVED`
- **Team Formation** — invite-code joins, leader controls, DB-enforced capacity
- **Submissions** — draft/submit/lock lifecycle, versioning, URL validation
- **Judging** — COI prevention, workload balancing, deterministic assignment
- **Rubric Scoring** — configurable weighted criteria, evaluation console
- **Z-Score Normalization** — fair normalized rankings with raw-score fallback
- **Community Voting** — one vote per user per submission, voting windows, anti-abuse rate limiting
- **Results & Leaderboard** — publish/unpublish lifecycle, immutable snapshots, CSV/JSON export
- **Audit Log** — append-only audit trail per hackathon
- **Security** — Helmet, CORS lockdown, rate limiting (auth 5/15min, votes 10/min, API 300/min)
- **Tests** — 140+ automated unit + integration tests

---

## Local Demo Accounts (Offline Testing)

The platform includes deterministic, seeded demo accounts for each role to facilitate offline evaluation:

| Role | Email | Password | Permissions Scope |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@dogfood.local` | `AdminPass123!` | System configuration, user management, unrestricted platform access |
| **ORGANIZER** | `organizer@dogfood.local` | `OrganizerPass123!` | Hackathon configuration, criteria rubrics, judge assignment runs, ranking |
| **JUDGE** | `judge@dogfood.local` | `JudgePass123!` | Evaluation console, assigned submissions queue, criteria scoring |
| **JUDGE (Alice)** | `judge.alice@dogfood.local` | `JudgePass123!` | Algorithm specialist judge; active in `ai-agents-blitz-2026` |
| **JUDGE (Bob)** | `judge.bob@dogfood.local` | `JudgePass123!` | Benchmark specialist judge; active in `ai-agents-blitz-2026` |
| **JUDGE (Charlie)** | `judge.charlie@dogfood.local` | `JudgePass123!` | Systems judge; active in `ai-agents-blitz-2026` |
| **JUDGE (Diana)** | `judge.diana@dogfood.local` | `JudgePass123!` | Inactive judge (demonstrates exclusion from assignment pool) |
| **JUDGE (Conflict)** | `judge.conflict@dogfood.local` | `JudgePass123!` | Judge who belongs to Team 4 (demonstrates COI exclusion) |
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
- **Explore Hackathons**: [http://localhost:3000/hackathons](http://localhost:3000/hackathons)
- **Organizer Dashboard**: [http://localhost:3000/organizer/hackathons](http://localhost:3000/organizer/hackathons)
- **Sign In**: [http://localhost:3000/login](http://localhost:3000/login)
- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Backend API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
  - `GET /api/v1/hackathons` - Public hackathon list
  - `POST /api/v1/hackathons` - Create hackathon (Organizer/Admin)
  - `GET /api/v1/hackathons/:id` - Hackathon details
  - `PATCH /api/v1/hackathons/:id` - Update hackathon (Organizer/Admin)
  - `POST /api/v1/hackathons/:id/transitions` - Lifecycle state transition (Organizer/Admin)
  - `POST /api/v1/hackathons/:id/registrations` - Register for OPEN hackathon (Participant)
  - `GET /api/v1/hackathons/:id/registration` - Participant self registration status
  - `GET /api/v1/hackathons/:id/registrations` - Organizer view all registrations
  - `PATCH /api/v1/hackathons/:id/registrations/:registrationId` - Organizer update status
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
# Run unit & integration test suites (56 tests across hackathons, registrations, auth, rbac, rate-limit, health, security)
npm test

# Run TypeScript typechecks across all workspaces
npm run typecheck

# Build all packages and applications
npm run build
```

---

## License

This project is licensed under the [MIT License](LICENSE).
