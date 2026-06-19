-- =============================================================
-- Supabase Seed Data — Development / Demo
-- Venture: au-sme-compliance
-- =============================================================
-- DECLARE ONLY — apply AFTER supabase-config.sql.
-- Apply command (operator, with production Supabase credentials):
--   psql $SUPABASE_DB_URL -f iac/supabase-config.sql
--   psql $SUPABASE_DB_URL -f iac/supabase-seed.sql
--
-- The demo bearer token in lib/apiClient.ts encodes these fixed UUIDs:
--   token: valid_00000000-0000-0000-0000-0000000000a1_00000000-0000-0000-0000-0000000000a2
--   accountId: 00000000-0000-0000-0000-0000000000a1
--   userId:    00000000-0000-0000-0000-0000000000a2
--
-- ON CONFLICT DO NOTHING makes this idempotent.
-- =============================================================

-- Demo user (no real password; placeholder hash is unusable for login)
INSERT INTO users (id, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-0000000000a2',
    'demo@example.com',
    -- Not a real bcrypt hash — this account is accessed only via the demo
    -- bearer token in Phase 4a. Replace with a real hash in Phase 4b.
    '$2b$12$PLACEHOLDER_HASH_NOT_FOR_LOGIN_00000000000000000000000000'
)
ON CONFLICT DO NOTHING;

-- Demo account (owner = demo user)
INSERT INTO accounts (id, owner_user_id, business_name, subscription_tier, subscription_status)
VALUES (
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-0000000000a2',
    'Demo Business',
    'trial',
    'trial'
)
ON CONFLICT DO NOTHING;
