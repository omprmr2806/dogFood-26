-- DOGFOOD Platform - Phase 3 Migration: Hackathons and Registrations

-- Hackathons Table
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

-- Record migration
INSERT INTO schema_migrations (migration_name)
VALUES ('003_hackathons_and_registrations.sql')
ON CONFLICT (migration_name) DO NOTHING;
