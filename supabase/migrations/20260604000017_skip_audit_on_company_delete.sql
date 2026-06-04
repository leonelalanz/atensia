-- ============================================================
-- SKIP AUDIT ON COMPANY DELETE - Avoid FK constraint violation
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_action TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Skip audit for company deletions (CASCADE delete handles cascading)
  IF TG_TABLE_NAME = 'companies' AND TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

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

  -- For tickets, try to use created_by field if available
  IF TG_TABLE_NAME = 'tickets' AND v_user_id IS NULL THEN
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
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
