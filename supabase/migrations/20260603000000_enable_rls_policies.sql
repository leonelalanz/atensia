-- ============================================================
-- CRITICAL SECURITY: Enable RLS and Create Policies
-- ============================================================
-- This migration enables Row-Level Security (RLS) on all tables
-- RLS ensures users can only see/modify data they have access to

-- ============================================================
-- 1. PROFILES TABLE POLICIES
-- ============================================================

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Superadmins can view all profiles
CREATE POLICY "Superadmins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Admins can view profiles in their company
CREATE POLICY "Admins can view company profiles"
  ON profiles FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update profiles in their company
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
-- 2. COMPANIES TABLE POLICIES
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Superadmins can view all companies
CREATE POLICY "Superadmins can view all companies"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Users can view their company
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Superadmins can update companies
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

-- Only superadmins can delete companies
CREATE POLICY "Superadmins can delete companies"
  ON companies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ============================================================
-- 3. TICKETS TABLE POLICIES
-- ============================================================

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Users can view tickets from their company
CREATE POLICY "Users can view company tickets"
  ON tickets FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Admins and Superadmins can create tickets
CREATE POLICY "Admins can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'agent', 'developer', 'superadmin')
  );

-- Users can update tickets in their company
CREATE POLICY "Users can update company tickets"
  ON tickets FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can delete tickets in their company
CREATE POLICY "Admins can delete company tickets"
  ON tickets FOR DELETE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ============================================================
-- 4. TICKET_COMMENTS TABLE POLICIES
-- ============================================================

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on tickets they can access
CREATE POLICY "Users can view ticket comments"
  ON ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE id = ticket_comments.ticket_id
        AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Users can create comments on accessible tickets
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

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON ticket_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON ticket_comments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 5. SLA_POLICIES TABLE POLICIES
-- ============================================================

ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

-- Users can view SLA policies for their company
CREATE POLICY "Users can view company SLA policies"
  ON sla_policies FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Only admins can modify SLA policies
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
-- 6. SUBSCRIPTIONS TABLE POLICIES
-- ============================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Superadmins can view all subscriptions
CREATE POLICY "Superadmins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Users can view their company subscription
CREATE POLICY "Users can view company subscription"
  ON subscriptions FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Only superadmins can modify subscriptions
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
-- 7. ACTIVITY_LOGS TABLE POLICIES
-- ============================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view activity logs for their company
CREATE POLICY "Users can view company activity logs"
  ON activity_logs FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Users can only create activity logs for themselves
CREATE POLICY "Users can create their own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Users can only update their own activity logs
CREATE POLICY "Users can update their own activity logs"
  ON activity_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 8. NOTIFICATIONS TABLE POLICIES
-- ============================================================

-- Enable RLS only if notifications table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    -- Users can only view their own notifications
    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      USING (user_id = auth.uid());

    -- Users can only create notifications for themselves (rare, usually backend)
    CREATE POLICY "Users can create own notifications"
      ON notifications FOR INSERT
      WITH CHECK (user_id = auth.uid());

    -- Users can update their own notification read status
    CREATE POLICY "Users can update notification read status"
      ON notifications FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Users can delete their own notifications
    CREATE POLICY "Users can delete own notifications"
      ON notifications FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- To verify RLS is enabled, run:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = true;

-- To check policies:
-- SELECT policyname, tablename, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
