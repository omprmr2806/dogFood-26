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
VALUES ('dogfood_version', '0.6.0-phase6'),
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

-- =============================================================================
-- PHASE 5: SUBMISSIONS & VERSION SNAPSHOTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    team_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    tagline VARCHAR(255),
    description TEXT NOT NULL,
    problem_statement TEXT,
    solution TEXT,
    technology_stack TEXT[] DEFAULT '{}',
    repo_url VARCHAR(500),
    demo_url VARCHAR(500),
    demo_video_url VARCHAR(500),
    presentation_url VARCHAR(500),
    cover_image_path VARCHAR(500),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'LOCKED', 'UNDER_REVIEW', 'FINALIZED', 'DISQUALIFIED')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submissions_team_hackathon
        FOREIGN KEY (team_id, hackathon_id)
        REFERENCES teams(id, hackathon_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_submissions_team_id UNIQUE (team_id),
    CONSTRAINT uq_submissions_id_hackathon UNIQUE (id, hackathon_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_hackathon_id ON submissions(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_title ON submissions(title);

CREATE TABLE IF NOT EXISTS submission_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_submission_version UNIQUE (submission_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_submission_versions_submission_id ON submission_versions(submission_id);

-- Additional Teams for Submissions
INSERT INTO teams (id, hackathon_id, name, invite_code, leader_id, status)
VALUES
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Serverless Stars', 'DOG-STARS6', '00000000-0000-0000-0000-000000000013', 'ACTIVE'),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', 'Rogue Operators', 'DOG-ROGUE7', '00000000-0000-0000-0000-000000000011', 'LOCKED')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, invite_code = EXCLUDED.invite_code, status = EXCLUDED.status;

INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', 'LEADER'),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000011', 'LEADER')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Seed Submissions
INSERT INTO submissions (
  id, hackathon_id, team_id, title, tagline, description,
  problem_statement, solution, technology_stack, repo_url,
  demo_url, demo_video_url, presentation_url, status, submitted_at
)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003',
    'NebulaStream: Edge Telemetry Pipeline',
    'Real-time edge event aggregation and telemetry ingestion engine',
    'NebulaStream processes high-frequency IoT telemetry at edge clusters with minimal CPU overhead and zero internet dependency.',
    'Edge microcontrollers frequently lose cellular connectivity, leading to dropped sensor readings in industrial environments.',
    'A local ring-buffer store with gossip-protocol batch synchronization when gateway connectivity is restored.',
    ARRAY['Rust', 'WebAssembly', 'PostgreSQL', 'Docker'],
    'https://github.com/dogfood/nebulastream',
    'https://nebulastream.local:8080',
    'https://youtu.be/dummy-nebulastream',
    'https://slides.local/nebulastream',
    'DRAFT',
    NULL
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000006',
    'SkyScale: Distributed Micro-VM Orchestrator',
    'Self-healing micro-VM scheduler with zero-downtime reconfiguration',
    'SkyScale delivers sub-second cold starts for multi-tenant microVM execution using lightweight Linux KVM virtualization.',
    'Traditional container schedulers add unacceptable latency and memory footprint on resource-constrained server nodes.',
    'A lightweight Raft-consensus supervisor managing Firecracker microVMs over local unix sockets.',
    ARRAY['Go', 'Linux KVM', 'Firecracker', 'gRPC'],
    'https://github.com/dogfood/skyscale',
    'https://skyscale.local',
    'https://vimeo.com/dummy-skyscale',
    'https://slides.local/skyscale',
    'SUBMITTED',
    '2026-03-15 14:30:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000004',
    'CognitiveFlow: Self-Reflecting Coding Subagents',
    'Autonomous multi-agent consensus for complex codebase refactoring',
    'CognitiveFlow orchestrates specialized local LLM agents cooperating over an AST graph to eliminate software bugs autonomously.',
    'Single-agent code generation frequently hallucinates API contracts and introduces regression bugs.',
    'A triple-agent consensus cycle: Planner proposes, Coder writes AST transformations, Verifier compiles and tests locally.',
    ARRAY['Python', 'TypeScript', 'Tree-sitter', 'Ollama'],
    'https://github.com/dogfood/cognitiveflow',
    'https://cognitiveflow.local',
    'https://youtube.com/watch?v=dummy-cognitiveflow',
    'https://slides.local/cognitiveflow',
    'LOCKED',
    '2026-02-28 23:55:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000005',
    'FrostByte: Zero-Knowledge Decentralized Vault',
    'Offline-first sovereign identity proofs using succinct cryptographic arguments',
    'FrostByte enables credential verification without disclosing sensitive participant metadata using client-generated zk-SNARKs.',
    'Centralized credential registries suffer data breaches and violate user privacy.',
    'Cryptographic identity credentials verified via offline Groth16 zk-SNARK circuit evaluators.',
    ARRAY['Circom', 'TypeScript', 'IndexedDB', 'WebAssembly'],
    'https://github.com/dogfood/frostbyte',
    'https://frostbyte.local',
    'https://youtu.be/dummy-frostbyte',
    'https://slides.local/frostbyte',
    'FINALIZED',
    '2025-12-19 18:00:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000007',
    'SpamBot: Automated Web Scraping Cluster',
    'High throughput web scraper bypassing anti-bot defenses',
    'Automated cluster attempting to evade platform rate limits.',
    'Data scraping without permission.',
    'Violated hackathon terms of service.',
    ARRAY['Node.js', 'Puppeteer'],
    'https://github.com/dogfood/spambot',
    NULL,
    NULL,
    NULL,
    'DISQUALIFIED',
    '2025-12-18 10:00:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  problem_statement = EXCLUDED.problem_statement,
  solution = EXCLUDED.solution,
  technology_stack = EXCLUDED.technology_stack,
  repo_url = EXCLUDED.repo_url,
  demo_url = EXCLUDED.demo_url,
  status = EXCLUDED.status,
  submitted_at = EXCLUDED.submitted_at;

-- Seed Submission Versions
INSERT INTO submission_versions (
  id, submission_id, version_number, snapshot_data, created_by
)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    1,
    '{"title": "SkyScale: Distributed Micro-VM Orchestrator", "status": "SUBMITTED", "technologyStack": ["Go", "Linux KVM", "Firecracker", "gRPC"]}'::jsonb,
    '00000000-0000-0000-0000-000000000013'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003',
    1,
    '{"title": "CognitiveFlow: Self-Reflecting Coding Subagents", "status": "LOCKED", "technologyStack": ["Python", "TypeScript", "Tree-sitter", "Ollama"]}'::jsonb,
    '00000000-0000-0000-0000-000000000011'
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000004',
    1,
    '{"title": "FrostByte: Zero-Knowledge Decentralized Vault", "status": "FINALIZED", "technologyStack": ["Circom", "TypeScript", "IndexedDB", "WebAssembly"]}'::jsonb,
    '00000000-0000-0000-0000-000000000012'
  )
ON CONFLICT (submission_id, version_number) DO NOTHING;

-- Record Phase 5 Migration
INSERT INTO schema_migrations (migration_name)
VALUES ('005_submissions.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================
-- Phase 6: Judges, Conflicts, and Assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS hackathon_judges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hackathon_judge UNIQUE (hackathon_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_judges_hackathon_id ON hackathon_judges(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_judges_judge_id ON hackathon_judges(judge_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_judges_status ON hackathon_judges(status);

CREATE TABLE IF NOT EXISTS hackathon_judging_configs (
    hackathon_id UUID PRIMARY KEY REFERENCES hackathons(id) ON DELETE CASCADE,
    judges_per_submission INTEGER NOT NULL DEFAULT 2 CHECK (judges_per_submission >= 1),
    assignments_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS judge_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_judge_conflicts_hackathon_id ON judge_conflicts(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_judge_conflicts_judge_id ON judge_conflicts(judge_id);

CREATE TABLE IF NOT EXISTS judge_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVOKED')),
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_judge_submission UNIQUE (submission_id, judge_id),
    CONSTRAINT fk_judge_assignment_sub_hack
        FOREIGN KEY (submission_id, hackathon_id)
        REFERENCES submissions(id, hackathon_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_judge_assignment_judge_hack
        FOREIGN KEY (hackathon_id, judge_id)
        REFERENCES hackathon_judges(hackathon_id, judge_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_hackathon_id ON judge_assignments(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_submission_id ON judge_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge_id ON judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_status ON judge_assignments(status);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_is_final ON judge_assignments(is_final);

-- Seed Phase 6 Judges
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000021',
    'judge.alice@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Dr. Alice Algorithm',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    'judge.bob@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Bob Benchmark',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    'judge.charlie@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Charlie Criterion',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000024',
    'judge.diana@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Diana Data',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000025',
    'judge.conflict@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Judge TeamConflict',
    'JUDGE',
    'ACTIVE'
  )
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Team conflict membership
INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  (
    '40000000-0000-0000-0000-000000000025',
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000025',
    'MEMBER'
  )
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Additional Teams & Submissions in ai-agents-blitz-2026
INSERT INTO teams (id, hackathon_id, name, invite_code, leader_id, status)
VALUES
  (
    '30000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000004',
    'Neural Navigators',
    'DOG-NEUR8',
    '00000000-0000-0000-0000-000000000010',
    'LOCKED'
  ),
  (
    '30000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000004',
    'Prompt Crafters',
    'DOG-CRFT9',
    '00000000-0000-0000-0000-000000000012',
    'LOCKED'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;

INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  (
    '40000000-0000-0000-0000-000000000018',
    '30000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000010',
    'LEADER'
  ),
  (
    '40000000-0000-0000-0000-000000000019',
    '30000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000012',
    'LEADER'
  )
ON CONFLICT (team_id, user_id) DO NOTHING;

INSERT INTO submissions (
  id, hackathon_id, team_id, title, tagline, description,
  problem_statement, solution, technology_stack, repo_url,
  demo_url, status, submitted_at
)
VALUES
  (
    '50000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000008',
    'AutoSynth: Autonomous Synthetic Dataset Pipeline',
    'Self-curating synthetic dataset generator for local SLM alignment',
    'Generates verifiable synthetic domain datasets with constraint satisfaction solvers.',
    'Lack of clean privacy-preserving fine-tuning data for edge devices.',
    'Dual-critic feedback loop evaluating diversity and factual grounding.',
    ARRAY['Python', 'PyTorch', 'FastAPI', 'SQLite'],
    'https://github.com/dogfood/autosynth',
    'https://autosynth.local',
    'LOCKED',
    '2026-02-28 23:50:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000009',
    'PromptGuard: Real-Time Adversarial Jailbreak Shield',
    'Zero-latency semantic proxy intercepting prompt injection vectors',
    'Deterministic firewall scanning inbound prompt embeddings against semantic evasion patterns.',
    'Indirect prompt injection threatening autonomous agents in production.',
    'Local vector distance clustering filter rejecting anomalous token trajectories.',
    ARRAY['Go', 'WebAssembly', 'ONNX Runtime', 'Redis'],
    'https://github.com/dogfood/promptguard',
    'https://promptguard.local',
    'LOCKED',
    '2026-02-28 23:58:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status;

-- Event-Specific Judges
INSERT INTO hackathon_judges (id, hackathon_id, judge_id, status)
VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000021', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000022', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000023', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000024', 'INACTIVE'),
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000025', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000021', 'ACTIVE')
ON CONFLICT (hackathon_id, judge_id) DO UPDATE SET
  status = EXCLUDED.status;

-- Judging Configurations
INSERT INTO hackathon_judging_configs (hackathon_id, judges_per_submission, assignments_finalized, finalized_at)
VALUES
  ('10000000-0000-0000-0000-000000000004', 2, TRUE, '2026-03-01 00:00:00+00'),
  ('10000000-0000-0000-0000-000000000003', 2, FALSE, NULL)
ON CONFLICT (hackathon_id) DO UPDATE SET
  judges_per_submission = EXCLUDED.judges_per_submission,
  assignments_finalized = EXCLUDED.assignments_finalized,
  finalized_at = EXCLUDED.finalized_at;

-- Explicit Conflict of Interest
INSERT INTO judge_conflicts (id, hackathon_id, judge_id, submission_id, reason)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000021',
    '50000000-0000-0000-0000-000000000009',
    'Former academic advisor to team lead.'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Finalized Assignments
INSERT INTO judge_assignments (
  id, hackathon_id, submission_id, judge_id, status, is_final, assigned_at, finalized_at
)
VALUES
  ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000022', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000021', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000025', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000023', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000025', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00')
ON CONFLICT (submission_id, judge_id) DO UPDATE SET
  status = EXCLUDED.status,
  is_final = EXCLUDED.is_final;

-- Record Phase 6 Migration
INSERT INTO schema_migrations (migration_name)
VALUES ('006_judges_and_assignments.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================
-- Phase 7: Rubrics, Criteria & Judge Evaluations
-- ============================================================

CREATE TABLE IF NOT EXISTS rubrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rubrics_hackathon_id ON rubrics(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_is_active ON rubrics(is_active);

CREATE TABLE IF NOT EXISTS rubric_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    weight_percentage NUMERIC(5, 2) NOT NULL CHECK (weight_percentage > 0 AND weight_percentage <= 100),
    max_points NUMERIC(6, 2) NOT NULL CHECK (max_points > 0),
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rubric_criterion_name UNIQUE (rubric_id, name)
);

CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric_id ON rubric_criteria(rubric_id);

CREATE TABLE IF NOT EXISTS judge_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES judge_assignments(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    raw_weighted_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    feedback TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'LOCKED')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assignment_evaluation UNIQUE (assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_evaluations_hackathon_id ON judge_evaluations(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_judge_evaluations_assignment_id ON judge_evaluations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_judge_evaluations_submission_id ON judge_evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_judge_evaluations_judge_id ON judge_evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_evaluations_status ON judge_evaluations(status);

CREATE TABLE IF NOT EXISTS judge_criterion_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES judge_evaluations(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
    score NUMERIC(6, 2) NOT NULL CHECK (score >= 0),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_evaluation_criterion UNIQUE (evaluation_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_criterion_scores_evaluation_id ON judge_criterion_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_judge_criterion_scores_criterion_id ON judge_criterion_scores(criterion_id);

-- Seed Phase 7 Rubrics
INSERT INTO rubrics (id, hackathon_id, name, description, is_active)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    'AI Agents Blitz Evaluation Rubric',
    'Standard multi-criterion weighted evaluation framework for autonomous agents.',
    TRUE
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    'Systems Engineering Evaluation Rubric',
    'Evaluates distributed systems architecture, latency, and fault-tolerance.',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Seed Phase 7 Criteria (Weights sum to exactly 100%)
INSERT INTO rubric_criteria (id, rubric_id, name, description, weight_percentage, max_points, display_order)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Technical Architecture & Complexity',
    'Codebase design, modularity, algorithmic depth, and error handling.',
    30.00,
    10.00,
    1
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Agent Autonomy & Determinism',
    'Verifiable execution traces, tool-calling resilience, and offline self-reflection.',
    30.00,
    10.00,
    2
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Problem Impact & Innovation',
    'Originality of problem formulation and practical real-world utility.',
    25.00,
    10.00,
    3
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'UX, Documentation & Demo',
    'Quality of live demonstration, clear instructions, and intuitive interface.',
    15.00,
    10.00,
    4
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000002',
    'Distributed Architecture',
    'High availability, partitioning tolerance, and data consensus.',
    50.00,
    10.00,
    1
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000002',
    'Performance & Throughput',
    'Benchmark latency under synthetic saturation loads.',
    50.00,
    10.00,
    2
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  weight_percentage = EXCLUDED.weight_percentage,
  max_points = EXCLUDED.max_points;

-- Seed Phase 7 Evaluations
INSERT INTO judge_evaluations (
  id, hackathon_id, assignment_id, submission_id, judge_id, rubric_id,
  raw_weighted_score, feedback, status, submitted_at
)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    89.50,
    'Exceptional multi-agent consensus architecture. Well documented AST parser integration.',
    'SUBMITTED',
    '2026-03-01 12:00:00+00'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000022',
    'a0000000-0000-0000-0000-000000000001',
    84.00,
    'Great resilience in test suite. Minor latency on code generation cycle.',
    'SUBMITTED',
    '2026-03-01 13:00:00+00'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000021',
    'a0000000-0000-0000-0000-000000000001',
    93.50,
    'Outstanding theoretical rigor in synthetic distribution generator.',
    'SUBMITTED',
    '2026-03-01 14:00:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  raw_weighted_score = EXCLUDED.raw_weighted_score,
  status = EXCLUDED.status;

-- Seed Phase 7 Criterion Scores
INSERT INTO judge_criterion_scores (id, evaluation_id, criterion_id, score, feedback)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 9.0, 'Very clean AST pipeline'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 9.5, 'Zero hallucination verified'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 8.5, 'High practical value'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 8.5, 'Solid walkthrough demo')
ON CONFLICT (evaluation_id, criterion_id) DO NOTHING;

-- Update assignments for submitted evaluations
UPDATE judge_assignments SET status = 'COMPLETED'
WHERE id IN ('90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003');

-- Record Phase 7 Migration
INSERT INTO schema_migrations (migration_name)
VALUES ('007_rubrics_and_scores.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- PHASE 8: SCORE NORMALIZATION & RANKINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_judging_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    raw_score_avg NUMERIC(6, 2) NOT NULL DEFAULT 0,
    normalized_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    evaluations_count INT NOT NULL DEFAULT 0,
    evaluations_completed INT NOT NULL DEFAULT 0,
    rank INT,
    is_tied BOOLEAN NOT NULL DEFAULT FALSE,
    is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hackathon_submission_result UNIQUE (hackathon_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_project_results_hackathon_id ON project_judging_results(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_project_results_submission_id ON project_judging_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_project_results_rank ON project_judging_results(rank);

-- Phase 8 Seed Data
INSERT INTO project_judging_results (
  id, hackathon_id, submission_id, raw_score_avg, normalized_score, evaluations_count, evaluations_completed, rank, is_tied, is_finalized
)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000008',
    93.50,
    93.50,
    2,
    1,
    1,
    FALSE,
    FALSE
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000003',
    86.75,
    86.75,
    2,
    2,
    2,
    FALSE,
    FALSE
  )
ON CONFLICT (hackathon_id, submission_id) DO UPDATE SET
  raw_score_avg = EXCLUDED.raw_score_avg,
  normalized_score = EXCLUDED.normalized_score,
  rank = EXCLUDED.rank;

-- Record Phase 8 Migration
INSERT INTO schema_migrations (migration_name)
VALUES ('008_normalization_and_rankings.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Update Application Version
UPDATE system_metadata
SET value = '0.8.0-phase8', updated_at = CURRENT_TIMESTAMP
WHERE key = 'dogfood_version';

-- ============================================================
-- PHASE 9: COMMUNITY VOTING
-- ============================================================

CREATE TABLE IF NOT EXISTS submission_votes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id  UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vote_user_submission UNIQUE (user_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_submission  ON submission_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_votes_hackathon   ON submission_votes(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_votes_user        ON submission_votes(user_id);

CREATE OR REPLACE VIEW submission_vote_counts AS
SELECT
    submission_id,
    hackathon_id,
    COUNT(*) AS vote_count
FROM submission_votes
GROUP BY submission_id, hackathon_id;

ALTER TABLE hackathons
    ADD COLUMN IF NOT EXISTS voting_start   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS voting_end     TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO schema_migrations (migration_name)
VALUES ('009_community_voting.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================
-- PHASE 10: RESULTS PUBLICATION + AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS hackathon_results_publications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    published_by UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    snapshot     JSONB NOT NULL DEFAULT '{}',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_results_pub_hackathon ON hackathon_results_publications(hackathon_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE SET NULL,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email   VARCHAR(255),
    action       VARCHAR(128) NOT NULL,
    entity_type  VARCHAR(64),
    entity_id    UUID,
    details      JSONB DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_hackathon  ON audit_log(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);

INSERT INTO schema_migrations (migration_name)
VALUES ('010_results_and_audit.sql')
ON CONFLICT (migration_name) DO NOTHING;

-- Update Application Version
UPDATE system_metadata
SET value = '1.0.0-rc', updated_at = CURRENT_TIMESTAMP
WHERE key = 'dogfood_version';
