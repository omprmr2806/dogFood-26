# DOGFOOD Data Model Specification

## 1. Overview

This document specifies the data model for the DOGFOOD Hackathon Platform. In Phase 1, the foundational schema migration tracker (`schema_migrations`) and system metadata table (`system_metadata`) are implemented. Future phases will introduce the complete relational schema.

---

## 2. Implemented Schema

### Phase 1 Tables

#### `schema_migrations`
Tracks applied database migrations to ensure idempotent execution.
- `id` (SERIAL PRIMARY KEY)
- `migration_name` (VARCHAR(255) NOT NULL UNIQUE)
- `applied_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)

#### `system_metadata`
Stores core application metadata, schema versions, and installation state.
- `key` (VARCHAR(64) PRIMARY KEY)
- `value` (TEXT NOT NULL)
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)

---

### Phase 2 Tables (Authentication & RBAC)

#### `users`
User credentials, role assignments, and profile metadata.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `email` (VARCHAR(255) NOT NULL UNIQUE)
- `password_hash` (VARCHAR(255) NOT NULL)
- `full_name` (VARCHAR(255) NOT NULL)
- `role` (VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT')))
- `status` (VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')))
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Indexes**: `idx_users_email`, `idx_users_role`

#### `sessions`
Server-tracked cryptographic sessions for revocation and fixation defense.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `user_id` (UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `token_hash` (VARCHAR(255) NOT NULL UNIQUE)
- `ip_address` (VARCHAR(45))
- `user_agent` (TEXT)
- `expires_at` (TIMESTAMP WITH TIME ZONE NOT NULL)
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- `revoked_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes**: `idx_sessions_user_id`, `idx_sessions_token_hash`, `idx_sessions_expires_at`

#### `audit_logs`
Immutable audit trail for sensitive administrative, auth, and state transition actions.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `user_id` (UUID REFERENCES users(id) ON DELETE SET NULL)
- `action` (VARCHAR(64) NOT NULL)
- `entity_type` (VARCHAR(64) NOT NULL)
- `entity_id` (VARCHAR(64))
- `metadata` (JSONB)
- `ip_address` (VARCHAR(45))
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Indexes**: `idx_audit_logs_user_id`, `idx_audit_logs_action`, `idx_audit_logs_created_at`

---

### Phase 3 Tables (Hackathons & Registrations)

#### `hackathons`
Event entity tracking lifecycle state, team boundaries, rules, and schedules.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `slug` (VARCHAR(128) NOT NULL UNIQUE)
- `name` (VARCHAR(255) NOT NULL)
- `short_description` (VARCHAR(500))
- `description` (TEXT NOT NULL)
- `rules` (TEXT)
- `status` (VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'RUNNING', 'JUDGING', 'COMPLETED', 'ARCHIVED')))
- `registration_start` (TIMESTAMP WITH TIME ZONE)
- `registration_end` (TIMESTAMP WITH TIME ZONE)
- `event_start` (TIMESTAMP WITH TIME ZONE)
- `event_end` (TIMESTAMP WITH TIME ZONE)
- `min_team_size` (INTEGER NOT NULL DEFAULT 1 CHECK (min_team_size >= 1))
- `max_team_size` (INTEGER NOT NULL DEFAULT 4 CHECK (max_team_size >= min_team_size))
- `created_by` (UUID REFERENCES users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Indexes**: `idx_hackathons_slug` (UNIQUE), `idx_hackathons_status`, `idx_hackathons_created_by`

#### `registrations`
Participant registration applications and attendance states for an event.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `hackathon_id` (UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE)
- `user_id` (UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `status` (VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CHECKED_IN')))
- `registered_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Constraints**: `UNIQUE (user_id, hackathon_id)` - A user cannot register twice for the same hackathon.
- **Indexes**: `idx_registrations_hackathon_id`, `idx_registrations_user_id`, `idx_registrations_status`

---

### Phase 4 Tables (Teams & Memberships)

#### `teams`
Participant teams established for a specific hackathon.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `hackathon_id` (UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE)
- `name` (VARCHAR(100) NOT NULL)
- `invite_code` (VARCHAR(32) NOT NULL UNIQUE)
- `created_by` (UUID REFERENCES users(id) ON DELETE SET NULL)
- `leader_id` (UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT)
- `status` (VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'DISBANDED')))
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Constraints**: `UNIQUE (id, hackathon_id)` - Composite key required for foreign key enforcement in `team_members`.
- **Indexes**: `idx_teams_hackathon_id`, `idx_teams_invite_code` (UNIQUE), `idx_teams_leader_id`, `idx_teams_status`

#### `team_members`
Individual user assignments to teams, strictly guaranteeing one team per participant per hackathon at the PostgreSQL layer.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `team_id` (UUID NOT NULL)
- `hackathon_id` (UUID NOT NULL)
- `user_id` (UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `role` (VARCHAR(32) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('LEADER', 'MEMBER')))
- `joined_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Constraints**:
  - `CONSTRAINT fk_team_members_team_hackathon FOREIGN KEY (team_id, hackathon_id) REFERENCES teams(id, hackathon_id) ON DELETE CASCADE`
  - `CONSTRAINT uq_hackathon_user UNIQUE (hackathon_id, user_id)` - Physical database guarantee preventing a user from joining multiple teams in the same hackathon.
  - `CONSTRAINT uq_team_user UNIQUE (team_id, user_id)` - Redundant uniqueness per team.
- **Indexes**: `idx_team_members_team_id`, `idx_team_members_user_id`, `idx_team_members_hackathon_user` (UNIQUE)

### Phase 5 Tables (Submissions & Version Snapshots)

#### `submissions`
Project submissions linked to hackathons and teams.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `hackathon_id` (UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE)
- `team_id` (UUID NOT NULL)
- `title` (VARCHAR(150) NOT NULL)
- `tagline` (VARCHAR(255))
- `description` (TEXT NOT NULL)
- `problem_statement` (TEXT)
- `solution` (TEXT)
- `technology_stack` (TEXT[] DEFAULT '{}')
- `repo_url` (VARCHAR(500))
- `demo_url` (VARCHAR(500))
- `demo_video_url` (VARCHAR(500))
- `presentation_url` (VARCHAR(500))
- `cover_image_path` (VARCHAR(500))
- `status` (VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'LOCKED', 'UNDER_REVIEW', 'FINALIZED', 'DISQUALIFIED')))
- `submitted_at` (TIMESTAMP WITH TIME ZONE)
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Constraints**:
  - `CONSTRAINT fk_submissions_team_hackathon FOREIGN KEY (team_id, hackathon_id) REFERENCES teams(id, hackathon_id) ON DELETE CASCADE`
  - `CONSTRAINT uq_submissions_team_id UNIQUE (team_id)` - Guarantees exactly at most one submission per team.
  - `CONSTRAINT uq_submissions_id_hackathon UNIQUE (id, hackathon_id)` - Composite foreign key reference for downstream judging allocations.
- **Indexes**: `idx_submissions_hackathon_id`, `idx_submissions_team_id` (UNIQUE), `idx_submissions_status`, `idx_submissions_submitted_at`, `idx_submissions_title`

#### `submission_versions`
Immutable version snapshots captured at submission or major milestone for auditing.
- `id` (UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `submission_id` (UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE)
- `version_number` (INTEGER NOT NULL)
- `snapshot_data` (JSONB NOT NULL)
- `created_by` (UUID REFERENCES users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)
- **Constraints**: `CONSTRAINT uq_submission_version UNIQUE (submission_id, version_number)`
- **Indexes**: `idx_submission_versions_submission_id`

---

## 3. Future Phases Schema Preview (Phases 6–10)

| Table | Purpose |
| :--- | :--- |
| `rubrics` | Judging rubric configurations |
| `rubric_criteria` | Evaluation criteria with percentage weights and maximum score points |
| `judge_assignments`| Workload-balanced evaluation allocations avoiding conflicts of interest |
| `judge_scores` | Normalized and raw scores per assignment and criteria |
| `community_votes` | Public votes with deduplication and self-voting restrictions |
