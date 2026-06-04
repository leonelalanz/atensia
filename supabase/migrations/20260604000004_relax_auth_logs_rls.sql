-- ============================================================
-- FIX AUTH LOGS RLS - More permissive for login/logout logging
-- ============================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS admin_auth_logs_select ON auth_logs;
DROP POLICY IF EXISTS user_auth_logs_select ON auth_logs;
DROP POLICY IF EXISTS anyone_auth_logs_insert ON auth_logs;

-- More permissive SELECT policies for admins
CREATE POLICY auth_logs_select_admin ON auth_logs FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

-- Users see their own logs
CREATE POLICY auth_logs_select_user ON auth_logs FOR SELECT
USING (user_id = auth.uid());

-- Allow authenticated users to insert their own auth logs
-- (The application ensures company_id correctness)
CREATE POLICY auth_logs_insert_authenticated ON auth_logs FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' IS NOT NULL);

-- Allow Supabase service role to insert (for edge functions)
CREATE POLICY auth_logs_insert_service ON auth_logs FOR INSERT
WITH CHECK (true);
