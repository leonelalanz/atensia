# Configuración de Notificaciones por Email con Resend

## 📧 Pasos de Configuración

### 1. Crear cuenta en Resend
1. Ve a https://resend.com
2. Crea una cuenta gratis
3. En el dashboard, ve a **API Keys**
4. Copia tu API Key (comienza con `re_`)

### 2. Configurar variables en Supabase

Ve al dashboard de Supabase de tu proyecto:

1. **Configurar RESEND_API_KEY:**
   - Ve a **Project Settings** → **API**
   - En la sección **Edge Functions** (o **Function Secrets**)
   - Agrega un nuevo secret:
     - **Nombre:** `RESEND_API_KEY`
     - **Valor:** Tu API Key de Resend (ej: `re_xxxxxxxxxxxxx`)

2. **Configurar APP_URL (opcional):**
   - **Nombre:** `APP_URL`
   - **Valor:** Tu URL de la aplicación (ej: `https://app.atensia.com`)
   - Por defecto es `https://atensia.app`

### 3. Deploy de la Edge Function

Desde tu terminal:

```bash
supabase functions deploy send-email
```

Si tienes errores de permisos, asegúrate de que:
- Estés autenticado: `supabase login`
- Tengas acceso al proyecto

### 4. Verifica la instalación

Prueba la función:

```bash
supabase functions invoke send-email --body '{
  "to": "tu-email@ejemplo.com",
  "subject": "Prueba de Atensia",
  "html": "<h1>¡Hola!</h1><p>Este es un email de prueba.</p>"
}'
```

Deberías recibir un email en menos de 1 minuto.

## 🎯 Cómo Funciona

### Notificaciones Automáticas

Las notificaciones se envían automáticamente cuando ocurren estos eventos:

#### 📝 Tickets
- **Ticket Creado** → Email al Admin y Asignado
- **Ticket Asignado** → Email al Asignado
- **Ticket Resuelto/Cerrado** → Email al Creador y Admins
- **Comentario Agregado** → Email a los involucrados
- **Escalado a Crítico** → Email alertando del cambio

#### 👤 Usuarios (próximamente)
- **Usuario Registrado** → Email de bienvenida
- **Contraseña Cambiada** → Confirmación
- **Reset de Contraseña** → Link para recuperar

## 🔧 Integración en Código

### Para enviar notificación con email:

```typescript
import { onTicketCreated } from '@/lib/notifications';

// En tu función que crea tickets:
await onTicketCreated({
  ticketId: 'abc123',
  ticketNumber: 'TICKET-001',
  title: 'Bug en login',
  description: 'No puedo iniciar sesión',
  priority: 'high',
  companyId: 'company-id',
  companyName: 'Mi Empresa',
  creatorId: 'user-1',
  assigneeId: 'user-2',
});
```

### Templates Disponibles

Los emails usan templates HTML profesionales incluidos:
- `ticket_created` - Nuevo ticket
- `ticket_assigned` - Ticket asignado
- `ticket_resolved` - Ticket resuelto
- `ticket_commented` - Nuevo comentario
- `ticket_escalated` - Ticket escalado
- `user_registered` - Registro de usuario
- `password_changed` - Contraseña actualizada
- `password_reset` - Recuperación de contraseña

## 📊 Límites de Resend

**Plan Gratuito:**
- 100 emails/día
- Dominio: `noreply@atensia.app`

**Plan Pagado:**
- 50,000 emails/mes
- Dominio personalizado
- $20/mes o pay-as-you-go

## ⚠️ Troubleshooting

### Email no llega

1. **Verifica el API Key:**
   ```bash
   supabase secrets list
   ```

2. **Revisa los logs de la función:**
   ```bash
   supabase functions logs send-email
   ```

3. **Comprueba spam/promociones** en tu bandeja

### Error: "Invalid API Key"

- Asegúrate de que el API Key de Resend sea correcto
- Comienza con `re_`
- No tiene espacios en blanco

### Error en la Edge Function

1. Redeploy:
   ```bash
   supabase functions deploy send-email --no-verify-jwt
   ```

2. Verifica el archivo `send-email/index.ts`

## 📞 Soporte

- **Resend:** https://resend.com/docs
- **Supabase Functions:** https://supabase.com/docs/guides/functions
- **Issues:** Abre un issue en GitHub

---

**Próximos pasos:**
1. ✅ Completar configuración de emails
2. ⏳ Integrar notificaciones de usuarios
3. ⏳ Agregar webhooks personalizados
