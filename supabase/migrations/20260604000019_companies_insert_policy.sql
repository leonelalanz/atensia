-- ============================================================
-- COMPANIES INSERT POLICY - Allow superadmins and admins to create
-- ============================================================

-- Allow superadmins to insert companies
CREATE POLICY "superadmin_insert_companies"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');

-- Allow admins to insert companies (for their own company context)
CREATE POLICY "admin_insert_companies"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'role' = 'admin');
