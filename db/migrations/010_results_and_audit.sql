-- DOGFOOD Phase 10: Results Publication + Audit Log

-- Results publication table (immutable publish record)
CREATE TABLE IF NOT EXISTS hackathon_results_publications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    published_by UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    snapshot     JSONB NOT NULL DEFAULT '{}',   -- immutable snapshot of leaderboard at publish time
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,  -- only one active publication per hackathon

    CONSTRAINT uq_active_publication UNIQUE (hackathon_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_results_pub_hackathon ON hackathon_results_publications(hackathon_id);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE SET NULL,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email   VARCHAR(255),
    action       VARCHAR(128) NOT NULL,    -- e.g. 'RESULTS_PUBLISHED', 'VOTE_CAST', 'SUBMISSION_LOCKED'
    entity_type  VARCHAR(64),             -- e.g. 'hackathon', 'submission', 'vote'
    entity_id    UUID,
    details      JSONB DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_hackathon  ON audit_log(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
