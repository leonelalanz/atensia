-- Bucket para logos de empresas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso
CREATE POLICY "Anyone can read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Authenticated users can update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can delete logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos');
