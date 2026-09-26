-- DOGFOOD Platform - Phase 6 Database Migration: Judge Management & Assignments
-- Enforces event-specific judges, conflict of interest, and unique judge-submission assignments

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
    -- Physical constraint: A judge cannot be assigned to the same submission twice
    CONSTRAINT uq_judge_submission UNIQUE (submission_id, judge_id),
    -- Hackathon consistency constraints
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
