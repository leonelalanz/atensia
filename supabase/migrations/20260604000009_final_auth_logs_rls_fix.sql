-- ============================================================
-- FINAL FIX - AUTH LOGS RLS - Clear and working policies
-- ============================================================

-- Drop all existing policies
DROP POLICY IF EXISTS auth_logs_view_by_company ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_all_superadmin ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_company_admin ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_own_user ON auth_logs;
DROP POLICY IF EXISTS auth_logs_insert_authenticated ON auth_logs;
DROP POLICY IF EXISTS auth_logs_insert_service ON auth_logs;

-- ============================================================
-- SELECT POLICIES
-- ============================================================

-- Policy 1: Superadmin sees ALL logs (no restrictions)
CREATE POLICY auth_logs_superadmin_select ON auth_logs FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'superadmin'
);

-- Policy 2: Admin sees logs from their company only
CREATE POLICY auth_logs_admin_select ON auth_logs FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- Policy 3: User sees their own logs
CREATE POLICY auth_logs_user_select ON auth_logs FOR SELECT
USING (
  user_id = auth.uid()
);

-- ============================================================
-- INSERT POLICIES
-- ============================================================

-- Allow authenticated users to insert their own logs
CREATE POLICY auth_logs_insert_authenticated ON auth_logs FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('admin', 'superadmin')
);
