-- Create invoices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage for invoices
CREATE POLICY "public_read_invoices" ON storage.objects
  FOR SELECT USING (bucket_id = 'invoices');

CREATE POLICY "authenticated_upload_invoices" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "superadmin_manage_invoices" ON storage.objects
  FOR ALL USING (
    bucket_id = 'invoices' AND (
      auth.role() = 'authenticated' AND
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
      )
    )
  );
