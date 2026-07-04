/*
  Multi-currency support: VES + USD
  Stores VES/USD exchange rate with history
*/

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate numeric(15,6) NOT NULL,
  effective_date timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),

  CONSTRAINT positive_rate CHECK (rate > 0)
);

CREATE INDEX idx_exchange_rates_date ON exchange_rates(effective_date DESC);

-- Insert default rate (1 VES = 1 VES, 1 USD = 4,500,000 VES as starting point)
INSERT INTO exchange_rates (rate, updated_by, effective_date)
VALUES (4500000, NULL, now())
ON CONFLICT DO NOTHING;

-- Add RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Superadmin can update rates
CREATE POLICY "exchange_rates_superadmin_select"
  ON exchange_rates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "exchange_rates_superadmin_update"
  ON exchange_rates FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'superadmin');
