-- Drop ALL existing policies on companies
DROP POLICY IF EXISTS "superadmin_insert_companies" ON companies;
DROP POLICY IF EXISTS "superadmin_update_companies" ON companies;
DROP POLICY IF EXISTS "superadmin_delete_companies" ON companies;
DROP POLICY IF EXISTS "Admins can create companies" ON companies;
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

-- SELECT: Allow authenticated users to view companies
CREATE POLICY "companies_select"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Allow authenticated users to create companies (validation done in app)
CREATE POLICY "companies_insert"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Allow authenticated users to update companies (validation done in app)
CREATE POLICY "companies_update"
  ON companies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Allow authenticated users to delete companies (validation done in app)
CREATE POLICY "companies_delete"
  ON companies FOR DELETE
  TO authenticated
  USING (true);
