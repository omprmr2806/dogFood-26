-- DOGFOOD Platform - Phase 8 Seed Data: Project Judging Results & Ranking Preview

INSERT INTO project_judging_results (
  id, hackathon_id, submission_id, raw_score_avg, normalized_score, evaluations_count, evaluations_completed, rank, is_tied, is_finalized
)
VALUES
  -- 1. AutoSynth (scored 93.50)
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
  -- 2. CognitiveFlow (scored avg (89.5 + 84.0)/2 = 86.75)
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
