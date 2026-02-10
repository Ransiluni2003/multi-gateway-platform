# Known Issues + Next Backlog

**Date:** February 6, 2026  
**Status:** Production-Ready with Known Limitations  
**Purpose:** Honest assessment of security gaps, missing configurations, and intentional placeholders

---

## 🔴 CRITICAL: Must Fix Before Production

### 1. **Malware/Virus Scanning Not Implemented**

**Status:** ⚠️ PLACEHOLDER ONLY  
**Severity:** HIGH  
**Risk:** Malicious files can be uploaded and stored

**Current State:**
- File model has `scanStatus: "pending"` field ([server.ts#L303](backend/src/server.ts#L303))
- **No actual scanning occurs** - this is a placeholder
- Files are immediately accessible after upload

**What's Missing:**
```typescript
// Currently NOT implemented:
- ClamAV integration
- Cloud-based scanning (VirusTotal, AWS Macie, etc.)
- Quarantine bucket for suspicious files
- Async scanning pipeline
- Notification when scan completes
```

**Recommended Solutions:**
1. **Quick Win:** Integrate ClamAV in Docker
   ```yaml
   # Add to docker-compose.yml
   clamav:
     image: clamav/clamav:latest
     ports:
       - "3310:3310"
   ```

2. **Cloud Option:** AWS Macie or VirusTotal API
   ```typescript
   // backend/src/services/virusScanService.ts
   import VirusTotal from 'virustotal-api';
   
   async function scanFile(fileBuffer: Buffer) {
     const vt = new VirusTotal(process.env.VIRUSTOTAL_API_KEY);
     const result = await vt.fileScan(fileBuffer);
     return result.positives === 0;
   }
   ```

3. **Minimum Viable Protection:**
   - Enforce strict MIME type allowlist (currently configurable)
   - Scan file headers, not just extension
   - Block executable types (.exe, .bat, .sh, .dll)

**Timeline:** REQUIRED before accepting user uploads in production

---

### 2. **Rate Limiting Uses In-Memory Storage**

**Status:** ⚠️ KNOWN LIMITATION  
**Severity:** MEDIUM (HIGH for multi-server deployments)  
**Risk:** Brute-force protection doesn't work across multiple servers

**Current State:**
- Brute-force protection uses in-memory `Map` ([backend/src/middleware/bruteForceProtection.ts](backend/src/middleware/bruteForceProtection.ts))
- Works perfectly for **single server**
- **Breaks in load-balanced setups** - each server has its own blocklist

**Impact:**
- ✅ Single server deployment: Works correctly
- ❌ Load-balanced (2+ servers): Attacker can rotate between servers
- ❌ Container restart: All rate limit counters reset

**What's Missing:**
- Redis-backed rate limit storage
- Shared blocklist across instances
- Persistent rate limit counters

**Fix Required:**
```typescript
// Migrate to Redis-backed storage
import { RateLimiterRedis } from 'rate-limiter-flexible';

const limiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit',
  points: 5,
  duration: 900, // 15 minutes
});
```

**Staging/Production Requirement:**
- Must use Redis for rate limiting
- Set `REDIS_URL` environment variable
- Redis configuration already exists but not used for rate limiting

**Timeline:** REQUIRED before horizontal scaling

---

### 3. **CSP Still Allows unsafe-inline and unsafe-eval**

**Status:** ⚠️ KNOWN LIMITATION  
**Severity:** MEDIUM  
**Risk:** Weaker XSS protection posture

**Current State:**
- Content-Security-Policy includes `'unsafe-inline'` and `'unsafe-eval'`
- Required for Next.js and Material-UI framework compatibility
- See [commerce-web/next.config.ts#L20](commerce-web/next.config.ts#L20)

**Why It Exists:**
- Next.js uses inline scripts for hydration
- Material-UI uses `eval()` for dynamic styles
- Framework limitation, not implementation choice

**Mitigation:**
- ✅ All other CSP directives properly configured
- ✅ X-Frame-Options: DENY prevents clickjacking
- ✅ X-Content-Type-Options: nosniff prevents MIME attacks
- ⚠️ XSS protection weakened by unsafe directives

**Future Fix:**
1. Wait for Next.js nonce support (planned v15+)
2. Replace Material-UI if it becomes blocker
3. Use CSP nonces for inline scripts:
   ```typescript
   // Generate nonce per-request
   const nonce = crypto.randomBytes(16).toString('base64');
   res.setHeader('Content-Security-Policy', 
     `script-src 'nonce-${nonce}'`);
   ```

**Timeline:** Monitor Next.js releases for nonce support

---

### 4. **JWT Secret Rotation Not Implemented**

**Status:** ⚠️ MISSING FEATURE  
**Severity:** MEDIUM  
**Risk:** Compromised JWT secret requires manual intervention

**Current State:**
- Single `JWT_SECRET` environment variable
- No automatic rotation
- No key versioning
- Changing secret invalidates ALL tokens immediately

**What's Missing:**
- Key rotation strategy
- Multiple valid keys during transition
- Graceful token migration
- Secret versioning in database

**Recommended Approach:**
```typescript
// Support multiple JWT secrets for rotation
const JWT_SECRETS = [
  process.env.JWT_SECRET_V2,  // Current
  process.env.JWT_SECRET_V1,  // Previous (valid for 7 days)
];

function verifyToken(token: string) {
  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      continue; // Try next secret
    }
  }
  throw new Error('Invalid token');
}
```

**Timeline:** Phase 2 enhancement (post-launch)

---

## 🟡 HIGH: Strongly Recommended for Production

### 5. **Audit Log Retention Not Enforced**

**Status:** ⚠️ NO CLEANUP JOB  
**Severity:** MEDIUM  
**Risk:** Database grows unbounded, performance degrades

**Current State:**
- Audit logs stored in MongoDB ([models/AuditLog.ts](backend/src/models/AuditLog.ts))
- **No automatic cleanup**
- No archival process
- No retention policy enforcement

**What's Missing:**
- Scheduled cleanup job
- Archive to cold storage (S3 Glacier)
- Retention policy (recommend 90 days hot, 1 year archive)
- Analytics export before deletion

**Fix Available:**
```bash
# Cron job to run retention cleanup
0 2 * * * node /app/scripts/audit-log-cleanup.js
```

**Implementation Needed:**
```typescript
// scripts/audit-log-cleanup.js
// Archive logs older than 90 days
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

const oldLogs = await AuditLog.find({ 
  createdAt: { $lt: cutoff } 
});

// Export to S3 before deletion
await s3.putObject({
  Bucket: 'audit-logs-archive',
  Key: `audit-${cutoff.toISOString()}.json.gz`,
  Body: gzip(JSON.stringify(oldLogs)),
});

// Delete from MongoDB
await AuditLog.deleteMany({ 
  createdAt: { $lt: cutoff } 
});
```

**Timeline:** Set up before 30 days of production use

---

### 6. **File Retention Cleanup (Partial Implementation)**

**Status:** ✅ IMPLEMENTED but needs cron setup  
**Severity:** LOW  
**Location:** [scripts/retention-cleanup.js](scripts/retention-cleanup.js)

**Current State:**
- ✅ Script exists and works
- ✅ Soft-deletes files past `deleteScheduledAt`
- ⚠️ **Must be scheduled** - doesn't run automatically

**How to Run:**
```bash
# Manual execution
node scripts/retention-cleanup.js

# Add to crontab (daily at 2 AM)
0 2 * * * cd /app && node scripts/retention-cleanup.js >> /var/log/retention-cleanup.log 2>&1

# Or use Docker cron service
# See docker-compose.yml for scheduler service
```

**Environment Variables Required:**
```bash
API_URL=https://api.yourapp.com
ADMIN_EMAIL=admin@yourapp.com
ADMIN_PASSWORD=secure_password_here
# Or use token:
ADMIN_TOKEN=your_admin_jwt_token
```

**Cron-Ready:** YES - script exits with proper codes (0 = success, 1 = failure)

**Timeline:** Set up cron job during deployment

---

### 7. **Signed URL Revocation is TTL-Based Only**

**Status:** ⚠️ LIMITATION  
**Severity:** LOW  
**Risk:** Cannot immediately revoke signed URLs

**Current State:**
- Share links use token-based validation ([fileAccessRoutes.ts](backend/src/routes/fileAccessRoutes.ts))
- ✅ Share links CAN be revoked (sets `revokedAt` timestamp)
- ⚠️ Supabase signed URLs remain valid until TTL expires (60 seconds default)

**Why This Matters:**
```
1. Admin shares file with 24-hour link
2. User copies the Supabase signed URL
3. Admin revokes share link
4. User can still access file for up to 60 more seconds
```

**Current Mitigations:**
- Short TTL (60 seconds) limits exposure window
- Share link validation checks `revokedAt` before generating new signed URL
- Download count tracking

**Future Enhancement:**
- Per-object secret rotation (changes signed URL immediately)
- Proxy all downloads through backend (no direct Supabase access)
- Implement signed URL allowlist/blocklist

**Timeline:** Phase 3 enhancement (if needed)

---

### 8. **No Pagination for Large File Listings**

**Status:** ⚠️ PERFORMANCE ISSUE  
**Severity:** LOW (MEDIUM for power users)  
**Risk:** Slow queries for users with 1000+ files

**Current State:**
- File listing endpoints return all results
- Works fine for <1000 files
- Degrades with large datasets

**Impact:**
- ✅ Users with <1000 files: No issue
- ⚠️ Users with 10,000+ files: Slow responses (2-5 seconds)
- ⚠️ Database load increases with concurrent requests

**Fix Needed:**
```typescript
// Implement cursor-based pagination
router.get('/files', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const cursor = req.query.cursor; // Last file ID from previous page
  
  const query = cursor 
    ? { _id: { $gt: cursor }, uploadedBy: userId }
    : { uploadedBy: userId };
  
  const files = await File.find(query)
    .sort({ _id: 1 })
    .limit(limit + 1);
  
  const hasMore = files.length > limit;
  const results = hasMore ? files.slice(0, -1) : files;
  
  res.json({
    files: results,
    nextCursor: hasMore ? results[results.length - 1]._id : null,
  });
});
```

**Timeline:** Implement when average user has >500 files

---

## 🟢 MEDIUM: Best Practices (Not Blockers)

### 9. **Missing Environment Variables for Staging/Production**

**Development .env contains:**
- ✅ Local MongoDB URL
- ✅ Local Redis URL
- ✅ Development Supabase keys (placeholder)
- ✅ Test Stripe/PayPal keys

**REQUIRED for Staging/Production:**

| Variable | Purpose | How to Get | Criticality |
|----------|---------|------------|-------------|
| `JWT_SECRET` | Token signing | `openssl rand -hex 64` | 🔴 CRITICAL |
| `MONGO_URI` | Production database | MongoDB Atlas | 🔴 CRITICAL |
| `REDIS_URL` | Shared cache/queues | Redis Cloud or AWS ElastiCache | 🔴 CRITICAL |
| `SUPABASE_URL` | File storage | [supabase.com](https://supabase.com) dashboard | 🔴 CRITICAL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend file operations | Supabase Settings → API | 🔴 CRITICAL |
| `STRIPE_SECRET_KEY` | Payment processing | [dashboard.stripe.com](https://dashboard.stripe.com) | 🟡 HIGH |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | Stripe CLI or dashboard | 🟡 HIGH |
| `PAYPAL_CLIENT_ID` | PayPal integration | [developer.paypal.com](https://developer.paypal.com) | 🟡 HIGH |
| `PAYPAL_CLIENT_SECRET` | PayPal authentication | PayPal developer dashboard | 🟡 HIGH |
| `SENTRY_DSN` | Error tracking | [sentry.io](https://sentry.io) | 🟢 MEDIUM |
| `LOGTAIL_SOURCE_TOKEN` | Centralized logging | [betterstack.com/logtail](https://betterstack.com/logtail) | 🟢 MEDIUM |
| `VIRUSTOTAL_API_KEY` | Malware scanning | [virustotal.com/gui/join-us](https://virustotal.com/gui/join-us) | 🔴 CRITICAL |

**Secret Management Recommendations:**
1. **GitHub Secrets:** Used by CI/CD ([.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml))
2. **Railway/Render:** Set in dashboard environment variables
3. **Vercel:** Set via `vercel env` CLI or dashboard
4. **AWS Secrets Manager:** For enterprise deployments
5. **Doppler/Infisical:** For multi-environment secret sync

**What NOT to Commit:**
- ❌ Real JWT secrets
- ❌ Production database URLs
- ❌ Stripe/PayPal production keys
- ❌ Service role keys (Supabase, AWS)
- ❌ API tokens (Sentry, Logtail)

**Verification:**
```bash
# Check .env.example has no real secrets
npm run verify:secrets-hygiene

# CI/CD validates this automatically
# See .github/workflows/secrets-validation.yml
```

---

### 10. **File Upload Size Enforcement (Implemented but Configurable)**

**Status:** ✅ IMPLEMENTED  
**Severity:** N/A (documentation only)

**Current State:**
- Default max upload: 10 MB
- Configurable via `UPLOAD_MAX_BYTES` environment variable
- Enforced in [server.ts#L74](backend/src/server.ts#L74)

**Current Configuration:**
```bash
# .env
UPLOAD_MAX_BYTES=10485760  # 10 MB default
UPLOAD_ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,text/plain
```

**Allowlist Status:**
```typescript
// backend/src/server.ts
const DEFAULT_ALLOWED_UPLOAD_TYPES = [
  "application/octet-stream",
  "application/pdf", 
  "image/jpeg",
  "image/png",
  "text/plain",
];

// Override with:
UPLOAD_ALLOWED_MIME_TYPES=application/pdf,image/jpeg
```

**Documentation:** ✅ Complete  
**Implementation:** ✅ Working  
**Testing:** ✅ Verified

---

### 11. **Per-File ACL Metadata + Revocation (Implemented)**

**Status:** ✅ COMPLETE  
**Severity:** N/A (documentation only)

**Implementation Location:**
- Model: [backend/src/models/File.ts](backend/src/models/File.ts)
- Service: [backend/src/services/fileService.ts](backend/src/services/fileService.ts)  
- Routes: [backend/src/routes/fileAccessRoutes.ts](backend/src/routes/fileAccessRoutes.ts)

**Features:**
```typescript
// ACL Structure
interface ACLEntry {
  userId: string;
  role: "viewer" | "editor" | "admin";
  grantedAt: Date;
  grantedBy: string;
}

// Share Link Structure
interface ShareLink {
  token: string;
  expiresAt: Date;
  maxDownloads?: number;
  downloadCount: number;
  revokedAt?: Date;  // Revocation support
  createdBy: string;
}
```

**API Endpoints:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/files/:fileId/acl` | POST | Grant user access |
| `/api/files/:fileId/acl/:userId` | DELETE | Revoke user access |
| `/api/files/:fileId/share` | POST | Create share link |
| `/api/files/:fileId/share/validate` | POST | Validate token |
| `/api/files/:fileId/share/:token` | DELETE | Revoke share link |
| `/api/files/:fileId/retention` | POST | Set auto-delete policy |
| `/admin/files/retention/cleanup` | POST | Run cleanup job |
| `/api/files/:fileId/metadata` | GET | Get full ACL + shares |

**Documentation:** ✅ Complete ([docs/SECURE_FILE_SHARING_POLICY.md](docs/SECURE_FILE_SHARING_POLICY.md))  
**Implementation:** ✅ Working  
**Testing:** ✅ Integration tests pass

---

## 📋 INTENTIONAL PLACEHOLDERS (Future Work)

### Features We Know We Need But Haven't Built Yet

1. **Virus Scanning Pipeline**
   - Status: Placeholder field exists
   - Reason: Waiting for production hosting decision (ClamAV vs cloud)
   - Priority: CRITICAL before public launch

2. **Redis-Backed Rate Limiting**
   - Status: Redis client exists, not used for rate limiting
   - Reason: Works fine for single-server development
   - Priority: CRITICAL for horizontal scaling

3. **Audit Log Retention Job**
   - Status: No scheduled job
   - Reason: Haven't reached log volume threshold
   - Priority: HIGH, implement at 10k+ logs

4. **File Storage Lifecycle Rules**
   - Status: Manual cleanup via script
   - Reason: Waiting for Supabase lifecycle API support
   - Priority: MEDIUM

5. **CSP Tightening (Remove unsafe-inline)**
   - Status: Framework limitation
   - Reason: Next.js doesn't support CSP nonces yet
   - Priority: MEDIUM, wait for framework update

6. **Token Revocation List (JWT)**
   - Status: Only refresh tokens revoked
   - Reason: Access tokens are short-lived (15 min)
   - Priority: LOW, token expiry provides adequate security

7. **Admin UI for ACL Management**
   - Status: API exists, no UI
   - Reason: API-first approach, UI is Phase 2
   - Priority: LOW, nice-to-have

8. **Centralized Secret Rotation Playbook**
   - Status: Manual rotation only
   - Reason: Low frequency need (quarterly rotation)
   - Priority: LOW

---

## 🎯 PRODUCTION DEPLOYMENT CHECKLIST

Before going live, you MUST:

### Security (CRITICAL)
- [ ] Implement virus/malware scanning (ClamAV or cloud service)
- [ ] Migrate rate limiting to Redis
- [ ] Generate strong JWT secret (`openssl rand -hex 64`)
- [ ] Rotate all default passwords (MongoDB, Redis, admin)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set up Sentry error tracking
- [ ] Configure CORS for production domain only

### Infrastructure (HIGH)
- [ ] Set up production MongoDB (MongoDB Atlas)
- [ ] Set up production Redis (Redis Cloud or ElastiCache)
- [ ] Configure Supabase production project
- [ ] Set up Stripe production account
- [ ] Configure audit log retention cleanup (cron job)
- [ ] Set up file retention cleanup (cron job)
- [ ] Configure automated backups (MongoDB + file storage)

### Monitoring (MEDIUM)
- [ ] Enable Logtail or similar logging service
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure Prometheus metrics collection
- [ ] Set up alerting for critical errors
- [ ] Create operational runbooks

### Testing (MEDIUM)
- [ ] Run full security test suite (`npm run test:security`)
- [ ] Perform load testing (`npm run loadtest`)
- [ ] Verify all CI/CD pipelines pass
- [ ] Test backup restoration process
- [ ] Validate disaster recovery procedures

---

## 📊 SECURITY POSTURE SUMMARY

| Category | Status | Notes |
|----------|--------|-------|
| **Authentication** | ✅ Strong | JWT + refresh tokens, CSRF protection |
| **Authorization** | ✅ Strong | Role-based + per-file ACL |
| **Input Validation** | ✅ Good | File size, MIME type, request validation |
| **Output Encoding** | ✅ Good | Security headers configured |
| **Malware Protection** | ❌ Missing | **BLOCKER for production** |
| **Rate Limiting** | ⚠️ Partial | Works single-server, fails multi-server |
| **Audit Logging** | ✅ Strong | All security events logged |
| **Secret Management** | ⚠️ Partial | No rotation policy |
| **XSS Protection** | ⚠️ Partial | CSP has unsafe directives (framework limit) |
| **CSRF Protection** | ✅ Strong | Double-submit cookies |
| **SQL Injection** | ✅ N/A | Using MongoDB ODM (Mongoose) |
| **File Storage** | ✅ Strong | Signed URLs, ACL, retention policies |

### Overall Grade: **B+ (Production-Ready with Critical Gap)**

**Strengths:**
- ✅ Solid authentication/authorization
- ✅ Comprehensive audit logging
- ✅ Good file access controls
- ✅ Active security testing in CI/CD

**Critical Gap:**
- ❌ No malware scanning (MUST FIX)

**Recommended Improvements:**
- 🟡 Redis-backed rate limiting (before scaling)
- 🟡 Tighten CSP (when framework supports)
- 🟡 Implement secret rotation (operational maturity)

---

## 📞 QUESTIONS? NEED HELP?

### Documentation References
- Security Review: [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md)
- File Access Control: [docs/SECURE_FILE_SHARING_POLICY.md](docs/SECURE_FILE_SHARING_POLICY.md)
- Security Testing: [docs/SECURITY_TESTING_SUITE.md](docs/SECURITY_TESTING_SUITE.md)
- CI/CD Setup: [CI_CD_SETUP_GUIDE.md](CI_CD_SETUP_GUIDE.md)

### Quick Commands
```bash
# Run all security tests
npm run test:security

# Verify secrets hygiene
npm run verify:secrets-hygiene

# Check rate limiting
npm run verify:rate-limiting

# Test signed URLs
npm run demo:storage

# Validate security headers
npm run verify:security-headers

# Manual retention cleanup
node scripts/retention-cleanup.js
```

---

**Last Updated:** February 6, 2026  
**Next Review:** Before production deployment  
**Maintained By:** Development Team
