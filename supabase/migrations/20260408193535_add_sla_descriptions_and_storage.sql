
/*
  # Mejoras: Descripciones SLA y Bucket de Almacenamiento

  1. Agrega columna `description` a sla_policies
  2. Crea bucket de almacenamiento para adjuntos de tickets
  3. Políticas de acceso para el bucket
*/

-- ============================================================
-- SLA POLICIES: add description column
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sla_policies' AND column_name = 'description'
  ) THEN
    ALTER TABLE sla_policies ADD COLUMN description text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Update default descriptions for existing policies
UPDATE sla_policies SET description = 'Incidencias críticas que detienen completamente las operaciones del negocio. Requieren atención inmediata 24/7.' WHERE priority = 'critical' AND description = '';
UPDATE sla_policies SET description = 'Problemas graves que afectan a múltiples usuarios o funcionalidades clave. Deben resolverse en el mismo día.' WHERE priority = 'high' AND description = '';
UPDATE sla_policies SET description = 'Incidencias moderadas que afectan a algunos usuarios. Tienen solución alternativa disponible.' WHERE priority = 'medium' AND description = '';
UPDATE sla_policies SET description = 'Solicitudes o mejoras menores con bajo impacto en las operaciones diarias.' WHERE priority = 'low' AND description = '';

-- ============================================================
-- STORAGE: create bucket for ticket attachments
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'text/plain','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Owners can delete their attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
