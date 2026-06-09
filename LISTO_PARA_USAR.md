# ✅ SISTEMA DE AGENCIA - LISTO PARA USAR

## Lo Que Tienes

### Módulos en Español ✅
- `src/lib/clientes.ts` - Gestionar clientes
- `src/lib/despliegues.ts` - Registrar despliegues
- `src/lib/testsBuilds.ts` - Subir test builds
- `src/lib/reportes.ts` - Generar reportes

### Páginas React en Español ✅
- `src/pages/agencia/PaginaClientes.tsx` - Crear/ver/suspender clientes
- `src/pages/agencia/PaginaDespliegues.tsx` - Crear/aprobar despliegues
- `src/pages/agencia/PaginaTestBuilds.tsx` - Subir/gestionar test builds
- `src/pages/agencia/PaginaReportes.tsx` - Generar reportes

### Base de Datos ✅
- Migración: `supabase/migrations/20260608000001_add_agency_structure.sql`
- 6 tablas nuevas listas
- RLS configurado

---

## Cómo Activar

### 1. Aplicar Migración
```bash
supabase db push
```

### 2. Agregar las Páginas a la App

Edita `src/App.tsx` y agrega:

```typescript
import PaginaClientes from './pages/agencia/PaginaClientes';
import PaginaDespliegues from './pages/agencia/PaginaDespliegues';
import PaginaTestBuilds from './pages/agencia/PaginaTestBuilds';
import PaginaReportes from './pages/agencia/PaginaReportes';

function renderPage() {
  switch (route) {
    // ... casos existentes
    case 'clientes': return role === 'admin' ? <PaginaClientes /> : <DashboardPage />;
    case 'despliegues': return (role === 'admin' || role === 'developer') ? <PaginaDespliegues /> : <DashboardPage />;
    case 'testbuilds': return (role === 'admin' || role === 'developer') ? <PaginaTestBuilds /> : <DashboardPage />;
    case 'reportes': return role === 'admin' ? <PaginaReportes /> : <DashboardPage />;
    // ...
  }
}
```

### 3. Agregar Rutas

Edita `src/contexts/RouterContext.tsx`:

```typescript
const ROUTE_TO_PATH: Record<Route, string> = {
  // ... rutas existentes
  'clientes': '/clientes',
  'despliegues': '/despliegues',
  'testbuilds': '/testbuilds',
  'reportes': '/reportes',
};

// En pathToRoute():
if (pathname === '/clientes') return { route: 'clientes', params: {} };
if (pathname === '/despliegues') return { route: 'despliegues', params: {} };
if (pathname === '/testbuilds') return { route: 'testbuilds', params: {} };
if (pathname === '/reportes') return { route: 'reportes', params: {} };
```

### 4. Agregar al Sidebar

Edita `src/components/layout/Sidebar.tsx`:

```typescript
const NAV_ITEMS: NavItem[] = [
  // ... items existentes
  { label: 'Clientes', icon: Building2, route: 'clientes', roles: ['admin'] },
  { label: 'Despliegues', icon: Rocket, route: 'despliegues', roles: ['admin', 'developer'] },
  { label: 'Test Builds', icon: Package, route: 'testbuilds', roles: ['admin', 'developer'] },
  { label: 'Reportes', icon: BarChart3, route: 'reportes', roles: ['admin'] },
];
```

### 5. Actualizar Types

Edita `src/types/index.ts` y agrega a `Route`:

```typescript
export type Route =
  | // ... rutas existentes
  | 'clientes'
  | 'despliegues'
  | 'testbuilds'
  | 'reportes';
```

### 6. Ejecutar

```bash
npm run dev
```

---

## Cómo Usar

### Admin - Crear Cliente
1. Login como admin
2. Sidebar → "Clientes"
3. Click "+ Agregar Cliente"
4. Rellena: Nombre, Contacto, Email, Color
5. Click "Crear Cliente"
6. ✅ Cliente registrado en BD

### Developer - Crear Despliegue
1. Login como developer
2. Sidebar → "Despliegues"
3. Selecciona cliente
4. Click "+ Nuevo Despliegue"
5. Rellena: Plataforma, Versión, Build #, Notas
6. Click "Crear"
7. ✅ Despliegue en estado "draft"

### Developer - Enviar Despliegue
1. En la lista de despliegues, ve uno en estado "draft"
2. Click "Enviar"
3. ✅ Cambia a estado "submitted"
4. Admin recibe notificación (próxima feature)

### Admin - Aprobar Despliegue
1. Ve despliegues enviados (status "submitted")
2. Click "Aprobar" o "Rechazar"
3. ✅ Cambia estado

### Developer - Subir Test Build
1. Sidebar → "Test Builds"
2. Selecciona cliente
3. Click "+ Subir Test Build"
4. Rellena datos: Plataforma, Versión, Build #, URLs
5. Click "Subir"
6. ✅ Test build creado

### Developer - Cambiar Estado Test Build
1. Click "Probando" → "Completado" o "Fallido"
2. ✅ Estado actualizado en BD

### Admin - Generar Reporte
1. Sidebar → "Reportes"
2. Click "+ Generar Reporte"
3. Selecciona:
   - Tipo: Tickets / Despliegues / Testing
   - Cliente: (opcional - vacío = todos)
   - Fechas: Inicio y Fin
4. Click "Generar"
5. ✅ Reporte creado con datos agregados
6. Click en reporte para ver detalles

---

## Estructura de BD Que Se Usa

### client_companies
Relación Admin → Cliente
```
id, admin_company_id, client_company_id, 
client_contact_name, client_contact_email, status
```

### deployments
Despliegues de cada cliente
```
id, client_company_id, platform_id, version, 
build_number, status, submitted_at, approved_at, live_at
```

### test_builds
Test builds de cada cliente
```
id, client_company_id, platform_id, version, 
build_number, test_url, status, uploaded_by
```

### reports
Reportes generados
```
id, admin_company_id, client_company_id, title, 
report_type, period_start, period_end, data (JSON)
```

---

## Seguridad Automática (RLS)

- ✅ Admin solo ve sus clientes
- ✅ Developer puede ver clientes de su admin
- ✅ Agent sin acceso a agencia
- ✅ Superadmin acceso total

---

## ¿Qué Falta? (No es Bloqueante)

- ❌ Notificaciones en tiempo real
- ❌ Integración con App Store/Google Play
- ❌ Webhooks
- ❌ Tests unitarios
- ❌ Exportación de reportes

Se puede agregar después si se necesita.

---

## Resumen

**Tienes un sistema completo y funcional en español que:**
- ✅ Registra clientes
- ✅ Registra despliegues
- ✅ Registra test builds
- ✅ Genera reportes con datos agregados
- ✅ Todo guardado en BD
- ✅ Seguridad con RLS

**Próximo paso: Agregar las páginas a tu app.**

¿Necesitas algo más?
