-- Function to safely delete a company and all related data
CREATE OR REPLACE FUNCTION delete_company_cascade(p_company_id uuid)
RETURNS TABLE(success boolean, error_msg text) AS $$
BEGIN
  BEGIN
    -- Delete audit logs for users in this company
    DELETE FROM audit_logs
    WHERE user_id IN (
      SELECT id FROM profiles WHERE company_id = p_company_id
    );

    -- Delete activity logs for users in this company
    DELETE FROM activity_logs
    WHERE user_id IN (
      SELECT id FROM profiles WHERE company_id = p_company_id
    );

    -- Delete ticket comments (which reference tickets)
    DELETE FROM ticket_comments
    WHERE ticket_id IN (
      SELECT id FROM tickets WHERE company_id = p_company_id
    );

    -- Delete ticket attachments
    DELETE FROM ticket_attachments
    WHERE ticket_id IN (
      SELECT id FROM tickets WHERE company_id = p_company_id
    );

    -- Delete ticket history
    DELETE FROM ticket_history
    WHERE ticket_id IN (
      SELECT id FROM tickets WHERE company_id = p_company_id
    );

    -- Delete SLA records
    DELETE FROM sla_records
    WHERE ticket_id IN (
      SELECT id FROM tickets WHERE company_id = p_company_id
    );

    -- Delete tickets
    DELETE FROM tickets WHERE company_id = p_company_id;

    -- Delete client_companies relationships
    DELETE FROM client_companies
    WHERE client_company_id = p_company_id
    OR admin_company_id = p_company_id;

    -- Delete SLA policies
    DELETE FROM sla_policies WHERE company_id = p_company_id;

    -- Delete subscriptions
    DELETE FROM subscriptions WHERE company_id = p_company_id;

    -- Delete profiles (users)
    DELETE FROM profiles WHERE company_id = p_company_id;

    -- Delete the company itself
    DELETE FROM companies WHERE id = p_company_id;

    RETURN QUERY SELECT true, '';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION delete_company_cascade(uuid) TO authenticated;
