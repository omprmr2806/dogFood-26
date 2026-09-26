# DOGFOOD Data Model Specification

## 1. Overview

This document specifies the data model for the DOGFOOD Hackathon Platform. In Phase 1, the foundational schema migration tracker (`schema_migrations`) and system metadata table (`system_metadata`) are implemented. Future phases will introduce the complete relational schema.

---

## 2. Phase 1 Tables

### `schema_migrations`
Tracks applied database migrations to ensure idempotent execution.
- `id` (SERIAL PRIMARY KEY)
- `migration_name` (VARCHAR(255) NOT NULL UNIQUE)
- `applied_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)

### `system_metadata`
Stores core application metadata, schema versions, and installation state.
- `key` (VARCHAR(64) PRIMARY KEY)
- `value` (TEXT NOT NULL)
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)

---

## 3. Future Phases Schema Preview (Phases 2–10)

| Table | Purpose |
| :--- | :--- |
| `users` | User credentials, roles (`ADMIN`, `ORGANIZER`, `JUDGE`, `PARTICIPANT`), profile metadata |
| `hackathons` | Event details, scheduling, and lifecycle state (`DRAFT`, `OPEN`, `RUNNING`, `JUDGING`, `COMPLETED`, `ARCHIVED`) |
| `registrations` | Participant applications and attendance state |
| `teams` | Participant teams, invite codes, and hackathon association |
| `team_members` | Membership records enforcing one team per participant per event |
| `submissions` | Project submissions, repository links, descriptions, and media |
| `rubrics` | Judging rubric configurations |
| `rubric_criteria` | Evaluation criteria with percentage weights and maximum score points |
| `judge_assignments`| Workload-balanced evaluation allocations avoiding conflicts of interest |
| `judge_scores` | Normalized and raw scores per assignment and criteria |
| `community_votes` | Public votes with deduplication and self-voting restrictions |
| `audit_logs` | Immutable audit trail for administrative and sensitive actions |
