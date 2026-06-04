-- ============================================================
-- SYNC - Create missing profiles for ticket creators
-- ============================================================
-- Ensure all users who created tickets have profiles

-- For any created_by that doesn't have a profile, we'll need to handle this
-- This script identifies missing profiles but manual action may be needed

-- Check which user_ids from tickets don't have profiles:
-- SELECT DISTINCT created_by FROM tickets
-- WHERE created_by NOT IN (SELECT id FROM profiles)
-- AND created_by IS NOT NULL;

-- If you have the mapping of those UUIDs to actual users,
-- insert them as profiles like this example:

-- Insert missing user profiles (replace with actual data)
-- INSERT INTO profiles (id, email, full_name, role, company_id, is_active)
-- SELECT
--   t.created_by,
--   t.created_by::text || '@company.local' as email,
--   'Unknown User' as full_name,
--   'agent' as role,
--   t.company_id,
--   true as is_active
-- FROM (
--   SELECT DISTINCT created_by, company_id FROM tickets
--   WHERE created_by NOT IN (SELECT id FROM profiles)
--   AND created_by IS NOT NULL
-- ) t
-- ON CONFLICT (id) DO NOTHING;

-- More reliable approach: Update tickets to use correct created_by
-- If you know the correct mapping, update here:

-- Example: If UUID 44444444 should be admin@acmecorp.com user:
-- UPDATE tickets SET created_by = '22222222-2222-2222-2222-222222222222'
-- WHERE created_by = '44444444-4444-4444-4444-444444444444';

-- Example: If UUID 33333333 should be agent@acmecorp.com user:
-- UPDATE tickets SET created_by = '33333333-3333-3333-3333-333333333333'
-- WHERE created_by = '33333333-3333-3333-3333-333333333333';
