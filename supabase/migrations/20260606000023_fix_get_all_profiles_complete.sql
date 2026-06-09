-- ============================================================
-- FIX - get_all_profiles function to return all profile fields
-- ============================================================

DROP FUNCTION IF EXISTS get_all_profiles();

CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE(
  id uuid,
  company_id uuid,
  full_name text,
  email text,
  role text,
  avatar_emoji text,
  avatar_color text,
  is_active boolean,
  created_at timestamp
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.company_id,
    p.full_name,
    p.email,
    p.role,
    p.avatar_emoji,
    p.avatar_color,
    p.is_active,
    p.created_at
  FROM profiles p
  WHERE p.email IS NOT NULL
  ORDER BY p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_profiles() TO anon;
