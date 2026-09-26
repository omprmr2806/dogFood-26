-- DOGFOOD Platform - Phase 7 Seed Data: Rubrics, Criteria & Evaluations

-- 1. Create Default Active Rubrics
INSERT INTO rubrics (id, hackathon_id, name, description, is_active)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004', -- ai-agents-blitz-2026 (JUDGING)
    'AI Agents Blitz Evaluation Rubric',
    'Standard multi-criterion weighted evaluation framework for autonomous agents.',
    TRUE
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003', -- cloud-systems-2026 (RUNNING)
    'Systems Engineering Evaluation Rubric',
    'Evaluates distributed systems architecture, latency, and fault-tolerance.',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Seed Criteria for AI Agents Blitz Rubric (Weights sum to exactly 100%)
INSERT INTO rubric_criteria (id, rubric_id, name, description, weight_percentage, max_points, display_order)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Technical Architecture & Complexity',
    'Codebase design, modularity, algorithmic depth, and error handling.',
    30.00,
    10.00,
    1
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Agent Autonomy & Determinism',
    'Verifiable execution traces, tool-calling resilience, and offline self-reflection.',
    30.00,
    10.00,
    2
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Problem Impact & Innovation',
    'Originality of problem formulation and practical real-world utility.',
    25.00,
    10.00,
    3
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'UX, Documentation & Demo',
    'Quality of live demonstration, clear instructions, and intuitive interface.',
    15.00,
    10.00,
    4
  ),
  -- Criteria for Cloud Systems Rubric
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000002',
    'Distributed Architecture',
    'High availability, partitioning tolerance, and data consensus.',
    50.00,
    10.00,
    1
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000002',
    'Performance & Throughput',
    'Benchmark latency under synthetic saturation loads.',
    50.00,
    10.00,
    2
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  weight_percentage = EXCLUDED.weight_percentage,
  max_points = EXCLUDED.max_points;

-- 3. Seed Evaluations for Phase 6 Assignments
INSERT INTO judge_evaluations (
  id, hackathon_id, assignment_id, submission_id, judge_id, rubric_id,
  raw_weighted_score, feedback, status, submitted_at
)
VALUES
  -- Evaluation 1: Judge 03 evaluated CognitiveFlow (Assignment 90000000-0000-0000-0000-000000000001)
  (
    'c0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    89.50,
    'Exceptional multi-agent consensus architecture. Well documented AST parser integration.',
    'SUBMITTED',
    '2026-03-01 12:00:00+00'
  ),
  -- Evaluation 2: Judge Bob evaluated CognitiveFlow (Assignment 90000000-0000-0000-0000-000000000002)
  (
    'c0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000022',
    'a0000000-0000-0000-0000-000000000001',
    84.00,
    'Great resilience in test suite. Minor latency on code generation cycle.',
    'SUBMITTED',
    '2026-03-01 13:00:00+00'
  ),
  -- Evaluation 3: Judge Alice evaluated AutoSynth (Assignment 90000000-0000-0000-0000-000000000003)
  (
    'c0000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000021',
    'a0000000-0000-0000-0000-000000000001',
    93.50,
    'Outstanding theoretical rigor in synthetic distribution generator.',
    'SUBMITTED',
    '2026-03-01 14:00:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  raw_weighted_score = EXCLUDED.raw_weighted_score,
  status = EXCLUDED.status;

-- 4. Seed Criterion Scores for Evaluation 1
INSERT INTO judge_criterion_scores (id, evaluation_id, criterion_id, score, feedback)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 9.0, 'Very clean AST pipeline'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 9.5, 'Zero hallucination verified'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 8.5, 'High practical value'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 8.5, 'Solid walkthrough demo')
ON CONFLICT (evaluation_id, criterion_id) DO NOTHING;

-- 5. Update Assignment Status for submitted evaluations
UPDATE judge_assignments SET status = 'COMPLETED'
WHERE id IN ('90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003');
