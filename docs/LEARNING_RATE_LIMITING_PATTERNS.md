# 🎓 Learning Guide: Rate Limiting Architecture Patterns

**From In-Memory to Distributed Systems**  
**Date:** February 13, 2026

---

## 📚 What This Teaches

You'll learn:
1. **Why** in-memory rate limiting breaks at scale
2. **How** distributed systems share state
3. **When** to use each approach
4. **Implementation** patterns with real code

---

## Part 1: The Problem

### Scenario: E-commerce Login Attack

**Timeline:**
```
09:00 AM - Attacker starts dictionary attack on /api/auth/login
09:01 AM - Backend server A sees 50 requests from IP 1.2.3.4
09:01 AM - Rate limiter blocks IP 1.2.3.4 ✅
09:02 AM - Load balancer routes request to server B
09:02 AM - Server B has NO memory of IP 1.2.3.4 ❌
09:02 AM - Attacker continues attack through server B
```

**Result:** Rate limiting only works within single server!

---

## Part 2: In-Memory Rate Limiting (Current)

### How It Works

```typescript
// backend/src/middleware/bruteForceProtection.ts

// JavaScript Map stored in server's RAM
const ipRateLimits = new Map<string, {
  count: number;
  firstRequest: Date;
  blocked: boolean;
}>();

export function checkRateLimit(ip: string) {
  const entry = ipRateLimits.get(ip);
  const now = new Date();
  
  // First request from this IP
  if (!entry) {
    ipRateLimits.set(ip, {
      count: 1,
      firstRequest: now,
      blocked: false,
    });
    return true; // Allow
  }
  
  // Check if window expired (15 minutes)
  const elapsed = now.getTime() - entry.firstRequest.getTime();
  if (elapsed > 15 * 60 * 1000) {
    // Reset window
    entry.count = 1;
    entry.firstRequest = now;
    entry.blocked = false;
    return true;
  }
  
  // Increment counter
  entry.count++;
  
  // Block if exceeded limit
  if (entry.count > 10) {
    entry.blocked = true;
    return false; // Block
  }
  
  return true;
}
```

### Memory Layout

```
Server A's RAM:
┌─────────────────────────┐
│ ipRateLimits Map        │
├─────────────────────────┤
│ "1.2.3.4" → {           │
│   count: 10,            │
│   firstRequest: 9:00 AM,│
│   blocked: false        │
│ }                       │
└─────────────────────────┘

Server B's RAM:
┌─────────────────────────┐
│ ipRateLimits Map        │
├─────────────────────────┤
│ (empty)                 │  ← No knowledge of 1.2.3.4!
└─────────────────────────┘
```

### Pros ✅
- **Fast:** No network calls (< 1ms)
- **Simple:** No external dependencies
- **Free:** No Redis/database costs
- **Works great** for single-server deployments

### Cons ❌
- **Lost on restart:** Server reboot = limits reset
- **No coordination:** Multiple servers don't share state
- **Memory leak risk:** Map grows without cleanup
- **Not scalable:** Can't horizontally scale servers

---

## Part 3: Redis-Backed Rate Limiting

### Why Redis?

Redis is an **in-memory database** that ALL servers can access:

```
User requests → Load Balancer
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
    Server A              Server B
         ↓                     ↓
         └──────────┬──────────┘
                    ↓
              Redis Server
          (Shared State!)
```

### Key Redis Concepts

#### 1. Atomic Operations
```redis
# Multiple servers can safely increment without race conditions
INCR ratelimit:1.2.3.4
# Returns 1 (first request)

INCR ratelimit:1.2.3.4
# Returns 2 (second request)

# Atomic = no two servers can read "1" simultaneously
```

#### 2. Automatic Expiry
```redis
# Set a counter that auto-deletes after 900 seconds (15 mins)
INCR ratelimit:1.2.3.4
EXPIRE ratelimit:1.2.3.4 900

# No manual cleanup needed!
```

#### 3. Persistence
```redis
# Redis can save to disk periodically
# Restarting Redis doesn't lose rate limit state
```

---

### Implementation: Simple Counter

```typescript
// backend/src/lib/rateLimit/redisRateLimiter.ts

import { Redis } from 'ioredis';

export class RedisRateLimiter {
  private redis: Redis;
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }
  
  async checkRateLimit(
    ip: string, 
    maxAttempts: number = 10, 
    windowSeconds: number = 900
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    
    const key = `ratelimit:login:${ip}`;
    
    // Increment counter atomically
    const count = await this.redis.incr(key);
    
    // Set expiry on first request
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    // Calculate remaining attempts
    const remaining = Math.max(0, maxAttempts - count);
    
    // Get TTL (time to live = when counter resets)
    const ttl = await this.redis.ttl(key);
    const resetAt = new Date(Date.now() + (ttl * 1000));
    
    return {
      allowed: count <= maxAttempts,
      remaining,
      resetAt,
    };
  }
  
  async resetLimit(ip: string): Promise<void> {
    await this.redis.del(`ratelimit:login:${ip}`);
  }
}
```

**Usage:**

```typescript
// backend/src/middleware/rateLimitMiddleware.ts

import { RedisRateLimiter } from '../lib/rateLimit/redisRateLimiter';

const limiter = new RedisRateLimiter(process.env.REDIS_URL);

export async function rateLimitMiddleware(req, res, next) {
  const ip = req.ip;
  
  try {
    const result = await limiter.checkRateLimit(ip, 10, 900);
    
    // Add headers for client debugging
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
      });
    }
    
    next();
  } catch (error) {
    // Redis unavailable - fail open or closed?
    console.error('Rate limiting error:', error);
    
    // Option A: FAIL OPEN (allow request, log error)
    next();
    
    // Option B: FAIL CLOSED (block request, maintain security)
    // return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
}
```

---

### Advanced: Sliding Window (More Accurate)

**Problem with simple counter:**
```
Window 1: 09:00:00 - 09:15:00
Window 2: 09:15:00 - 09:30:00

User makes 10 requests at 09:14:59 ✅ (allowed)
User makes 10 requests at 09:15:01 ✅ (allowed)
= 20 requests in 2 seconds! 
```

**Solution: Sliding window tracks timestamps**

```typescript
export class SlidingWindowRateLimiter {
  async checkRateLimit(ip: string, maxAttempts: number, windowSeconds: number) {
    const key = `ratelimit:${ip}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Redis Sorted Set: scores = timestamps
    const requests = await this.redis.zrangebyscore(key, windowStart, now);
    
    if (requests.length >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }
    
    // Add current request with timestamp as score
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    
    // Clean up old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);
    
    // Auto-expire the entire set
    await this.redis.expire(key, windowSeconds);
    
    return {
      allowed: true,
      remaining: maxAttempts - requests.length - 1,
    };
  }
}
```

**Visual:**

```
Timeline (15-minute window):
├─ 09:00 ─ 09:05 ─ 09:10 ─ 09:15 ─ 09:20 ─┤
   └─────── Window moves with time ────────┘
   
At 09:17, window is 09:02 - 09:17
At 09:18, window is 09:03 - 09:18
etc.
```

---

## Part 4: Failure Modes & Resilience

### What Happens When Redis Goes Down?

#### Option 1: Fail Open (Prioritize Availability)

```typescript
try {
  const result = await limiter.checkRateLimit(ip);
  if (!result.allowed) {
    return res.status(429).json({ error: 'Rate limited' });
  }
} catch (error) {
  // Redis is down
  logger.error('Redis unavailable, rate limiting DISABLED', { error });
  
  // Send alert to ops team
  await pagerDuty.alert('Rate limiting degraded');
  
  // Allow request through (FAIL OPEN)
  // Attackers can bypass limits, but legitimate users aren't blocked
}
```

**Best for:** User-facing services, demo/MVP apps

#### Option 2: Fail Closed (Prioritize Security)

```typescript
try {
  const result = await limiter.checkRateLimit(ip);
  // ...
} catch (error) {
  logger.error('Redis unavailable, BLOCKING all requests', { error });
  
  // Block request (FAIL CLOSED)
  return res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'Rate limiting system is down',
  });
}
```

**Best for:** High-security systems (banking, healthcare)

#### Option 3: Fallback to In-Memory

```typescript
const redisLimiter = new RedisRateLimiter(redisUrl);
const memoryLimiter = new InMemoryRateLimiter(); // Backup

export async function checkRateLimit(ip: string) {
  try {
    return await redisLimiter.checkRateLimit(ip);
  } catch (error) {
    logger.warn('Redis down, falling back to in-memory rate limiting');
    return memoryLimiter.checkRateLimit(ip);
  }
}
```

**Best for:** Critical systems that can't go down

---

### Connection Pooling

**Problem:** Creating new Redis connection per request is slow!

```typescript
// ❌ BAD: New connection every time
export async function checkRateLimit(ip: string) {
  const redis = new Redis(process.env.REDIS_URL); // Slow!
  const count = await redis.incr(`ratelimit:${ip}`);
  await redis.quit();
  return count <= 10;
}
```

**Solution:** Reuse connections

```typescript
// ✅ GOOD: Single connection shared across requests
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: false, // Fail fast if Redis is down
});

// Use this instance everywhere
export async function checkRateLimit(ip: string) {
  const count = await redis.incr(`ratelimit:${ip}`);
  return count <= 10;
}
```

---

## Part 5: When to Use Each Approach

### Decision Matrix

| Criterion | In-Memory | Redis | Upstash |
|-----------|-----------|-------|---------|
| **Deployment** | Single server | Multiple servers | Serverless |
| **Traffic** | < 100 req/sec | Any | < 10K req/day (free tier) |
| **Accuracy** | Resets on restart | Persistent | Persistent |
| **Latency** | < 1ms | 2-5ms (local) | 50-100ms (cloud) |
| **Ops Burden** | None | Manage Redis | None |
| **Cost** | Free | Redis hosting | Free tier / $10/mo |

### Recommendation for THIS Repo

**Current deployment:** Docker Compose with single backend container

```yaml
# docker-compose.yml
services:
  backend:
    image: backend:latest
    # Single container = in-memory works perfectly!
```

✅ **KEEP in-memory rate limiting**

**MIGRATE to Redis when:**
1. Adding second backend container
2. Moving to Kubernetes
3. Deploying to Vercel/Netlify (use Upstash)

---

## Part 6: Implementation Plan

### Phase 1: Abstract Interface (Do Now)

```typescript
// backend/src/lib/rateLimit/interface.ts

export interface IRateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};
```

### Phase 2: In-Memory Implementation

```typescript
// backend/src/lib/rateLimit/inMemoryRateLimiter.ts

export class InMemoryRateLimiter implements IRateLimiter {
  private store = new Map<string, { count: number; resetAt: Date }>();
  
  async check(key: string, limit: number, windowSeconds: number) {
    const entry = this.store.get(key);
    const now = new Date();
    
    if (!entry || entry.resetAt < now) {
      // New window
      const resetAt = new Date(now.getTime() + windowSeconds * 1000);
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }
    
    entry.count++;
    
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
    };
  }
  
  async reset(key: string) {
    this.store.delete(key);
  }
}
```

### Phase 3: Redis Implementation (When Needed)

```typescript
// backend/src/lib/rateLimit/redisRateLimiter.ts
// (Code from Part 3 above)
```

### Phase 4: Factory Pattern

```typescript
// backend/src/lib/rateLimit/factory.ts

export function createRateLimiter(): IRateLimiter {
  const type = process.env.RATE_LIMIT_STORE || 'memory';
  
  switch (type) {
    case 'redis':
      return new RedisRateLimiter(process.env.REDIS_URL);
    
    case 'upstash':
      return new UpstashRateLimiter();
    
    case 'memory':
    default:
      logger.warn('Using in-memory rate limiting (dev mode or single server)');
      return new InMemoryRateLimiter();
  }
}

// Usage in middleware:
const limiter = createRateLimiter();
```

### Phase 5: Environment Config

```bash
# .env.development (single server)
RATE_LIMIT_STORE=memory

# .env.production (multiple servers)
RATE_LIMIT_STORE=redis
REDIS_URL=redis://redis:6379
```

---

## Part 7: Testing

### Test Script

```typescript
// scripts/test-rate-limiting.ts

import axios from 'axios';

async function testRateLimiting() {
  const endpoint = 'http://localhost:3001/api/auth/login';
  
  console.log('Testing rate limiting...\n');
  
  for (let i = 1; i <= 12; i++) {
    try {
      const response = await axios.post(endpoint, {
        email: 'test@example.com',
        password: 'wrong-password',
      });
      
      const remaining = response.headers['x-ratelimit-remaining'];
      console.log(`Request ${i}: ✅ Allowed (${remaining} remaining)`);
      
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        console.log(`Request ${i}: ❌ BLOCKED (retry after ${retryAfter}s)`);
      } else {
        console.log(`Request ${i}: Other error - ${error.response?.status}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✅ Rate limiting test complete');
}

testRateLimiting();
```

**Expected output:**
```
Request 1: ✅ Allowed (9 remaining)
Request 2: ✅ Allowed (8 remaining)
...
Request 10: ✅ Allowed (0 remaining)
Request 11: ❌ BLOCKED (retry after 895s)
Request 12: ❌ BLOCKED (retry after 895s)
```

---

## Summary: Key Takeaways

1. **In-memory is OK for single servers** - Don't over-engineer!
2. **Redis is needed for horizontal scaling** - Shared state across servers
3. **Always handle Redis failures gracefully** - Fail open vs fail closed
4. **Use interfaces/abstractions** - Easy migration later
5. **Monitor rate limit effectiveness** - Are limits too strict? Too loose?

**Next:** Implement interface pattern so migration is < 1 hour when needed!

---

**Go build scalable systems! 🚀**
