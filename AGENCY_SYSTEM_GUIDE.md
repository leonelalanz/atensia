# Sistema de Agencia - Guía Técnica

## Visión General

El sistema de Agencia permite que **Admins** (agencias) registren y gestionen múltiples **clientes** (empresas), cada uno con:
- Sección aislada de tickets
- Control de despliegues en markets
- Plataformas de prueba (TestFlight, TestFairy, etc.)
- Generación de reportes

Los **Developers** pueden trabajar cross-admin, accediendo a todos los clientes de sus admins.

---

## Estructura de Datos

### Relaciones Principales

```
Admin Company (company_id en profile)
    ↓
client_companies (relación N:N)
    ↓
Client Company (empresa del cliente)
    ├── Tickets (aislados por cliente)
    ├── Deployments (despliegues a markets)
    ├── Test Builds (builds para testing)
    └── Reports (reportes del admin)

Developer (company_id puede ser null o flexible)
    ├── Acceso a su company_id
    └── Acceso a todos los client_company_id de los admins
```

### Tablas Nuevas

#### 1. `client_companies`
Relación Admin → Cliente
- `id`: UUID
- `admin_company_id`: UUID (referencia a companies del admin)
- `client_company_id`: UUID (referencia a companies del cliente)
- `client_contact_name`: string
- `client_contact_email`: string
- `client_contact_phone`: string
- `notes`: text
- `status`: 'active' | 'inactive' | 'suspended'

#### 2. `deployment_platforms`
Plataformas disponibles para desplegar
- `id`: UUID
- `name`: string (iOS - App Store, Android - Google Play, Web, etc.)
- `description`: string
- `icon`: string
- `is_active`: boolean

#### 3. `deployments`
Registro de despliegues por cliente
- `id`: UUID
- `client_company_id`: UUID
- `platform_id`: UUID
- `version`: string
- `build_number`: string
- `release_notes`: text
- `status`: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'live' | 'rollback'
- `submitted_by`, `submitted_at`
- `approved_by`, `approved_at`
- `live_at`
- `rollback_at`, `rollback_reason`

#### 4. `test_platforms`
Servicios de testing disponibles
- `id`: UUID
- `name`: string (TestFlight, TestFairy, Firebase Test Lab, etc.)
- `description`: string
- `icon`: string
- `is_active`: boolean

#### 5. `test_builds`
Builds de prueba por cliente
- `id`: UUID
- `client_company_id`: UUID
- `platform_id`: UUID
- `version`: string
- `build_number`: string
- `test_url`: string
- `build_file_url`: string
- `test_notes`: text
- `status`: 'created' | 'distributed' | 'testing' | 'completed' | 'failed' | 'archived'
- `uploaded_by`, `uploaded_at`

#### 6. `reports`
Reportes generados por admins
- `id`: UUID
- `admin_company_id`: UUID
- `client_company_id`: UUID (nullable - null = todos los clientes)
- `title`: string
- `report_type`: 'tickets' | 'deployments' | 'testing' | 'combined' | 'custom'
- `period_start`, `period_end`: date
- `data`: jsonb (datos agregados)
- `generated_by`: UUID

---

## Políticas RLS (Row Level Security)

### Clientes (client_companies)
- **Admin**: Lee sus propios clientes
- **Cliente**: Lee su relación con el admin
- **Developer**: Acceso implícito a través de deployments/test_builds
- **Superadmin**: Lee todos

### Despliegues (deployments)
- **Admin**: Lee despliegues de sus clientes
- **Developer**: Lee despliegues de clientes de su admin
- **Developer**: Crea/actualiza despliegues en clientes de su admin

### Test Builds (test_builds)
- **Admin**: Lee test builds de sus clientes
- **Developer**: Lee test builds de clientes de su admin
- **Developer**: Crea/actualiza test builds en clientes de su admin

### Reportes (reports)
- **Admin**: Lee reportes que generó
- **Admin**: Puede generar reportes de todos sus clientes
- **Superadmin**: Lee todos los reportes

---

## API/Servicios

### Servicios (en `src/lib/`)

#### clientCompanies.ts
```typescript
createClientCompany(adminId, clientData)      // Crear cliente
getAdminClients(adminId)                      // Obtener clientes del admin
getClientCompany(clientId)                    // Obtener un cliente
updateClientCompany(clientId, updates)        // Actualizar cliente
suspendClientCompany(clientId)                // Suspender cliente
reactivateClientCompany(clientId)             // Reactivar cliente
getDeploymentPlatforms()                      // Obtener plataformas de despliegue
getTestPlatforms()                            // Obtener plataformas de test
```

#### deployments.ts
```typescript
createDeployment(deployment)                  // Crear despliegue
getClientDeployments(clientId)               // Obtener despliegues del cliente
getDeployment(deploymentId)                   // Obtener un despliegue
submitDeployment(deploymentId, userId)        // Enviar despliegue
approveDeployment(deploymentId, userId)       // Aprobar despliegue
rejectDeployment(deploymentId, userId)        // Rechazar despliegue
markDeploymentLive(deploymentId)             // Marcar como live
rollbackDeployment(deploymentId, reason)      // Revertir despliegue
updateDeployment(deploymentId, updates)       // Actualizar despliegue
```

#### testBuilds.ts
```typescript
createTestBuild(testBuild)                   // Crear test build
getClientTestBuilds(clientId)                // Obtener test builds del cliente
getTestBuild(testBuildId)                    // Obtener un test build
updateTestBuildStatus(testBuildId, status)   // Actualizar estado
markTestBuildDistributed(testBuildId)        // Marcar distribuido
markTestBuildTesting(testBuildId)            // Marcar testing
markTestBuildCompleted(testBuildId)          // Marcar completado
markTestBuildFailed(testBuildId)             // Marcar fallido
archiveTestBuild(testBuildId)                // Archivar
updateTestBuild(testBuildId, updates)        // Actualizar
deleteTestBuild(testBuildId)                 // Eliminar
```

#### reports.ts
```typescript
createReport(report)                         // Crear reporte
getAdminReports(adminId)                     // Obtener reportes del admin
getReport(reportId)                          // Obtener un reporte
generateTicketReport(...)                    // Generar reporte de tickets
generateDeploymentReport(...)                // Generar reporte de despliegues
generateTestingReport(...)                   // Generar reporte de testing
generateCombinedReport(...)                  // Generar reporte combinado
deleteReport(reportId)                       // Eliminar reporte
```

### Hooks (en `src/lib/hooks/`)

```typescript
useClientCompanies(adminId)      // Manejo de clientes
useDeployments(clientId)         // Manejo de despliegues
useTestBuilds(clientId)          // Manejo de test builds
useReports(adminId, userId)      // Manejo de reportes
```

---

## Páginas/Componentes

### ClientsPage (`/clients`)
- Acceso: **Admin only**
- Funcionalidades:
  - Listar clientes
  - Crear nuevo cliente
  - Ver/editar detalles del cliente
  - Suspender/reactivar cliente

### DeploymentsPage (`/deployments`)
- Acceso: **Admin, Developer**
- Funcionalidades:
  - Seleccionar cliente
  - Listar despliegues del cliente
  - Crear despliegue
  - Cambiar estado (submit, approve, reject, mark live, rollback)
  - Ver detalles del despliegue

### TestBuildsPage (`/test-builds`)
- Acceso: **Admin, Developer**
- Funcionalidades:
  - Seleccionar cliente
  - Listar test builds del cliente
  - Crear test build
  - Cambiar estado (created → testing → completed/failed → archived)
  - Ver URL de test, archivo de build

### ReportsPage (`/reports`)
- Acceso: **Admin only**
- Funcionalidades:
  - Generar reportes (tickets, deployments, testing, combined)
  - Filtrar por cliente (opcional)
  - Rango de fechas
  - Ver detalles del reporte
  - Eliminar reportes

---

## Flujos de Uso

### 1. Admin Creando Cliente
```
1. Admin → Clients page
2. Click "Add Client"
3. Rellena: Company Name, Contact Name, Contact Email, Color
4. Sistema:
   - Crea empresa en `companies` table
   - Crea relación en `client_companies`
   - Crea políticas SLA por defecto
```

### 2. Developer Registrando Despliegue
```
1. Dev → Deployments page
2. Selecciona cliente
3. Click "New Deployment"
4. Rellena: Platform, Version, Build Number, Release Notes
5. Sistema:
   - Crea deployment en status 'draft'
   - Dev puede editar antes de submeter
6. Dev click "Submit"
7. Admin recibe notificación
8. Admin "Approve" o "Reject"
9. Si aprobado, Dev puede "Mark Live"
```

### 3. Developer Subiendo Test Build
```
1. Dev → Test Builds page
2. Selecciona cliente
3. Click "Upload Test Build"
4. Rellena: Platform (TestFlight/TestFairy), Version, Build Number
5. Agrega URL de test y archivo de build
6. Sistema:
   - Crea test_build en status 'created'
   - Dev puede distribuir y marcar testing
   - Dev marca como completed/failed
```

### 4. Admin Generando Reporte
```
1. Admin → Reports page
2. Click "Generate Report"
3. Selecciona:
   - Tipo de reporte (Tickets, Deployments, Testing, Combined)
   - Cliente (opcional - todos si deja en blanco)
   - Rango de fechas (últimos 30 días por defecto)
4. Sistema:
   - Agrega datos relevantes en DB
   - Agregación automática (por status, prioridad, etc)
   - Genera reporte con datos JSON
5. Admin puede ver reporte y eliminarlo después
```

---

## Seguridad

### Control de Acceso
- **Admin** solo ve sus clientes y despliegues
- **Developer** solo ve clientes de su admin, pero puede actuar en todos
- **Agent** no tiene acceso a agencia features
- **Superadmin** acceso total (débuggin/management)

### RLS Policies
Todas las operaciones están protegidas por RLS policies en Supabase.
- Lectura: Solo datos de acceso permitido
- Escritura: Solo si es propietario/admin del recurso
- Cross-admin: Solo developers pueden acceder clientes de otros admins

### Validación
- Frontend: React form validation
- Backend: RLS policies + tipos TypeScript
- Business logic: Validaciones en servicios

---

## Migraciones SQL

Archivo: `supabase/migrations/20260608000001_add_agency_structure.sql`

Contiene:
- Creación de 6 nuevas tablas
- RLS policies para cada tabla
- Índices para performance
- Funciones helper:
  - `get_my_clients()`: Obtener clientes del admin actual
  - `get_dev_accessible_companies()`: Obtener empresas accesibles para dev

---

## Testing

### Casos de prueba recomendados:
1. Admin crea cliente → verify en DB
2. Dev ve cliente del admin → verify RLS
3. Dev crea despliegue → verify belong a cliente correcto
4. Admin aprueba despliegue → verify cambio de estado
5. Dev genera reporte → verify datos agregados correctos
6. Cross-admin isolation → verify dev no ve clientes de otro admin

---

## Próximos Pasos Recomendados

1. **Notificaciones**
   - Admin recibe notificación cuando dev submete despliegue
   - Dev recibe notificación cuando despliegue es aprobado/rechazado

2. **Auditoría**
   - Log de cambios en deployments/test_builds
   - Quién hizo qué y cuándo

3. **Integración de APIs**
   - Conectar con App Store, Google Play APIs
   - Conectar con TestFlight, TestFairy APIs

4. **Webhooks**
   - Notificación cuando app va live
   - Integración con Slack/Teams

5. **Dashboard mejorado**
   - Estadísticas por cliente
   - Tendencias de despliegues
   - Health checks

6. **Roles más granulares**
   - QA roles (solo pueden marcar test como completed/failed)
   - Release manager (solo pueden aprobar despliegues)
