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

## 5. Security & Privacy Baseline

1. **Security Headers**: Managed by Helmet with strict Content-Security-Policy.
2. **CORS**: Explicit whitelist from `CORS_ORIGIN`, rejecting arbitrary cross-site access.
3. **Resource Protection**: Body size limits prevent memory exhaustion denial-of-service (`100kb`).
4. **Data Sanitization**: Logs output structured metadata (`method`, `url`, `statusCode`, `durationMs`) while suppressing authorization tokens and request payloads.
5. **Mass-Assignment Defense**: Self-registration endpoints strictly disallow the `role` field; new accounts are assigned `PARTICIPANT` role by default.
