-- ============================================================
-- COMPANIES CASCADE DELETE - Allow deleting companies with logs
-- ============================================================

-- Drop existing foreign keys that reference companies
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_company_id_fkey;

ALTER TABLE auth_logs
DROP CONSTRAINT IF EXISTS auth_logs_company_id_fkey;

ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS tickets_company_id_fkey;

ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_company_id_fkey;

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;

ALTER TABLE sla_policies
DROP CONSTRAINT IF EXISTS sla_policies_company_id_fkey;

-- Recreate foreign keys with ON DELETE CASCADE
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_company_id_fkey
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE auth_logs
ADD CONSTRAINT auth_logs_company_id_fkey
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE tickets
ADD CONSTRAINT tickets_company_id_fkey
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_company_id_fkey
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE profiles
ADD CONSTRAINT profiles_company_id_fkey
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE sla_policies
ADD CONSTRAINT sla_policies_company_id_fkey
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
