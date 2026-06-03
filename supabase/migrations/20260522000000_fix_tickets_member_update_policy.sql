-- Fix: agents and developers can update any ticket in their company,
-- not just tickets they created or are assigned to.
-- The old policy blocked assignment of unassigned tickets.

DROP POLICY IF EXISTS "tickets_member_update" ON tickets;

CREATE POLICY "tickets_member_update"
  ON tickets FOR UPDATE TO authenticated
  USING (
    company_id = get_my_company()
    AND get_my_role() IN ('agent', 'developer')
  )
  WITH CHECK (
    company_id = get_my_company()
    AND get_my_role() IN ('agent', 'developer')
  );
