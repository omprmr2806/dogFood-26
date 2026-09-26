-- DOGFOOD Platform - Phase 3 Hackathons and Registrations Seed Data
-- Deterministic fake events covering all lifecycle states (DRAFT, OPEN, RUNNING, JUDGING, COMPLETED)

-- Hackathons Seed
INSERT INTO hackathons (
    id, slug, name, short_description, description, rules, status, 
    min_team_size, max_team_size, created_by, created_at, updated_at
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'robotics-sprint-2026',
    'Autonomous Robotics Sprint',
    'Early-stage draft hackathon focusing on physical computing and microcontrollers.',
    'Build next-generation robotics applications using local simulation and edge hardware. All projects must run without external cloud reliance.',
    'Standard hardware safety guidelines apply. Teams of 2 to 4 members.',
    'DRAFT',
    2, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000002',
    'dogfood-alpha-2026',
    'Dogfood Alpha Hackathon',
    'Open for registration! Build self-hosted, resilient developer tooling.',
    'Welcome to the premier DOGFOOD hackathon. Challenge yourself to build modular platforms, offline utilities, and open-source infrastructure tools.',
    'All submissions must run via Docker Compose locally. No cloud vendor lock-in permitted. Teams of 1 to 4 members.',
    'OPEN',
    1, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000003',
    'cloud-systems-2026',
    'Cloud Systems Challenge',
    'Currently running! Teams are building distributed monoliths and high-throughput systems.',
    'Engineering competition testing system stability, database normalization, and secure RBAC implementations under load.',
    'Code freeze at deadline. Teams of 1 to 5 members.',
    'RUNNING',
    1, 5,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000004',
    'ai-agents-blitz-2026',
    'AI Agents Blitz',
    'Submissions closed; judging evaluation phase is currently active.',
    'Evaluating agentic workflows, autonomous tool calling, and deterministic evaluation engines across submitted projects.',
    'Judges evaluate submissions against multi-criteria weighted rubrics.',
    'JUDGING',
    1, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000005',
    'winter-sprint-2025',
    'Winter Code Sprint',
    'Completed hackathon archive with finalized normalized leaderboard results.',
    'The 2025 annual winter sprint concluded with over 50 projects evaluated and certified.',
    'Historical event archive. Read-only.',
    'COMPLETED',
    1, 4,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- Registrations Seed
INSERT INTO registrations (id, hackathon_id, user_id, status)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002', -- dogfood-alpha-2026
    '00000000-0000-0000-0000-000000000004', -- participant@dogfood.local
    'ACCEPTED'
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003', -- cloud-systems-2026
    '00000000-0000-0000-0000-000000000004', -- participant@dogfood.local
    'ACCEPTED'
)
ON CONFLICT (user_id, hackathon_id) DO NOTHING;
