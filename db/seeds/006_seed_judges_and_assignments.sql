-- DOGFOOD Platform - Phase 6 Seed Data: Judges, Conflicts, and Assignments
-- Provides deterministic judges, hackathon judging configs, conflict of interest, and assignments

-- 1. Create Judge Users
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000021',
    'judge.alice@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Dr. Alice Algorithm',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    'judge.bob@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Bob Benchmark',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    'judge.charlie@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Charlie Criterion',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000024',
    'judge.diana@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Diana Data',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000025',
    'judge.conflict@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Judge TeamConflict',
    'JUDGE',
    'ACTIVE'
  )
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- 2. Associate Judge Conflict user to Team 4 (Agentic Explorers in ai-agents-blitz-2026: 10000000-0000-0000-0000-000000000004)
-- This creates a structural Conflict of Interest
INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  (
    '40000000-0000-0000-0000-000000000025',
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000025',
    'MEMBER'
  )
ON CONFLICT (team_id, user_id) DO NOTHING;

-- 3. Additional Teams & Submissions in ai-agents-blitz-2026 for rich workload demonstration
INSERT INTO teams (id, hackathon_id, name, invite_code, leader_id, status)
VALUES
  (
    '30000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000004',
    'Neural Navigators',
    'DOG-NEUR8',
    '00000000-0000-0000-0000-000000000010',
    'LOCKED'
  ),
  (
    '30000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000004',
    'Prompt Crafters',
    'DOG-CRFT9',
    '00000000-0000-0000-0000-000000000012',
    'LOCKED'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;

INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  (
    '40000000-0000-0000-0000-000000000018',
    '30000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000010',
    'LEADER'
  ),
  (
    '40000000-0000-0000-0000-000000000019',
    '30000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000012',
    'LEADER'
  )
ON CONFLICT (team_id, user_id) DO NOTHING;

INSERT INTO submissions (
  id, hackathon_id, team_id, title, tagline, description,
  problem_statement, solution, technology_stack, repo_url,
  demo_url, status, submitted_at
)
VALUES
  (
    '50000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000008',
    'AutoSynth: Autonomous Synthetic Dataset Pipeline',
    'Self-curating synthetic dataset generator for local SLM alignment',
    'Generates verifiable synthetic domain datasets with constraint satisfaction solvers.',
    'Lack of clean privacy-preserving fine-tuning data for edge devices.',
    'Dual-critic feedback loop evaluating diversity and factual grounding.',
    ARRAY['Python', 'PyTorch', 'FastAPI', 'SQLite'],
    'https://github.com/dogfood/autosynth',
    'https://autosynth.local',
    'LOCKED',
    '2026-02-28 23:50:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000009',
    'PromptGuard: Real-Time Adversarial Jailbreak Shield',
    'Zero-latency semantic proxy intercepting prompt injection vectors',
    'Deterministic firewall scanning inbound prompt embeddings against semantic evasion patterns.',
    'Indirect prompt injection threatening autonomous agents in production.',
    'Local vector distance clustering filter rejecting anomalous token trajectories.',
    ARRAY['Go', 'WebAssembly', 'ONNX Runtime', 'Redis'],
    'https://github.com/dogfood/promptguard',
    'https://promptguard.local',
    'LOCKED',
    '2026-02-28 23:58:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status;

-- 4. Register Event-Specific Judges (hackathon_judges)
INSERT INTO hackathon_judges (id, hackathon_id, judge_id, status)
VALUES
  -- ai-agents-blitz-2026 (10000000-0000-0000-0000-000000000004)
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000021', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000022', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000023', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000024', 'INACTIVE'),
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000025', 'ACTIVE'),
  -- cloud-systems-2026 (10000000-0000-0000-0000-000000000003)
  ('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'ACTIVE'),
  ('70000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000021', 'ACTIVE')
ON CONFLICT (hackathon_id, judge_id) DO UPDATE SET
  status = EXCLUDED.status;

-- 5. Judging Configurations
INSERT INTO hackathon_judging_configs (hackathon_id, judges_per_submission, assignments_finalized, finalized_at)
VALUES
  ('10000000-0000-0000-0000-000000000004', 2, TRUE, '2026-03-01 00:00:00+00'),
  ('10000000-0000-0000-0000-000000000003', 2, FALSE, NULL)
ON CONFLICT (hackathon_id) DO UPDATE SET
  judges_per_submission = EXCLUDED.judges_per_submission,
  assignments_finalized = EXCLUDED.assignments_finalized,
  finalized_at = EXCLUDED.finalized_at;

-- 6. Seed Explicit Conflict of Interest
-- Judge Alice has a recorded conflict with PromptCrafters / PromptGuard (50000000-0000-0000-0000-000000000009)
INSERT INTO judge_conflicts (id, hackathon_id, judge_id, submission_id, reason)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000021',
    '50000000-0000-0000-0000-000000000009',
    'Former academic advisor to team lead.'
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Finalized Assignments for ai-agents-blitz-2026
-- Active judges for ai-agents-blitz-2026:
-- Panel Judge (03), Alice (21), Bob (22), Charlie (23), Conflict Judge (25)
-- Note: Conflict Judge (25) CANNOT judge CognitiveFlow (03) due to team membership!
-- Note: Alice (21) CANNOT judge PromptGuard (09) due to explicit COI!
INSERT INTO judge_assignments (
  id, hackathon_id, submission_id, judge_id, status, is_final, assigned_at, finalized_at
)
VALUES
  -- Submission 3 (CognitiveFlow): assigned to Judge (03) and Bob (22)
  ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000022', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),

  -- Submission 8 (AutoSynth): assigned to Alice (21) and Conflict Judge (25)
  ('90000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000021', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000025', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),

  -- Submission 9 (PromptGuard): assigned to Charlie (23) and Conflict Judge (25)
  ('90000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000023', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00'),
  ('90000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000025', 'ASSIGNED', TRUE, '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00')
ON CONFLICT (submission_id, judge_id) DO UPDATE SET
  status = EXCLUDED.status,
  is_final = EXCLUDED.is_final;
