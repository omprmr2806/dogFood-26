# DOGFOOD Security Policy & Threat Model

## 1. Security Architecture Principles

Security is a first-class requirement in the DOGFOOD platform:
1. **Frontend Checks are NOT Security**: All authentication, authorization, role permissions, and input boundaries are strictly enforced on the server.
2. **Zero Trust Resource Ownership**: Every protected route verifies identity, role permissions, event lifecycle state, and object ownership.
3. **No Secret Leakage**: Passwords, tokens, cookies, internal stack traces, and database connection strings are never returned in client errors or logged to server stdout.

---

## 2. Mitigations Implemented (Phases 1 & 2)

| Threat Category | Phase 1 & 2 Defense Mechanism |
| :--- | :--- |
| **Password Storage** | **Argon2id** password hashing (`m=19456, t=2, p=1`). Plaintext passwords and hashes are never exposed via APIs. |
| **User Enumeration** | Constant-time dummy hash verification on failed logins; generic error message (*"Invalid email or password"*). |
| **Session Hijacking / Theft** | `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookies; server-side session revocation in PostgreSQL. |
| **Session Fixation** | Complete session identifier rotation upon successful authentication. |
| **Privilege Escalation** | Registration payload enforces strict schema rejecting client `role` injection; all new registrations default to `PARTICIPANT`. |
| **Brute Force Attacks** | In-memory sliding window rate limiter (10 requests / minute) on `/api/v1/auth/*` returning `429 Too Many Requests`. |
| **SQL Injection** | Parameterized SQL queries via `pg` connection pool; zero string concatenation. |
| **Cross-Site Scripting (XSS)** | Helmet Content-Security-Policy (CSP) headers; React automatic DOM escaping. |
| **Clickjacking / MIME Sniffing** | Helmet `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff`. |
| **CORS Abuse** | Strict whitelist matching `CORS_ORIGIN`; wildcard origins rejected. |
| **Denial of Service (DoS)** | Request body parsing capped at `100kb` (`BODY_SIZE_LIMIT`). |
| **Audit Trail** | Immutable `audit_logs` tracking `AUTH_REGISTER`, `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, and `AUTH_LOGOUT`. |

---

## 3. Reporting a Vulnerability

If you identify a security vulnerability, please disclose it responsibly to the DOGFOOD security maintainers rather than opening a public issue.
