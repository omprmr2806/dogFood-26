-- DOGFOOD Platform - Phase 7 Database Migration: Rubrics, Criteria & Judge Evaluations
-- Enforces structured scoring rubrics, percentage weights (totalling 100%), and immutable evaluations

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
