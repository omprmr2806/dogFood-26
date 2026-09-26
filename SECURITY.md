# DOGFOOD Security Policy & Threat Model

## 1. Security Architecture Principles

Security is a first-class requirement in the DOGFOOD platform:
1. **Frontend Checks are NOT Security**: All authentication, authorization, role permissions, and input boundaries are strictly enforced on the server.
2. **Zero Trust Resource Ownership**: Every protected route verifies identity, role permissions, event lifecycle state, and object ownership.
3. **No Secret Leakage**: Passwords, tokens, cookies, internal stack traces, and database connection strings are never returned in client errors or logged to server stdout.

---

## 2. Phase 1 Mitigations Implemented

| Vulnerability Category | Phase 1 Defense Mechanism |
| :--- | :--- |
| **SQL Injection** | Parameterized queries via `pg` connection pool; zero string interpolation in queries. |
| **Cross-Site Scripting (XSS)** | Helmet Content-Security-Policy (CSP) headers; React automatic DOM escaping. |
| **Clickjacking / MIME Sniffing** | Helmet `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff`. |
| **Cross-Origin Resource Sharing** | Explicit CORS whitelist configured via `CORS_ORIGIN`; wildcard origins rejected. |
| **Denial of Service (DoS)** | Request body parsing capped at `100kb` (`BODY_SIZE_LIMIT`). |
| **Information Disclosure** | Centralized error handler masks stack traces and internal errors in production. |
| **Configuration Tampering** | Strict startup environment variable parsing via Zod (`apps/api/src/config/env.ts`). |

---

## 3. Reporting a Vulnerability

If you identify a security vulnerability, please disclose it responsibly to the DOGFOOD security maintainers rather than opening a public issue.
