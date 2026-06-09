-- ============================================================
-- CONSOLIDATE RLS HELPER FUNCTIONS - Base para todas las políticas
-- ============================================================

-- Helper: Obtener rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: Obtener company_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: Es superadmin?
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() = 'superadmin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: Es admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() IN ('admin', 'superadmin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: Es agent?
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() IN ('agent', 'admin', 'superadmin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: Es developer?
CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() IN ('developer', 'admin', 'superadmin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
