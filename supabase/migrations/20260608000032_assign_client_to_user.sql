-- Create profile first, then company to avoid audit_logs FK issues

CREATE OR REPLACE FUNCTION assign_user_to_client(
  p_user_id uuid,
  p_admin_company_id uuid,
  p_nombre text,
  p_contacto_nombre text,
  p_contacto_email text,
  p_color_primario text DEFAULT '#2563eb'
)
RETURNS TABLE(company_id uuid, success boolean, error_msg text) AS $$
DECLARE
  v_company_id uuid;
BEGIN

  -- Check if profile already exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    INSERT INTO profiles (
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
      NULL,
      p_contacto_nombre,
      p_contacto_email,
      'agent',
      '👤',
      p_color_primario,
      true
    );
  END IF;

  -- Create the company (no error handling - let errors bubble up)
  INSERT INTO companies (
    name,
    logo_url,
    primary_color,
    plan,
    status,
    maintenance_mode,
    admin_name,
    admin_email
  ) VALUES (
    p_nombre,
    '',
    p_color_primario,
    'basic',
    'active',
    false,
    p_contacto_nombre,
    p_contacto_email
  )
  RETURNING id INTO v_company_id;

  -- Update profile with company_id
  UPDATE profiles
  SET company_id = v_company_id
  WHERE id = p_user_id;

  -- Create the relationship (no error handling - let errors bubble up)
  INSERT INTO client_companies (
    admin_company_id,
    client_company_id,
    client_contact_name,
    client_contact_email,
    client_contact_phone,
    status
  ) VALUES (
    p_admin_company_id,
    v_company_id,
    p_contacto_nombre,
    p_contacto_email,
    '',
    'active'
  );

  RETURN QUERY SELECT v_company_id, true, '';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::uuid, false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION assign_user_to_client(uuid, uuid, text, text, text, text) TO authenticated;
