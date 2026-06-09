# Sistema de Agencia - Guía de Uso (Frontend)

## Cómo usar los Servicios y Hooks

### 1. Crear un Cliente (Admin)

```typescript
import { useClientCompanies } from './lib/hooks';
import { useAuth } from './contexts/AuthContext';

export function CreateClientExample() {
  const { profile } = useAuth();
  const { addClient, loading, error } = useClientCompanies(profile?.company_id);

  const handleCreate = async () => {
    try {
      await addClient(profile!.company_id!, {
        name: 'Acme Corp',
        admin_name: 'John Doe',
        admin_email: 'john@acme.com',
        primary_color: '#2563eb',
        plan: 'professional',
        status: 'active',
        maintenance_mode: false,
        logo_url: '',
      });
      // Cliente creado exitosamente
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (error) return <div>Error: {error.message}</div>;
  if (loading) return <div>Loading...</div>;

  return <button onClick={handleCreate}>Crear Cliente</button>;
}
```

---

### 2. Crear un Despliegue (Developer)

```typescript
import { useDeployments } from './lib/hooks';
import { getDeploymentPlatforms } from './lib/clientCompanies';

export function CreateDeploymentExample() {
  const [clientId, setClientId] = useState('');
  const { createDeployment, loading, error } = useDeployments(clientId);
  const [platforms, setPlatforms] = useState([]);

  useEffect(() => {
    getDeploymentPlatforms().then(setPlatforms);
  }, []);

  const handleCreate = async () => {
    try {
      await createDeployment({
        client_company_id: clientId,
        platform_id: 'platform-id-from-select',
        version: '1.0.0',
        build_number: '100',
        release_notes: 'Fixed bugs in v1.0',
      });
      // Despliegue creado
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
        <option>Selecciona cliente</option>
        {platforms.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Creando...' : 'Crear Despliegue'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

---

### 3. Aprobar Despliegue (Admin)

```typescript
import { useDeployments } from './lib/hooks';
import { useAuth } from './contexts/AuthContext';

export function ApproveDeploymentExample({ deploymentId, clientId }) {
  const { profile } = useAuth();
  const { approveDeployment, loading } = useDeployments(clientId);

  const handleApprove = async () => {
    try {
      await approveDeployment(deploymentId, profile!.id);
      // Aprobado exitosamente
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <button onClick={handleApprove} disabled={loading}>
      {loading ? 'Aprobando...' : 'Aprobar Despliegue'}
    </button>
  );
}
```

---

### 4. Subir Test Build (Developer)

```typescript
import { useTestBuilds } from './lib/hooks';
import { useAuth } from './contexts/AuthContext';
import { getTestPlatforms } from './lib/clientCompanies';

export function UploadTestBuildExample() {
  const { profile } = useAuth();
  const [clientId, setClientId] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const { createTestBuild, loading } = useTestBuilds(clientId);

  useEffect(() => {
    getTestPlatforms().then(setPlatforms);
  }, []);

  const handleUpload = async () => {
    try {
      await createTestBuild({
        client_company_id: clientId,
        platform_id: 'testflight-id',
        version: '1.0.0',
        build_number: '100',
        uploaded_by: profile!.id,
        test_url: 'https://testflight.apple.com/...',
        build_file_url: 'https://storage.example.com/build.ipa',
        test_notes: 'Ready for QA testing',
      });
      // Build subido exitosamente
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <button onClick={handleUpload} disabled={loading}>
      {loading ? 'Subiendo...' : 'Subir Build de Test'}
    </button>
  );
}
```

---

### 5. Generar Reporte (Admin)

```typescript
import { useReports } from './lib/hooks';
import { useAuth } from './contexts/AuthContext';

export function GenerateReportExample() {
  const { profile } = useAuth();
  const [clientId, setClientId] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const { generateCombinedReport, reports, loading } = useReports(
    profile?.company_id || '',
    profile?.id || ''
  );

  const handleGenerate = async () => {
    try {
      await generateCombinedReport(
        clientId || null, // null = todos los clientes
        dateRange.start,
        dateRange.end
      );
      // Reporte generado exitosamente
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      <input
        type="date"
        value={dateRange.start}
        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
      />
      <input
        type="date"
        value={dateRange.end}
        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
      />
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generando...' : 'Generar Reporte'}
      </button>

      {reports.length > 0 && (
        <div>
          <h3>Reportes Generados:</h3>
          {reports.map((report) => (
            <div key={report.id}>
              <h4>{report.title}</h4>
              <p>Tipo: {report.report_type}</p>
              <p>Fecha: {report.created_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Flujo Completo de Ejemplo

### Escenario: Admin creando cliente y Dev registrando despliegue

```typescript
// PASO 1: Admin crea cliente
// → Archivo: src/pages/clients/ClientsPage.tsx
const admin = useAuth().profile; // admin@acme.com
const { addClient } = useClientCompanies(admin.company_id);

await addClient(admin.company_id, {
  name: 'Cliente Acme',
  admin_name: 'Juan Pérez',
  admin_email: 'juan@acme.com',
  // ...
});

// Base de datos:
// - companies: + 1 registro (Cliente Acme)
// - client_companies: + 1 relación (admin → acme)

// PASO 2: Dev ve sus clientes
const dev = useAuth().profile; // dev@acme.com (pertenece a admin)
const { clients } = useClientCompanies(dev.company_id);
// → Ver: [{ client_company_id: 'acme-uuid', ... }]

// PASO 3: Dev crea despliegue
const { createDeployment } = useDeployments('acme-uuid');
await createDeployment({
  client_company_id: 'acme-uuid',
  platform_id: 'ios-appstore',
  version: '1.0.0',
  build_number: '100',
});

// Base de datos:
// - deployments: + 1 registro (draft)
// - Estado: client_company_id='acme-uuid', status='draft'

// PASO 4: Dev envía despliegue
const { submitDeployment } = useDeployments('acme-uuid');
await submitDeployment(deploymentId, dev.id);
// Estado: status='submitted'

// PASO 5: Admin recibe notificación y aprueba
const { approveDeployment } = useDeployments('acme-uuid');
await approveDeployment(deploymentId, admin.id);
// Estado: status='approved'

// PASO 6: Dev marca como live
const { markLive } = useDeployments('acme-uuid');
await markLive(deploymentId);
// Estado: status='live'
```

---

## Error Handling

Todos los servicios lanzan errores descriptivos:

```typescript
try {
  await createClientCompany(adminId, data);
} catch (error) {
  // error.message es descriptivo:
  // - "Admin company ID is required"
  // - "Company name is required"
  // - "Failed to create company: [db error]"
  console.error('Error:', error.message);
}
```

---

## Testing

### Test 1: Admin crea cliente
```typescript
test('admin can create client', async () => {
  const admin = createTestUser('admin');
  const result = await createClientCompany(admin.company_id, {
    name: 'Test Client',
    admin_name: 'Test User',
    admin_email: 'test@example.com',
  });

  expect(result.clientCompany).toBeDefined();
  expect(result.relation).toBeDefined();
  expect(result.relation.status).toBe('active');
});
```

### Test 2: Dev ve clientes del admin
```typescript
test('dev can see admin clients', async () => {
  const admin = createTestUser('admin');
  const dev = createTestUser('developer', { admin_company_id: admin.company_id });
  
  const clients = await getAdminClients(admin.company_id);
  
  expect(clients.length).toBeGreaterThan(0);
});
```

### Test 3: Crear despliegue falla sin client_id
```typescript
test('deployment requires client_company_id', async () => {
  expect(async () => {
    await createDeployment({
      client_company_id: '', // missing
      platform_id: 'ios',
      version: '1.0',
      build_number: '1',
    });
  }).rejects.toThrow('Client company ID');
});
```

---

## Debugging

### Ver qué pasó en consola
```typescript
// Todos los servicios loguean errores con contexto
console.error('Error creating test build:', message);
// Output: "Error creating test build: Failed to create test build: [db error]"
```

### Ver datos en Supabase
```sql
-- Ver clientes de un admin
SELECT * FROM client_companies WHERE admin_company_id = 'your-admin-id';

-- Ver despliegues de un cliente
SELECT d.*, p.name FROM deployments d
LEFT JOIN deployment_platforms p ON d.platform_id = p.id
WHERE client_company_id = 'your-client-id'
ORDER BY d.created_at DESC;

-- Ver reportes generados
SELECT * FROM reports WHERE admin_company_id = 'your-admin-id' ORDER BY created_at DESC;
```

---

## Mejoras Futuras

1. **Caching**: Cachear plataformas (no cambian frecuentemente)
2. **Paginación**: Para listas con muchos items
3. **Filtros avanzados**: Por status, fecha, etc.
4. **Exportación**: PDF, CSV de reportes
5. **Webhooks**: Notificaciones en tiempo real
6. **GraphQL**: Query API más eficiente
