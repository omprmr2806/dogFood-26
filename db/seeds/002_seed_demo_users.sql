-- DOGFOOD Platform - Phase 2 Demo Accounts Seed
-- Deterministic fake accounts for offline testing of all 4 RBAC roles.
-- Passwords hashed using Argon2id:
-- admin@dogfood.local        -> AdminPass123!
-- organizer@dogfood.local    -> OrganizerPass123!
-- judge@dogfood.local        -> JudgePass123!
-- participant@dogfood.local  -> ParticipantPass123!

INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$BSqafikFjBt+9U1ka9SxTA$Q1Sv0nxglgOx1rWkJ5Yrbg8PRJ781QEb6g2cs4TkcyM',
    'Platform Administrator',
    'ADMIN',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'organizer@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$H/TDsgtGR/7taBuLXz0PGQ$dlnlr0O17bolk1JW/3FKxRiWe7+D3PsDzH5Cnvf+5iU',
    'Lead Organizer',
    'ORGANIZER',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'judge@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
    'Panel Judge',
    'JUDGE',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'participant@dogfood.local',
    '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4',
    'Hackathon Participant',
    'PARTICIPANT',
    'ACTIVE'
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;
