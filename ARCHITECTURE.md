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
        |   - App Router          | -- Client --> |  - Argon2id Local Auth  |
        |   - AuthContext & Hooks |    fetch      |  - Central RBAC Guards  |
        |   - Minimal Footprint   | (Credentials) |  - Security & RateLimit |
        +-------------------------+               +-------------------------+
                                                               |
                                                  Connection Pool (node-postgres)
                                                               v
                                                  +-------------------------+
                                                  |   PostgreSQL 16 (DB)    |
                                                  |   - users, sessions     |
                                                  |   - audit_logs          |
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

## 3. Authentication & Session Architecture (Phase 2)

### 100% Local Authentication
- **Password Hashing**: Implemented using **Argon2id** (`@node-rs/argon2`, $m=19456, t=2, p=1$). Argon2id provides memory-hard protection against GPU/ASIC brute-force cracking.
- **Timing-Safe Enumeration Defense**: When an invalid or non-existent email is supplied to `/login`, the backend executes a dummy Argon2id verification pass before returning a generic error, preventing side-channel timing analysis.
- **Session Security**:
  - Generated session identifiers are cryptographically random (`crypto.randomUUID()`).
  - Sessions are tracked in the PostgreSQL `sessions` table.
  - A SHA-256 hash of the signed JWT token is stored in the database.
  - The client receives an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie (`dogfood_session`). Bearer token headers are also supported for programmatic access.
- **Session Revocation & Fixation Protection**:
  - Successful login generates a new session identifier, neutralizing session fixation attacks.
  - Logging out immediately marks the session as revoked in the database (`revoked_at = CURRENT_TIMESTAMP`), instantly blocking subsequent requests with that token.

---

## 4. Centralized Backend RBAC Architecture

DOGFOOD enforces authorization through a pipeline of composable middleware guards:

```
Request ──> [Rate Limiter] ──> [Authenticate Guard] ──> [Role Guard] ──> [Handler]
```

### Role Hierarchy & Matrix
- **`ADMIN`**: Full platform authority; user management, hackathon creation, and override capabilities.
- **`ORGANIZER`**: Hackathon management, criteria rubric configuration, judge assignment execution, and score publishing.
- **`JUDGE`**: Submission evaluation console and criteria scoring.
- **`PARTICIPANT`**: Team formation, project submission, and community voting.

### Status Code Semantics
- **`401 Unauthorized` (`UNAUTHENTICATED`, `INVALID_TOKEN`, `SESSION_REVOKED`)**: The request lacks valid session credentials.
- **`403 Forbidden` (`FORBIDDEN`)**: The user is authenticated, but lacks the necessary role permissions.
- **`429 Too Many Requests` (`RATE_LIMIT_EXCEEDED`)**: The client exceeded the allowed rate limit (10 attempts/min).
- **`409 Conflict` (`EMAIL_EXISTS`)**: Registration conflict when an email already exists.

---

## 5. Hackathon Lifecycle & Event State Machine (Phase 3)

The hackathon domain is modeled around a deterministic, backend-enforced state machine:

```
[DRAFT] ──────> [OPEN] ──────> [RUNNING] ──────> [JUDGING] ──────> [COMPLETED] ──────> [ARCHIVED]
   │               │               │                │                 │
   └───────────────┴───────────────┴────────────────┴─────────────────┴─────────────> (to ARCHIVED)
```

### Valid Lifecycle Transitions:
- `DRAFT` &rarr; `OPEN`, `ARCHIVED`
- `OPEN` &rarr; `RUNNING`, `DRAFT`, `ARCHIVED`
- `RUNNING` &rarr; `JUDGING`, `ARCHIVED`
- `JUDGING` &rarr; `COMPLETED`, `ARCHIVED`
- `COMPLETED` &rarr; `ARCHIVED`
- `ARCHIVED` &rarr; (Terminal State)

Every transition request is validated server-side by `HackathonService.transitionStatus()`. Illegal transitions are rejected with `400 INVALID_STATE_TRANSITION`. All transitions are recorded in the `audit_logs` table.

### Reusable Event State Guard Middleware
The `requireEventState(...allowedStates: HackathonStatus[])` middleware is designed for reuse across subsequent phases (Teams, Submissions, Judging, Voting):
- Resolves event by UUID or unique slug.
- Rejects requests when current event state is not in `allowedStates` (`400 INVALID_EVENT_STATE`).
- Attaches the resolved hackathon to `req.hackathon` to prevent redundant queries downstream.

---

## 6. Participant Registration Workflow & Privacy Boundaries

### Registration Rules
1. **Authenticated**: User must possess an active session.
2. **State Guard**: Hackathon must be in state `OPEN`.
3. **Time Windows**: If `registration_start` or `registration_end` timestamps are specified, current time must fall within the window.
4. **Database Uniqueness**: Enforced via PostgreSQL constraint `UNIQUE(user_id, hackathon_id)` preventing duplicate registrations.

### Privacy & IDOR Boundaries
- **Public Surface**: Public hackathon listings and details display event information, rules, and confirmed registration count only. Participant identities and emails are stripped.
- **Participant Access**: Authenticated participants can view only their own registration status (`GET /api/v1/hackathons/:id/registration`).
- **Organizer Access**: Authorized Organizers/Admins can view the full registration table including participant names and emails (`GET /api/v1/hackathons/:id/registrations`).
- **IDOR Protection**: Participants cannot modify their own registration status, approve others, or tamper with cross-hackathon records. Status modification (`PATCH /api/v1/hackathons/:id/registrations/:registrationId`) is strictly gated to `ORGANIZER` and `ADMIN` roles.

---

## 8. Team & Membership Management Architecture (Phase 4)

### Team Lifecycle & States
Teams follow a managed state machine integrated with the hackathon lifecycle:
- **`ACTIVE`**: Default state upon team creation. Members can be added, invite codes regenerated, or members leave while event is in `OPEN` or `RUNNING`.
- **`LOCKED`**: Automatic transition when hackathon moves to `JUDGING` or `COMPLETED`. Membership changes and renames are forbidden.
- **`DISBANDED`**: Triggered when the last member (or leader without remaining members) leaves, or when an organizer disbands the team.

```
[ACTIVE] ──(Judging State / Lock)──> [LOCKED]
   │
   └──(Leader Disbands / All Leave)──> [DISBANDED]
```

### Database-Enforced One-Team-Per-Hackathon Constraint
Rather than relying solely on application-level checks, DOGFOOD guarantees that a participant cannot join multiple teams within the same hackathon using a relational composite foreign key:
```sql
-- teams table defines composite unique key:
UNIQUE (id, hackathon_id)

-- team_members table references (team_id, hackathon_id) and enforces single membership per hackathon:
CONSTRAINT fk_team_members_team_hackathon
    FOREIGN KEY (team_id, hackathon_id) REFERENCES teams(id, hackathon_id) ON DELETE CASCADE,
CONSTRAINT uq_hackathon_user
    UNIQUE (hackathon_id, user_id)
```
This physical constraint makes cross-team double-joining impossible even under concurrent race conditions.

### Concurrency & Race-Condition Safety
Team joining is race-sensitive (e.g. two users simultaneously joining a team with 1 slot remaining). To prevent capacity overflow:
1. Operations execute within a PostgreSQL `SERIALIZABLE` or `READ COMMITTED` transaction.
2. The team row is acquired with pessimistic locking:
   ```sql
   SELECT * FROM teams WHERE id = $1 FOR UPDATE;
   ```
3. Current member count is evaluated against `hackathons.max_team_size` within the locked transaction before inserting the new member.

### Secure Invite Code Mechanism
- **Generation**: Cryptographically random 8-character alphanumeric string generated via `crypto.randomBytes(6)` formatted in uppercase without ambiguous characters.
- **Privacy Protection**: Invite codes are only exposed to authenticated team members, the team leader, and event organizers. Public team listings strictly omit `invite_code`.
- **Regeneration**: Authorized team leaders can rotate the invite code at any time, instantly invalidating previous join links.

### Team Authorization & IDOR Defenses
Every team endpoint enforces a multi-layer verification chain:
1. `authenticate` verifies session validity.
2. `requireRegistration` verifies the user is an `ACCEPTED` participant in the event.
3. `teamService` enforces role-specific rules:
   - Only `LEADER` can rename the team, regenerate invite codes, or remove members.
   - Non-members attempting `PATCH /teams/:teamId` or member modifications receive `403 Forbidden` (`FORBIDDEN`).
   - If the leader leaves, leadership is automatically transferred to the next oldest member; if no members remain, the team transitions to `DISBANDED`.
   - `ORGANIZER` and `ADMIN` have administrative oversight to disband teams or audit rosters.
   - `JUDGE` role has no administrative access to teams.

---

## 9. Security & Privacy Baseline

1. **Security Headers**: Managed by Helmet with strict Content-Security-Policy.
2. **CORS**: Explicit whitelist from `CORS_ORIGIN`, rejecting arbitrary cross-site access.
3. **Resource Protection**: Body size limits prevent memory exhaustion denial-of-service (`100kb`).
4. **Data Sanitization**: Logs output structured metadata (`method`, `url`, `statusCode`, `durationMs`) while suppressing authorization tokens and request payloads.
5. **Mass-Assignment Defense**: Self-registration endpoints strictly disallow the `role` field; new accounts are assigned `PARTICIPANT` role by default.
