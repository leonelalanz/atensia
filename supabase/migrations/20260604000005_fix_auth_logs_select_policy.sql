-- ============================================================
-- FIX AUTH LOGS SELECT POLICY - Allow superadmin to see all
-- ============================================================

-- Drop previous SELECT policies
DROP POLICY IF EXISTS auth_logs_select_admin ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_user ON auth_logs;

-- Superadmins can see ALL auth logs
CREATE POLICY auth_logs_select_superadmin ON auth_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

-- Admins can see logs for their company users
CREATE POLICY auth_logs_select_admin ON auth_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
    AND p.company_id IN (
      SELECT company_id FROM auth_logs al WHERE al.id = auth_logs.id
    )
  )
);

-- Users can see their own logs
CREATE POLICY auth_logs_select_user ON auth_logs FOR SELECT
USING (user_id = auth.uid());
