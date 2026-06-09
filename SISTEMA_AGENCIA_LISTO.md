# Sistema de Agencia - LISTO PARA USAR

## ✅ Lo Que Está Hecho

### Base de Datos ✅
- Migración SQL: `supabase/migrations/20260608000001_add_agency_structure.sql`
- 6 tablas nuevas
- RLS policies configuradas
- Datos de plataformas precargados

### Módulos Funcionales (En Español) ✅

```
✅ src/lib/clientes.ts
   - crearCliente() → Registra un nuevo cliente
   - obtenerClientes() → Lista los clientes del admin
   - suspenderCliente() → Suspende un cliente
   - reactivarCliente() → Reactiva un cliente

✅ src/lib/despliegues.ts
   - crearDespliegue() → Registra nuevo despliegue
   - obtenerDespliegues() → Lista despliegues de un cliente
   - enviarDespliegue() → Envía para aprobación
   - aprobarDespliegue() → Admin aprueba
   - rechazarDespliegue() → Admin rechaza
   - marcarEnVivo() → Marca como en vivo
   - revertirDespliegue() → Revierte con motivo

✅ src/lib/testsBuilds.ts
   - subirTestBuild() → Sube nuevo test build
   - obtenerTestBuilds() → Lista test builds del cliente
   - marcarDistribuido() → Cambiar estado
   - marcarProbando() → Cambiar estado
   - marcarCompletado() → Cambiar estado
   - marcarFallido() → Cambiar estado
   - archivarTestBuild() → Archivar
   - eliminarTestBuild() → Eliminar

✅ src/lib/reportes.ts
   - crearReporte() → Registra reporte en BD
   - obtenerReportes() → Lista reportes del admin
   - generarReporteTickets() → Genera reporte de tickets
   - generarReporteDespliegues() → Genera reporte de despliegues
   - generarReporteTests() → Genera reporte de tests
   - eliminarReporte() → Elimina reporte
```

---

## 🎯 Cómo Usar

### 1. Aplicar Migración
```bash
supabase db push
```

### 2. Importar en tu código
```typescript
import { crearCliente, obtenerClientes } from '@/lib/clientes';
import { crearDespliegue, obtenerDespliegues } from '@/lib/despliegues';
import { subirTestBuild, obtenerTestBuilds } from '@/lib/testsBuilds';
import { generarReporteTickets, obtenerReportes } from '@/lib/reportes';
```

### 3. Usar en componentes
```typescript
// Crear cliente
const { exito, cliente } = await crearCliente(idAdmin, {
  nombre: 'Acme Corp',
  contactoNombre: 'Juan Pérez',
  contactoEmail: 'juan@acme.com',
  colorPrimario: '#2563eb',
});

// Obtener clientes
const clientes = await obtenerClientes(idAdmin);

// Crear despliegue
const { exito, despliegue } = await crearDespliegue({
  idClienteEmpresa: 'cliente-uuid',
  idPlataforma: 'plataforma-uuid',
  version: '1.0.0',
  numeroCompilacion: '100',
  notasLanzamiento: 'Fixes en v1.0',
});

// Enviar despliegue
await enviarDespliegue(idDespliegue, idUsuario);

// Aprobar despliegue
await aprobarDespliegue(idDespliegue, idAdmin);

// Subir test build
const { exito, testBuild } = await subirTestBuild({
  idClienteEmpresa: 'cliente-uuid',
  idPlataforma: 'testflight-uuid',
  version: '1.0.0',
  numeroCompilacion: '100',
  idUsuario: 'dev-uuid',
  urlTest: 'https://testflight.apple.com/...',
});

// Generar reporte de tickets
const { exito, reporte } = await generarReporteTickets(
  idAdmin,
  null, // null = todos los clientes
  '2026-06-01',
  '2026-06-08',
  idUsuario
);
```

---

## 📊 Estructura de Datos

### client_companies (Relación Admin → Cliente)
```typescript
{
  id: string;
  admin_company_id: string;        // Admin
  client_company_id: string;       // Cliente
  client_contact_name: string;
  client_contact_email: string;
  client_contact_phone: string;
  status: 'active' | 'inactive' | 'suspended';
}
```

### deployments (Despliegues)
```typescript
{
  id: string;
  client_company_id: string;
  platform_id: string;             // iOS, Android, Web, etc
  version: string;                 // 1.0.0
  build_number: string;            // 100
  release_notes: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'live' | 'rollback';
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  live_at: string | null;
  rollback_at: string | null;
  rollback_reason: string | null;
}
```

### test_builds (Test Builds)
```typescript
{
  id: string;
  client_company_id: string;
  platform_id: string;             // TestFlight, TestFairy, etc
  version: string;
  build_number: string;
  test_url: string;
  build_file_url: string;
  test_notes: string;
  status: 'created' | 'distributed' | 'testing' | 'completed' | 'failed' | 'archived';
  uploaded_by: string;
  uploaded_at: string;
}
```

### reports (Reportes)
```typescript
{
  id: string;
  admin_company_id: string;
  client_company_id: string | null;
  title: string;
  report_type: 'tickets' | 'deployments' | 'testing';
  period_start: string;            // YYYY-MM-DD
  period_end: string;              // YYYY-MM-DD
  data: {
    total_tickets: number;
    por_estado: { [estado]: number };
    por_prioridad: { [prioridad]: number };
    // ... etc
  };
  generated_by: string;
  created_at: string;
}
```

---

## 🔒 Seguridad

### RLS (Row Level Security) Automático
- ✅ Admin solo ve sus clientes
- ✅ Developer ve clientes de su admin
- ✅ Agent sin acceso
- ✅ Superadmin acceso total

### Validación
- ✅ Verificaciones en Supabase
- ✅ Foreign keys automáticos
- ✅ Datos consistentes

---

## ❌ Qué NO Está

- ❌ Componentes React (frontend)
- ❌ Webhooks
- ❌ Integraciones con App Store/Google Play
- ❌ Notificaciones en tiempo real
- ❌ Tests unitarios

Eso se puede agregar después si es necesario.

---

## 📝 Notas

- Todos los módulos están en **español**
- Usan Supabase directamente
- Retornan `{ exito: true, ... }` o lanzan error
- **Sin complejidad innecesaria**
- Hechos para registrar datos, no para interfaces bonitas

---

## ✨ Listo Para Usar

Ya puedes:
1. Crear clientes
2. Registrar despliegues  
3. Subir test builds
4. Generar reportes
5. Todo queda guardado en BD

¿Necesitas algo más?
