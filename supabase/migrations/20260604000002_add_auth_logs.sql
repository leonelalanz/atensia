-- ============================================================
-- AUTH LOGS - Track user login/logout
-- ============================================================
-- This migration assumes audit_logs table already exists from 20260604000000

CREATE TABLE auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('login', 'logout', 'password_reset', 'mfa_enabled')),
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_auth_logs_company_id ON auth_logs(company_id);
CREATE INDEX idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX idx_auth_logs_action ON auth_logs(action);
CREATE INDEX idx_auth_logs_created_at ON auth_logs(created_at);

-- ============================================================
-- RLS POLICIES - Auth logs
-- ============================================================

ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Admins see logs for their company users
CREATE POLICY admin_auth_logs_select ON auth_logs FOR SELECT
USING (
  auth.jwt() ->> 'role' IN ('admin', 'superadmin')
  AND (
    auth.jwt() ->> 'role' = 'superadmin'
    OR company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Users can only see their own login history
CREATE POLICY user_auth_logs_select ON auth_logs FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'agent'
  AND user_id = auth.uid()
);

-- Anyone can insert their own auth logs
CREATE POLICY anyone_auth_logs_insert ON auth_logs FOR INSERT
WITH CHECK (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));
