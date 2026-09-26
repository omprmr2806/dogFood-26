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
VALUES ('dogfood_version', '0.1.0-phase1'),
       ('seeded_environment', 'true'),
       ('initialized_at', CURRENT_TIMESTAMP::text)
ON CONFLICT (key) DO NOTHING;

INSERT INTO schema_migrations (migration_name)
VALUES ('001_initial_setup.sql')
ON CONFLICT (migration_name) DO NOTHING;
