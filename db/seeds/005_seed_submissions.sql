-- DOGFOOD Platform - Phase 5 Seed Data: Submissions & Version Snapshots
-- Provides realistic submissions across OPEN, RUNNING, JUDGING, and COMPLETED hackathons

-- 1. Ensure required extra team and members exist for rich submission dataset
-- Team 6 (Serverless Stars in RUNNING: cloud-systems-2026)
INSERT INTO teams (id, hackathon_id, name, invite_code, leader_id, status)
VALUES
  (
    '30000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000003',
    'Serverless Stars',
    'DOG-STARS6',
    '00000000-0000-0000-0000-000000000013', -- Eve Engineer
    'ACTIVE'
  ),
  (
    '30000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000005',
    'Rogue Operators',
    'DOG-ROGUE7',
    '00000000-0000-0000-0000-000000000011', -- Carol Coder
    'LOCKED'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  invite_code = EXCLUDED.invite_code,
  status = EXCLUDED.status;

-- Ensure membership records exist
INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  (
    '40000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000013',
    'LEADER'
  ),
  (
    '40000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000011',
    'LEADER'
  )
ON CONFLICT (team_id, user_id) DO NOTHING;

-- 2. Seed Submissions
INSERT INTO submissions (
  id, hackathon_id, team_id, title, tagline, description,
  problem_statement, solution, technology_stack, repo_url,
  demo_url, demo_video_url, presentation_url, status, submitted_at
)
VALUES
  -- 1. DRAFT Submission in RUNNING hackathon (cloud-systems-2026, Team 3: Cloud Runners)
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003',
    'NebulaStream: Edge Telemetry Pipeline',
    'Real-time edge event aggregation and telemetry ingestion engine',
    'NebulaStream processes high-frequency IoT telemetry at edge clusters with minimal CPU overhead and zero internet dependency.',
    'Edge microcontrollers frequently lose cellular connectivity, leading to dropped sensor readings in industrial environments.',
    'A local ring-buffer store with gossip-protocol batch synchronization when gateway connectivity is restored.',
    ARRAY['Rust', 'WebAssembly', 'PostgreSQL', 'Docker'],
    'https://github.com/dogfood/nebulastream',
    'https://nebulastream.local:8080',
    'https://youtu.be/dummy-nebulastream',
    'https://slides.local/nebulastream',
    'DRAFT',
    NULL
  ),

  -- 2. SUBMITTED Submission in RUNNING hackathon (cloud-systems-2026, Team 6: Serverless Stars)
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000006',
    'SkyScale: Distributed Micro-VM Orchestrator',
    'Self-healing micro-VM scheduler with zero-downtime reconfiguration',
    'SkyScale delivers sub-second cold starts for multi-tenant microVM execution using lightweight Linux KVM virtualization.',
    'Traditional container schedulers add unacceptable latency and memory footprint on resource-constrained server nodes.',
    'A lightweight Raft-consensus supervisor managing Firecracker microVMs over local unix sockets.',
    ARRAY['Go', 'Linux KVM', 'Firecracker', 'gRPC'],
    'https://github.com/dogfood/skyscale',
    'https://skyscale.local',
    'https://vimeo.com/dummy-skyscale',
    'https://slides.local/skyscale',
    'SUBMITTED',
    '2026-03-15 14:30:00+00'
  ),

  -- 3. LOCKED Submission in JUDGING hackathon (ai-agents-blitz-2026, Team 4: Agentic Explorers)
  (
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000004',
    'CognitiveFlow: Self-Reflecting Coding Subagents',
    'Autonomous multi-agent consensus for complex codebase refactoring',
    'CognitiveFlow orchestrates specialized local LLM agents cooperating over an AST graph to eliminate software bugs autonomously.',
    'Single-agent code generation frequently hallucinates API contracts and introduces regression bugs.',
    'A triple-agent consensus cycle: Planner proposes, Coder writes AST transformations, Verifier compiles and tests locally.',
    ARRAY['Python', 'TypeScript', 'Tree-sitter', 'Ollama'],
    'https://github.com/dogfood/cognitiveflow',
    'https://cognitiveflow.local',
    'https://youtube.com/watch?v=dummy-cognitiveflow',
    'https://slides.local/cognitiveflow',
    'LOCKED',
    '2026-02-28 23:55:00+00'
  ),

  -- 4. FINALIZED Submission in COMPLETED hackathon (winter-sprint-2025, Team 5: Winter Legends)
  (
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000005',
    'FrostByte: Zero-Knowledge Decentralized Vault',
    'Offline-first sovereign identity proofs using succinct cryptographic arguments',
    'FrostByte enables credential verification without disclosing sensitive participant metadata using client-generated zk-SNARKs.',
    'Centralized credential registries suffer data breaches and violate user privacy.',
    'Cryptographic identity credentials verified via offline Groth16 zk-SNARK circuit evaluators.',
    ARRAY['Circom', 'TypeScript', 'IndexedDB', 'WebAssembly'],
    'https://github.com/dogfood/frostbyte',
    'https://frostbyte.local',
    'https://youtu.be/dummy-frostbyte',
    'https://slides.local/frostbyte',
    'FINALIZED',
    '2025-12-19 18:00:00+00'
  ),

  -- 5. DISQUALIFIED Submission in COMPLETED hackathon (winter-sprint-2025, Team 7: Rogue Operators)
  (
    '50000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000007',
    'SpamBot: Automated Web Scraping Cluster',
    'High throughput web scraper bypassing anti-bot defenses',
    'Automated cluster attempting to evade platform rate limits.',
    'Data scraping without permission.',
    'Violated hackathon terms of service.',
    ARRAY['Node.js', 'Puppeteer'],
    'https://github.com/dogfood/spambot',
    NULL,
    NULL,
    NULL,
    'DISQUALIFIED',
    '2025-12-18 10:00:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  problem_statement = EXCLUDED.problem_statement,
  solution = EXCLUDED.solution,
  technology_stack = EXCLUDED.technology_stack,
  repo_url = EXCLUDED.repo_url,
  demo_url = EXCLUDED.demo_url,
  status = EXCLUDED.status,
  submitted_at = EXCLUDED.submitted_at;

-- 3. Seed Submission Version Snapshots
INSERT INTO submission_versions (
  id, submission_id, version_number, snapshot_data, created_by
)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    1,
    '{"title": "SkyScale: Distributed Micro-VM Orchestrator", "status": "SUBMITTED", "technologyStack": ["Go", "Linux KVM", "Firecracker", "gRPC"]}'::jsonb,
    '00000000-0000-0000-0000-000000000013'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003',
    1,
    '{"title": "CognitiveFlow: Self-Reflecting Coding Subagents", "status": "LOCKED", "technologyStack": ["Python", "TypeScript", "Tree-sitter", "Ollama"]}'::jsonb,
    '00000000-0000-0000-0000-000000000011'
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000004',
    1,
    '{"title": "FrostByte: Zero-Knowledge Decentralized Vault", "status": "FINALIZED", "technologyStack": ["Circom", "TypeScript", "IndexedDB", "WebAssembly"]}'::jsonb,
    '00000000-0000-0000-0000-000000000012'
  )
ON CONFLICT (submission_id, version_number) DO NOTHING;
