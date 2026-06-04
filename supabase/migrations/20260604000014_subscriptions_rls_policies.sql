-- ============================================================
-- SUBSCRIPTIONS RLS POLICIES
-- ============================================================

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS subscriptions_select ON subscriptions;
DROP POLICY IF EXISTS subscriptions_insert ON subscriptions;
DROP POLICY IF EXISTS subscriptions_update ON subscriptions;
DROP POLICY IF EXISTS subscriptions_delete ON subscriptions;

-- Superadmin can do everything
CREATE POLICY subscriptions_superadmin_all ON subscriptions
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- Admin can view and manage their company's subscriptions
CREATE POLICY subscriptions_admin_select ON subscriptions FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY subscriptions_admin_insert ON subscriptions FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY subscriptions_admin_update ON subscriptions FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY subscriptions_admin_delete ON subscriptions FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);
