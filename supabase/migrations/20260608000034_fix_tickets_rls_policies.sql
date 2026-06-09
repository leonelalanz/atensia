-- Fix tickets RLS policies - remove all old ones and create clean new ones

-- Drop ALL existing policies on tickets table
DROP POLICY IF EXISTS "Admins can create tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete company tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete company or client tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view company tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update company tickets" ON tickets;
DROP POLICY IF EXISTS "Users update company or client tickets" ON tickets;
DROP POLICY IF EXISTS "users_view_company_or_client_tickets" ON tickets;
DROP POLICY IF EXISTS "users_update_company_or_client_tickets" ON tickets;
DROP POLICY IF EXISTS "admins_delete_company_or_client_tickets" ON tickets;
DROP POLICY IF EXISTS "tickets_developer_cross_admin" ON tickets;
DROP POLICY IF EXISTS "tickets_developer_cross_admin_insert" ON tickets;
DROP POLICY IF EXISTS "tickets_developer_cross_admin_update" ON tickets;

-- Create clean, simple policies

-- 1. SELECT: Allow users to see tickets from their company OR admins to see client tickets OR if assigned to them
CREATE POLICY "tickets_select"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    -- Own company tickets
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    -- Client company tickets (if you're an admin)
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
      AND company_id IN (
        SELECT client_company_id
        FROM client_companies
        WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
    )
    OR
    -- Tickets assigned to you (regardless of company)
    assigned_to = auth.uid()
  );

-- 2. INSERT: Allow creating tickets in your company
CREATE POLICY "tickets_insert"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'agent', 'developer', 'superadmin')
  );

-- 3. UPDATE: Allow updating tickets in your company OR admin can update client tickets OR if assigned to you
CREATE POLICY "tickets_update"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
      AND company_id IN (
        SELECT client_company_id
        FROM client_companies
        WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
    )
    OR
    assigned_to = auth.uid()
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
      AND company_id IN (
        SELECT client_company_id
        FROM client_companies
        WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
    )
    OR
    assigned_to = auth.uid()
  );

-- 4. DELETE: Allow deleting tickets (admins only)
CREATE POLICY "tickets_delete"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    AND (
      company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      OR
      company_id IN (
        SELECT client_company_id
        FROM client_companies
        WHERE admin_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
      )
    )
  );
