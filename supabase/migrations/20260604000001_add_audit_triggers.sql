-- ============================================================
-- AUDIT TRIGGERS - Auto-log all changes
-- ============================================================
-- Automatically record all INSERT, UPDATE, DELETE operations

-- Create the audit logging function
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

  -- Determine company_id based on table
  CASE TG_TABLE_NAME
    WHEN 'tickets' THEN
      v_company_id := NEW.company_id;
    WHEN 'profiles' THEN
      v_company_id := NEW.company_id;
    WHEN 'companies' THEN
      v_company_id := NEW.id;
    WHEN 'sla_policies' THEN
      v_company_id := NEW.company_id;
    WHEN 'subscriptions' THEN
      v_company_id := NEW.company_id;
    WHEN 'ticket_comments' THEN
      v_company_id := (SELECT company_id FROM tickets WHERE id = NEW.ticket_id);
    WHEN 'activity_logs' THEN
      v_company_id := NEW.company_id;
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

-- ============================================================
-- CREATE TRIGGERS FOR EACH TABLE
-- ============================================================

-- TICKETS
DROP TRIGGER IF EXISTS audit_tickets_insert ON tickets;
DROP TRIGGER IF EXISTS audit_tickets_update ON tickets;
DROP TRIGGER IF EXISTS audit_tickets_delete ON tickets;

CREATE TRIGGER audit_tickets_insert
AFTER INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_tickets_update
AFTER UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_tickets_delete
AFTER DELETE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- PROFILES
DROP TRIGGER IF EXISTS audit_profiles_insert ON profiles;
DROP TRIGGER IF EXISTS audit_profiles_update ON profiles;
DROP TRIGGER IF EXISTS audit_profiles_delete ON profiles;

CREATE TRIGGER audit_profiles_insert
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_profiles_update
AFTER UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_profiles_delete
AFTER DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- COMPANIES
DROP TRIGGER IF EXISTS audit_companies_insert ON companies;
DROP TRIGGER IF EXISTS audit_companies_update ON companies;
DROP TRIGGER IF EXISTS audit_companies_delete ON companies;

CREATE TRIGGER audit_companies_insert
AFTER INSERT ON companies
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_companies_update
AFTER UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_companies_delete
AFTER DELETE ON companies
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- SLA_POLICIES
DROP TRIGGER IF EXISTS audit_sla_policies_insert ON sla_policies;
DROP TRIGGER IF EXISTS audit_sla_policies_update ON sla_policies;
DROP TRIGGER IF EXISTS audit_sla_policies_delete ON sla_policies;

CREATE TRIGGER audit_sla_policies_insert
AFTER INSERT ON sla_policies
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_sla_policies_update
AFTER UPDATE ON sla_policies
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_sla_policies_delete
AFTER DELETE ON sla_policies
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- SUBSCRIPTIONS
DROP TRIGGER IF EXISTS audit_subscriptions_insert ON subscriptions;
DROP TRIGGER IF EXISTS audit_subscriptions_update ON subscriptions;
DROP TRIGGER IF EXISTS audit_subscriptions_delete ON subscriptions;

CREATE TRIGGER audit_subscriptions_insert
AFTER INSERT ON subscriptions
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_subscriptions_update
AFTER UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_subscriptions_delete
AFTER DELETE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- TICKET_COMMENTS
DROP TRIGGER IF EXISTS audit_ticket_comments_insert ON ticket_comments;
DROP TRIGGER IF EXISTS audit_ticket_comments_update ON ticket_comments;
DROP TRIGGER IF EXISTS audit_ticket_comments_delete ON ticket_comments;

CREATE TRIGGER audit_ticket_comments_insert
AFTER INSERT ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_ticket_comments_update
AFTER UPDATE ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_ticket_comments_delete
AFTER DELETE ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- To verify triggers are created:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public' AND trigger_name LIKE 'audit_%'
-- ORDER BY event_object_table;
