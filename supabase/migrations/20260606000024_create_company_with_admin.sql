-- ============================================================
-- CREATE COMPANY WITH ADMIN - RPC Function to bypass RLS
-- ============================================================

DROP FUNCTION IF EXISTS create_company_with_admin(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION create_company_with_admin(
  p_user_id uuid,
  p_company_name text,
  p_company_color text,
  p_admin_name text,
  p_admin_email text
)
RETURNS TABLE(company_id uuid, success boolean, error_msg text) AS $$
DECLARE
  v_company_id uuid;
  v_error_msg text := '';
BEGIN
  BEGIN
    -- Temporarily disable triggers to avoid audit log conflicts during signup
    SET session_replication_role = replica;

    -- Insert company
    INSERT INTO public.companies (
      name,
      primary_color,
      plan,
      status,
      admin_name,
      admin_email
    ) VALUES (
      p_company_name,
      p_company_color,
      'basic',
      'active',
      p_admin_name,
      p_admin_email
    )
    RETURNING id INTO v_company_id;

    -- Insert user profile as admin
    INSERT INTO public.profiles (
      id,
      company_id,
      full_name,
      email,
      role,
      avatar_emoji,
      avatar_color,
      is_active
    ) VALUES (
      p_user_id,
      v_company_id,
      p_admin_name,
      p_admin_email,
      'admin',
      '👤',
      p_company_color,
      true
    );

    -- Re-enable triggers
    SET session_replication_role = default;

    RETURN QUERY SELECT v_company_id, true, '';
  EXCEPTION WHEN OTHERS THEN
    -- Re-enable triggers in case of error
    SET session_replication_role = default;
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT NULL::uuid, false, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_company_with_admin(uuid, text, text, text, text) TO authenticated;
