-- Add currency field to payment_proofs
ALTER TABLE payment_proofs ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'VES'));

-- Update existing records to USD by default
UPDATE payment_proofs SET currency = 'USD' WHERE currency IS NULL;

-- Add exchange_rate_used field to store the rate at time of payment
ALTER TABLE payment_proofs ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(15,6);

-- Set default rate for existing records
UPDATE payment_proofs SET exchange_rate_used = 4500000 WHERE exchange_rate_used IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_proofs_currency ON payment_proofs(currency);
