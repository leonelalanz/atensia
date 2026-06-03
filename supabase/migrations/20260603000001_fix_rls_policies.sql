-- ============================================================
-- FIX: Remove duplicate RLS policies and recreate correctly
-- ============================================================
-- Some RLS policies were already created in previous migrations.
-- This migration cleans them up and ensures all policies are present.

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "companies_superadmin_select" ON companies;
DROP POLICY IF EXISTS "Superadmins can view all companies" ON companies;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "companies_update_superadmin" ON companies;
DROP POLICY IF EXISTS "companies_delete_superadmin" ON companies;

-- Recreate companies policies
CREATE POLICY "Superadmins can view all companies"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Superadmins can update companies"
  ON companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete companies"
  ON companies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ============================================================
-- PROFILES TABLE: Drop and recreate if any duplicates
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update company profiles" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Admins can view company profiles"
  ON profiles FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update company profiles"
  ON profiles FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- TICKETS TABLE: Drop and recreate if any duplicates
-- ============================================================

DROP POLICY IF EXISTS "Users can view company tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can create tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update company tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete company tickets" ON tickets;

CREATE POLICY "Users can view company tickets"
  ON tickets FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'agent', 'developer', 'superadmin')
  );

CREATE POLICY "Users can update company tickets"
  ON tickets FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete company tickets"
  ON tickets FOR DELETE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ============================================================
-- TICKET_COMMENTS TABLE: Drop and recreate if any duplicates
-- ============================================================

DROP POLICY IF EXISTS "Users can view ticket comments" ON ticket_comments;
DROP POLICY IF EXISTS "Users can create comments" ON ticket_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON ticket_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON ticket_comments;

CREATE POLICY "Users can view ticket comments"
  ON ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE id = ticket_comments.ticket_id
        AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments"
  ON ticket_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE id = ticket_comments.ticket_id
        AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own comments"
  ON ticket_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON ticket_comments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- SLA_POLICIES TABLE: Drop and recreate if any duplicates
-- ============================================================

DROP POLICY IF EXISTS "Users can view company SLA policies" ON sla_policies;
DROP POLICY IF EXISTS "Admins can create SLA policies" ON sla_policies;
DROP POLICY IF EXISTS "Admins can update SLA policies" ON sla_policies;
DROP POLICY IF EXISTS "Admins can delete SLA policies" ON sla_policies;

CREATE POLICY "Users can view company SLA policies"
  ON sla_policies FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can create SLA policies"
  ON sla_policies FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

CREATE POLICY "Admins can update SLA policies"
  ON sla_policies FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete SLA policies"
  ON sla_policies FOR DELETE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ============================================================
-- SUBSCRIPTIONS TABLE: Drop and recreate if any duplicates
-- ============================================================

DROP POLICY IF EXISTS "Superadmins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view company subscription" ON subscriptions;
DROP POLICY IF EXISTS "Superadmins can update subscriptions" ON subscriptions;

CREATE POLICY "Superadmins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Users can view company subscription"
  ON subscriptions FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Superadmins can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ============================================================
-- ACTIVITY_LOGS TABLE: Drop and recreate if any duplicates
-- ============================================================

DROP POLICY IF EXISTS "Users can view company activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can create their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can update their own activity logs" ON activity_logs;

CREATE POLICY "Users can view company activity logs"
  ON activity_logs FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create their own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own activity logs"
  ON activity_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- VERIFY RLS IS ENABLED
-- ============================================================
-- Run this query to verify:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN
-- ('profiles', 'companies', 'tickets', 'ticket_comments', 'sla_policies', 'subscriptions', 'activity_logs')
-- ORDER BY tablename;
