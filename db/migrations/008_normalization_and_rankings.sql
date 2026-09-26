-- DOGFOOD Platform - Phase 8 Database Migration: Score Normalization & Ranking Results
-- Stores deterministic normalized scores, judge distributions, and rankings

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
