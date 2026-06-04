-- ============================================================
-- FUNCTION - Get all profiles for audit log display
-- ============================================================
-- Helper function that bypasses RLS to get user emails for audit logs

CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE(id uuid, email text) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email FROM profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
