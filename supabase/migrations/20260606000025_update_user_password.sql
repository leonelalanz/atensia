-- ============================================================
-- UPDATE USER PASSWORD - RPC Function for superadmin
-- ============================================================

DROP FUNCTION IF EXISTS update_user_password(uuid, text);

CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS TABLE(success boolean, error_msg text) AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT true, ''::text;
  ELSE
    RETURN QUERY SELECT false, 'Usuario no encontrado'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION update_user_password(uuid, text) TO authenticated;
