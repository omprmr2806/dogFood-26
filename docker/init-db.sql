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
VALUES ('dogfood_version', '0.2.0-phase2'),
       ('seeded_environment', 'true'),
       ('initialized_at', CURRENT_TIMESTAMP::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO schema_migrations (migration_name)
VALUES ('001_initial_setup.sql'),
       ('002_auth_and_rbac.sql')
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
