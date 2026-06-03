# ⚡ QUICK REFERENCE - Commands Copy/Paste

## 🔐 Paso 1: Edge Function (20 min)

### Check versions
```bash
node --version  # Need 18+
npm --version   # Need 8+
```

### Install Supabase CLI
```bash
npm install -g supabase
supabase --version
```

### Login
```bash
supabase login
# Aprueba en navegador
```

### Link project (reemplaza YOUR_PROJECT_ID)
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### Deploy function
```bash
supabase functions deploy demo-credentials
```

### Test endpoint
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'

# Expected response:
# {"password":"Test1234!","expiresAt":"...","message":"..."}
```

---

## 🗄️ Paso 2: RLS Migrations (10 min)

### Apply migration
```bash
supabase db push
```

### Verify RLS enabled
En Supabase SQL Editor:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: All `rowsecurity = true`

---

## 🔒 Paso 3: HTTPS (30-60 min)

### Option A: Vercel (EASIEST)

```bash
# Build
npm run build

# Install vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# VITE_SUPABASE_URL = https://YOUR_PROJECT_ID.supabase.co
# VITE_SUPABASE_ANON_KEY = YOUR_ANON_KEY

# Re-deploy
vercel --prod
```

### Option B: Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
# Set env vars in dashboard
# Re-deploy
netlify deploy --prod --dir dist
```

### Option C: Self-hosted nginx

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Edit /etc/nginx/sites-available/atensia
# (Use example from STEP_BY_STEP_DEPLOYMENT.md)

# Restart
sudo systemctl restart nginx
```

### Verify HTTPS
```bash
curl -I https://your-domain.com
# Must show 301 redirect from HTTP

openssl s_client -connect your-domain.com:443
# Must show "Verify return code: 0 (ok)"

curl -I https://your-domain.com | grep -i "strict-transport"
# Must show Strict-Transport-Security header
```

---

## ✅ Paso 4: Tests (3-4 hours)

### Security Tests (24 tests)

Abrir: `SECURITY_TESTING.md`

Ejecutar cada sección:

```bash
# Test demo endpoint válido
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'
# Expected: ✅ PASS

# Test demo endpoint invalid email
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com"}'
# Expected: 404 Not Found ✅ PASS

# Test rate limiting (5 requests)
for i in {1..6}; do
  curl -X POST https://your-domain.com/functions/v1/demo-credentials \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@acmecorp.com"}'
done
# Requests 1-5: Success ✅
# Request 6: 429 Too Many Requests ✅ PASS

# Test HTTPS enforced
curl -I http://your-domain.com
# Expected: 301 redirect ✅ PASS

# Test Security Headers
curl -I https://your-domain.com
# Look for:
# - Strict-Transport-Security ✅
# - X-Content-Type-Options ✅
# - X-Frame-Options ✅
```

### QA Tests (92 tests)

Abrir: `QA_CHECKLIST.md`

Prueba manualmente:

#### Security (8 tests)
```
- [ ] ✅ Login works
- [ ] ✅ Demo login works
- [ ] ✅ Invalid creds rejected
- [ ] ✅ Logout works
- [ ] ✅ Permissions enforced
- [ ] ✅ RLS working
- [ ] ✅ Rate limiting works
- [ ] ✅ HTTPS enforced
```

#### Frontend (35 tests)
```
- [ ] ✅ Login page loads
- [ ] ✅ Can create ticket
- [ ] ✅ Can search
- [ ] ✅ Mobile responsive
- [ ] ✅ Dark mode works
- [ ] ✅ etc...
```

#### Rest (49 tests)
```
- [ ] ✅ Performance OK
- [ ] ✅ Accessibility OK
- [ ] ✅ Cross-browser OK
- [ ] ✅ etc...
```

### Document Results

Fill in QA_CHECKLIST.md:

```markdown
## Test Results - [Your Date]

| Test | Status | Notes |
|------|--------|-------|
| 1.1.1 Demo Endpoint | ✅ PASS | Response OK |
| 1.2.1 Regular Login | ✅ PASS | Works |
| 4.1.1 HTTPS | ✅ PASS | Enforced |
| ... | ... | ... |

**Total Pass Rate:** 100%
**Approved by:** [Your Name]
**Date:** [Date]
```

---

## 🎯 Quick Status Check

```bash
# Is supabase connected?
supabase projects list

# Is function deployed?
supabase functions list

# Is HTTPS working?
curl -I https://your-domain.com

# Can you login?
# Open browser to https://your-domain.com
# Try login

# Can demo endpoint be called?
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'

# Are RLS policies active?
# Go to Supabase > SQL Editor > Run RLS check query
```

---

## 📝 Sign-Off Template

Copy to PRODUCTION_CHECKLIST.md when done:

```markdown
### Development Team
- [x] Code review completed
- [x] Tests passing
- [x] Ready to deploy

**Approved by:** [Name] **Date:** [Date]

### Security Team
- [x] Security review passed
- [x] No vulnerabilities found
- [x] Ready for production

**Approved by:** [Name] **Date:** [Date]

### QA Team
- [x] All tests passed
- [x] Functionality verified
- [x] Performance acceptable

**Approved by:** [Name] **Date:** [Date]

### DevOps Team
- [x] Infrastructure ready
- [x] Monitoring configured
- [x] Rollback plan tested

**Approved by:** [Name] **Date:** [Date]

### Management/CTO
- [x] Business requirements met
- [x] Compliance verified
- [x] ✅ GO AHEAD for production

**Approved by:** [Name] **Date:** [Date]
```

---

## 🔴 Error Troubleshooting

| Error | Fix |
|-------|-----|
| `supabase: command not found` | `npm install -g supabase` |
| `Not authenticated` | `supabase login` (approve in browser) |
| `Project not linked` | `supabase link --project-ref ID` |
| `Function already exists` | `supabase functions delete demo-credentials` then redeploy |
| `Migration failed` | `supabase db reset` (careful - resets everything) |
| `HTTPS not working` | `openssl s_client -connect domain.com:443` to debug |
| `Env vars not working` | Verify in hosting dashboard and redeploy |
| `Tests failing` | Check SECURITY_TESTING.md for expected behavior |

---

## ✨ When Done...

```bash
# 1. You have HTTPS ✅
# 2. Edge function works ✅
# 3. RLS policies active ✅
# 4. All tests PASS ✅
# 5. Documentation complete ✅

# Therefore...
# 🎉 READY FOR CLIENTS IN PRODUCTION! 🎉
```

---

**Print this page or bookmark for easy access!**
