-- Create payment_proofs table for storing payment evidence
CREATE TABLE payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  plan TEXT NOT NULL CHECK (plan IN ('basic','professional','enterprise')),
  plan_price DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  proof_url TEXT NOT NULL,
  proof_file_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

-- Superadmin can see all
CREATE POLICY "superadmin_view_all" ON payment_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Company can see their own
CREATE POLICY "company_view_own" ON payment_proofs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Company can insert their own
CREATE POLICY "company_insert_own" ON payment_proofs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Superadmin can update (for validation)
CREATE POLICY "superadmin_update" ON payment_proofs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Create indexes
CREATE INDEX idx_payment_proofs_company ON payment_proofs(company_id);
CREATE INDEX idx_payment_proofs_status ON payment_proofs(status);
CREATE INDEX idx_payment_proofs_created ON payment_proofs(created_at DESC);
