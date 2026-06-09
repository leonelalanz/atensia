-- Create a secure RPC function for admins to create client companies with users
-- Creates company + user profile + relationship all at once

CREATE OR REPLACE FUNCTION create_client_company(
  p_nombre text,
  p_contacto_nombre text,
  p_contacto_email text,
  p_color_primario text DEFAULT '#2563eb',
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(company_id uuid, user_id uuid, success boolean, error_msg text) AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_error_msg text := '';
  v_my_company uuid;
  v_my_role text;
BEGIN
  -- Get user's company and role
  SELECT p.company_id, p.role INTO v_my_company, v_my_role
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Check if user is admin
  IF v_my_role != 'admin' AND v_my_role != 'superadmin' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'Solo administradores pueden crear clientes';
    RETURN;
  END IF;

  BEGIN
    -- Create the new company
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

    -- If a user_id is provided, create the profile for the client company
    IF p_user_id IS NOT NULL THEN
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
        v_company_id,
        p_contacto_nombre,
        p_contacto_email,
        'admin',
        '👤',
        p_color_primario,
        true
      );
      v_user_id := p_user_id;
    END IF;

    -- Create the relationship between admin company and client company
    INSERT INTO client_companies (
      admin_company_id,
      client_company_id,
      client_contact_name,
      client_contact_email,
      client_contact_phone,
      status
    ) VALUES (
      v_my_company,
      v_company_id,
      p_contacto_nombre,
      p_contacto_email,
      '',
      'active'
    );

    RETURN QUERY SELECT v_company_id, v_user_id, true, '';
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_client_company(text, text, text, text, uuid) TO authenticated;
