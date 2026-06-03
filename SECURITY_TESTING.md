# 🔒 Security Testing Guide - Atensia

## Complete Security Test Suite

This document provides comprehensive testing procedures to verify security implementations before production.

---

## Section 1: Authentication & Authorization Testing

### Test 1.1: Demo Credentials Endpoint Security

**Objective:** Verify demo credentials endpoint is secure and rate-limited.

#### Test 1.1.1: Valid Demo Request
```bash
# Request
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'

# Expected Response: 200 OK
{
  "password": "Test1234!",
  "expiresAt": "2026-06-04T12:30:00Z",
  "message": "Demo credentials are valid for 1 hour"
}

# ✅ PASS: Returns credentials with expiration
```

#### Test 1.1.2: Invalid Email
```bash
# Request
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com"}'

# Expected Response: 404 Not Found
{
  "error": "Demo account not found"
}

# ✅ PASS: Returns 404 without revealing valid emails
```

#### Test 1.1.3: Missing Email
```bash
# Request
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected Response: 400 Bad Request
{
  "error": "Email is required"
}

# ✅ PASS: Validates required fields
```

#### Test 1.1.4: Rate Limiting (5 requests per hour per IP)
```bash
# Request 1-5: Should succeed
for i in {1..5}; do
  curl -X POST https://your-domain.com/functions/v1/demo-credentials \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@acmecorp.com"}'
  echo "Request $i: Success"
done

# Request 6: Should be rate limited
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acmecorp.com"}'

# Expected Response: 429 Too Many Requests
{
  "error": "Too many requests. Please try again in 1 hour.",
  "retryAfter": 3600
}

# ✅ PASS: Rate limiting works correctly
```

#### Test 1.1.5: Wrong HTTP Method
```bash
# Request with GET (wrong method)
curl -X GET https://your-domain.com/functions/v1/demo-credentials

# Expected Response: 405 Method Not Allowed
{
  "error": "Method not allowed"
}

# ✅ PASS: Only allows POST
```

### Test 1.2: Login Security

#### Test 1.2.1: Valid Credentials
```bash
# Login with real account
Email: test@company.com
Password: [Valid password]

# ✅ PASS: Login succeeds, redirects to dashboard
```

#### Test 1.2.2: Invalid Password
```bash
# Attempt login with wrong password
Email: test@company.com
Password: wrongpassword123

# ✅ PASS: Rejection message appears
# Note: Message should be generic (not "wrong password")
# Error: "Invalid credentials. Please check email and password."
```

#### Test 1.2.3: Brute Force Protection
```bash
# Attempt 10 failed logins in rapid succession
# Observe timeout/CAPTCHA appears after 5-10 attempts

# ✅ PASS: Account locks or CAPTCHArequired after failed attempts
```

#### Test 1.2.4: Password Reset
```bash
# 1. Click "Forgot Password"
# 2. Enter email: test@company.com
# 3. Check email for reset link

# ✅ PASS: Reset email arrives with token
# ✅ PASS: Token is one-time use only
# ✅ PASS: Token expires after 24 hours
```

---

## Section 2: Data Access Control (RLS) Testing

### Test 2.1: Profile Access

#### Test 2.1.1: Users Can View Own Profile
```typescript
// User logs in as: user1@company.com
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// ✅ PASS: Returns user's profile
// ✅ PASS: Can view full details
```

#### Test 2.1.2: Users Cannot View Other Profiles
```typescript
// User1 tries to view User2's profile
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', 'user2-id')
  .single();

// ✅ PASS: Returns empty result (RLS denies)
// ✅ PASS: No error message (security)
```

#### Test 2.1.3: Admins Can View Company Profiles
```typescript
// Admin logs in as: admin@company.com
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('company_id', companyId);

// ✅ PASS: Returns all company profiles
```

#### Test 2.1.4: Admins Cannot View Other Company Profiles
```typescript
// Admin from Company A tries to view Company B profiles
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('company_id', 'company-b-id');

// ✅ PASS: Returns empty result (RLS denies)
```

### Test 2.2: Ticket Access

#### Test 2.2.1: Users Can View Company Tickets
```typescript
// User from Company A views tickets
const { data } = await supabase
  .from('tickets')
  .select('*')
  .eq('company_id', 'company-a-id');

// ✅ PASS: Returns only Company A tickets
```

#### Test 2.2.2: Users Cannot View Other Company Tickets
```typescript
// User from Company A tries to view Company B tickets
const { data } = await supabase
  .from('tickets')
  .select('*')
  .eq('company_id', 'company-b-id');

// ✅ PASS: Returns empty result
```

#### Test 2.2.3: Delete Permission Restricted to Admins
```typescript
// Agent tries to delete ticket
const { error } = await supabase
  .from('tickets')
  .delete()
  .eq('id', 'ticket-id');

// ✅ PASS: Returns 403 Forbidden (RLS denies)

// Admin deletes ticket (same request)
// ✅ PASS: Delete succeeds
```

---

## Section 3: Input Validation Testing

### Test 3.1: Email Validation

#### Test 3.1.1: Invalid Email Format
```typescript
// Try to create account with invalid email
const response = await signUp({
  email: 'not-an-email',
  password: 'Password123!'
});

// ✅ PASS: Returns validation error
```

#### Test 3.1.2: SQL Injection Attempt
```typescript
// Try email with SQL injection
const email = "test'; DROP TABLE profiles; --@company.com";

const response = await signUp({
  email: email,
  password: 'Password123!'
});

// ✅ PASS: Returns validation error
// ✅ PASS: Database not affected
```

#### Test 3.1.3: XSS Attempt in Email
```typescript
// Try email with script tag
const email = "<script>alert('xss')</script>@company.com";

const response = await signUp({
  email: email,
  password: 'Password123!'
});

// ✅ PASS: Returns validation error
```

### Test 3.2: Password Validation

#### Test 3.2.1: Password Too Short
```bash
# Attempt to set password: 'Test'

# ✅ PASS: Error "Password must be at least 6 characters"
```

#### Test 3.2.2: Password Complexity
```bash
# Attempt to set password: '123456'

# Current behavior: Accepted
# Recommendation: Add complexity requirements
# - Minimum 8 characters
# - Mix of uppercase, lowercase, numbers
```

---

## Section 4: HTTPS & Transport Security Testing

### Test 4.1: HTTPS Enforcement

#### Test 4.1.1: HTTP Redirects to HTTPS
```bash
# Request over HTTP
curl -I http://your-domain.com

# Expected: 301 Redirect to HTTPS
# Status: HTTP/1.1 301 Moved Permanently
# Location: https://your-domain.com

# ✅ PASS: All HTTP requests redirect
```

#### Test 4.1.2: SSL Certificate Valid
```bash
# Check certificate
openssl s_client -connect your-domain.com:443 -showcerts

# ✅ PASS: Certificate is valid
# ✅ PASS: Not self-signed
# ✅ PASS: Domain matches
# ✅ PASS: Expiration date in future
```

#### Test 4.1.3: Strong TLS Version
```bash
# Check minimum TLS version
curl --tlsv1.1 https://your-domain.com

# ✅ PASS: TLS 1.1 rejected (forced TLS 1.2+)

curl --tlsv1.2 https://your-domain.com

# ✅ PASS: TLS 1.2 accepted
```

### Test 4.2: Security Headers

#### Test 4.2.1: Check All Headers Present
```bash
curl -I https://your-domain.com | grep -i "strict-transport-security"

# ✅ PASS: Header present
# Strict-Transport-Security: max-age=31536000; includeSubDomains

# Check other headers
curl -I https://your-domain.com | grep -E "(X-Content-Type-Options|X-Frame-Options|X-XSS-Protection)"

# ✅ PASS: All security headers present
```

---

## Section 5: Data Exposure Testing

### Test 5.1: No Credentials in Logs

#### Test 5.1.1: Check Browser Console
```javascript
// Open DevTools (F12)
// Go to Network tab
// Make login request
// Inspect request/response body

// ✅ PASS: No credentials in request body
// ✅ PASS: No tokens in plain text
```

#### Test 5.1.2: Check Network Traffic
```bash
# Use Wireshark to inspect network traffic
# All sensitive data should be encrypted (HTTPS only)

# ✅ PASS: No plaintext credentials visible
```

#### Test 5.1.3: Check LocalStorage
```javascript
// Open DevTools
// Application > Local Storage

// ✅ PASS: Only JWT token stored (not password)
// ✅ PASS: No sensitive user data stored
```

### Test 5.2: Error Messages Don't Reveal Secrets

#### Test 5.2.1: Generic Error Messages
```bash
# Try to reset password for non-existent email
Email: nonexistent@domain.com

# Expected message:
# "If an account exists, you will receive a reset email"

# ✅ PASS: Doesn't reveal if email exists
```

#### Test 5.2.2: No Stack Traces in Production
```bash
# Trigger an error in app
# Check error message in UI

# ✅ PASS: Shows "Something went wrong"
# ✅ PASS: No stack trace visible
# ✅ PASS: Full error only in console logs (backend)
```

---

## Section 6: Session Security Testing

### Test 6.1: Session Management

#### Test 6.1.1: JWT Token Expiration
```typescript
// Login successfully
// Wait for token to expire (1 hour by default)

// Try to make authenticated request
const { data, error } = await supabase
  .from('tickets')
  .select('*');

// ✅ PASS: Request fails with auth error
// ✅ PASS: User redirected to login
```

#### Test 6.1.2: Logout Invalidates Session
```typescript
// 1. Login
// 2. Click Logout
// 3. Try to access dashboard directly

// ✅ PASS: Redirected to login page
// ✅ PASS: Token removed from storage
```

#### Test 6.1.3: Token Refresh
```typescript
// Check if token auto-refreshes before expiration

// ✅ PASS: New token issued before expiration
// ✅ PASS: No forced logout during session
```

---

## Section 7: Database Security Testing

### Test 7.1: RLS Policies Enabled

#### Test 7.1.1: Verify RLS Status
```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'tickets', 'companies');

-- ✅ PASS: All tables have rowsecurity = true
```

#### Test 7.1.2: List All Policies
```sql
SELECT policyname, tablename, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ✅ PASS: All expected policies are listed
```

### Test 7.2: Direct Database Access Blocked

#### Test 7.2.1: Cannot Access Without Authentication
```bash
# Try to connect directly to database
psql -h your-project.supabase.co -U postgres -d postgres

# ✅ PASS: Connection refused
# ✅ PASS: Only Supabase can access
```

---

## Section 8: Performance & Abuse Testing

### Test 8.1: Rate Limiting

#### Test 8.1.1: Demo Endpoint Rate Limiting
```bash
# Already tested in Section 1.1.4
# ✅ PASS: Limits at 5 requests per hour per IP
```

#### Test 8.1.2: Login Rate Limiting
```bash
# Make 10 failed login attempts rapidly
# Observe rate limiting kicks in

# ✅ PASS: Delays increase after each attempt
# ✅ PASS: Temporary lockout after 5-10 attempts
```

### Test 8.2: DoS Protection

#### Test 8.2.1: Large Payload Rejection
```bash
# Send extremely large JSON to endpoint
curl -X POST https://your-domain.com/functions/v1/demo-credentials \
  -H "Content-Type: application/json" \
  -d "$(python -c 'print(\"{\\\"email\\\":\\\"\" + \"a\" * 1000000 + \"\\\"}\")')"

# ✅ PASS: Returns 413 Payload Too Large
```

---

## Test Execution Checklist

### Pre-Testing
- [ ] Testing environment isolated (not production)
- [ ] Have at least 2 test accounts (different companies)
- [ ] Have admin account for testing
- [ ] Browser DevTools ready for inspection
- [ ] Postman/curl installed for API testing

### During Testing
- [ ] Document all test results
- [ ] Screenshot failures
- [ ] Note any unusual behavior
- [ ] Record test execution time

### Post-Testing
- [ ] All critical tests must PASS
- [ ] Document any failed tests
- [ ] Create bug reports for failures
- [ ] Fix all security-related failures before production

---

## Test Results Template

```markdown
## Security Test Results - [Date]

| Test | Status | Notes |
|------|--------|-------|
| 1.1.1 Demo Valid Request | ✅ PASS | Response correct |
| 1.1.2 Demo Invalid Email | ✅ PASS | Generic error returned |
| 1.1.4 Rate Limiting | ✅ PASS | 429 after 5 requests |
| 2.1.1 Own Profile Access | ✅ PASS | Can view own profile |
| 2.1.2 Other Profile Access | ✅ PASS | RLS denies access |
| 4.1.1 HTTPS Enforced | ✅ PASS | HTTP redirects |
| 4.2.1 Security Headers | ✅ PASS | All headers present |
| 5.1.1 Console Clean | ✅ PASS | No credentials logged |

**Overall Result:** ✅ ALL TESTS PASSED  
**Tested by:** [Your Name]  
**Date:** [Date]  
**Approved for Production:** ✅ YES / ❌ NO
```

---

## Continuous Security Testing

### Automated Testing (CI/CD)

Add to your CI pipeline:

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run Security Audit
        run: npm audit --audit-level=moderate
      
      - name: Check for Hardcoded Secrets
        run: npm run check-secrets
      
      - name: Run OWASP ZAP Scan
        uses: zaproxy/action-full-scan@v0
        with:
          target: 'https://staging.your-domain.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

### Manual Testing Schedule

- **Weekly:** Run basic security tests (1.1, 1.2, 4.1)
- **Monthly:** Full security test suite
- **Quarterly:** Professional penetration testing
- **After major changes:** Full security test suite

---

## Reporting Bugs Found During Testing

If you find a security issue:

1. **STOP** - Do not continue testing
2. **Document** - Note exactly what you did
3. **Report** - Contact security team immediately
4. **Fix** - Don't deploy until fixed
5. **Re-test** - Verify fix works

**Security Contact:** security@your-domain.com

---

**Last Updated:** 2026-06-03  
**Maintained by:** Security Team  
**Status:** ✅ Ready for Use
