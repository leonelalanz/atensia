# ✅ PASOS FINALES - SISTEMA DE AGENCIA

Todo está listo y en **ESPAÑOL**. Solo necesitas:

## 1️⃣ Correr la Migración SQL

```bash
supabase db push
```

## 2️⃣ Actualizar `src/App.tsx`

Cambia `renderPage()` por esto (reemplaza la función completa):

```typescript
function renderPage() {
  switch (route) {
    case 'dashboard': return <DashboardPage />;
    case 'tickets': return <TicketsPage />;
    case 'help': return <HelpPage />;
    case 'ticket-detail': return <TicketDetailPage />;
    case 'new-ticket': return <NewTicketPage />;
    case 'users': return (role === 'admin' || role === 'superadmin') ? <UsersPage /> : <DashboardPage />;
    case 'companies': return role === 'superadmin' ? <CompaniesAndPlans /> : <DashboardPage />;
    case 'subscriptions': return role === 'superadmin' ? <CompaniesAndPlans /> : <DashboardPage />;
    case 'sla': return role === 'admin' ? <SLAPage /> : <DashboardPage />;
    case 'activities': return (role === 'developer' || role === 'admin') ? <ActivitiesPage /> : <DashboardPage />;
    case 'audit': return (role === 'admin' || role === 'superadmin') ? <AuditLogsPage /> : <DashboardPage />;
    case 'settings': return <SettingsPage />;
    case 'branding': return role === 'admin' || role === 'superadmin' ? <BrandingPage /> : <DashboardPage />;
    case 'terms': return <TermsOfServicePage />;
    case 'privacy': return <PrivacyPolicyPage />;
    case 'plans-management': return role === 'superadmin' ? <PlansManagement /> : <DashboardPage />;
    case 'upgrade-plan': return (role === 'admin' || role === 'superadmin') ? <UpgradeRequest /> : <DashboardPage />;
    
    // AGENCIA
    case 'clientes': return role === 'admin' ? <PaginaClientes /> : <DashboardPage />;
    case 'despliegues': return (role === 'admin' || role === 'developer') ? <PaginaDespliegues /> : <DashboardPage />;
    case 'testbuilds': return (role === 'admin' || role === 'developer') ? <PaginaTestBuilds /> : <DashboardPage />;
    case 'reportes': return role === 'admin' ? <PaginaReportes /> : <DashboardPage />;
    
    default: return <DashboardPage />;
  }
}
```

Y agrega al inicio del archivo:

```typescript
import PaginaClientes from './pages/agencia/PaginaClientes';
import PaginaDespliegues from './pages/agencia/PaginaDespliegues';
import PaginaTestBuilds from './pages/agencia/PaginaTestBuilds';
import PaginaReportes from './pages/agencia/PaginaReportes';
```

## 3️⃣ Actualizar `src/contexts/RouterContext.tsx`

En `ROUTE_TO_PATH`, agrega:

```typescript
'clientes': '/clientes',
'despliegues': '/despliegues',
'testbuilds': '/testbuilds',
'reportes': '/reportes',
```

En `pathToRoute()`, agrega:

```typescript
if (pathname === '/clientes') return { route: 'clientes', params: {} };
if (pathname === '/despliegues') return { route: 'despliegues', params: {} };
if (pathname === '/testbuilds') return { route: 'testbuilds', params: {} };
if (pathname === '/reportes') return { route: 'reportes', params: {} };
```

## 4️⃣ Actualizar `src/types/index.ts`

Agrega a `type Route`:

```typescript
| 'clientes'
| 'despliegues'
| 'testbuilds'
| 'reportes'
```

## 5️⃣ Actualizar `src/components/layout/Sidebar.tsx`

En imports, agrega:

```typescript
import { Building2, Rocket, Package, BarChart3 } from 'lucide-react';
```

En `NAV_ITEMS`, agrega:

```typescript
{ label: 'Clientes', icon: Building2, route: 'clientes', roles: ['admin'] },
{ label: 'Despliegues', icon: Rocket, route: 'despliegues', roles: ['admin', 'developer'] },
{ label: 'Test Builds', icon: Package, route: 'testbuilds', roles: ['admin', 'developer'] },
{ label: 'Reportes', icon: BarChart3, route: 'reportes', roles: ['admin'] },
```

## 6️⃣ Ejecutar

```bash
npm run dev
```

Ahora debería funcionar todo en español 🎉

---

## Lo Que Tienes

### ✅ Módulos (Funcionales)
- `src/lib/clientes.ts`
- `src/lib/despliegues.ts`
- `src/lib/testsBuilds.ts`
- `src/lib/reportes.ts`

### ✅ Páginas (En Español)
- `src/pages/agencia/PaginaClientes.tsx`
- `src/pages/agencia/PaginaDespliegues.tsx`
- `src/pages/agencia/PaginaTestBuilds.tsx`
- `src/pages/agencia/PaginaReportes.tsx`

### ✅ Base de Datos
- Migración con 6 tablas nuevas
- RLS configurado
- Datos precargados

---

## Próximo: Ejecutar

1. Abre terminal en la raíz del proyecto
2. Corre: `supabase db push`
3. Luego: `npm run dev`
4. Login como admin
5. Ve al Sidebar → "Clientes"
6. ¡Listo!

¿Alguna pregunta?
