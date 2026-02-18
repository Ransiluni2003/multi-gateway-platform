# 🚀 Production Security - Quick Reference Sheet

**Print this! Keep on desk! Reference when coding!**

---

## 🔐 Security Patterns Cheat Sheet

### Content Security Policy (CSP)

```typescript
// ❌ WEAK (Current)
"script-src 'self' 'unsafe-inline'"

// ✅ STRONG (Nonce-based)
const nonce = crypto.randomBytes(16).toString('base64');
`script-src 'self' 'nonce-${nonce}'`
```

**When to use nonces:** Handling payments, PII, or compliance-required  
**When to keep unsafe-inline:** MVP/demo, with monitoring

---

### Rate Limiting Decision Tree

```
Single server? 
  → In-memory (Map) ✅

Multiple servers?
  → Redis (self-hosted) ✅

Serverless (Vercel)?
  → Upstash ✅

High traffic (>10K req/sec)?
  → Redis + Local cache ✅
```

**Failure mode:**  
- **Fail open:** Allow requests (better UX)  
- **Fail closed:** Block requests (better security)

---

### JWT Secret Rotation (5 Steps)

```typescript
// Setup multi-key support
const SECRETS = {
  'v1': process.env.JWT_SECRET_V1,
  'v2': process.env.JWT_SECRET_V2,
};

// Sign with KID
jwt.sign({ ...payload, kid: 'v2' }, SECRETS['v2']);

// Verify any version
const kid = decoded.payload.kid || 'v1';
jwt.verify(token, SECRETS[kid]);
```

**Rotation schedule:** Every 90 days (or immediately if leaked)

---

### Malware Scanning State Machine

```
PENDING → SCANNING → CLEAN ✅
                   ↘ INFECTED ❌
                   ↘ ERROR ⚠️
```

**Never block uploads!** Queue scan, return immediately.

---

## 📄 Pagination Quick Reference

### When to Use Each

| Pattern | Use When | Pros | Cons |
|---------|----------|------|------|
| **Offset** | Admin tables, < 10K rows | Simple, page numbers | Slow at high offsets |
| **Cursor** | Social feeds, file lists | Fast, scalable | No page jumps |
| **Keyset** | High-performance SQL | Fastest | Complex queries |

### Cursor Implementation (3 Steps)

```typescript
// 1. Build query with cursor
const query = cursor 
  ? { createdAt: { $lt: cursor.createdAt }, _id: { $lt: cursor._id } }
  : {};

// 2. Get limit + 1 (to check hasMore)
const results = await db.find(query)
  .sort({ createdAt: -1, _id: -1 })
  .limit(21); // +1

// 3. Return cursor + hasMore
const hasMore = results.length > 20;
const nextCursor = hasMore ? results[19] : null;
```

---

## 🗑️ Audit Retention Patterns

### Cost Comparison

| Storage | Cost/GB/month | Retrieval | Use For |
|---------|---------------|-----------|---------|
| **MongoDB** | $0.08 | Instant | 0-90 days |
| **S3 Standard** | $0.023 | Instant | 90-365 days |
| **S3 Glacier IR** | $0.004 | Instant | 1-7 years |
| **S3 Glacier Deep** | $0.001 | 12 hours | 7+ years |

### Compliance Requirements

- **GDPR:** 30 days - 1 year
- **SOC 2:** 90 days - 1 year
- **PCI-DSS:** 90 days - 1 year
- **HIPAA:** 6 years
- **SOX:** 7 years

### Cron Schedule Reference

```bash
0 2 * * *       # Daily at 2 AM
0 */6 * * *     # Every 6 hours
0 0 * * 0       # Weekly (Sunday)
0 0 1 * *       # Monthly (1st)
*/15 * * * *    # Every 15 minutes
```

---

## ⚡ Performance Optimization

### Database Indexes

```typescript
// For pagination
db.collection.createIndex({ userId: 1, createdAt: -1, _id: -1 });

// For rate limiting
db.collection.createIndex({ ip: 1, createdAt: 1 }, { expireAfterSeconds: 900 });

// For search + pagination
db.collection.createIndex({ userId: 1, searchField: 'text', createdAt: -1 });
```

### Query Optimization

```typescript
// ❌ BAD: Returns everything
await db.find({ userId });

// ✅ GOOD: Project only needed fields
await db.find({ userId })
  .select('_id name createdAt')
  .lean(); // Mongoose: return plain objects
```

---

## 🎯 When to Use Each Pattern

### Security Controls

| If you have... | Use... |
|---------------|--------|
| Public-facing app | Strict CSP (nonces) |
| Internal tool | Permissive CSP + monitoring |
| Payment processing | Rate limiting + IP blocking |
| User-generated content | Malware scanning (async) |
| API endpoints | JWT with short TTL (15 mins) |

### Scalability Patterns

| If you need... | Use... |
|---------------|--------|
| Social feed pagination | Cursor (infinite scroll) |
| Admin table pagination | Offset (page numbers) |
| Distributed rate limiting | Redis/Upstash |
| Single-server rate limiting | In-memory (Map) |
| Long-term audit storage | S3 Glacier |
| Fast audit queries | MongoDB (recent only) |

---

## 🚨 Error Handling Patterns

### Rate Limiting

```typescript
try {
  await rateLimiter.check(ip);
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // Redis down - decide:
    // Option A: Fail open (allow request)
    logger.error('Redis down');
    return next();
    
    // Option B: Fail closed (block request)
    return res.status(503).json({ error: 'Service unavailable' });
  }
}
```

### JWT Verification

```typescript
try {
  const decoded = jwtManager.verifyToken(token);
} catch (error) {
  if (error.message.includes('Unknown JWT key version')) {
    // Key rotated out
    return res.status(401).json({ error: 'Please log in again' });
  }
  
  // Invalid token
  return res.status(401).json({ error: 'Invalid token' });
}
```

### Pagination

```typescript
// Cursor validation
try {
  const cursor = JSON.parse(Buffer.from(req.query.cursor, 'base64'));
} catch (error) {
  return res.status(400).json({ error: 'Invalid cursor' });
}
```

---

## 🧪 Testing Quick Commands

```bash
# Security headers
curl -I http://localhost:3000/api/health

# Rate limiting
for i in {1..12}; do curl -X POST http://localhost:3000/api/auth/login; done

# Pagination
curl "http://localhost:3000/api/files?limit=20"
curl "http://localhost:3000/api/files?limit=20&cursor=abc123"

# Audit cleanup (dry-run)
npm run cleanup:audit:dry

# JWT token decode
echo "TOKEN" | cut -d. -f2 | base64 -d | jq
```

---

## 📊 Monitoring Checklist

### Metrics to Track

- [ ] Rate limit hit rate (% of requests blocked)
- [ ] JWT key usage by version (track rotation progress)
- [ ] Pagination cursor errors (invalid/expired)
- [ ] Audit log growth rate (GB/day)
- [ ] Malware scan queue depth
- [ ] Archive job success rate

### Alerts to Set

- [ ] Rate limiter Redis down (PagerDuty)
- [ ] JWT secret leaked (GitHub scanner)
- [ ] Audit cleanup job failed
- [ ] Malware detected in upload
- [ ] Database size > 80% quota

---

## 🐛 Common Pitfalls

### CSP
❌ Inline scripts without nonces  
✅ Generate nonce per request

### Rate Limiting
❌ Using in-memory with multiple servers  
✅ Use Redis for distributed state

### JWT
❌ Rotating secret without grace period  
✅ Support v1 + v2 during rotation

### Pagination
❌ Using offset for large datasets  
✅ Use cursor for scalability

### Audit Logs
❌ Never deleting (infinite growth)  
✅ Archive to cold storage

---

## 🔢 Magic Numbers (Copy These!)

```typescript
// Rate limits
const LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW = 15 * 60; // 15 minutes
const LOGIN_BLOCK = 30 * 60;  // 30 minutes

// JWT TTLs
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

// Pagination
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Audit retention
const HOT_STORAGE_DAYS = 90;
const COLD_STORAGE_YEARS = 1;

// Cleanup schedules
const ARCHIVE_CRON = '0 2 * * *'; // 2 AM daily
const CLEANUP_CRON = '0 3 * * 0'; // 3 AM Sunday
```

---

## 🎓 Learning Resources Quick Links

- **[Full Learning Index](./LEARNING_INDEX.md)** - Start here
- **[Production Security](./LEARNING_PRODUCTION_SECURITY.md)** - CSP, rate limiting, JWT, scanning
- **[Rate Limiting Patterns](./LEARNING_RATE_LIMITING_PATTERNS.md)** - In-memory vs distributed
- **[JWT Secret Rotation](./LEARNING_JWT_SECRET_ROTATION.md)** - Zero-downtime migration
- **[Pagination Patterns](./LEARNING_PAGINATION_PATTERNS.md)** - Offset vs cursor
- **[Audit Retention](./LEARNING_AUDIT_RETENTION.md)** - Cleanup & archival

---

## ✅ Pre-Production Checklist

### Security
- [ ] CSP header set (strict or monitored)
- [ ] Rate limiting on auth endpoints
- [ ] JWT secrets in environment (not code)
- [ ] HTTPS enforced (redirect HTTP→HTTPS)
- [ ] Security headers validated

### Scalability
- [ ] Pagination on list endpoints
- [ ] Rate limiter abstracted (easy Redis migration)
- [ ] Database indexes created
- [ ] Audit logs have retention policy

### Monitoring
- [ ] Error tracking (Sentry/Rollbar)
- [ ] Performance metrics (DataDog/New Relic)
- [ ] Uptime monitoring (StatusCake/Pingdom)
- [ ] Alert channels configured

### Documentation
- [ ] API endpoints documented
- [ ] Architecture diagram current
- [ ] Runbook for incidents
- [ ] Demo video recorded

---

**🔖 Bookmark this page!**  
**📍 Keep next to your monitor!**  
**🖨️ Print and reference often!**

---

**Build secure, scalable systems! 🚀🔒**
