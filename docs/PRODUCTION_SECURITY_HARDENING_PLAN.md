# Production Security Hardening Plan

**Date:** February 11, 2026  
**Status:** Action Required Before Production  
**Repository:** multi-gateway-platform  
**Purpose:** Clear, actionable security improvements with repo-specific implementation paths

---

## Executive Summary

This platform is **demo/staging ready** but has **4 critical gaps** blocking production deployment. This document provides the exact implementation path for each issue, including code locations, trade-offs, and failure modes.

---

## 🔴 BLOCKING PRODUCTION TODAY

### 1. Content Security Policy (CSP) - `unsafe-inline` Risk

**Current State:**
- **Location:** [commerce-web/next.config.ts#L23-L24](../commerce-web/next.config.ts#L23-L24)
- **Issue:** `'unsafe-inline'` and `'unsafe-eval'` weaken XSS protection
- **Why it exists:** Next.js hydration + Material-UI dynamic styles require it

```typescript
// Current (PERMISSIVE):
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
```

**The Nonce/Strict CSP Path (Recommended):**

**Step 1:** Add nonce generation middleware (middleware.ts)
```typescript
// commerce-web/middleware.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware(req: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64');
  
  const cspHeader = `
    script-src 'self' 'nonce-${nonce}' https://js.stripe.com;
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
  `.replace(/\s+/g, ' ').trim();
  
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce); // Pass to React
  
  return response;
}
```

**Step 2:** Update _document.tsx to inject nonce
```typescript
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';
import { headers } from 'next/headers';

export default function Document() {
  const nonce = headers().get('x-nonce');
  
  return (
    <Html>
      <Head nonce={nonce} />
      <body>
        <Main />
        <NextScript nonce={nonce} />
      </body>
    </Html>
  );
}
```

**Step 3:** Material-UI configuration
```typescript
// commerce-web/pages/_app.tsx
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const cache = createCache({
  key: 'css',
  nonce: typeof window !== 'undefined' 
    ? document.querySelector('meta[property="csp-nonce"]')?.getAttribute('content')
    : undefined,
});

function MyApp({ Component, pageProps }) {
  return (
    <CacheProvider value={cache}>
      <Component {...pageProps} />
    </CacheProvider>
  );
}
```

**Trade-offs:**
- ✅ **Pro:** Significantly stronger XSS protection (inline scripts won't execute without nonce)
- ✅ **Pro:** Industry best practice, passes security audits
- ❌ **Con:** Requires Next.js 13.4+ (check current version: `package.json`)
- ❌ **Con:** Breaks hot module reload in development (need dev-only exception)
- ❌ **Con:** Material-UI v4 doesn't support nonces (need v5+ upgrade)

**Estimated Effort:** 2-3 days (includes testing all pages/components)

**Alternative (Keep `unsafe-inline` but add monitoring):**
- Add CSP violation reporting endpoint
- Monitor for actual inline script injection attempts
- Accept risk for MVP, plan strict CSP for v2.0

```typescript
// Add to CSP header:
"report-uri /api/csp-report; report-to csp-endpoint"
```

**Decision Required:** 
- [ ] **SHIP NOW:** Keep `unsafe-inline`, add violation monitoring (1 day)
- [ ] **HARDEN FIRST:** Implement nonce-based CSP (2-3 days, blocks launch)

---

### 2. Rate Limiting - In-Memory Risk

**Current State:**
- **Location:** [backend/src/middleware/bruteForceProtection.ts#L11-L18](../backend/src/middleware/bruteForceProtection.ts#L11-L18)
- **Issue:** Rate limits stored in JavaScript `Map`, lost on restart/scale-out
- **Impact:** ⚠️ **Single server works fine**, breaks with load balancing

```typescript
// Current (IN-MEMORY):
const ipRateLimits = new Map<string, RateLimitEntry>();
```

**The Redis/Upstash Migration Path:**

**Step 1:** Choose backing store
| Option | Pros | Cons | Setup Time |
|--------|------|------|------------|
| **Redis (docker-compose)** | Already in repo, free, local dev works | Requires ops management | 2 hours |
| **Upstash (cloud)** | Serverless, zero ops, free tier | Requires signup, slight latency | 30 mins |

**Step 2a:** Redis Implementation (Recommended for self-hosted)

```typescript
// backend/src/middleware/bruteForceProtection.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../config/redis'; // ← Already exists!

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'bruteforce',
  points: 10,          // Max attempts
  duration: 900,       // 15 minutes (in seconds)
  blockDuration: 1800, // 30 minutes block
});

export async function bruteForceProtection(req, res, next) {
  const ip = getClientIP(req);
  
  try {
    await rateLimiter.consume(ip); // ← Atomic Redis operation
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000),
    });
  }
}
```

**Config Required:**
```env
# .env.production
REDIS_URL=redis://localhost:6379
# OR for Upstash:
REDIS_URL=rediss://:password@endpoint.upstash.io:6379
```

**Step 2b:** Upstash Implementation (Recommended for Vercel/serverless)

```bash
# Install Upstash client
npm install @upstash/redis
```

```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv(); // Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

export async function checkRateLimit(ip: string) {
  const key = `ratelimit:${ip}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 900); // 15 minutes
  }
  
  if (count > 10) {
    throw new Error('Rate limit exceeded');
  }
  
  return count;
}
```

**Failure Modes & Handling:**

```typescript
// Graceful degradation if Redis is down
export async function bruteForceProtection(req, res, next) {
  try {
    await rateLimiter.consume(ip);
    next();
  } catch (err) {
    if (err.name === 'RedisConnectionError') {
      logger.error('Redis unavailable, rate limiting disabled', err);
      // ALLOW request (fail open) or BLOCK (fail closed)?
      next(); // ← Decision point: permissive vs paranoid
    } else {
      // Rate limit triggered
      res.status(429).json({ error: 'Too many attempts' });
    }
  }
}
```

**Decision Point - Fail Open vs Fail Closed:**
- **Fail Open (allow requests):** Users not impacted by Redis outage, attackers can bypass
- **Fail Closed (block requests):** Attackers blocked, legitimate users also impacted

**Recommended:** Fail open with metric spike alerting

**Estimated Effort:** 
- Redis: 4 hours (including tests)
- Upstash: 2 hours

**Testing Verification:**
```bash
# Test rate limit persistence across restarts
curl -X POST http://localhost:3000/api/auth/login # (10 times)
docker-compose restart backend
curl -X POST http://localhost:3000/api/auth/login # Should still be rate-limited
```

**Decision Required:**
- [ ] **MVP:** Keep in-memory for single-server deploy (document limitation)
- [ ] **PRODUCTION:** Migrate to Redis/Upstash before scaling (blocks horizontal scaling)

---

### 3. JWT Secret Rotation - Missing Versioning

**Current State:**
- **Location:** Environment variable `JWT_SECRET` (single key)
- **Issue:** Rotating secret invalidates ALL active sessions immediately
- **Impact:** All users logged out on secret change (compromised key = mass logout)

**Simple Versioned Key Strategy:**

**Step 1:** Add key versioning to .env
```env
# .env.production
JWT_SECRET_V2=<new-key-generated-2026-02-11>  # Current
JWT_SECRET_V1=<old-key-generated-2026-01-01>  # Grace period: 7 days
JWT_KEY_VERSION=2  # Encode new tokens with this
```

**Step 2:** Update JWT utilities (backend/src/utils/jwt.ts)
```typescript
// backend/src/utils/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRETS = {
  v2: process.env.JWT_SECRET_V2,
  v1: process.env.JWT_SECRET_V1,
};

const CURRENT_VERSION = process.env.JWT_KEY_VERSION || '2';

// Sign with CURRENT secret
export function signToken(payload: any, expiresIn = '7d') {
  return jwt.sign(
    { ...payload, kid: CURRENT_VERSION }, // ← Key ID in token
    JWT_SECRETS[`v${CURRENT_VERSION}`],
    { expiresIn }
  );
}

// Verify against ALL valid secrets
export function verifyToken(token: string) {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.payload?.kid || '1'; // Default to v1 for old tokens
  
  // Try specified version first
  if (JWT_SECRETS[`v${kid}`]) {
    try {
      return jwt.verify(token, JWT_SECRETS[`v${kid}`]);
    } catch (err) {
      logger.warn(`Token verification failed with v${kid}`, err);
    }
  }
  
  // Fallback: try all secrets (for tokens without kid)
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

**Step 3:** Safe rotation procedure
```bash
# Week 1: Add V2 key (don't change JWT_KEY_VERSION yet)
JWT_SECRET_V2=<new-64-char-key>
JWT_SECRET_V1=<current-key>
JWT_KEY_VERSION=1  # Still signing with V1

# Week 2: Switch to V2 for new tokens (7-day overlap window)
JWT_KEY_VERSION=2  # New logins get V2 tokens, old V1 tokens still valid

# Week 3: Remove V1 (after grace period)
JWT_SECRET_V1=  # Old tokens now invalid (force re-login)
```

**Overlap Window Trade-offs:**
- **7 days:** Balances security vs user convenience (1 week re-login window)
- **24 hours:** Faster rotation, more user disruption
- **30 days:** Longer grace period, slower incident response

**Estimated Effort:** 3 hours (implementation + testing)

**Testing Verification:**
```typescript
// Test rotation scenario
const oldToken = signToken({ userId: '123' }); // V1
process.env.JWT_KEY_VERSION = '2';
const newToken = signToken({ userId: '123' }); // V2

// Both should verify successfully during overlap
expect(verifyToken(oldToken)).toBeTruthy();
expect(verifyToken(newToken)).toBeTruthy();
```

**Decision Required:**
- [ ] **MVP:** Keep single secret (document manual rotation procedure)
- [ ] **HARDENED:** Implement versioned rotation (3 hours, unblocks incident response)

---

### 4. Malware Scanning - Placeholder Only

**Current State:**
- **Location:** [backend/src/server.ts#L303](../backend/src/server.ts#L303) (file model has `scanStatus` field)
- **Issue:** Field exists, NO actual scanning occurs
- **Impact:** Malicious files (`.exe`, `.bat`, malware-laden PDFs) can be uploaded

**The Hook Point (Current Upload Flow):**
```typescript
// backend/src/server.ts (simplified)
router.post('/api/files/upload-url', async (req, res) => {
  const { filename, contentType } = req.body;
  
  // 1. ✅ MIME type check exists
  const allowedTypes = ['image/', 'application/pdf', 'text/'];
  
  // 2. ✅ Supabase signed URL generated
  const { signedUrl } = await supabase.storage
    .from('user-files')
    .createSignedUploadUrl(path);
  
  // 3. ⚠️ File saved with scanStatus: "pending"
  const file = await File.create({
    filename,
    scanStatus: 'pending', // ← PLACEHOLDER, never updated!
    uploadedBy: req.user._id,
  });
  
  // 4. ❌ NO SCANNING OCCURS
  
  res.json({ signedUrl, fileId: file._id });
});
```

**Recommended Approach - Async Scan Queue:**

**Architecture:**
```
User Upload → Supabase → Database Record → Queue Scan Job → Worker Scans → Update Status
                ↓                                                    ↓
           (immediate access)                               (async, 5-30s later)
```

**Step 1:** Choose scanning service
| Option | Setup | Cost | Latency | Accuracy |
|--------|-------|------|---------|----------|
| **ClamAV (Docker)** | Medium | Free | ~2-5s | Good (open-source) |
| **VirusTotal API** | Easy | Free tier: 4 req/min | ~10-30s | Excellent (60+ engines) |
| **AWS S3 Malware Scanning** | Complex | $0.10/GB | ~5-10s | Very Good |

**Step 2:** ClamAV Implementation (Recommended for self-hosted)

```yaml
# docker-compose.yml (add service)
services:
  clamav:
    image: clamav/clamav:latest
    ports:
      - "3310:3310"
    volumes:
      - clamav_data:/var/lib/clamav
    healthcheck:
      test: ["CMD", "clamdscan", "--ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  clamav_data:
```

```typescript
// backend/src/services/malwareScanner.ts
import NodeClam from 'clamscan';

const clam = new NodeClam().init({
  clamdscan: {
    host: 'clamav',
    port: 3310,
  },
});

export async function scanFile(fileBuffer: Buffer): Promise<{
  isInfected: boolean;
  viruses: string[];
}> {
  const { isInfected, viruses } = await clam.scanBuffer(fileBuffer);
  return { isInfected, viruses };
}
```

**Step 3:** Queue integration (use existing BullMQ setup)
```typescript
// backend/src/queues/scanQueue.ts
import { Queue, Worker } from 'bullmq';
import { redisClient } from '../config/redis';
import { scanFile } from '../services/malwareScanner';
import File from '../models/File';

const scanQueue = new Queue('file-scan', { connection: redisClient });

// Enqueue scan job after upload
export async function enqueueScan(fileId: string, supabasePath: string) {
  await scanQueue.add('scan-file', { fileId, supabasePath });
}

// Worker processes scans
const scanWorker = new Worker('file-scan', async (job) => {
  const { fileId, supabasePath } = job.data;
  
  // 1. Download file from Supabase
  const { data, error } = await supabase.storage
    .from('user-files')
    .download(supabasePath);
  
  if (error) throw error;
  
  // 2. Scan file
  const buffer = Buffer.from(await data.arrayBuffer());
  const { isInfected, viruses } = await scanFile(buffer);
  
  // 3. Update database
  await File.findByIdAndUpdate(fileId, {
    scanStatus: isInfected ? 'infected' : 'clean',
    scanResult: isInfected ? viruses.join(', ') : 'No threats detected',
    scannedAt: new Date(),
  });
  
  // 4. If infected, quarantine (move to separate bucket)
  if (isInfected) {
    await supabase.storage
      .from('quarantine')
      .move(supabasePath, `quarantine/${fileId}`);
    
    logger.warn(`File ${fileId} quarantined: ${viruses.join(', ')}`);
  }
}, { connection: redisClient });
```

**Step 4:** Update upload endpoint
```typescript
// backend/src/server.ts
router.post('/api/files/upload-url', async (req, res) => {
  // ... existing code ...
  
  const file = await File.create({
    filename,
    scanStatus: 'pending',
    uploadedBy: req.user._id,
  });
  
  // ✅ NEW: Enqueue scan job
  await enqueueScan(file._id.toString(), supabasePath);
  
  res.json({ signedUrl, fileId: file._id });
});
```

**Step 5:** Handle scan results (frontend)
```typescript
// commerce-web/components/FileStatus.tsx
function FileStatus({ fileId }) {
  const { data: file } = useSWR(`/api/files/${fileId}`);
  
  if (file.scanStatus === 'pending') {
    return <Badge color="yellow">Scanning...</Badge>;
  }
  if (file.scanStatus === 'infected') {
    return <Badge color="red">Malware Detected - Access Denied</Badge>;
  }
  return <Badge color="green">Safe</Badge>;
}
```

**Upload Handling Strategy - Quarantine vs Deny:**

| Approach | Description | Trade-offs |
|----------|-------------|------------|
| **Immediate Access (Current)** | Files available before scan | ⚠️ Malware can be downloaded before detection |
| **Deny Until Scanned** | Block downloads while scanStatus='pending' | ✅ Safer, ❌ 5-30s wait, poor UX |
| **Quarantine Bucket** | Upload to temp bucket, move after scan | ✅ Best security, ❌ Complex, 2x storage cost |

**Recommended for MVP:** Deny downloads until scanned (modify download endpoint)
```typescript
// backend/src/server.ts
router.get('/api/files/:id/download', async (req, res) => {
  const file = await File.findById(req.params.id);
  
  // ✅ NEW: Check scan status
  if (file.scanStatus === 'pending') {
    return res.status(202).json({
      error: 'File is being scanned, please retry in 10 seconds',
      scanStatus: 'pending',
    });
  }
  
  if (file.scanStatus === 'infected') {
    return res.status(403).json({
      error: 'File failed security scan and cannot be downloaded',
    });
  }
  
  // Proceed with download...
});
```

**Estimated Effort:**
- ClamAV + Queue: 1 day (including testing)
- VirusTotal: 4 hours (simpler, API-based)

**Decision Required:**
- [ ] **MVP BLOCKER:** Must implement before accepting user uploads (1 day)
- [ ] **Startup Risk:** Ship without scanning (document acceptable use policy)

---

## 🟡 OPTIONAL (Post-Launch Improvements)

- **Audit Log Retention:** No cleanup job (database grows unbounded)
- **Dependency Scanning:** GitHub Dependabot alerts exist but no auto-updates
- **HTTPS Enforcement:** Works locally (nginx/docker), verify in production

---

## Implementation Checklist

### Pre-Launch (Pick Your Battles)
- [ ] **CSP Decision:** Keep unsafe-inline + monitoring OR implement nonces (blocks launch 2-3 days)
- [ ] **Rate Limiting:** Keep in-memory for single-server OR migrate to Redis (4 hours, required for scaling)
- [ ] **JWT Rotation:** Document manual process OR implement versioning (3 hours)
- [ ] **Malware Scanning:** **REQUIRED** - Implement ClamAV/VirusTotal (1 day, non-negotiable for user uploads)

### Production Deployment
```bash
# Generate secrets
openssl rand -hex 64  # JWT_SECRET_V2

# Set environment variables
export JWT_SECRET_V2=<generated>
export REDIS_URL=redis://redis:6379
export VIRUSTOTAL_API_KEY=<if-using-virustotal>

# Verify security headers
npm run verify:security-headers

# Test rate limiting across restarts
npm run test:rate-limiting

# Test file scanning
npm run test:malware-scanning
```

### Post-Launch Hardening (Phase 2)
- [ ] Implement strict CSP with nonces
- [ ] Automated JWT secret rotation (monthly)
- [ ] Real-time CSP violation monitoring
- [ ] Audit log retention policy (6 months)

---

## What Is Blocking Production TODAY?

| Issue | Severity | Effort | Can Ship Without? |
|-------|----------|--------|-------------------|
| **Malware Scanning** | 🔴 CRITICAL | 1 day | ❌ NO - Legal/compliance risk |
| **Rate Limit Redis** | 🟡 MEDIUM | 4 hours | ✅ YES - if single server |
| **CSP unsafe-inline** | 🟡 MEDIUM | 2-3 days | ✅ YES - acceptable for MVP |
| **JWT Rotation** | 🟢 LOW | 3 hours | ✅ YES - manual process acceptable |

**Minimum Viable Security for Launch:**
1. ✅ Implement malware scanning (1 day)
2. ✅ Document rate limiting limitation (15 minutes)
3. ✅ Add CSP violation monitoring (2 hours)
4. ✅ Document JWT manual rotation procedure (30 minutes)

**Total time to production-ready:** ~1.5 days

---

## Questions/Decisions Needed

1. **CSP Strategy:** Ship with unsafe-inline + monitoring, or block launch for strict CSP?
2. **Rate Limit Backing Store:** Redis (self-hosted) or Upstash (serverless)?
3. **Malware Scanner:** ClamAV (Docker) or VirusTotal (API)?
4. **File Access Policy:** Deny downloads during scan, or allow (accept risk)?

---

**Document Owner:** Security Team  
**Last Updated:** February 11, 2026  
**Next Review:** Before production deployment (after decisions above)
