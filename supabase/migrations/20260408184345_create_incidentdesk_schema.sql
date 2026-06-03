
/*
  # IncidentDesk — Esquema completo

  Crea todas las tablas, funciones auxiliares, políticas RLS e índices
  para el sistema multi-tenant de gestión de tickets.

  Tablas: companies, subscriptions, profiles, sla_policies,
          tickets, sla_records, ticket_comments, ticket_attachments,
          ticket_history, activity_logs
*/

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text DEFAULT '',
  primary_color text DEFAULT '#2563eb',
  plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','professional','enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  maintenance_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','professional','enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trial','expired','cancelled')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('superadmin','admin','agent','developer')),
  avatar_emoji text NOT NULL DEFAULT '👤',
  avatar_color text NOT NULL DEFAULT '#2563eb',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTIONS (after profiles table exists)
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_company()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- SLA POLICIES
-- ============================================================

CREATE TABLE IF NOT EXISTS sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  priority text NOT NULL CHECK (priority IN ('critical','high','medium','low')),
  first_response_hours numeric(6,2) NOT NULL DEFAULT 1,
  resolution_hours numeric(6,2) NOT NULL DEFAULT 4,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, priority)
);

-- ============================================================
-- TICKETS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE DEFAULT 'TKT-' || nextval('ticket_number_seq')::text,
  company_id uuid NOT NULL REFERENCES companies(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  category text NOT NULL DEFAULT 'soporte' CHECK (category IN ('soporte','bug','solicitud','consulta','otro')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  due_date timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- SLA RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS sla_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  first_response_deadline timestamptz,
  resolution_deadline timestamptz,
  first_response_met boolean,
  resolution_met boolean,
  first_responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TICKET COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TICKET ATTACHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES ticket_comments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL DEFAULT '',
  file_size integer NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT '',
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TICKET HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  hours_spent numeric(4,2) NOT NULL DEFAULT 0 CHECK (hours_spent >= 0 AND hours_spent <= 24),
  ticket_id uuid REFERENCES tickets(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS: Enable on all tables
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: COMPANIES
-- ============================================================

CREATE POLICY "companies_superadmin_select"
  ON companies FOR SELECT TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "companies_member_select"
  ON companies FOR SELECT TO authenticated
  USING (id = get_my_company() AND get_my_role() IN ('admin','agent','developer'));

CREATE POLICY "companies_superadmin_insert"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "companies_superadmin_update"
  ON companies FOR UPDATE TO authenticated
  USING (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "companies_admin_update"
  ON companies FOR UPDATE TO authenticated
  USING (id = get_my_company() AND get_my_role() = 'admin')
  WITH CHECK (id = get_my_company() AND get_my_role() = 'admin');

-- ============================================================
-- RLS POLICIES: SUBSCRIPTIONS
-- ============================================================

CREATE POLICY "subscriptions_superadmin_select"
  ON subscriptions FOR SELECT TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "subscriptions_admin_select"
  ON subscriptions FOR SELECT TO authenticated
  USING (company_id = get_my_company() AND get_my_role() = 'admin');

CREATE POLICY "subscriptions_superadmin_insert"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "subscriptions_superadmin_update"
  ON subscriptions FOR UPDATE TO authenticated
  USING (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');

-- ============================================================
-- RLS POLICIES: PROFILES
-- ============================================================

CREATE POLICY "profiles_superadmin_select"
  ON profiles FOR SELECT TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "profiles_company_select"
  ON profiles FOR SELECT TO authenticated
  USING (company_id = get_my_company() AND get_my_role() IN ('admin','agent','developer'));

CREATE POLICY "profiles_own_select"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_own_insert"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE TO authenticated
  USING (company_id = get_my_company() AND get_my_role() = 'admin')
  WITH CHECK (company_id = get_my_company() AND get_my_role() = 'admin');

CREATE POLICY "profiles_superadmin_update"
  ON profiles FOR UPDATE TO authenticated
  USING (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "profiles_superadmin_insert"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'superadmin');

-- ============================================================
-- RLS POLICIES: SLA_POLICIES
-- ============================================================

CREATE POLICY "sla_policies_member_select"
  ON sla_policies FOR SELECT TO authenticated
  USING (company_id = get_my_company() OR get_my_role() = 'superadmin');

CREATE POLICY "sla_policies_admin_insert"
  ON sla_policies FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company() AND get_my_role() = 'admin');

CREATE POLICY "sla_policies_admin_update"
  ON sla_policies FOR UPDATE TO authenticated
  USING (company_id = get_my_company() AND get_my_role() = 'admin')
  WITH CHECK (company_id = get_my_company() AND get_my_role() = 'admin');

CREATE POLICY "sla_policies_admin_delete"
  ON sla_policies FOR DELETE TO authenticated
  USING (company_id = get_my_company() AND get_my_role() = 'admin');

-- ============================================================
-- RLS POLICIES: TICKETS
-- ============================================================

CREATE POLICY "tickets_superadmin_select"
  ON tickets FOR SELECT TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "tickets_company_select"
  ON tickets FOR SELECT TO authenticated
  USING (company_id = get_my_company() AND get_my_role() IN ('admin','agent','developer'));

CREATE POLICY "tickets_company_insert"
  ON tickets FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company() AND get_my_role() IN ('admin','agent','developer'));

CREATE POLICY "tickets_admin_update"
  ON tickets FOR UPDATE TO authenticated
  USING (company_id = get_my_company() AND get_my_role() = 'admin')
  WITH CHECK (company_id = get_my_company() AND get_my_role() = 'admin');

CREATE POLICY "tickets_member_update"
  ON tickets FOR UPDATE TO authenticated
  USING (
    company_id = get_my_company()
    AND get_my_role() IN ('agent','developer')
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  )
  WITH CHECK (company_id = get_my_company() AND get_my_role() IN ('agent','developer'));

-- ============================================================
-- RLS POLICIES: SLA_RECORDS
-- ============================================================

CREATE POLICY "sla_records_company_select"
  ON sla_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (t.company_id = get_my_company() OR get_my_role() = 'superadmin')
    )
  );

CREATE POLICY "sla_records_company_insert"
  ON sla_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.company_id = get_my_company()
    )
  );

CREATE POLICY "sla_records_company_update"
  ON sla_records FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.company_id = get_my_company()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.company_id = get_my_company()
    )
  );

-- ============================================================
-- RLS POLICIES: TICKET_COMMENTS
-- ============================================================

CREATE POLICY "ticket_comments_company_select"
  ON ticket_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (t.company_id = get_my_company() OR get_my_role() = 'superadmin')
    )
  );

CREATE POLICY "ticket_comments_company_insert"
  ON ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.company_id = get_my_company()
    )
  );

CREATE POLICY "ticket_comments_own_update"
  ON ticket_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLS POLICIES: TICKET_ATTACHMENTS
-- ============================================================

CREATE POLICY "ticket_attachments_company_select"
  ON ticket_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (t.company_id = get_my_company() OR get_my_role() = 'superadmin')
    )
  );

CREATE POLICY "ticket_attachments_company_insert"
  ON ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.company_id = get_my_company()
    )
  );

-- ============================================================
-- RLS POLICIES: TICKET_HISTORY
-- ============================================================

CREATE POLICY "ticket_history_company_select"
  ON ticket_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (t.company_id = get_my_company() OR get_my_role() = 'superadmin')
    )
  );

CREATE POLICY "ticket_history_company_insert"
  ON ticket_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.company_id = get_my_company()
    )
  );

-- ============================================================
-- RLS POLICIES: ACTIVITY_LOGS
-- ============================================================

CREATE POLICY "activity_logs_superadmin_select"
  ON activity_logs FOR SELECT TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "activity_logs_admin_select"
  ON activity_logs FOR SELECT TO authenticated
  USING (company_id = get_my_company() AND get_my_role() = 'admin');

CREATE POLICY "activity_logs_own_select"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND get_my_role() = 'developer');

CREATE POLICY "activity_logs_developer_insert"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = get_my_company()
    AND get_my_role() = 'developer'
  );

CREATE POLICY "activity_logs_own_update"
  ON activity_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND get_my_role() = 'developer')
  WITH CHECK (user_id = auth.uid() AND get_my_role() = 'developer');

CREATE POLICY "activity_logs_own_delete"
  ON activity_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND get_my_role() = 'developer');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date);
CREATE INDEX IF NOT EXISTS idx_sla_records_ticket ON sla_records(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);

-- ============================================================
-- DEFAULT SLA POLICIES FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_sla_policies(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sla_policies (company_id, priority, first_response_hours, resolution_hours)
  VALUES
    (p_company_id, 'critical', 1, 4),
    (p_company_id, 'high', 4, 8),
    (p_company_id, 'medium', 8, 24),
    (p_company_id, 'low', 24, 72)
  ON CONFLICT (company_id, priority) DO NOTHING;
END;
$$;
