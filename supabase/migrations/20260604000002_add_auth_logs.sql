-- ============================================================
-- AUTH LOGS - Track user login/logout
-- ============================================================

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

-- ============================================================
-- FUNCTION - Combine audit_logs and auth_logs for unified view
-- ============================================================

CREATE OR REPLACE VIEW unified_activity_logs AS
SELECT
  'audit' as log_type,
  id,
  company_id,
  user_id,
  action,
  table_name as entity_type,
  record_id,
  old_data,
  new_data,
  NULL::TEXT as ip_address,
  NULL::TEXT as user_agent,
  status,
  error_message,
  created_at
FROM audit_logs

UNION ALL

SELECT
  'auth' as log_type,
  id,
  company_id,
  user_id,
  action,
  NULL::TEXT as entity_type,
  NULL::TEXT as record_id,
  NULL::JSONB as old_data,
  NULL::JSONB as new_data,
  ip_address,
  user_agent,
  status,
  error_message,
  created_at
FROM auth_logs

ORDER BY created_at DESC;

-- ============================================================
-- IMPROVE AUDIT LOGS - Better user tracking
-- ============================================================

-- Add IP and User-Agent to audit_logs if not already there
-- (This migration assumes they exist from previous migration)
-- To use in triggers, pass them via SET config or from the client

-- Update the audit trigger function to handle better user context
CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_action TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  -- Get current user from session
  v_user_id := auth.uid();

  -- If no session user, try to get from JWT claims (for edge function context)
  IF v_user_id IS NULL THEN
    v_user_id := (auth.jwt() ->> 'sub')::uuid;
  END IF;

  -- Determine company_id based on table
  CASE TG_TABLE_NAME
    WHEN 'tickets' THEN
      v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    WHEN 'profiles' THEN
      v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    WHEN 'companies' THEN
      v_company_id := COALESCE(NEW.id, OLD.id);
    WHEN 'sla_policies' THEN
      v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    WHEN 'subscriptions' THEN
      v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    WHEN 'ticket_comments' THEN
      v_company_id := (SELECT company_id FROM tickets WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id));
    WHEN 'activity_logs' THEN
      v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSE
      v_company_id := NULL;
  END CASE;

  -- Skip audit if no company context
  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    status
  ) VALUES (
    v_company_id,
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_old_data,
    v_new_data,
    'success'
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log failed audit attempt
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    table_name,
    record_id,
    status,
    error_message
  ) VALUES (
    v_company_id,
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    'failed',
    SQLERRM
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
