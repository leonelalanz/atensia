
/*
  # Datos de Prueba — IncidentDesk

  Crea usuarios de prueba para los 4 roles y datos de demostración completos.

  ## Credenciales de prueba
  - superadmin@incidentdesk.com / Test1234!  (SuperAdmin)
  - admin@acmecorp.com           / Test1234!  (Admin — ACME Corp)
  - agente@acmecorp.com          / Test1234!  (Agente — ACME Corp)
  - dev@acmecorp.com             / Test1234!  (Desarrollador — ACME Corp)

  ## Datos creados
  - 2 empresas con suscripciones
  - 4 perfiles de usuario
  - Políticas SLA para ACME Corp
  - 10 tickets con distintas prioridades y estados
  - Registros SLA por ticket
  - 12 comentarios
  - Historial de cambios
  - 8 registros de actividad de desarrollador
*/

DO $$
DECLARE
  v_sa_id      uuid := '11111111-1111-1111-1111-111111111111';
  v_admin_id   uuid := '22222222-2222-2222-2222-222222222222';
  v_agent_id   uuid := '33333333-3333-3333-3333-333333333333';
  v_dev_id     uuid := '44444444-4444-4444-4444-444444444444';

  v_company1   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_company2   uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  v_pwd        text;

  v_t1  uuid := gen_random_uuid();
  v_t2  uuid := gen_random_uuid();
  v_t3  uuid := gen_random_uuid();
  v_t4  uuid := gen_random_uuid();
  v_t5  uuid := gen_random_uuid();
  v_t6  uuid := gen_random_uuid();
  v_t7  uuid := gen_random_uuid();
  v_t8  uuid := gen_random_uuid();
  v_t9  uuid := gen_random_uuid();
  v_t10 uuid := gen_random_uuid();
BEGIN
  v_pwd := crypt('Test1234!', gen_salt('bf'));

  -- ============================================================
  -- AUTH USERS (idempotent: skip if already exists)
  -- ============================================================
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone, phone_change, phone_change_token, email_change_token_current,
    email_change_confirm_status
  ) VALUES
  (
    '00000000-0000-0000-0000-000000000000', v_sa_id, 'authenticated', 'authenticated',
    'superadmin@incidentdesk.com', v_pwd,
    now(), '{"provider":"email","providers":["email"]}', '{}',
    false, now(), now(), '', '', '', '', null, '', '', '', 0
  ),
  (
    '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
    'admin@acmecorp.com', v_pwd,
    now(), '{"provider":"email","providers":["email"]}', '{}',
    false, now(), now(), '', '', '', '', null, '', '', '', 0
  ),
  (
    '00000000-0000-0000-0000-000000000000', v_agent_id, 'authenticated', 'authenticated',
    'agente@acmecorp.com', v_pwd,
    now(), '{"provider":"email","providers":["email"]}', '{}',
    false, now(), now(), '', '', '', '', null, '', '', '', 0
  ),
  (
    '00000000-0000-0000-0000-000000000000', v_dev_id, 'authenticated', 'authenticated',
    'dev@acmecorp.com', v_pwd,
    now(), '{"provider":"email","providers":["email"]}', '{}',
    false, now(), now(), '', '', '', '', null, '', '', '', 0
  )
  ON CONFLICT (id) DO NOTHING;

  -- Identities needed for email login
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES
  (v_sa_id::text,    v_sa_id,    jsonb_build_object('sub', v_sa_id::text,    'email', 'superadmin@incidentdesk.com'), 'email', now(), now(), now()),
  (v_admin_id::text, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@acmecorp.com'),          'email', now(), now(), now()),
  (v_agent_id::text, v_agent_id, jsonb_build_object('sub', v_agent_id::text, 'email', 'agente@acmecorp.com'),         'email', now(), now(), now()),
  (v_dev_id::text,   v_dev_id,   jsonb_build_object('sub', v_dev_id::text,   'email', 'dev@acmecorp.com'),            'email', now(), now(), now())
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- COMPANIES
  -- ============================================================
  INSERT INTO companies (id, name, logo_url, primary_color, plan, status, maintenance_mode)
  VALUES
  (v_company1, 'ACME Corporation', '', '#2563eb', 'professional', 'active', false),
  (v_company2, 'TechStart SRL',    '', '#0d9488', 'basic',        'active', false)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- SUBSCRIPTIONS
  -- ============================================================
  INSERT INTO subscriptions (company_id, plan, status, start_date, end_date, amount, currency)
  VALUES
  (v_company1, 'professional', 'active', '2025-01-01', '2026-01-01', 299.00, 'USD'),
  (v_company2, 'basic',        'trial',  '2026-03-01', '2026-04-30',  49.00, 'USD')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- PROFILES
  -- ============================================================
  INSERT INTO profiles (id, company_id, full_name, email, role, avatar_emoji, avatar_color, is_active)
  VALUES
  (v_sa_id,    null,       'Carlos Mendoza',   'superadmin@incidentdesk.com', 'superadmin', '🦁', '#dc2626', true),
  (v_admin_id, v_company1, 'Laura García',     'admin@acmecorp.com',          'admin',      '👩‍💼', '#2563eb', true),
  (v_agent_id, v_company1, 'Pedro Ramírez',    'agente@acmecorp.com',         'agent',      '🧑‍🔧', '#0891b2', true),
  (v_dev_id,   v_company1, 'Sofía Torres',     'dev@acmecorp.com',            'developer',  '👩‍💻', '#16a34a', true)
  ON CONFLICT (id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    email        = EXCLUDED.email,
    role         = EXCLUDED.role,
    avatar_emoji = EXCLUDED.avatar_emoji,
    avatar_color = EXCLUDED.avatar_color;

  -- ============================================================
  -- SLA POLICIES — ACME Corp
  -- ============================================================
  INSERT INTO sla_policies (company_id, priority, first_response_hours, resolution_hours)
  VALUES
  (v_company1, 'critical', 1,  4),
  (v_company1, 'high',     4,  8),
  (v_company1, 'medium',   8,  24),
  (v_company1, 'low',      24, 72)
  ON CONFLICT (company_id, priority) DO NOTHING;

  -- ============================================================
  -- TICKETS
  -- ============================================================
  INSERT INTO tickets (id, company_id, title, description, priority, category, status, created_by, assigned_to, created_at, updated_at, resolved_at)
  VALUES
  (v_t1,  v_company1, 'Servidor de producción caído',
   'El servidor principal de producción no responde desde las 03:15 AM. Todos los servicios están inaccesibles. Necesitamos restaurar el servicio urgentemente.',
   'critical', 'bug', 'in_progress', v_agent_id, v_dev_id,
   now() - interval '2 hours', now() - interval '30 minutes', null),

  (v_t2,  v_company1, 'Error 500 en módulo de pagos',
   'Los usuarios reportan un error 500 al intentar completar compras. El módulo de pagos falla intermitentemente desde la última actualización.',
   'high', 'bug', 'open', v_agent_id, v_dev_id,
   now() - interval '5 hours', now() - interval '5 hours', null),

  (v_t3,  v_company1, 'Acceso denegado al panel de reportes',
   'El usuario gerente@acme.com no puede acceder al panel de reportes. Recibe el mensaje "Acceso denegado" aunque tiene el rol correcto.',
   'high', 'soporte', 'in_progress', v_admin_id, v_agent_id,
   now() - interval '1 day', now() - interval '4 hours', null),

  (v_t4,  v_company1, 'Solicitud: Exportar datos a Excel',
   'Necesitamos poder exportar los reportes de ventas mensuales directamente a Excel. Actualmente solo disponemos de PDF.',
   'medium', 'solicitud', 'open', v_agent_id, null,
   now() - interval '2 days', now() - interval '2 days', null),

  (v_t5,  v_company1, 'Lentitud extrema en búsquedas',
   'Las búsquedas en el catálogo de productos toman más de 30 segundos. Los usuarios están abandonando la plataforma por este problema.',
   'high', 'bug', 'resolved', v_admin_id, v_dev_id,
   now() - interval '3 days', now() - interval '1 day',
   now() - interval '1 day'),

  (v_t6,  v_company1, 'Actualizar términos y condiciones',
   'Se requiere actualizar el texto de los términos y condiciones según las nuevas regulaciones de protección de datos.',
   'low', 'solicitud', 'open', v_admin_id, v_agent_id,
   now() - interval '4 days', now() - interval '4 days', null),

  (v_t7,  v_company1, 'Consulta: Configuración de notificaciones',
   '¿Cómo puedo configurar las notificaciones por email para recibir alertas solo de tickets críticos?',
   'low', 'consulta', 'closed', v_agent_id, v_agent_id,
   now() - interval '6 days', now() - interval '5 days',
   now() - interval '5 days'),

  (v_t8,  v_company1, 'Imagen de perfil no se actualiza',
   'Al intentar cambiar la foto de perfil, el sistema muestra el mensaje de éxito pero la imagen no se actualiza. Se mantiene la imagen anterior.',
   'medium', 'bug', 'open', v_agent_id, v_dev_id,
   now() - interval '1 day', now() - interval '1 day', null),

  (v_t9,  v_company1, 'Integración con sistema de facturación',
   'Requerimos integrar la plataforma con nuestro sistema de facturación SAP. Necesitamos sincronización bidireccional en tiempo real.',
   'medium', 'solicitud', 'in_progress', v_admin_id, v_dev_id,
   now() - interval '7 days', now() - interval '2 days', null),

  (v_t10, v_company1, 'Errores en importación masiva de usuarios',
   'Al importar el CSV con más de 1000 usuarios, el proceso falla en el registro 847. El error indica "duplicate key value violates unique constraint".',
   'critical', 'bug', 'open', v_admin_id, v_dev_id,
   now() - interval '3 hours', now() - interval '3 hours', null)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- SLA RECORDS
  -- ============================================================
  INSERT INTO sla_records (ticket_id, first_response_deadline, resolution_deadline, first_response_met, resolution_met, first_responded_at)
  VALUES
  -- T1 Critical: 1h resp, 4h res — vencido (creado hace 2h, 4h resolución)
  (v_t1,  now() - interval '1 hour',   now() + interval '2 hours',  true,  null, now() - interval '90 minutes'),
  -- T2 High: 4h resp, 8h res — primera respuesta vencida
  (v_t2,  now() - interval '1 hour',   now() + interval '3 hours',  false, null, null),
  -- T3 High: en riesgo
  (v_t3,  now() + interval '3 hours',  now() + interval '7 hours',  true,  null, now() - interval '20 hours'),
  -- T4 Medium: pendiente
  (v_t4,  now() + interval '6 hours',  now() + interval '22 hours', null,  null, null),
  -- T5 High: resuelto y cumplido
  (v_t5,  now() - interval '71 hours', now() - interval '67 hours', true,  true, now() - interval '72 hours'),
  -- T6 Low: pendiente
  (v_t6,  now() + interval '20 hours', now() + interval '68 hours', null,  null, null),
  -- T7 Low: cerrado cumplido
  (v_t7,  now() - interval '137 hours',now() - interval '113 hours',true,  true, now() - interval '143 hours'),
  -- T8 Medium: en riesgo
  (v_t8,  now() + interval '7 hours',  now() + interval '23 hours', null,  null, null),
  -- T9 Medium: primera respuesta realizada
  (v_t9,  now() - interval '159 hours',now() - interval '143 hours',true,  null, now() - interval '166 hours'),
  -- T10 Critical: recién creado, en cuenta regresiva
  (v_t10, now() - interval '2 hours',  now() + interval '1 hour',   false, null, null)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- TICKET COMMENTS
  -- ============================================================
  INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal, created_at)
  VALUES
  (v_t1, v_dev_id,   'Me conecto al servidor ahora. El proceso nginx parece haber fallado. Intentando reiniciar.', false, now() - interval '90 minutes'),
  (v_t1, v_dev_id,   'Reinicio de nginx exitoso. El servidor está respondiendo. Monitoreando para confirmar estabilidad.', false, now() - interval '60 minutes'),
  (v_t1, v_admin_id, 'Revisar los logs para identificar la causa raíz antes de marcar como resuelto.', true,  now() - interval '45 minutes'),

  (v_t2, v_agent_id, 'Confirmo el error. Se reproduce en todos los navegadores. El endpoint /api/payments/checkout devuelve 500.', false, now() - interval '4 hours'),
  (v_t2, v_dev_id,   'Revisando los logs de la API. Parece ser un problema de timeout con el proveedor de pagos.', false, now() - interval '3 hours'),

  (v_t3, v_admin_id, 'El usuario tiene el rol correcto en base de datos. Parece un problema de caché de sesión.', true,  now() - interval '22 hours'),
  (v_t3, v_agent_id, 'Solicité al usuario que cierre sesión y vuelva a iniciar. Pendiente de confirmación.', false, now() - interval '4 hours'),

  (v_t5, v_dev_id,   'El problema era una consulta SQL sin índice en la tabla products (50M registros). Se agregó índice compuesto.', false, now() - interval '26 hours'),
  (v_t5, v_admin_id, 'Las búsquedas ahora responden en menos de 200ms. Excelente trabajo.', false, now() - interval '25 hours'),

  (v_t9, v_dev_id,   'Documentación de la API SAP recibida. Iniciando desarrollo del conector.', false, now() - interval '5 days'),
  (v_t9, v_admin_id, '¿Cuándo estima tener el primer prototipo funcional?', false, now() - interval '4 days'),
  (v_t9, v_dev_id,   'Estimado: 3 días más para el MVP de sincronización unidireccional.', false, now() - interval '4 days')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- TICKET HISTORY
  -- ============================================================
  INSERT INTO ticket_history (ticket_id, user_id, field_changed, old_value, new_value, created_at)
  VALUES
  (v_t1,  v_admin_id, 'assigned_to', '',           v_dev_id::text,     now() - interval '115 minutes'),
  (v_t1,  v_admin_id, 'status',      'open',        'in_progress',      now() - interval '115 minutes'),
  (v_t3,  v_admin_id, 'assigned_to', '',            v_agent_id::text,   now() - interval '23 hours'),
  (v_t3,  v_admin_id, 'status',      'open',        'in_progress',      now() - interval '4 hours'),
  (v_t5,  v_dev_id,   'status',      'in_progress', 'resolved',         now() - interval '25 hours'),
  (v_t5,  v_admin_id, 'priority',    'critical',    'high',             now() - interval '2 days 12 hours'),
  (v_t7,  v_agent_id, 'status',      'in_progress', 'resolved',         now() - interval '5 days 2 hours'),
  (v_t7,  v_agent_id, 'status',      'resolved',    'closed',           now() - interval '5 days'),
  (v_t9,  v_admin_id, 'assigned_to', '',            v_dev_id::text,     now() - interval '6 days 23 hours'),
  (v_t9,  v_admin_id, 'status',      'open',        'in_progress',      now() - interval '6 days')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- ACTIVITY LOGS (Desarrollador — Sofía Torres)
  -- ============================================================
  INSERT INTO activity_logs (user_id, company_id, date, description, hours_spent, ticket_id, created_at)
  VALUES
  (v_dev_id, v_company1, CURRENT_DATE,
   'Diagnóstico y resolución de caída del servidor de producción. Revisión de logs de nginx y reinicio del servicio.',
   2.5, v_t1, now() - interval '1 hour'),

  (v_dev_id, v_company1, CURRENT_DATE,
   'Investigación del error 500 en módulo de pagos. Análisis de trazas en Sentry y logs de la API de pagos.',
   1.5, v_t2, now() - interval '30 minutes'),

  (v_dev_id, v_company1, CURRENT_DATE - 1,
   'Desarrollo de conector SAP: implementación de autenticación OAuth2 y primeras llamadas a la API.',
   4.0, v_t9, now() - interval '1 day 2 hours'),

  (v_dev_id, v_company1, CURRENT_DATE - 1,
   'Reunión de sincronización con el equipo. Revisión de pendientes de la semana y planificación.',
   1.0, null, now() - interval '1 day 9 hours'),

  (v_dev_id, v_company1, CURRENT_DATE - 2,
   'Optimización de consultas SQL en módulo de búsqueda. Creación de índices compuestos en tabla products.',
   3.0, v_t5, now() - interval '2 days 3 hours'),

  (v_dev_id, v_company1, CURRENT_DATE - 2,
   'Revisión y merge de PRs pendientes. Code review del módulo de usuarios.',
   2.0, null, now() - interval '2 days 6 hours'),

  (v_dev_id, v_company1, CURRENT_DATE - 3,
   'Investigación de error en importación masiva de usuarios. Identificado problema de keys duplicadas en CSV.',
   2.5, v_t10, now() - interval '3 days 1 hour'),

  (v_dev_id, v_company1, CURRENT_DATE - 3,
   'Documentación técnica de la integración SAP y diagramas de arquitectura del conector.',
   2.0, v_t9, now() - interval '3 days 4 hours')
  ON CONFLICT DO NOTHING;

END $$;
