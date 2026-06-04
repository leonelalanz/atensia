-- ============================================================
-- FIX - get_all_profiles function with proper bypass
-- ============================================================

DROP FUNCTION IF EXISTS get_all_profiles();

CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE(id uuid, email text) AS $$
BEGIN
  -- Disable RLS temporarily by using postgres role
  -- and select all profiles without restrictions
  RETURN QUERY
  SELECT p.id, p.email
  FROM profiles p
  WHERE p.email IS NOT NULL
  ORDER BY p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_profiles() TO anon;
