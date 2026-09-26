-- DOGFOOD Platform - Phase 1 Seed
-- Populates baseline development data

INSERT INTO system_metadata (key, value)
VALUES ('seed_status', 'seeded_phase1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
