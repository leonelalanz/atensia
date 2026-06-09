-- Function to create a company with admin user
CREATE OR REPLACE FUNCTION create_company_with_admin(
  p_company_name text,
  p_primary_color text,
  p_logo_url text,
  p_admin_name text,
  p_admin_email text,
  p_admin_password text
)
RETURNS TABLE(company_id uuid, success boolean, error_msg text) AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    p_admin_email,
    crypt(p_admin_password, gen_salt('bf')),
    NOW(),
    jsonify(json_object('full_name' -> p_admin_name))
  )
  RETURNING id INTO v_user_id;

  -- Create company
  INSERT INTO companies (name, primary_color, logo_url, admin_name, admin_email, plan, status, maintenance_mode)
  VALUES (p_company_name, p_primary_color, p_logo_url, p_admin_name, p_admin_email, 'basic', 'active', false)
  RETURNING id INTO v_company_id;

  -- Create profile
  INSERT INTO profiles (id, company_id, full_name, email, role, avatar_emoji, avatar_color, is_active)
  VALUES (v_user_id, v_company_id, p_admin_name, p_admin_email, 'admin', '👤', p_primary_color, true);

  -- Create default SLA policies
  PERFORM create_default_sla_policies(v_company_id);

  RETURN QUERY SELECT v_company_id, true, '';

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::uuid, false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_company_with_admin(text, text, text, text, text, text) TO authenticated;
