# 🚀 Production Deployment Guide - Atensia

## Overview

This guide covers the complete deployment process for Atensia to production. Follow these steps carefully to ensure security, performance, and reliability.

---

## Pre-Deployment Checklist

### Code & Security
- [ ] All security changes merged (see SECURITY.md)
- [ ] RLS policies enabled in Supabase
- [ ] Demo credentials endpoint deployed
- [ ] Rate limiting configured
- [ ] Environment variables set correctly
- [ ] No hardcoded secrets in code
- [ ] Security audit completed

### Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual QA testing completed
- [ ] Security penetration testing completed
- [ ] Performance testing completed

### Infrastructure
- [ ] HTTPS certificate obtained (Let's Encrypt or commercial)
- [ ] WAF (Web Application Firewall) configured
- [ ] Database backups enabled
- [ ] Monitoring and alerting configured
- [ ] CDN configured (optional but recommended)

---

## Phase 1: Infrastructure Setup

### 1.1 HTTPS/TLS Configuration

#### Using Vercel (Recommended for Frontend)

```bash
# Deploy frontend to Vercel for automatic HTTPS
npm run build
# Then upload to Vercel dashboard
# Vercel automatically provides free SSL certificates
```

**Vercel Dashboard Settings:**
```
Settings > SSL/TLS:
- Automatic: ON (default)
- HSTS: Enable
- HTTPS Only: Enable (redirect HTTP → HTTPS)
```

#### Using AWS/Cloudfront

```bash
# Request or import SSL certificate in AWS Certificate Manager
# Create CloudFront distribution with certificate
# Set origin to your app domain
# Set "Viewer Protocol Policy" to HTTPS only
```

**Security Headers in CloudFront:**

```
HTTP Headers (in Origin Response):
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
```

#### Using Self-Hosted Server (nginx)

```nginx
# /etc/nginx/sites-available/atensia
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Strong SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Redirect HTTP to HTTPS
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

**Enable Let's Encrypt Certificate:**

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Auto-renew (cron job, runs automatically)
sudo certbot renew --quiet
```

### 1.2 CORS Configuration

Update `.env` with Supabase configuration:

```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<your-production-anon-key>
```

**Supabase Console Settings:**

```
1. Go to Settings > API
2. Under JWT Settings, verify JWT expiration (default 1 hour is good)
3. Go to Auth > Policies
4. Verify all RLS policies are enabled
5. Ensure Email/Password authentication is enabled
```

### 1.3 Database Security

#### Enable Backup

```bash
# In Supabase dashboard:
Settings > Database > Backups
- Enable "Automated backups"
- Retention: 7 days (minimum)
- Backup frequency: Daily
```

#### Monitor Database

```bash
# In Supabase dashboard:
Logs > Edge Functions Logs (to see demo-credentials requests)
Logs > Query Performance (monitor slow queries)
```

---

## Phase 2: Deploy Edge Functions

### 2.1 Deploy Demo Credentials Function

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy functions
supabase functions deploy demo-credentials

# Verify deployment
curl -X POST https://your-project.supabase.co/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'

# Expected response:
# {"password":"Test1234!","expiresAt":"2026-06-04T...","message":"..."}
```

### 2.2 Configure Rate Limiting

The rate limiting is built into the Edge Function (max 5 requests per IP per hour).

**Monitor requests in Supabase Logs:**

```bash
# View function logs
supabase functions logs demo-credentials

# Example log entry:
# [AUDIT] Demo credentials requested for: admin@acmecorp.com from IP: 203.0.113.42
```

---

## Phase 3: Deploy Frontend

### 3.1 Build Optimized Bundle

```bash
# Build production bundle
npm run build

# Verify bundle size
npm run build -- --verbose

# Expected output: bundle should be < 500KB (gzipped)
```

### 3.2 Deploy to Hosting

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard:
# Settings > Environment Variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<production-key>
```

#### Option B: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir dist

# Configure in Netlify dashboard:
# Settings > Build & Deploy > Environment
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<production-key>
```

#### Option C: Self-Hosted with Docker

```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build image
docker build -t atensia:latest .

# Run container
docker run -p 443:443 -e VITE_SUPABASE_URL=$URL \
  -e VITE_SUPABASE_ANON_KEY=$KEY atensia:latest
```

---

## Phase 4: Post-Deployment Verification

### 4.1 Verify HTTPS

```bash
# Check HTTPS certificate
curl -vI https://your-domain.com

# Should see:
# * SSL certificate verify ok
# * Connected to your-domain.com

# Check security headers
curl -I https://your-domain.com | grep -i "strict-transport-security"
```

### 4.2 Verify Demo Credentials Endpoint

```bash
# Test edge function
curl -X POST https://your-domain.com/api/auth/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'
```

### 4.3 Test Login Flow

1. Open https://your-domain.com in browser
2. Try regular login (with test account)
3. Try demo login (with one of the demo accounts)
4. Verify demo login redirects to dashboard

### 4.4 Monitor Performance

```bash
# Use web-vitals to monitor
# Install: npm i --save-dev web-vitals

# Add to main.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

## Phase 5: Monitoring & Maintenance

### 5.1 Set Up Monitoring

#### Using Supabase Logs

```bash
# Watch demo credentials requests
supabase functions logs demo-credentials --follow

# Watch Edge Function errors
supabase functions logs demo-credentials --status=error
```

#### Using External Services

**Option 1: LogRocket (Frontend Monitoring)**

```bash
npm i logrocket
```

```typescript
// src/main.tsx
import LogRocket from 'logrocket';

LogRocket.init('your-org/atensia', {
  console: {
    shouldAggregateConsoleErrors: true,
  },
  network: {
    requestSanitizer: (request) => {
      // Don't log sensitive data
      if (request.url.includes('demo-credentials')) {
        request.body = null;
      }
      return request;
    },
  },
});
```

**Option 2: Sentry (Error Tracking)**

```bash
npm i @sentry/react @sentry/tracing
```

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://xxx@xxx.ingest.sentry.io/xxx',
  environment: 'production',
  tracesSampleRate: 0.1,
  beforeSend: (event) => {
    // Don't send events with sensitive data
    return event;
  },
});
```

### 5.2 Security Monitoring

**Set up alerts for:**
- Rate limit exceeded (demo endpoint)
- Failed login attempts (5+ in 5 minutes)
- Database query performance degradation
- Certificate expiration (30 days before)

```bash
# Example monitoring query for Supabase
# Run in Supabase SQL Editor:

SELECT
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as request_count,
  COUNT(DISTINCT ip_address) as unique_ips
FROM function_logs
WHERE function_name = 'demo-credentials'
GROUP BY minute
ORDER BY minute DESC
LIMIT 100;
```

### 5.3 Regular Maintenance

**Weekly:**
- [ ] Check Supabase logs for errors
- [ ] Monitor rate limiting on demo endpoint
- [ ] Review failed login attempts

**Monthly:**
- [ ] Rotate demo account credentials
- [ ] Update Supabase dependencies
- [ ] Review and rotate any API keys
- [ ] Check certificate expiration date

**Quarterly:**
- [ ] Security audit
- [ ] Penetration testing
- [ ] Database optimization
- [ ] Performance review

---

## Rollback Plan

If something goes wrong in production:

### Quick Rollback (Vercel/Netlify)

```bash
# Redeploy previous version
vercel --prod --skip-build  # Vercel remembers previous builds

# Or deploy specific commit
git log --oneline
vercel --prod --skip-build <commit-hash>
```

### Database Rollback (Supabase)

```bash
# Go to Backups in Supabase dashboard
# Select latest backup before the issue
# Click "Restore" (be careful - this overwrites data!)
```

### Complete Rollback Steps

1. Revert frontend deployment
2. Revert Supabase migrations (if needed)
3. Check logs to identify what went wrong
4. Fix issue locally
5. Re-deploy with testing

---

## Troubleshooting

### Demo Endpoint Returns 500 Error

```bash
# Check Edge Function logs
supabase functions logs demo-credentials

# Common issues:
# 1. Email not in DEMO_ACCOUNTS list
# 2. Function not deployed correctly
# 3. Supabase URL not correct in LoginPage.tsx
```

### HTTPS Certificate Warning

```bash
# Check certificate validity
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew --dry-run  # Test
sudo certbot renew            # Actual renewal
```

### Rate Limiting Not Working

```bash
# Check if Edge Function is deployed
supabase functions list

# Verify rate limiting code is present in index.ts
cat supabase/functions/demo-credentials/index.ts | grep -i "rate"
```

---

## Security Checklist - Final Review

- [ ] HTTPS enabled on all endpoints
- [ ] Security headers configured
- [ ] RLS policies enabled and tested
- [ ] Demo credentials endpoint deployed and rate-limited
- [ ] Backups enabled and tested
- [ ] Monitoring and alerting configured
- [ ] Secrets not exposed in logs
- [ ] Environment variables properly set
- [ ] CORS policies restrictive
- [ ] WAF enabled (if available)
- [ ] Database credentials rotated
- [ ] API keys rotated
- [ ] Incident response plan documented

---

## Support & Escalation

**For Security Issues:**
1. Stop deployment immediately
2. Notify security team
3. Review affected systems
4. Document incident
5. Implement fix and test

**For Performance Issues:**
1. Check Supabase dashboard stats
2. Review slow queries
3. Optimize indexes
4. Monitor edge function performance

**For Availability Issues:**
1. Check Supabase status page
2. Check hosting provider status
3. Review logs for errors
4. Implement rollback if needed

---

**Deployment completed by:** [Your Name]  
**Date:** [Date]  
**Version:** 1.0  
**Status:** ✅ Ready for Production
