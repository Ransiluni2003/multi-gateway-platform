# 🎓 Learning Guide: JWT Secret Rotation & Zero-Downtime Migrations

**How to Change Critical Credentials Without Breaking Production**  
**Date:** February 13, 2026

---

## 📚 What This Teaches

Learn production-grade credential rotation:
1. **Why** rotating secrets is critical security
2. **How** to rotate without logging out all users
3. **When** to rotate (scheduled vs emergency)
4. **Implementation** with versioned keys (KID pattern)

---

## Part 1: The Security Nightmare

### Real-World Scenario

**March 15, 2025 - 2:00 AM**
```bash
# Junior developer accidentally commits .env file
git add .
git commit -m "quick fix"
git push origin main

# .env contains:
JWT_SECRET=my-super-secret-key-12345
DATABASE_URL=postgres://admin:password123@prod.db.com
STRIPE_SECRET_KEY=sk_live_...
```

**March 15, 2025 - 9:30 AM**
```
GitHub Security Alert: "Secret detected in repository"
```

**March 15, 2025 - 10:00 AM**
```
Security team meeting:
- JWT_SECRET is public
- Attackers can forge tokens for ANY user
- 50,000 active sessions need new tokens
- Can't just change the secret (everyone gets logged out!)
```

---

## Part 2: Why Naive Rotation Breaks Everything

### The Problem

**Before rotation:**
```typescript
// .env
JWT_SECRET=old-secret-abc123

// User logs in
const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
// Token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**After naive rotation:**
```typescript
// .env (changed)
JWT_SECRET=new-secret-xyz789

// Existing user tries to access protected route
const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
// ❌ ERROR: Invalid signature!
// All 50,000 users logged out simultaneously 💀
```

**Impact:**
- ❌ Customer support flooded with "I got logged out!" tickets
- ❌ Active checkout sessions lost → revenue loss
- ❌ Bad user experience → churn risk
- ❌ Negative PR if leaked secret is public knowledge

---

## Part 3: Industry Solution - Key Versioning (KID)

### Concept: Multiple Secrets Simultaneously

Instead of ONE secret, support MULTIPLE secrets with version IDs:

```typescript
const JWT_SECRETS = {
  'v1': 'old-secret-abc123',  // Previous secret (still valid)
  'v2': 'new-secret-xyz789',  // Current secret (use for new tokens)
};
```

**Key insight:** Old tokens signed with `v1` still verify, but NEW tokens use `v2`!

---

### JWT Structure with KID

**Standard JWT (3 parts):**
```
Header . Payload . Signature
```

**Header with KID:**
```json
{
  "alg": "HS256",
  "typ": "JWT",
  "kid": "v2"  // ← Key ID tells us which secret to use!
}
```

**Payload:**
```json
{
  "userId": 123,
  "email": "user@example.com",
  "iat": 1710504000,
  "exp": 1710590400
}
```

**Signature:** HMAC-SHA256(header + payload, SECRETS['v2'])

---

## Part 4: Implementation

### Step 1: Multi-Secret Infrastructure

```typescript
// backend/src/config/jwt.ts

import jwt from 'jsonwebtoken';

interface JWTKey {
  id: string;
  secret: string;
  createdAt: Date;
  deprecatedAt?: Date; // When to stop issuing new tokens with this key
  expiresAt?: Date;    // When to stop accepting tokens with this key
}

export class JWTKeyManager {
  private keys: Map<string, JWTKey>;
  
  constructor() {
    this.keys = new Map();
    
    // Load keys from environment
    this.loadKeysFromEnv();
  }
  
  private loadKeysFromEnv() {
    // Primary key (always required)
    const currentKey = {
      id: process.env.CURRENT_JWT_KEY_VERSION || 'v1',
      secret: process.env.JWT_SECRET,
      createdAt: new Date(),
    };
    this.keys.set(currentKey.id, currentKey);
    
    // Legacy keys (for rotation overlap)
    if (process.env.JWT_SECRET_V1) {
      this.keys.set('v1', {
        id: 'v1',
        secret: process.env.JWT_SECRET_V1,
        createdAt: new Date('2026-01-01'),
      });
    }
    
    if (process.env.JWT_SECRET_V2) {
      this.keys.set('v2', {
        id: 'v2',
        secret: process.env.JWT_SECRET_V2,
        createdAt: new Date('2026-02-01'),
      });
    }
  }
  
  /**
   * Get the current key for SIGNING new tokens
   */
  getCurrentKey(): JWTKey {
    const keyId = process.env.CURRENT_JWT_KEY_VERSION || 'v1';
    const key = this.keys.get(keyId);
    
    if (!key) {
      throw new Error(`JWT key ${keyId} not found. Check environment config.`);
    }
    
    return key;
  }
  
  /**
   * Get a specific key for VERIFYING existing tokens
   */
  getKey(kid: string): JWTKey | undefined {
    return this.keys.get(kid);
  }
  
  /**
   * Sign a new token with the current key
   */
  signToken(payload: any, expiresIn = '15m'): string {
    const key = this.getCurrentKey();
    
    return jwt.sign(
      { ...payload, kid: key.id }, // Include KID in payload
      key.secret,
      { expiresIn, algorithm: 'HS256' }
    );
  }
  
  /**
   * Verify a token using its embedded KID
   */
  verifyToken(token: string): any {
    // Decode without verification to extract KID
    const decoded = jwt.decode(token, { complete: true }) as any;
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }
    
    // Get KID from payload (fallback to 'v1' for old tokens without KID)
    const kid = decoded.payload?.kid || 'v1';
    
    // Get the corresponding secret
    const key = this.getKey(kid);
    
    if (!key) {
      throw new Error(`Unknown JWT key version: ${kid}`);
    }
    
    // Verify with the correct secret
    try {
      return jwt.verify(token, key.secret);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
  
  /**
   * List all active keys (for admin dashboard)
   */
  listKeys(): JWTKey[] {
    return Array.from(this.keys.values());
  }
}

// Singleton instance
export const jwtManager = new JWTKeyManager();
```

---

### Step 2: Update Token Generation

```typescript
// backend/src/services/authService.ts

import { jwtManager } from '../config/jwt';

export async function login(email: string, password: string) {
  const user = await User.findOne({ email });
  
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid credentials');
  }
  
  // Generate access token with current key
  const accessToken = jwtManager.signToken(
    { userId: user._id, email: user.email, role: user.role },
    '15m' // 15 minutes
  );
  
  // Generate refresh token with current key
  const refreshToken = jwtManager.signToken(
    { userId: user._id, type: 'refresh' },
    '30d' // 30 days
  );
  
  return { accessToken, refreshToken };
}
```

---

### Step 3: Update Token Verification

```typescript
// backend/src/middleware/authenticate.ts

import { jwtManager } from '../config/jwt';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify with multi-key support
    const decoded = jwtManager.verifyToken(token);
    
    // Add user info to request
    req.user = decoded;
    
    // Log which key was used (for monitoring)
    console.log(`Token verified with key: ${decoded.kid}`);
    
    next();
  } catch (error) {
    if (error.message.includes('Unknown JWT key version')) {
      // Key has been fully rotated out
      return res.status(401).json({
        error: 'Token key version no longer supported',
        message: 'Please log in again',
      });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## Part 5: Rotation Playbook (Step-by-Step)

### Emergency Rotation (Secret Leaked)

#### Phase 1: Immediate - Add New Key (5 minutes)

```bash
# 1. Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: f7a9d2c4b...

# 2. Add to environment WITHOUT changing current key
# .env.production (update but don't restart yet!)
JWT_SECRET_V1=abc123-old-leaked-secret  # Keep this!
JWT_SECRET_V2=f7a9d2c4b-new-safe-secret  # Add this
CURRENT_JWT_KEY_VERSION=v1              # Still v1 for now

# 3. Deploy code update (multi-key support)
git add src/config/jwt.ts
git commit -m "feat: support multi-version JWT keys"
git push origin production

# Wait for deployment to complete (~5 mins)
```

**At this point:**
- ✅ Old tokens (v1) still work
- ✅ Code can handle v2 tokens
- ✅ New tokens still using v1 (not rotated yet)

---

#### Phase 2: Switch Key (10 minutes)

```bash
# Update environment to use new key for NEW tokens
CURRENT_JWT_KEY_VERSION=v2  # Switch to v2

# Restart backend servers (rolling restart, no downtime)
kubectl rollout restart deployment/backend
# OR
pm2 reload backend

# Verify new logins get v2 tokens
curl -X POST /api/auth/login -d '{"email":"test@test.com","password":"test"}' \
  | jq -r '.accessToken' \
  | cut -d. -f2 \
  | base64 -d \
  | jq '.kid'
# Should output: "v2"
```

**At this point:**
- ✅ Old tokens (v1) still work (grace period)
- ✅ New logins get v2 tokens
- ⚠️ Attacker can still forge v1 tokens

---

#### Phase 3: Invalidate Old Key (After TTL expires)

```bash
# Wait for longest token TTL to expire
# If access tokens = 15 mins, refresh tokens = 30 days
# → Wait 30 days for all v1 tokens to naturally expire

# OR force refresh for all users:
# Send "Please log in again" email
# Add middleware to reject v1 tokens

# After grace period, remove v1 secret
JWT_SECRET_V2=f7a9d2c4b-new-safe-secret
CURRENT_JWT_KEY_VERSION=v2
# Delete JWT_SECRET_V1 from environment

# Update code to remove v1 support
# backend/src/config/jwt.ts: Remove v1 from keys map
```

---

### Scheduled Rotation (90-Day Policy)

#### Week 1: Generate & Deploy Multi-Key Support

```bash
# Monday: Generate v2 secret
JWT_SECRET_V2=<new-secret>

# Deploy multi-key infrastructure
# Test in staging first!
```

#### Week 2: Switch to New Key

```bash
# Monday: Change CURRENT_JWT_KEY_VERSION to v2
# Rolling restart
# Monitor error rates (should be 0%)
```

#### Week 7-13: Grace Period

```
# Monitor:
- % of tokens using v1 vs v2
- Any "unknown key version" errors
- Token expiry rates

# Week 13: All v1 tokens expired naturally
```

#### Week 14: Remove Old Key

```bash
# Remove v1 from environment
# Remove v1 from code
# Document rotation in changelog
```

---

## Part 6: Monitoring & Observability

### Key Metrics to Track

```typescript
// backend/src/middleware/authenticate.ts

export async function authenticate(req, res, next) {
  try {
    const decoded = jwtManager.verifyToken(token);
    
    // Track key usage
    metrics.increment('jwt.verify.success', {
      key_version: decoded.kid,
      route: req.path,
    });
    
    // Alert if old key still in use after rotation deadline
    if (decoded.kid === 'v1' && isAfterRotationDeadline()) {
      logger.warn('Old JWT key still in use', {
        userId: decoded.userId,
        kid: decoded.kid,
        issuedAt: new Date(decoded.iat * 1000),
      });
    }
    
    next();
  } catch (error) {
    metrics.increment('jwt.verify.failure', {
      error_type: error.message,
    });
    // ...
  }
}
```

### Admin Dashboard

```typescript
// backend/src/routes/admin/jwtKeys.ts

router.get('/admin/jwt-keys', requireAdmin, (req, res) => {
  const keys = jwtManager.listKeys();
  
  const stats = {
    keys: keys.map(key => ({
      id: key.id,
      createdAt: key.createdAt,
      deprecatedAt: key.deprecatedAt,
      isCurrent: key.id === process.env.CURRENT_JWT_KEY_VERSION,
    })),
    activeTokensByKey: {
      // Query Redis/DB for token counts per key
      v1: await getActiveTokenCount('v1'),
      v2: await getActiveTokenCount('v2'),
    },
  };
  
  res.json(stats);
});
```

---

## Part 7: Edge Cases & Gotchas

### Problem 1: Refresh Tokens Have Long TTL

**Scenario:** Access tokens expire in 15 mins, but refresh tokens last 30 days!

**Solution:** Rotate refresh tokens too

```typescript
export async function refreshAccessToken(refreshToken: string) {
  const decoded = jwtManager.verifyToken(refreshToken);
  
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  // Generate NEW access token
  const accessToken = jwtManager.signToken({
    userId: decoded.userId,
    // ...
  }, '15m');
  
  // If refresh token is using old key, issue new refresh token too!
  let newRefreshToken = refreshToken;
  if (decoded.kid !== process.env.CURRENT_JWT_KEY_VERSION) {
    newRefreshToken = jwtManager.signToken({
      userId: decoded.userId,
      type: 'refresh',
    }, '30d');
    
    logger.info('Upgraded refresh token to new key', {
      userId: decoded.userId,
      oldKid: decoded.kid,
      newKid: process.env.CURRENT_JWT_KEY_VERSION,
    });
  }
  
  return { accessToken, refreshToken: newRefreshToken };
}
```

Now refresh tokens gradually migrate to new key without forcing login!

---

### Problem 2: Stateless JWTs Can't Be Revoked

**Scenario:** You rotate the secret, but an attacker already stole a v2 token!

**Solution:** Token blocklist (Redis)

```typescript
// backend/src/lib/tokenBlocklist.ts

export class TokenBlocklist {
  private redis: Redis;
  
  async blockToken(token: string, expiresInSeconds: number) {
    const jti = extractJTI(token); // Token unique ID
    await this.redis.setex(`blocklist:${jti}`, expiresInSeconds, '1');
  }
  
  async isBlocked(token: string): Promise<boolean> {
    const jti = extractJTI(token);
    const blocked = await this.redis.exists(`blocklist:${jti}`);
    return blocked === 1;
  }
}

// In authenticate middleware:
export async function authenticate(req, res, next) {
  const token = extractToken(req);
  const decoded = jwtManager.verifyToken(token);
  
  // Check blocklist
  if (await tokenBlocklist.isBlocked(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }
  
  req.user = decoded;
  next();
}
```

---

## Part 8: Testing

### Test Rotation Process

```typescript
// tests/jwt-rotation.test.ts

describe('JWT Key Rotation', () => {
  beforeEach(() => {
    // Setup test environment with v1 and v2 keys
    process.env.JWT_SECRET_V1 = 'test-secret-v1';
    process.env.JWT_SECRET_V2 = 'test-secret-v2';
    process.env.CURRENT_JWT_KEY_VERSION = 'v1';
  });
  
  it('should sign tokens with current key version', () => {
    const token = jwtManager.signToken({ userId: 123 });
    const decoded = jwt.decode(token, { complete: true });
    
    expect(decoded.payload.kid).toBe('v1');
  });
  
  it('should verify tokens signed with v1 key', () => {
    const token = jwt.sign({ userId: 123, kid: 'v1' }, process.env.JWT_SECRET_V1);
    const decoded = jwtManager.verifyToken(token);
    
    expect(decoded.userId).toBe(123);
  });
  
  it('should verify tokens signed with v2 key', () => {
    const token = jwt.sign({ userId: 123, kid: 'v2' }, process.env.JWT_SECRET_V2);
    const decoded = jwtManager.verifyToken(token);
    
    expect(decoded.userId).toBe(123);
  });
  
  it('should switch to v2 for new tokens after rotation', () => {
    process.env.CURRENT_JWT_KEY_VERSION = 'v2';
    
    const token = jwtManager.signToken({ userId: 123 });
    const decoded = jwt.decode(token, { complete: true });
    
    expect(decoded.payload.kid).toBe('v2');
  });
  
  it('should reject tokens with unknown key version', () => {
    const token = jwt.sign({ userId: 123, kid: 'v99' }, 'unknown-secret');
    
    expect(() => jwtManager.verifyToken(token)).toThrow('Unknown JWT key version');
  });
});
```

---

## Summary: Best Practices

1. **Always use KID** in production JWTs
2. **Never remove old key immediately** - grace period = longest token TTL
3. **Monitor key usage** - alert if old key usage doesn't decline
4. **Automate rotation** - scheduled job every 90 days
5. **Document process** - runbook for emergency rotation
6. **Test rotation in staging** before production
7. **Use short TTLs** for access tokens (15 mins max)
8. **Consider token blocklist** for critical systems

---

**Now you can rotate secrets without fear! 🔄🔐**
