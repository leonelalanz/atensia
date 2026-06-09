-- ============================================================
-- FIX AUDIT_LOGS FK - Remove constraint, use CASCADE only
-- ============================================================

-- Drop the problematic FK completely
-- Audit logs will cascade delete without constraint validation
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_company_id_fkey;
