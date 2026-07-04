-- Create payment-proofs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
CREATE POLICY "public_read_payment_proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs');

CREATE POLICY "authenticated_upload_payment_proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "superadmin_manage_payment_proofs" ON storage.objects
  FOR ALL USING (
    bucket_id = 'payment-proofs' AND (
      auth.role() = 'authenticated' AND
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
      )
    )
  );
