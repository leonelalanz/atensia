-- Allow admins to see tickets from their client companies

-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Users can view company tickets" ON tickets;

-- New policy: Allow viewing tickets from your company OR from client companies (for admins)
CREATE POLICY "users_view_company_or_client_tickets"
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
  );

-- Update policy: Users can update tickets in their company or client companies (if admin)
DROP POLICY IF EXISTS "Users can update company tickets" ON tickets;

CREATE POLICY "users_update_company_or_client_tickets"
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
  );

-- Delete policy: Admins can delete tickets from client companies
DROP POLICY IF EXISTS "Admins can delete company tickets" ON tickets;

CREATE POLICY "admins_delete_company_or_client_tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    (
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
    )
  );
