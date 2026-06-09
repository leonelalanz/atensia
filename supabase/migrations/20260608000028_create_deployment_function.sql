-- Create RPC function to insert deployments bypassing RLS

CREATE OR REPLACE FUNCTION insert_deployment(
  p_client_company_id uuid,
  p_platform_id uuid,
  p_version text,
  p_build_number text,
  p_release_notes text DEFAULT ''
)
RETURNS TABLE(deployment_id uuid, success boolean, error_msg text) AS $$
DECLARE
  v_deployment_id uuid;
  v_error_msg text := '';
BEGIN
  BEGIN
    INSERT INTO deployments (
      client_company_id,
      platform_id,
      version,
      build_number,
      release_notes,
      status
    ) VALUES (
      p_client_company_id,
      p_platform_id,
      p_version,
      p_build_number,
      p_release_notes,
      'draft'
    )
    RETURNING id INTO v_deployment_id;

    RETURN QUERY SELECT v_deployment_id, true, '';
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT NULL::uuid, false, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION insert_deployment(uuid, uuid, text, text, text) TO authenticated;
