# DOGFOOD Hackathon Platform

DOGFOOD is an open-source, self-hosted hackathon submission, judging, and community voting platform. It is engineered from the ground up to run reliably in containerized or local environments with **zero external cloud runtime dependencies** and full offline capability.

---

## Current Project Status: Phase 5 (Submissions + Public Project Gallery)

- **Completed**:
  - **Foundational Architecture**: Next.js App Router frontend, Express modular backend, PostgreSQL 16 schema.
  - **Local Authentication**: 100% self-hosted auth engine with Argon2id password hashing, server-managed sessions, and secure HttpOnly cookies (`/api/v1/auth/register`, `/login`, `/logout`, `/me`).
  - **Backend-Enforced RBAC**: Centralized role guard pipeline supporting `ADMIN`, `ORGANIZER`, `JUDGE`, and `PARTICIPANT` roles with standard `401 Unauthorized` and `403 Forbidden` responses.
  - **Hackathon Lifecycle State Machine**: Backend-enforced state transitions across `DRAFT`, `OPEN`, `RUNNING`, `JUDGING`, `COMPLETED`, and `ARCHIVED`. Strict validation rejecting illegal state jumps.
  - **Participant Registration Workflow**: Backend-enforced registration rules checking event `OPEN` state, active registration time windows, and database constraint `UNIQUE(user_id, hackathon_id)`.
  - **Team Formation & Membership System**:
    - Database-enforced rule: A user can belong to only ONE team within the same hackathon via `UNIQUE(hackathon_id, user_id)`.
    - Strict capacity enforcement matching `hackathon.max_team_size`.
    - Atomic join transactions with `SELECT ... FOR UPDATE` row-level locks preventing race-condition overcapacity.
    - Secure randomized invite codes (`DOG-XXXXXX`), case-insensitive matching, and leader-only regeneration.
    - Full IDOR defense: Participants cannot rename, disband, or tamper with other teams.
    - Data privacy: Invite codes and member emails are strictly omitted from public team listings.
  - **Submissions & Public Project Gallery**:
    - Relational integrity: Exactly one submission per team enforced at the PostgreSQL layer via `UNIQUE(team_id)` and composite FK `(team_id, hackathon_id) REFERENCES teams(id, hackathon_id)`.
    - Submission Versioning: Immutable audit snapshotting in `submission_versions` capturing project content at submission.
    - URL Scheme Security: Strictly whitelisted `http://` and `https://` schemes; rejected `javascript:`, `data:`, `file:`, `ftp:`. 100% offline with zero server-side external fetches (eliminates SSRF).
    - Event State Locking: Participant edits strictly blocked once hackathon enters `JUDGING`, `COMPLETED`, or `ARCHIVED` status.
    - Public Project Gallery (`/gallery`, `/gallery/[id]`): Server-side search, technology filtering, pagination, and privacy boundaries (drafts strictly excluded).
    - Participant Submission Workspace (`/hackathons/[slug]/submission`): Form drafting, auto-save, URL validation, and confirmation submission workflow.
    - Organizer Submission Supervision (`/organizer/hackathons/[id]/submissions`): Live metrics, submission rosters, and administrative status controls.
  - **Security Protections**: Rate limiting, enumeration defense, session fixation protection, mass-assignment defense, and immutable audit logging.
  - **Testing**: 102 automated unit and integration tests across 10 test suites.
- **In Progress / Next Phase**:
  - Phase 6: Judges, Evaluation Criteria & Rubrics.

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
