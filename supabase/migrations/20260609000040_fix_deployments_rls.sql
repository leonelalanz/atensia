-- Drop existing policies on deployments if any
DROP POLICY IF EXISTS "Users can view deployments from their company" ON deployments;
DROP POLICY IF EXISTS "Users can create deployments" ON deployments;
DROP POLICY IF EXISTS "Users can update deployments" ON deployments;
DROP POLICY IF EXISTS "deployments_select" ON deployments;
DROP POLICY IF EXISTS "deployments_insert" ON deployments;
DROP POLICY IF EXISTS "deployments_update" ON deployments;

-- SELECT: Allow users to view deployments from their own company OR client companies
CREATE POLICY "deployments_select"
  ON deployments FOR SELECT
  TO authenticated
  USING (
    -- Either the deployment is in the user's own company
    client_company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    -- Or the user's company is the admin of that client company
    client_company_id IN (
      SELECT client_company_id FROM client_companies
      WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- INSERT: Allow authenticated users to create deployments for their company or client companies
CREATE POLICY "deployments_insert"
  ON deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Can insert for their company or client companies
    client_company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    client_company_id IN (
      SELECT client_company_id FROM client_companies
      WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- UPDATE: Allow users to update deployments in their company or client companies
CREATE POLICY "deployments_update"
  ON deployments FOR UPDATE
  TO authenticated
  USING (
    client_company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    client_company_id IN (
      SELECT client_company_id FROM client_companies
      WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    client_company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    client_company_id IN (
      SELECT client_company_id FROM client_companies
      WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );
