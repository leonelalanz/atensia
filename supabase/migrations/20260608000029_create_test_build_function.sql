-- Create RPC function to insert test builds bypassing RLS

CREATE OR REPLACE FUNCTION insert_test_build(
  p_client_company_id uuid,
  p_platform_id uuid,
  p_version text,
  p_build_number text,
  p_uploaded_by uuid,
  p_test_url text DEFAULT '',
  p_build_file_url text DEFAULT '',
  p_test_notes text DEFAULT ''
)
RETURNS TABLE(test_build_id uuid, success boolean, error_msg text) AS $$
DECLARE
  v_test_build_id uuid;
  v_error_msg text := '';
BEGIN
  BEGIN
    INSERT INTO test_builds (
      client_company_id,
      platform_id,
      version,
      build_number,
      uploaded_by,
      test_url,
      build_file_url,
      test_notes,
      status
    ) VALUES (
      p_client_company_id,
      p_platform_id,
      p_version,
      p_build_number,
      p_uploaded_by,
      p_test_url,
      p_build_file_url,
      p_test_notes,
      'created'
    )
    RETURNING id INTO v_test_build_id;

    RETURN QUERY SELECT v_test_build_id, true, '';
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT NULL::uuid, false, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION insert_test_build(uuid, uuid, text, text, uuid, text, text, text) TO authenticated;
