-- Fix RLS for companies table to allow admins to create client companies
-- Admins can create NEW companies (clients) without needing a profile in them
-- The relationship is tracked in client_companies table instead

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "companies_admin_insert" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;

-- Allow authenticated admins to INSERT new companies (these will be client companies)
CREATE POLICY "companies_admin_insert"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'superadmin'));

-- Allow users to SELECT companies they belong to (have a profile in) OR are superadmin
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select"
  ON companies FOR SELECT TO authenticated
  USING (
    id = get_my_company()
    OR get_my_role() = 'superadmin'
  );

-- Allow admins to UPDATE their own company (the one they have a profile in)
DROP POLICY IF EXISTS "companies_update" ON companies;
CREATE POLICY "companies_update"
  ON companies FOR UPDATE TO authenticated
  USING (id = get_my_company() AND get_my_role() IN ('admin', 'superadmin'))
  WITH CHECK (id = get_my_company() AND get_my_role() IN ('admin', 'superadmin'));
