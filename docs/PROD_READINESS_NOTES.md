# Production Readiness Notes (Operational)

**Date:** 2026-02-16

## SLO / SLA / Error Budget (Simple Terms)

- **SLO (Service Level Objective):** Our internal reliability goal. Example: "99.9% of requests succeed per month."
- **SLA (Service Level Agreement):** The promise to customers. If we miss it, we may owe credits.
- **Error Budget:** The amount of failure we can afford while still meeting the SLO. Example: 99.9% uptime allows about 43 minutes of downtime per month.
- **Real examples from this repo (load testing):**
  - Payment P95 latency: 487ms (target < 500ms)
  - Error rate: 2-3% (target < 5%)
  - See: [LOAD_TESTING_QUICK_REFERENCE.md](../LOAD_TESTING_QUICK_REFERENCE.md)
- **Practical error budget math:** 99.5% uptime = 0.5% downtime = about 3.6 hours per month.
- **Rule of thumb:** Set SLA about 0.5% below the SLO (gives buffer).

## What We Collect (Logs, Metrics, Traces)

### Logs (Structured JSON + Correlation)
- **Backend:** JSON logs with `requestId`, `route`, `method`, `statusCode`, `latency`, and error stacks.
  - Code: backend/src/utils/structuredLogger.ts
  - Middleware: backend/src/middleware/requestLogger.ts
- **Commerce (Next API):** JSON logs with `requestId`, `route`, `method`, and latency.
  - Code: commerce-web/src/lib/request-logger.ts
- **Verifier:** `npm run demo:logs` (scripts/demo-logs.js)

**Docker log commands (filtering):**
```bash
docker-compose logs -f api
docker-compose logs -f payments
docker-compose logs -f worker

# Filter for errors
docker-compose logs api | grep -i "error\|warn"
docker-compose logs payments | grep -i "webhook"
```

**Optional Logtail:** Configure `LOGTAIL_SOURCE_TOKEN` to forward logs to Logtail.

### Metrics
- **Prometheus:** scrape `/metrics` from backend server.
  - Code: backend/src/server.ts (prom-client)
- **Queue metrics endpoint:** `/queue/metrics`
- **Dashboard:** [queue-monitor-dashboard.html](../queue-monitor-dashboard.html)

### Traces
- **OpenTelemetry -> Jaeger** (via otel-collector-config.yaml)
- **Capture scripts:**
  - scripts/generateDemoTraces.js
  - check-traces.js
  - trace-viewer.html

## Incident Response Checklist

### Auth Failures (4-step diagnosis + fixes)
1. **Check JWT verification**
  - Logs: search for `Invalid token`, `JWT_SECRET missing`, `token expired`
2. **Check MongoDB connection**
  - Look for `MongoDB connection failed` in backend logs
3. **Check token expiry settings**
  - Verify token TTL in auth logic and client refresh behavior
4. **Confirm rate limiting is not blocking**
  - Run: `node scripts/test-rate-limiting.js http://localhost:3000`

**Common fixes:**
- Ensure `JWT_SECRET` is set and consistent across services
- Restart MongoDB or fix `MONGO_URI`
- Re-issue tokens if clock drift or TTL misconfig

### Webhook Failures (4-step diagnosis + fixes)
1. **Check queue depth**
  - `redis-cli llen 'bull:webhooks:1'`
2. **Check Redis memory**
  - `redis-cli info memory` (warn if > 80%)
3. **Check worker health**
  - Inspect worker logs for retries or crashes
4. **Verify webhook signatures and IDs**
  - Logs include `eventType`, `eventId`, `idempotencyKey`

**Common fixes:**
- Scale workers (`docker-compose up -d --scale worker=3`)
- Increase Redis memory or clear stuck queues
- Verify webhook secret env vars

### Storage Failures (4-step diagnosis + fixes)
1. **Check Supabase connectivity**
  - Run: `node scripts/test-storage-e2e.js`
2. **Check credentials**
  - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`
3. **Check bucket permissions**
  - Confirm bucket exists and is private
4. **Confirm signed URL expiry handling**
  - Run: `node test-supabase-expiry.js`

**Common fixes:**
- Rotate Supabase service key
- Fix bucket name (`SUPABASE_BUCKET`)
- Recreate bucket policy if access denied

## Secure Secret Handling (Operational)

### Inventory + Rotation Cadence

| Secret | Purpose | Rotation Cadence |
|---|---|---|
| `JWT_SECRET` | Sign auth tokens | 90 days |
| `MONGO_URI` | Database connection | 180 days |
| `STRIPE_WEBHOOK_SECRET` | Verify webhooks | 180 days |
| `SUPABASE_SERVICE_ROLE` | Storage access | 90 days |
| `REDIS_PASSWORD` | Cache/queue access | 180 days |

### Emergency Rotation (JWT_SECRET leak, target < 2 hours)
1. **Generate new secret:**
  - `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Update environment/CI secrets** with new value.
3. **Deploy and verify**:
  - `npm run test:security`
  - `npm run demo:logs`
4. **Remove old secret** after traffic is healthy.

### Scheduled Rotation (Quarterly Checklist)
1. Generate new values (JWT + Redis):
  - `node -e "console.log('NEW_JWT=', require('crypto').randomBytes(32).toString('hex'))"`
  - `node -e "console.log('NEW_REDIS=', require('crypto').randomBytes(16).toString('hex'))"`
2. Update environment/CI secrets.
3. Deploy with rolling restart.
4. Record rotation in ops notes.

## Rate Limiter Store Selection (Env Examples)

```bash
# Local/dev (no Redis required)
RATE_LIMIT_STORE=memory

# Redis (self-hosted or managed)
RATE_LIMIT_STORE=redis
REDIS_URL=redis://:password@host:6379

# Upstash (serverless Redis)
RATE_LIMIT_STORE=upstash
UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

## Quick Verifiers (Repo Scripts)

- **Logs + correlation:** `npm run demo:logs`
- **Health endpoints:** `npm run verify:health`
- **Rate limiting:** `npm run test:rate-limit`
- **Storage E2E:** `node scripts/test-storage-e2e.js`
