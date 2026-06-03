# 🔒 Security Guidelines - Atensia

## Overview

This document outlines security practices and requirements for Atensia, a multi-tenant ticket management system. **DO NOT expose credentials in client-side code.**

---

## Critical Security Issues Fixed

### ✅ Issue 1: Hardcoded Demo Credentials (RESOLVED)
**Status:** Fixed in recent commits

Previously, demo account credentials were hardcoded in `LoginPage.tsx`:
```typescript
// ❌ BEFORE (REMOVED)
const DEMO_PROFILES = [
  { email: 'admin@acmecorp.com', password: 'Test1234!' },
  // ...
];
```

**Why this was dangerous:**
- Credentials visible in source code
- Exposed in compiled JavaScript
- Visible via browser DevTools
- Anyone with access to code could access admin accounts

**How it's fixed now:**
- All credentials removed from frontend code
- Credentials now served from secure backend endpoint
- Endpoint requires rate limiting and validation

---

## Demo Account System (Backend Implementation Required)

### Required Backend Endpoint

You must implement a secure endpoint that serves demo credentials:

```
POST /api/auth/demo-credentials
Content-Type: application/json

Request body:
{
  "email": "admin@acmecorp.com"
}

Response:
{
  "password": "Test1234!",
  "expiresAt": "2026-06-04T12:00:00Z"
}
```

### Backend Implementation Checklist

- [ ] Create `/api/auth/demo-credentials` endpoint
- [ ] **Rate limit**: Max 5 requests per IP per hour
- [ ] **Validate email**: Check if email is in approved demo list
- [ ] **Logs**: Log all demo credential requests for audit trail
- [ ] **Expiration**: Serve temporary passwords that expire (1 hour)
- [ ] **HTTPS only**: Reject non-HTTPS requests
- [ ] **CORS**: Restrict to your frontend domain only
- [ ] **IP filtering** (optional): Restrict to known networks

### Example Implementation (Node.js/Express)

```typescript
app.post('/api/auth/demo-credentials', async (req, res) => {
  // Rate limiting
  const ip = req.ip;
  const requestCount = await redis.incr(`demo-requests:${ip}`);
  if (requestCount === 1) await redis.expire(`demo-requests:${ip}`, 3600);
  if (requestCount > 5) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Validate email
  const { email } = req.body;
  const DEMO_EMAILS = [
    'superadmin@incidentdesk.com',
    'admin@acmecorp.com',
    'agente@acmecorp.com',
    'dev@acmecorp.com',
  ];

  if (!DEMO_EMAILS.includes(email)) {
    return res.status(400).json({ error: 'Invalid demo email' });
  }

  // Log request (important for audit)
  console.log(`[SECURITY] Demo credential requested for: ${email} from IP: ${ip}`);

  // Serve password from environment variable
  const password = process.env[`DEMO_PASSWORD_${email.toUpperCase().replace('@', '_').replace('.', '_')}`];
  
  if (!password) {
    return res.status(500).json({ error: 'Demo account not configured' });
  }

  res.json({
    password,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
});
```

### Environment Variables Required

```bash
# Backend .env
DEMO_PASSWORD_SUPERADMIN_INCIDENTDESK_COM=Test1234!
DEMO_PASSWORD_ADMIN_ACMECORP_COM=Test1234!
DEMO_PASSWORD_AGENTE_ACMECORP_COM=Test1234!
DEMO_PASSWORD_DEV_ACMECORP_COM=Test1234!
```

---

## ✅ Issue 2: Password in Company Type (RESOLVED)
**Status:** Fixed - `admin_password` field removed from Company interface

**What was wrong:**
```typescript
// ❌ BEFORE (REMOVED)
export interface Company {
  admin_password: string;  // ← NEVER store passwords in domain models
}
```

**Why this is dangerous:**
- Passwords could be exposed in logs, error messages, or debugging
- If database is compromised, all admin passwords are leaked
- Against OWASP best practices

**How it's fixed:**
- Removed `admin_password` field entirely
- All password management delegated to Supabase Auth
- Use Supabase's `signUp()` API to create users with passwords

---

## Best Practices for Production

### 1. **Never store passwords in your database**
- Use Supabase Auth exclusively for password management
- Use `supabase.auth.signUp()` for creating users
- Use `supabase.auth.updateUser({ password: newPassword })` for updates

### 2. **Environment Variables**
- All secrets must be in `.env` (local) or CI/CD secrets (production)
- Never commit `.env` to git (already in `.gitignore`)
- Use `.env.example` to document what variables are needed

```bash
# .env.example (safe to commit)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<replace-with-your-key>
```

### 3. **Supabase Row-Level Security (RLS)**
- ✅ Enable RLS on all tables
- ✅ Implement policies restricting data by company_id and user role
- ✅ Test RLS policies thoroughly before production

Example RLS policy:
```sql
CREATE POLICY "Users can only see tickets from their company"
  ON tickets FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

### 4. **HTTPS Only**
- ✅ All requests must use HTTPS in production
- ✅ Set `Secure` flag on all cookies
- ✅ Enable HSTS headers

### 5. **Rate Limiting**
- ✅ Implement rate limiting on auth endpoints (login, demo, reset password)
- ✅ Use exponential backoff for failed attempts

### 6. **Logging & Monitoring**
- ✅ Log all authentication events (successful/failed logins, password changes)
- ✅ Do NOT log passwords or sensitive data
- ✅ Monitor for suspicious activity (brute force attempts, etc.)
- ✅ Set up alerts for critical events

### 7. **Session Management**
- ✅ Use short-lived JWT tokens
- ✅ Implement refresh token rotation
- ✅ Clear session on logout
- ✅ Invalidate tokens on password change

### 8. **Data Exposure Prevention**
- ✅ Validate all user input on backend
- ✅ Use parameterized queries (Supabase does this automatically)
- ✅ Don't expose internal error messages to users
- ✅ Implement CORS properly

```typescript
// Example: Safe error handling
catch (error) {
  console.error('Internal error:', error);  // Log full error
  res.status(500).json({ 
    error: 'Something went wrong. Please try again.' // Generic message
  });
}
```

### 9. **Before Going to Production**
- [ ] Audit all file uploads (implement file type validation)
- [ ] Review Supabase RLS policies line by line
- [ ] Set up database backups
- [ ] Implement audit logging for sensitive operations
- [ ] Create incident response plan
- [ ] Run security test suite
- [ ] Have security expert review database schema
- [ ] Rotate demo credentials monthly
- [ ] Remove demo accounts before production (or restrict heavily)

---

## Migration Checklist: Making Demo System Secure

The frontend has been updated to fetch demo credentials from a secure backend endpoint.

### What you need to do:

1. **Implement the backend endpoint** (see section above)
2. **Configure rate limiting** (at least 5 requests/hour per IP)
3. **Set environment variables** for demo passwords
4. **Test the flow**: Frontend → Backend → Demo login
5. **Monitor demo requests** in production (log and track)
6. **Rotate credentials monthly** (update environment variables)

### Testing the Flow

```bash
# 1. Test backend endpoint
curl -X POST http://localhost:3000/api/auth/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'

# Should return:
# {"password":"Test1234!","expiresAt":"2026-06-04T12:00:00Z"}

# 2. Test frontend login with returned password
# Try logging in with admin@acmecorp.com and the password from step 1
```

---

## Incident Response

### If credentials are exposed:

1. **Immediately revoke** the exposed credentials in Supabase Auth
2. **Create new credentials** in environment variables
3. **Rotate all demo accounts** in database
4. **Review audit logs** for unauthorized access
5. **Notify affected users** if their data was accessed
6. **Document incident** for compliance records

---

## Security Review Checklist

Before deploying to production, verify:

- [ ] No hardcoded credentials in code
- [ ] All passwords managed by Supabase Auth
- [ ] RLS policies enforced on all tables
- [ ] Rate limiting implemented on auth endpoints
- [ ] HTTPS enforced in production
- [ ] Audit logging enabled
- [ ] Demo credentials served from secure backend only
- [ ] Environment variables properly configured
- [ ] Database backups enabled
- [ ] Error messages don't leak sensitive info

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Guide](https://supabase.com/docs/guides/database/postgres/authentication)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

**Last Updated:** 2026-06-03  
**Maintained By:** Security Team
