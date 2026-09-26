-- DOGFOOD Platform - Phase 4 Teams and Membership Seed Data
-- Deterministic fake teams and members across OPEN, RUNNING, JUDGING, and COMPLETED hackathons

-- 1. Additional Participant Users for realistic team rosters
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    'bob.builder@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4',
    'Bob Builder',
    'PARTICIPANT',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    'carol.coder@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4',
    'Carol Coder',
    'PARTICIPANT',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'david.designer@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4',
    'David Designer',
    'PARTICIPANT',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000013',
    'eve.engineer@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4',
    'Eve Engineer',
    'PARTICIPANT',
    'ACTIVE'
  )
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name;

-- 2. Ensure extra participants are registered in the relevant hackathons
INSERT INTO registrations (id, hackathon_id, user_id, status)
VALUES
  -- Registrations for OPEN hackathon: dogfood-alpha-2026 (10000000-0000-0000-0000-000000000002)
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000013', 'ACCEPTED'),

  -- Registrations for RUNNING hackathon: cloud-systems-2026 (10000000-0000-0000-0000-000000000003)
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'ACCEPTED'),
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000011', 'ACCEPTED')
ON CONFLICT (user_id, hackathon_id) DO NOTHING;

-- 3. Seed Teams
INSERT INTO teams (id, hackathon_id, name, invite_code, leader_id, status)
VALUES
  -- Teams for OPEN hackathon (dogfood-alpha-2026)
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'Alpha Innovators',
    'DOG-ALPHA1',
    '00000000-0000-0000-0000-000000000004', -- participant@dogfood.local (LEADER)
    'ACTIVE'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Byte Builders',
    'DOG-BYTE99',
    '00000000-0000-0000-0000-000000000010', -- Bob Builder (LEADER)
    'ACTIVE'
  ),

  -- Teams for RUNNING hackathon (cloud-systems-2026)
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'Cloud Runners',
    'DOG-CLOUD3',
    '00000000-0000-0000-0000-000000000004', -- participant@dogfood.local
    'ACTIVE'
  ),

  -- Teams for JUDGING hackathon (ai-agents-blitz-2026) - Locked structure
  (
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    'Agentic Explorers',
    'DOG-AGENT4',
    '00000000-0000-0000-0000-000000000011',
    'LOCKED'
  ),

  -- Teams for COMPLETED hackathon (winter-sprint-2025) - Read-only historical
  (
    '30000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    'Winter Legends',
    'DOG-WINT55',
    '00000000-0000-0000-0000-000000000012',
    'LOCKED'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  invite_code = EXCLUDED.invite_code,
  status = EXCLUDED.status;

-- 4. Seed Team Members (including the Leader as first member with role LEADER)
INSERT INTO team_members (id, team_id, hackathon_id, user_id, role)
VALUES
  -- Team 1 (Alpha Innovators)
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004', -- participant
    'LEADER'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000012', -- David Designer
    'MEMBER'
  ),

  -- Team 2 (Byte Builders)
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000010', -- Bob Builder
    'LEADER'
  ),

  -- Team 3 (Cloud Runners)
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004', -- participant
    'LEADER'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000010', -- Bob Builder
    'MEMBER'
  ),

  -- Team 4 (Agentic Explorers)
  (
    '40000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000011', -- Carol Coder
    'LEADER'
  ),

  -- Team 5 (Winter Legends)
  (
    '40000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000012', -- David Designer
    'LEADER'
  )
ON CONFLICT (team_id, user_id) DO NOTHING;
