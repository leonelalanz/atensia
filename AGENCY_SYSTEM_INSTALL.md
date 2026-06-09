# Sistema de Agencia - Guía de Instalación

## Pasos para Activar el Sistema de Agencia

### 1. Aplicar las Migraciones SQL

```bash
# En tu proyecto Supabase local o remoto
supabase db push
```

O manualmente:
```sql
-- Ejecuta el contenido de:
supabase/migrations/20260608000001_add_agency_structure.sql
```

Esta migración:
- ✅ Crea 6 nuevas tablas
- ✅ Establece RLS policies
- ✅ Crea índices para performance
- ✅ Crea funciones helper SQL

### 2. Verificar Tablas en Supabase

En el dashboard de Supabase, verifica que existan:
- ✅ `client_companies`
- ✅ `deployment_platforms` (con datos precargados)
- ✅ `deployments`
- ✅ `test_platforms` (con datos precargados)
- ✅ `test_builds`
- ✅ `reports`

### 3. Dependencias npm (si es necesario)

```bash
npm install
# Los siguientes ya deberían estar instalados:
# - lucide-react (para iconos)
# - @supabase/supabase-js (para DB)
```

### 4. Archivos Creados/Modificados

#### Archivos Nuevos:
```
✅ supabase/migrations/20260608000001_add_agency_structure.sql
✅ src/lib/clientCompanies.ts
✅ src/lib/deployments.ts
✅ src/lib/testBuilds.ts
✅ src/lib/reports.ts
✅ src/lib/hooks/index.ts
✅ src/lib/hooks/useClientCompanies.ts
✅ src/lib/hooks/useDeployments.ts
✅ src/lib/hooks/useTestBuilds.ts
✅ src/lib/hooks/useReports.ts
✅ src/pages/clients/ClientsPage.tsx
✅ src/pages/deployments/DeploymentsPage.tsx
✅ src/pages/testBuilds/TestBuildsPage.tsx
✅ src/pages/reports/ReportsPage.tsx
✅ AGENCY_SYSTEM_GUIDE.md
✅ AGENCY_SYSTEM_INSTALL.md
```

#### Archivos Modificados:
```
✅ src/types/index.ts (nuevas interfaces)
✅ src/contexts/RouterContext.tsx (nuevas rutas)
✅ src/App.tsx (imports y renderizado)
✅ src/components/layout/Sidebar.tsx (nuevos menu items)
```

### 5. Verificar Permisos de Roles

En Supabase RLS, verifica que:

#### Admin puede:
- ✅ Ver sus clientes
- ✅ Crear nuevos clientes
- ✅ Ver despliegues de sus clientes
- ✅ Ver test builds de sus clientes
- ✅ Generar reportes

#### Developer puede:
- ✅ Ver clientes de su admin
- ✅ Crear despliegues
- ✅ Crear test builds
- ✅ NO puede generar reportes

#### Agent/Superadmin:
- ✅ Agent: Sin acceso a agencia features
- ✅ Superadmin: Acceso total (debug)

### 6. Testear Localmente

```bash
npm run dev
```

#### Test como Admin:
1. Login como admin
2. Sidebar debe mostrar: "Clientes", "Despliegues", "Test Builds", "Reportes"
3. Click en "Clientes" → Crear cliente
4. Click en "Despliegues" → Seleccionar cliente → Crear despliegue
5. Click en "Test Builds" → Crear test build
6. Click en "Reportes" → Generar reporte

#### Test como Developer:
1. Login como developer
2. Sidebar debe mostrar: "Despliegues", "Test Builds"
3. NO debe mostrar: "Clientes", "Reportes"
4. Click en "Despliegues" → Ver clientes de su admin

#### Test como Agent:
1. Login como agent
2. NO debe ver ninguno de los nuevos menús
3. Solo debe ver: Tickets, Configuración, etc.

### 7. Verificar Datos en DB

```sql
-- Verificar clientes creados
SELECT * FROM client_companies;

-- Verificar despliegues
SELECT d.*, p.name as platform_name 
FROM deployments d 
LEFT JOIN deployment_platforms p ON d.platform_id = p.id;

-- Verificar test builds
SELECT t.*, tp.name as platform_name 
FROM test_builds t 
LEFT JOIN test_platforms tp ON t.platform_id = tp.id;

-- Verificar reportes
SELECT * FROM reports;
```

### 8. Problemas Comunes

#### "Permission denied" al crear cliente
- Verifica que el usuario sea admin
- Verifica RLS policies en Supabase
- Check: `client_companies_admin_insert` policy

#### "No deployment platforms found"
- La migración debe haber ejecutado los INSERTs
- Ejecuta manualmente:
```sql
INSERT INTO deployment_platforms (name, description) VALUES
  ('iOS - App Store', 'Apple App Store'),
  ('Android - Google Play', 'Google Play Store'),
  ('Web', 'Web application'),
  ('Web - PWA', 'Progressive Web App'),
  ('macOS - App Store', 'macOS App Store'),
  ('Windows', 'Windows application'),
  ('Linux', 'Linux application')
ON CONFLICT DO NOTHING;

INSERT INTO test_platforms (name, description) VALUES
  ('TestFlight', 'Apple TestFlight for iOS'),
  ('TestFairy', 'TestFairy for mobile testing'),
  ('Firebase Test Lab', 'Google Firebase Test Lab for Android'),
  ('Appetize', 'Cloud-based mobile app testing'),
  ('BrowserStack', 'Cloud browser and device testing'),
  ('Internal Testing', 'Internal QA testing')
ON CONFLICT DO NOTHING;
```

#### "Developer can't see client's deployments"
- Verifica que el developer esté en una company que sea admin
- O que el developer esté en una company que sea cliente de su admin
- Debug: Ejecuta `select get_dev_accessible_companies();`

---

## Configuración Avanzada

### Customizar Plataformas de Despliegue

Agregar nueva plataforma:
```sql
INSERT INTO deployment_platforms (name, description, icon) VALUES
  ('Mi App', 'Mi custom app store', '🚀')
ON CONFLICT (name) DO NOTHING;
```

### Customizar Plataformas de Test

```sql
INSERT INTO test_platforms (name, description) VALUES
  ('Mi Test Service', 'Descripción')
ON CONFLICT (name) DO NOTHING;
```

### Desactivar Plataforma

```sql
UPDATE deployment_platforms SET is_active = false WHERE name = 'Mi Plataforma';
```

---

## Rollback (si es necesario)

Para revertir el sistema de agencia:

```sql
-- Eliminar tablas (cuidado: elimina todos los datos)
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS test_builds;
DROP TABLE IF EXISTS test_platforms;
DROP TABLE IF EXISTS deployments;
DROP TABLE IF EXISTS deployment_platforms;
DROP TABLE IF EXISTS client_companies;

-- Eliminar funciones
DROP FUNCTION IF EXISTS get_my_clients();
DROP FUNCTION IF EXISTS get_dev_accessible_companies();
```

O en Supabase CLI:
```bash
supabase db reset
```

---

## Performance

### Índices Creados
- `idx_client_companies_admin`
- `idx_client_companies_client`
- `idx_deployments_client`
- `idx_deployments_platform`
- `idx_deployments_status`
- `idx_deployments_created`
- `idx_test_builds_client`
- `idx_test_builds_platform`
- `idx_test_builds_status`
- `idx_reports_admin`
- `idx_reports_client`
- `idx_reports_created`

Estos índices aseguran que las queries sean rápidas incluso con muchos datos.

---

## Documentación Relacionada

- `AGENCY_SYSTEM_GUIDE.md` - Guía técnica completa
- `src/lib/` - Servicios y lógica de negocio
- `src/pages/` - Componentes y UI
- `src/types/index.ts` - Interfaces TypeScript

---

## Soporte

Si tienes problemas:
1. Revisa los logs de Supabase
2. Verifica que todas las migraciones se aplicaron
3. Prueba las queries SQL manualmente
4. Revisa el navegador dev tools (Network/Console)
5. Confirma que tienes permisos correctos de usuario
