-- DOGFOOD Platform - Phase 5 Database Migration: Submissions and Version Snapshots
-- Enforces one-submission-per-team and cross-table hackathon integrity

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
    -- Composite FK guarantees team_id and hackathon_id belong together
    CONSTRAINT fk_submissions_team_hackathon
        FOREIGN KEY (team_id, hackathon_id)
        REFERENCES teams(id, hackathon_id)
        ON DELETE CASCADE,
    -- Strictly enforce at most one submission per team
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
