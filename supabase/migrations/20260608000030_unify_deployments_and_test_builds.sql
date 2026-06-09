-- Unify test_builds and deployments into a single deployments table
-- Add deployment_type field: 'test' or 'production'
-- Update platforms to match actual platforms

-- Add deployment_type column if not exists
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS deployment_type text NOT NULL DEFAULT 'production'
  CHECK (deployment_type IN ('test', 'production'));

-- Add test-specific fields to deployments
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS test_url text DEFAULT '';
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS build_file_url text DEFAULT '';
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS test_notes text DEFAULT '';
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES profiles(id);

-- Clear old platforms and add the correct ones
DELETE FROM deployment_platforms;

INSERT INTO deployment_platforms (name, description) VALUES
  ('iOS - TestFlight', 'Apple TestFlight for iOS testing'),
  ('iOS - App Store', 'Apple App Store Production'),
  ('Android - TestFairy', 'TestFairy for Android testing'),
  ('Android - Google Play', 'Google Play Store Production');

-- Create unified RPC function for creating deployments
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
  p_test_notes text DEFAULT ''
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
      uploaded_by
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
      p_uploaded_by
    )
    RETURNING id INTO v_deployment_id;

    RETURN QUERY SELECT v_deployment_id, true, '';
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT NULL::uuid, false, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION insert_deployment_unified(uuid, uuid, text, text, text, uuid, text, text, text, text) TO authenticated;
