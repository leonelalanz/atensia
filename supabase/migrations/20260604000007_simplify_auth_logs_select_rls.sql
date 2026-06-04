-- ============================================================
-- SIMPLIFY AUTH LOGS SELECT RLS - Remove overly complex policies
-- ============================================================

-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS auth_logs_select_superadmin ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_admin ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_user ON auth_logs;

-- Create simple, clear policies

-- 1. Superadmin can see EVERYTHING
CREATE POLICY auth_logs_select_all_superadmin ON auth_logs FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'superadmin'
);

-- 2. Admin can see logs for their company
CREATE POLICY auth_logs_select_company_admin ON auth_logs FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'admin'
  AND company_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- 3. Regular users see only their own logs
CREATE POLICY auth_logs_select_own_user ON auth_logs FOR SELECT
USING (
  user_id = auth.uid()
);
