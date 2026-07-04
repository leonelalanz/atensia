-- Fix function overloading issue by dropping the 10-parameter version
-- and keeping only the 11-parameter version with p_server_name

-- Drop the 10-parameter overload
DROP FUNCTION IF EXISTS insert_deployment_unified(
  uuid, uuid, text, text, text, uuid, text, text, text, text
) CASCADE;

-- Recreate the correct 11-parameter version
CREATE OR REPLACE FUNCTION insert_deployment_unified(
  p_client_company_id uuid,
  p_platform_id uuid,
  p_deployment_type text,
  p_version text,
  p_build_number text,
  p_uploaded_by uuid DEFAULT NULL,
  p_release_notes text DEFAULT '',
  p_test_url text DEFAULT '',
  p_build_file_url text DEFAULT '',
  p_test_notes text DEFAULT '',
  p_server_name text DEFAULT NULL
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
      deployment_type,
      version,
      build_number,
      status,
      release_notes,
      test_url,
      build_file_url,
      test_notes,
      uploaded_by,
      server_name
    ) VALUES (
      p_client_company_id,
      p_platform_id,
      p_deployment_type,
      p_version,
      p_build_number,
      'draft',
      p_release_notes,
      p_test_url,
      p_build_file_url,
      p_test_notes,
      p_uploaded_by,
      p_server_name
    )
    RETURNING id INTO v_deployment_id;

    RETURN QUERY SELECT v_deployment_id, true, '';
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT NULL::uuid, false, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION insert_deployment_unified(uuid, uuid, text, text, text, uuid, text, text, text, text, text) TO authenticated;
