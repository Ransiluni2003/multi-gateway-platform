# JWT Secret Rotation Runbook

**Document Type:** Operational Procedure  
**Date:** February 11, 2026  
**Status:** Production-Ready  
**Severity:** HIGH (Security Incident Response)

---

## Table of Contents

1. [When to Rotate JWT Secrets](#when-to-rotate-jwt-secrets)
2. [Pre-Rotation Checklist](#pre-rotation-checklist)
3. [Rotation Procedure](#rotation-procedure)
4. [Rollback Procedure](#rollback-procedure)
5. [Post-Rotation Verification](#post-rotation-verification)
6. [Future Implementation: Versioned Keys](#future-implementation-versioned-keys)

---

## When to Rotate JWT Secrets

### Immediate Rotation Required (Emergency):
- ✅ **Secret exposed** in logs, repository, or monitoring tools
- ✅ **Security breach** suspected or confirmed
- ✅ **Unauthorized access** to environment variables or deployment systems
- ✅ **Employee departure** with access to secrets

### Scheduled Rotation (Best Practice):
- 🔄 **Every 90 days** (quarterly rotation schedule)
- 🔄 **After major security updates** to auth system
- 🔄 **Compliance requirement** (check your organization's security policy)

### Do NOT Rotate:
- ❌ During peak traffic hours
- ❌ During active incidents
- ❌ Without a rollback plan

---

## Pre-Rotation Checklist

### 1. Communication
```bash
# Notify team 24 hours in advance (non-emergency)
- [ ] Engineering team notified
- [ ] DevOps/SRE team notified
- [ ] Support team notified (expect user re-logins)
- [ ] Maintenance window scheduled (if possible)
```

### 2. Backup Current State
```bash
# Save current JWT_SECRET (DO NOT commit to git!)
echo "Current JWT_SECRET (DO NOT SHARE):"
echo $JWT_SECRET > /secure/backup/jwt-secret-backup-$(date +%Y%m%d).txt
chmod 600 /secure/backup/jwt-secret-backup-$(date +%Y%m%d).txt

# Note: Store in password manager or encrypted vault
```

### 3. Generate New Secret
```bash
# Generate cryptographically secure 64-character secret
NEW_JWT_SECRET=$(openssl rand -hex 64)
echo "New JWT_SECRET (DO NOT SHARE):"
echo $NEW_JWT_SECRET

# Verify length (should be 128 characters for hex 64 bytes)
echo $NEW_JWT_SECRET | wc -c  # Should output 129 (128 + newline)
```

### 4. Testing Environment
```bash
# Test rotation in staging first
- [ ] Staging environment available
- [ ] Staging uses same auth flow as production
- [ ] Test user accounts created
```

---

## Rotation Procedure

### Step 1: Update Staging Environment

```bash
# Update staging .env or secrets
export JWT_SECRET="<NEW_SECRET_HERE>"

# OR if using deployment platform:
# Vercel/Netlify:
vercel env add JWT_SECRET production

# AWS:
aws ssm put-parameter \
  --name "/myapp/prod/JWT_SECRET" \
  --value "<NEW_SECRET_HERE>" \
  --type SecureString \
  --overwrite

# Heroku:
heroku config:set JWT_SECRET="<NEW_SECRET_HERE>" --app myapp-staging

# Docker Compose:
# Update docker-compose.yml or .env file, then:
docker-compose up -d --force-recreate
```

### Step 2: Verify Staging

```bash
# Test authentication flow in staging
curl -X POST https://staging.yourapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'

# Expected: New JWT token issued
# Save the token for next test

# Test token verification
TOKEN="<token_from_above>"
curl -X GET https://staging.yourapp.com/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with user data

# Test with old token (should fail)
OLD_TOKEN="<old_token_if_you_have_one>"
curl -X GET https://staging.yourapp.com/api/auth/me \
  -H "Authorization: Bearer $OLD_TOKEN"

# Expected: 401 Unauthorized
```

### Step 3: Update Production

**🚨 CAUTION: All users will be logged out immediately!**

```bash
# Update production environment variable
# (Use your deployment platform's method)

# Example for GitHub Actions secrets:
gh secret set JWT_SECRET --body "<NEW_SECRET_HERE>"

# Example for Kubernetes:
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET="<NEW_SECRET_HERE>" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart application to pick up new secret
# (Method varies by platform)

# Docker:
docker-compose restart backend

# Kubernetes:
kubectl rollout restart deployment/backend

# PM2:
pm2 restart backend

# Vercel/Netlify:
# Redeploy via dashboard or:
vercel --prod
```

### Step 4: Monitor Deployment

```bash
# Watch logs for errors
docker-compose logs -f backend
# OR
kubectl logs -f deployment/backend

# Check health endpoint
curl https://api.yourapp.com/api/health

# Expected: {"status":"ok"}

# Monitor error rate in your observability tool
# (Sentry, DataDog, New Relic, etc.)
```

---

## Rollback Procedure

### If Issues Detected Within 15 Minutes:

```bash
# 1. Immediately revert to old JWT_SECRET
export JWT_SECRET="<OLD_SECRET_FROM_BACKUP>"

# 2. Restart services
docker-compose restart backend

# 3. Verify health
curl https://api.yourapp.com/api/health

# 4. Test authentication
curl -X POST https://api.yourapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'

# 5. Post-mortem: Why did it fail?
# Common causes:
# - Secret not properly set in all services
# - Cached old secret in load balancer
# - Typo in secret value
```

---

## Post-Rotation Verification

### 1. Authentication Tests

```bash
# Test login (new token)
npm run test:auth

# OR manual test:
curl -X POST https://api.yourapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Save token
TOKEN="<token_from_response>"

# Test protected endpoint
curl https://api.yourapp.com/api/files/my-files \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
```

### 2. Verify Old Tokens Are Invalid

```bash
# Try using a token issued before rotation
OLD_TOKEN="<old_token>"
curl https://api.yourapp.com/api/auth/me \
  -H "Authorization: Bearer $OLD_TOKEN"

# Expected: 401 Unauthorized
# Message: "Invalid token" or "jwt malformed"
```

### 3. Check Audit Logs

```bash
# Verify no suspicious activity
curl https://api.yourapp.com/api/audit-logs?limit=50 \
  -H "Authorization: Bearer $TOKEN"

# Look for:
# - Failed authentication attempts (expected spike after rotation)
# - Successful re-logins (expected)
# - No unauthorized access attempts
```

### 4. Monitor Metrics (Next 24 Hours)

```bash
# Expected changes:
- ✅ Spike in login events (users re-authenticating)
- ✅ All old tokens rejected (401 errors expected)
- ⚠️ Support tickets about "logged out" - this is normal

# Unexpected (investigate):
- ❌ Authentication success rate drops below 90%
- ❌ Server errors (5xx) increase
- ❌ Health check failures
```

---

## Future Implementation: Versioned Keys

### Why Versioned Keys?

Current rotation **invalidates all tokens immediately**. Versioned keys allow:
- ✅ Graceful transition period (7-30 days)
- ✅ Users not forced to re-login
- ✅ Safer rotation process

### Implementation Code Scaffolding

**Step 1: Environment Variables**
```env
# .env.production
JWT_SECRET_V2=<new-secret-here>  # Current
JWT_SECRET_V1=<old-secret-here>  # Grace period: 7 days
JWT_KEY_VERSION=2                # Use v2 for new tokens
```

**Step 2: Update JWT Utilities**
```typescript
// backend/src/utils/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRETS = {
  v2: process.env.JWT_SECRET_V2,
  v1: process.env.JWT_SECRET_V1,
};

const CURRENT_VERSION = process.env.JWT_KEY_VERSION || '2';

// Sign with CURRENT secret + add version
export function signToken(payload: any, expiresIn = '7d') {
  return jwt.sign(
    { ...payload, kid: CURRENT_VERSION }, // ← Key ID
    JWT_SECRETS[`v${CURRENT_VERSION}`],
    { expiresIn }
  );
}

// Verify against ALL valid secrets
export function verifyToken(token: string) {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.payload?.kid || '1'; // Default to v1
  
  // Try specified version first
  if (JWT_SECRETS[`v${kid}`]) {
    try {
      return jwt.verify(token, JWT_SECRETS[`v${kid}`]);
    } catch (err) {
      console.warn(`Token verification failed with v${kid}`);
    }
  }
  
  // Fallback: try all secrets for tokens without kid
  for (const [version, secret] of Object.entries(JWT_SECRETS)) {
    if (!secret) continue;
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      continue;
    }
  }
  
  throw new Error('Invalid token');
}
```

**Step 3: Gradual Rotation Process**
```bash
# Week 1: Add V2 (both keys valid)
JWT_SECRET_V2=<new-secret>
JWT_SECRET_V1=<old-secret>
JWT_KEY_VERSION=1  # Still signing with V1

# Deploy, test, monitor

# Week 2: Switch to V2 (both still valid)
JWT_KEY_VERSION=2  # New logins get V2, old V1 tokens still work

# Monitor: V1 token usage should decline over 7 days

# Week 3: Remove V1 (after grace period)
JWT_SECRET_V1=  # Old tokens now invalid
# Only V2 tokens valid from this point
```

**Step 4: Testing Versioned Rotation**
```typescript
// Test both versions accepted during overlap
const oldToken = signTokenV1({ userId: '123' });
const newToken = signTokenV2({ userId: '123' });

expect(verifyToken(oldToken)).toBeTruthy(); // ✅ V1 accepted
expect(verifyToken(newToken)).toBeTruthy(); // ✅ V2 accepted

// After removing V1:
expect(() => verifyToken(oldToken)).toThrow(); // ❌ V1 rejected
expect(verifyToken(newToken)).toBeTruthy();    // ✅ V2 accepted
```

### Estimated Implementation Time:
- Code changes: 3 hours
- Testing: 2 hours
- Documentation: 1 hour
**Total: ~6 hours**

---

## Troubleshooting

### Issue: "Invalid token" errors after rotation

**Cause:** Expected behavior - old tokens are now invalid

**Solution:** Users must log in again. This is normal.

---

### Issue: "JWT_SECRET is not configured" error

**Cause:** New secret not loaded by application

**Solution:**
```bash
# 1. Verify env var is set
echo $JWT_SECRET

# 2. Restart application
docker-compose restart backend

# 3. Check logs
docker-compose logs backend | grep JWT_SECRET
```

---

### Issue: Authentication works but refresh fails

**Cause:** Refresh tokens signed with old secret

**Solution:** Refresh tokens must also be re-issued. Check refresh token service uses same JWT_SECRET.

---

### Issue: Load balancer still using cached old secret

**Cause:** Some load balancers cache environment variables

**Solution:**
```bash
# Force restart all instances
kubectl rollout restart deployment/backend
# Wait for all pods to be ready
kubectl rollout status deployment/backend
```

---

## Emergency Contacts

### If Rotation Fails:
1. **Rollback immediately** (see Rollback Procedure)
2. **Notify on-call engineer:** [Your pager/slack channel]
3. **Check runbook again** for missed steps

### After-Hours Rotation:
- **Only perform emergency rotations after-hours**
- **Have 2 engineers available** (one primary, one backup)
- **Rollback plan ready before starting**

---

## Appendix: Secret Storage Best Practices

### DO:
- ✅ Generate secrets with `openssl rand -hex 64`
- ✅ Store in encrypted vault (1Password, AWS Secrets Manager, HashiCorp Vault)
- ✅ Use different secrets for dev/staging/prod
- ✅ Rotate on a schedule (90 days)
- ✅ Document rotation in audit logs

### DON'T:
- ❌ Commit secrets to Git (even private repos)
- ❌ Share secrets via Slack/email
- ❌ Reuse secrets across environments
- ❌ Use weak secrets (< 32 bytes)
- ❌ Store secrets in plain text files

---

**Document Owner:** Security Team  
**Last Rotation:** [Record here after each rotation]  
**Next Scheduled Rotation:** [90 days from last rotation]  
**Emergency Rotation Contact:** [On-call engineer]

---

## Quick Reference Card

```bash
# Generate secret
openssl rand -hex 64

# Update secret (example: Docker)
export JWT_SECRET="<new-secret>"
docker-compose restart backend

# Verify it works
curl -X POST https://api.yourapp.com/api/auth/login \
  -d '{"email":"test@example.com","password":"Test@123"}'

# Monitor logs
docker-compose logs -f backend | grep "JWT"
```

**Remember:** Rotation = All users logged out! Plan accordingly.
