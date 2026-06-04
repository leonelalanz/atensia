-- ============================================================
-- ADD ERROR_MESSAGE COLUMN - If missing from audit_logs
-- ============================================================

-- Check if column exists and add if not
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS error_message TEXT;
