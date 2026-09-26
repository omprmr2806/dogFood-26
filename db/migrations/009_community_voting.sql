-- DOGFOOD Phase 9: Community Voting + Anti-Abuse
-- Participants can cast one vote per submission per hackathon.
-- The DB unique constraint is the authoritative anti-duplicate enforcement.

CREATE TABLE IF NOT EXISTS submission_votes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id  UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Core anti-abuse: one vote per (user, submission) pair
    CONSTRAINT uq_vote_user_submission UNIQUE (user_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_submission  ON submission_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_votes_hackathon   ON submission_votes(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_votes_user        ON submission_votes(user_id);

-- Convenience view: vote counts per submission
CREATE OR REPLACE VIEW submission_vote_counts AS
SELECT
    submission_id,
    hackathon_id,
    COUNT(*) AS vote_count
FROM submission_votes
GROUP BY submission_id, hackathon_id;

-- Voting windows: organizer controls when voting is open
ALTER TABLE hackathons
    ADD COLUMN IF NOT EXISTS voting_start   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS voting_end     TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN NOT NULL DEFAULT FALSE;
