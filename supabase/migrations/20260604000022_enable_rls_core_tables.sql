-- ============================================================
-- ENABLE RLS ON CORE TABLES - Companies and Profiles
-- ============================================================

-- ============================================================
-- COMPANIES TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "superadmin_insert_companies" ON public.companies;
DROP POLICY IF EXISTS "admin_insert_companies" ON public.companies;
DROP POLICY IF EXISTS "enable_all_superadmin" ON public.companies;
DROP POLICY IF EXISTS "enable_admin_all" ON public.companies;

-- Superadmin: Full access to all companies
CREATE POLICY "companies_superadmin_all"
ON public.companies
FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin: Can see their own company
CREATE POLICY "companies_admin_select"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_admin() AND (id = public.get_my_company() OR public.is_superadmin()));

-- Admin: Can update their own company
CREATE POLICY "companies_admin_update"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.is_admin() AND (id = public.get_my_company() OR public.is_superadmin()))
WITH CHECK (public.is_admin() AND (id = public.get_my_company() OR public.is_superadmin()));

-- ============================================================
-- PROFILES TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "superadmin_select_companies" ON public.profiles;
DROP POLICY IF EXISTS "admin_select_companies" ON public.profiles;

-- Superadmin: Full access to all profiles
CREATE POLICY "profiles_superadmin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin: Can see profiles in their company
CREATE POLICY "profiles_admin_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin() AND company_id = public.get_my_company());

-- Users: Can see their own profile
CREATE POLICY "profiles_user_select_self"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users: Can update their own profile
CREATE POLICY "profiles_user_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin: Can insert profiles in their company
CREATE POLICY "profiles_admin_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND company_id = public.get_my_company());

-- Superadmin: Can insert profiles anywhere
CREATE POLICY "profiles_superadmin_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- Users: Can see their own notifications
CREATE POLICY "notifications_user_select"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users: Can update their own notifications (mark as read)
CREATE POLICY "notifications_user_update"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System and admin: Can insert notifications
CREATE POLICY "notifications_system_insert"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users: Can delete their own notifications
CREATE POLICY "notifications_user_delete"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
