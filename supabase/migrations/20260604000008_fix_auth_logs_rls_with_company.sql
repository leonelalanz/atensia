-- ============================================================
-- FIX AUTH LOGS RLS - Use company_id based access instead of role JWT
-- ============================================================

-- Drop problematic policies
DROP POLICY IF EXISTS auth_logs_select_all_superadmin ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_company_admin ON auth_logs;
DROP POLICY IF EXISTS auth_logs_select_own_user ON auth_logs;

-- New simplified approach: use company_id from profiles
-- Admins/superadmins see logs for their company
-- Regular users see only their own logs

-- Allow viewing based on company membership
CREATE POLICY auth_logs_view_by_company ON auth_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Superadmin and admin see all logs for their company
      p.role IN ('superadmin', 'admin')
      AND p.company_id = auth_logs.company_id
    )
  )
  OR
  -- Users see their own logs
  user_id = auth.uid()
  OR
  -- Superadmin sees everything (no company restriction)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);
