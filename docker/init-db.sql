-- DOGFOOD Platform - Docker Container Initialization Script
-- Automatically executed on first container start by Postgres official image

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema migrations tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Metadata
CREATE TABLE IF NOT EXISTS system_metadata (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_metadata (key, value)
VALUES ('dogfood_version', '0.4.0-phase4'),
       ('seeded_environment', 'true'),
       ('initialized_at', CURRENT_TIMESTAMP::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO schema_migrations (migration_name)
VALUES ('001_initial_setup.sql'),
       ('002_auth_and_rbac.sql'),
       ('003_hackathons_and_registrations.sql'),
       ('004_teams_and_members.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Seed Deterministic Demo Accounts
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$BSqafikFjBt+9U1ka9SxTA$Q1Sv0nxglgOx1rWkJ5Yrbg8PRJ781QEb6g2cs4TkcyM',
    'Platform Administrator',
    'ADMIN',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'organizer@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$H/TDsgtGR/7taBuLXz0PGQ$dlnlr0O17bolk1JW/3FKxRiWe7+D3PsDzH5Cnvf+5iU',
    'Lead Organizer',
    'ORGANIZER',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'judge@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Panel Judge',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'participant@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4',
    'Hackathon Participant',
    'PARTICIPANT',
    'ACTIVE'
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Phase 3: Hackathons Table
CREATE TABLE IF NOT EXISTS hackathons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    short_description VARCHAR(500),
    description TEXT NOT NULL,
    rules TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'RUNNING', 'JUDGING', 'COMPLETED', 'ARCHIVED')),
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    event_start TIMESTAMP WITH TIME ZONE,
    event_end TIMESTAMP WITH TIME ZONE,
    min_team_size INT NOT NULL DEFAULT 1 CHECK (min_team_size > 0),
    max_team_size INT NOT NULL DEFAULT 4 CHECK (max_team_size >= min_team_size AND max_team_size <= 20),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hackathons_status ON hackathons(status);
CREATE INDEX IF NOT EXISTS idx_hackathons_slug ON hackathons(slug);
CREATE INDEX IF NOT EXISTS idx_hackathons_created_by ON hackathons(created_by);

-- Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CHECKED_IN')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_registrations_user_hackathon UNIQUE(user_id, hackathon_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_hackathon_id ON registrations(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

INSERT INTO schema_migrations (migration_name)
VALUES ('003_hackathons_and_registrations.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Seed Phase 3 Demo Hackathons
INSERT INTO hackathons (
    id, slug, name, short_description, description, rules, status, 
    min_team_size, max_team_size, created_by, created_at, updated_at
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'robotics-sprint-2026',
    'Autonomous Robotics Sprint',
    'Early-stage draft hackathon focusing on physical computing and microcontrollers.',
    'Build next-generation robotics applications using local simulation and edge hardware. All projects must run without external cloud reliance.',
    'Standard hardware safety guidelines apply. Teams of 2 to 4 members.',
    'DRAFT',
    2, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000002',
    'dogfood-alpha-2026',
    'Dogfood Alpha Hackathon',
    'Open for registration! Build self-hosted, resilient developer tooling.',
    'Welcome to the premier DOGFOOD hackathon. Challenge yourself to build modular platforms, offline utilities, and open-source infrastructure tools.',
    'All submissions must run via Docker Compose locally. No cloud vendor lock-in permitted. Teams of 1 to 4 members.',
    'OPEN',
    1, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000003',
    'cloud-systems-2026',
    'Cloud Systems Challenge',
    'Currently running! Teams are building distributed monoliths and high-throughput systems.',
    'Engineering competition testing system stability, database normalization, and secure RBAC implementations under load.',
    'Code freeze at deadline. Teams of 1 to 5 members.',
    'RUNNING',
    1, 5,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000004',
    'ai-agents-blitz-2026',
    'AI Agents Blitz',
    'Submissions closed; judging evaluation phase is currently active.',
    'Evaluating agentic workflows, autonomous tool calling, and deterministic evaluation engines across submitted projects.',
    'Judges evaluate submissions against multi-criteria weighted rubrics.',
    'JUDGING',
    1, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000005',
    'winter-sprint-2025',
    'Winter Code Sprint',
    'Completed hackathon archive with finalized normalized leaderboard results.',
    'The 2025 annual winter sprint concluded with over 50 projects evaluated and certified.',
    'Historical event archive. Read-only.',
    'COMPLETED',
    1, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- Seed Phase 3 Demo Registrations
INSERT INTO registrations (id, hackathon_id, user_id, status)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    'ACCEPTED'
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    'ACCEPTED'
)
ON CONFLICT (user_id, hackathon_id) DO NOTHING;

-- ==========================================
-- PHASE 4: TEAMS & TEAM MEMBERSHIP
-- ==========================================

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(32) NOT NULL UNIQUE,
    leader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'DISBANDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_teams_id_hackathon UNIQUE (id, hackathon_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON teams(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(LOWER(invite_code));
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('LEADER', 'MEMBER')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team_members_team_hackathon
        FOREIGN KEY (team_id, hackathon_id)
        REFERENCES teams(id, hackathon_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id),
    CONSTRAINT uq_team_members_hackathon_user UNIQUE (hackathon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_hackathon_id ON team_members(hackathon_id);

-- Seed Extra Demo Participants for Teams
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'bob.builder@dogfood.local', '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4', 'Bob Builder', 'PARTICIPANT', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000011', 'carol.coder@dogfood.local', '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4', 'Carol Coder', 'PARTICIPANT', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000012', 'david.designer@dogfood.local', '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4', 'David Designer', 'PARTICIPANT', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000013', 'eve.engineer@dogfood.local', '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4', 'Eve Engineer', 'PARTICIPANT', 'ACTIVE')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Seed Registrations for Teams
INSERT INTO registrations (id, hackathon_id, user_id, status)
VALUES
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000013', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000011', 'ACCEPTED')
ON CONFLICT (user_id, hackathon_id) DO NOTHING;

-- Seed Teams
INSERT INTO teams (id, hackathon_id, name, invite_code, leader_id, status)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Alpha Innovators', 'DOG-ALPHA1', '00000000-0000-0000-0000-000000000004', 'ACTIVE'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Byte Builders', 'DOG-BYTE99', '00000000-0000-0000-0000-000000000010', 'ACTIVE'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Cloud Runners', 'DOG-CLOUD3', '00000000-0000-0000-0000-000000000004', 'ACTIVE'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Agentic Explorers', 'DOG-AGENT4', '00000000-0000-0000-0000-000000000011', 'LOCKED'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Winter Legends', 'DOG-WINT55', '00000000-0000-0000-0000-000000000012', 'LOCKED')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, invite_code = EXCLUDED.invite_code, status = EXCLUDED.status;

-- Seed Team Members
INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'LEADER'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'MEMBER'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'LEADER'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'LEADER'),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'MEMBER'),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000011', 'LEADER'),
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000012', 'LEADER')
ON CONFLICT (team_id, user_id) DO NOTHING;

