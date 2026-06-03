# 🚀 STEP BY STEP: Deployment a Producción

**Tiempo estimado:** 2-3 horas  
**Dificultad:** Media  
**Ayuda disponible:** Vea DEPLOYMENT_GUIDE.md

---

## PASO 1: Deploy Edge Function a Supabase ⏱️ 20 min

### 1.1 Abre terminal en tu proyecto

```bash
cd "c:\Users\leone\Desktop\Lanzsystems\TICKETS\atensia"
```

### 1.2 Verifica Supabase CLI

```bash
supabase --version
```

Expected: `2.100.0` o superior ✅

### 1.3 Login en Supabase

```bash
supabase login
```

**Esto abrirá navegador. Authorize el acceso.**

Expected: Terminal debe mostrar:
```
✨ Authenticated as: tu-email@gmail.com
```

**⏸️ PAUSA: Hasta que veas esto en terminal, no continúes**

### 1.4 Link a tu Proyecto

Ve a: https://app.supabase.com

1. Selecciona tu proyecto
2. Settings > General
3. Copia el **Project ID**

Luego en terminal:

```bash
# Reemplaza YOUR_PROJECT_ID con el que copiaste
supabase link --project-ref YOUR_PROJECT_ID
```

Expected:
```
✅ Linked to project: xyz123abc
```

### 1.5 Deploy la función

```bash
supabase functions deploy demo-credentials
```

Expected output:
```
✅ Function "demo-credentials" deployed successfully
```

### 1.6 Verifica que se deployó ✅

En Supabase dashboard:
1. Ve a Edge Functions
2. Deberías ver "demo-credentials" en la lista

### 1.7 Test el endpoint

Obtén tu **Project URL** de Settings > General > URL

Luego ejecuta:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'
```

Expected response:
```json
{
  "password": "Test1234!",
  "expiresAt": "2026-06-04T12:30:00Z",
  "message": "Demo credentials are valid for 1 hour"
}
```

✅ **Si ves esto, PASO 1 está completo!**

---

## PASO 2: Apply RLS Migrations a Base de Datos ⏱️ 10 min

### 2.1 Verifica la migración existe

```bash
ls supabase/migrations/20260603000000_enable_rls_policies.sql
```

Expected: Muestra la ruta ✅

### 2.2 Apply la migración

```bash
supabase db push
```

Expected output:
```
✅ Applied migration: 20260603000000_enable_rls_policies.sql
```

### 2.3 Verifica que RLS está habilitado

En Supabase SQL Editor (https://app.supabase.com > SQL Editor):

Copia y ejecuta:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: Deberías ver todas las tablas con `rowsecurity = true`

Example:
```
public | profiles   | true
public | companies  | true
public | tickets    | true
```

✅ **Si ves todas en true, PASO 2 está completo!**

---

## PASO 3: Configura HTTPS y Environment ⏱️ 30-60 min

### Opción A: Vercel (Más fácil - RECOMENDADO)

#### A.1 Crea cuenta en Vercel

Ve a: https://vercel.com/sign-up

Usa GitHub para conectar

#### A.2 Build localmente

```bash
npm run build
```

Expected: Crea carpeta `dist/`

#### A.3 Deploy a Vercel

```bash
npm install -g vercel
vercel --prod
```

Responde las preguntas:
- Project name: `atensia`
- Framework: `Vite`
- Root dir: `./`

Expected output:
```
✅ Production: https://atensia.vercel.app
```

#### A.4 Set Environment Variables

En Vercel Dashboard:
1. Tu proyecto > Settings > Environment Variables
2. Agrega:

```
VITE_SUPABASE_URL = https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY = YOUR_ANON_KEY
```

Obtén ANON_KEY de: Settings > API > Project API Keys > `anon` key

#### A.5 Re-deploy con env vars

```bash
vercel --prod
```

#### A.6 Test HTTPS

Abre: https://atensia.vercel.app

Expected: 
- ✅ Se abre sin errores
- ✅ URL es HTTPS (candado verde)
- ✅ Login page aparece

---

### Opción B: Self-Hosted con nginx

#### B.1 Instala certbot (Let's Encrypt)

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

#### B.2 Get SSL Certificate

```bash
sudo certbot certonly --nginx -d your-domain.com
```

#### B.3 Configure nginx

Edita `/etc/nginx/sites-available/atensia`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    root /var/www/atensia/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

#### B.4 Restart nginx

```bash
sudo systemctl restart nginx
```

#### B.5 Test

```bash
curl -I https://your-domain.com
# Must show: SSL certificate verify ok
```

---

### Opción C: Netlify

#### C.1 Crea cuenta

https://netlify.com (conecta GitHub)

#### C.2 Deploy

```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
```

#### C.3 Set env vars

Netlify Dashboard > Site Settings > Build & Deploy > Environment

```
VITE_SUPABASE_URL = https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY = YOUR_ANON_KEY
```

#### C.4 Re-deploy

```bash
npm run build
netlify deploy --prod --dir dist
```

---

## ✅ Verificación de HTTPS

Ejecuta (funciona con cualquier opción):

```bash
# Test 1: HTTPS enforced
curl -I http://your-domain.com
# Debe mostrar: 301 Moved to https://

# Test 2: Certificate valid
openssl s_client -connect your-domain.com:443 -showcerts
# Busca: "Verify return code: 0 (ok)"

# Test 3: Security headers
curl -I https://your-domain.com | grep -i "strict-transport"
# Debe mostrar: Strict-Transport-Security header
```

✅ **Si todos pasan, PASO 3 está completo!**

---

## PASO 4: Ejecuta Tests de Seguridad ⏱️ 3-4 horas

### 4.1 Tests de Seguridad (24 tests)

Usa el archivo: `SECURITY_TESTING.md`

```bash
# Test 1.1.1: Demo endpoint válido
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'

# ✅ PASS si recibe: {"password":"Test1234!","expiresAt":"..."}
```

**Ejecuta todas las secciones en SECURITY_TESTING.md:**

1. ✅ Section 1: Authentication (5 tests)
2. ✅ Section 2: Data Access Control (4 tests)
3. ✅ Section 3: Input Validation (3 tests)
4. ✅ Section 4: HTTPS (3 tests)
5. ✅ Section 5: Data Exposure (2 tests)
6. ✅ Section 6: Session Security (3 tests)
7. ✅ Section 7: Database Security (2 tests)
8. ✅ Section 8: Performance (2 tests)

**Documenta resultados:**
- ✅ PASS = Excelente
- ❌ FAIL = Error crítico, debe arreglarse
- ⚠️ WARN = Revisar

### 4.2 QA Tests (92 tests)

Usa el archivo: `QA_CHECKLIST.md`

Prueba manualmente:

#### Security (8 tests)
- [ ] Login regular funciona
- [ ] Demo login funciona
- [ ] Credenciales inválidas rechazadas
- [ ] Rate limiting funciona
- [ ] Logout limpia sesión
- [ ] No acceso sin login
- [ ] Permisos correctos
- [ ] Datos otros usuarios no visibles

#### Frontend (35 tests)
- [ ] Login page carga
- [ ] Dashboard funciona
- [ ] Tickets se crean
- [ ] Search filtra
- [ ] Responsive mobile
- [ ] Dark mode funciona
- [ ] Etc (ver QA_CHECKLIST.md)

#### Otros (49 tests)
- Performance
- Accessibility
- Cross-browser
- Etc

### 4.3 Resulta un resumen

En `QA_CHECKLIST.md` hay un template. Complétalo:

```markdown
## Test Results - June 3, 2026

| Test | Status | Notes |
|------|--------|-------|
| 1.1.1 Demo endpoint | ✅ PASS | Response correct |
| 1.2.1 Regular login | ✅ PASS | Works |
| 2.1.1 Own profile | ✅ PASS | RLS enforced |
...

**Total Pass Rate:** 100%
**Status:** ✅ APPROVED FOR PRODUCTION
```

---

## 🎯 Checklist Final

- [ ] PASO 1: Edge Function deployed ✅
- [ ] PASO 2: RLS migrations applied ✅
- [ ] PASO 3: HTTPS configured ✅
- [ ] PASO 4: All tests PASS ✅
- [ ] PRODUCTION_CHECKLIST.md firmado ✅

---

## 📞 Si algo falla...

### Error: "Function already exists"
```bash
# Delete old function first
supabase functions delete demo-credentials
# Then deploy
supabase functions deploy demo-credentials
```

### Error: "Project not linked"
```bash
# Link again
supabase link --project-ref YOUR_PROJECT_ID
```

### Error: "Migrations failed"
```bash
# Check status
supabase db status
# Rollback if needed
supabase db reset
```

### Error: "HTTPS not working"
```bash
# Check certificate
openssl s_client -connect your-domain.com:443

# Check certificate expiration
certbot renew --dry-run

# Check nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🎉 ¡Completado!

Cuando todos los pasos estén ✅:

```bash
# Eres listo para...
# 1. Notificar a clientes
# 2. Monitorear en producción  
# 3. Estar alerta los primeros días
# 4. Hacer backup de todo
```

**Tiempo total:** 2-3 horas  
**Equipo:** 1 persona (o parallelizar si es equipo grande)

---

**Documentado por:** Claude Code Security Team  
**Fecha:** 2026-06-03  
**Versión:** 1.0  
**Status:** 🟡 Esperando que hagas los pasos
