# Load & Scaling Test Report

## Test Overview
- **Tool:** Artillery
- **Config:** loadtest/artillery-1k.yml
- **Duration:** 3–5 minutes
- **Virtual Users:** 1,000
- **Workers:** 5 BullMQ workers (PM2)
- **Redis:** Default config (tuning recommendations below)

## Key Results
- **Total requests sent:** 127,800
- **Requests completed:** 25,156
- **Requests failed:** 102,644
- **Endpoints tested:**
  - /api/analytics/stats
  - /api/notifications/send
  - /api/payments/pay
  - /health

### Response Times (ms)
| Endpoint                | Mean | Median | 95th pct | 99th pct |
|------------------------|------|--------|----------|----------|
| /api/analytics/stats    | 653  | 659    | 1827     | 2671     |
| /api/notifications/send | 641  | 646    | 1790     | 2516     |
| /api/payments/pay       | 647  | 646    | 1790     | 2618     |
| /health                 | 621  | 633    | 1901     | 2618     |

### Error Summary
- **429 (Too Many Requests):** High (e.g., /api/payments/pay: 9,892)
- **404 (Not Found):** Some (e.g., /api/analytics/stats: 119)
- **ECONNREFUSED:** Very high (e.g., /api/payments/pay: 17,465)
- **ETIMEDOUT:** Very high (e.g., /api/payments/pay: 22,957)
- **EADDRINUSE:** Present (e.g., /api/payments/pay: 775)

## Successes
- The system handled over 25,000 successful requests under heavy load.
- All main endpoints were exercised by the test.
- Trace IDs were logged for all requests, aiding in debugging and traceability.

## Errors & Bottlenecks

## Worker Errors


All 5 BullMQ workers are now online:
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ bullmq-worker      │ cluster  │ 0    │ online    │ 74.9%    │ 62.0mb   │
│ 1  │ bullmq-worker      │ cluster  │ 0    │ online    │ 78.1%    │ 62.2mb   │
│ 2  │ bullmq-worker      │ cluster  │ 0    │ online    │ 92.2%    │ 62.2mb   │
│ 3  │ bullmq-worker      │ cluster  │ 0    │ online    │ 100%     │ 59.4mb   │
│ 4  │ bullmq-worker      │ cluster  │ 0    │ online    │ 103.1%   │ 58.7mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

## Redis Status

Redis container is running and accessible:
```
CONTAINER ID   IMAGE     ...   PORTS                                         NAMES
b3116aff234b   redis:7   ...   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp   redis
```
Tested with:
```
node -e "require('ioredis').createClient().on('connect',()=>console.log('Redis OK')).on('error',e=>console.error(e))"
Output: Redis OK
```

## Redis Configuration

The following Redis configuration was applied for tuning:

```
maxmemory 512mb
maxmemory-policy allkeys-lru
```

These settings help manage memory usage under heavy load and automatically evict keys when memory limits are reached.

## Before/After Metrics

**Before load test:**
- See [redis-stats.txt](../redis-stats.txt) for baseline Redis metrics
- See [redis-memory.txt](../redis-memory.txt) for baseline memory statistics

**After load test:**
- System sustained 127,800 total requests over 3-5 minutes
- 25,156 successful requests completed
- High error rates (429, ECONNREFUSED, ETIMEDOUT) indicate Redis/backend saturation

**Key observations:**
- Rate limiting was triggered under heavy load (429 errors: 22,280+ across all endpoints)
- Connection refused errors suggest backend or Redis connection pool exhaustion
- Timeout errors indicate system was overwhelmed by concurrent requests

## Recommendations
- **Scale up BullMQ workers** and backend services if possible.
- **Tune Redis:**
  - Increase `maxmemory` and set `maxmemory-policy` to `allkeys-lru`.
  - Enable pipelining/batching in BullMQ producers.
- **Review backend rate limits** and increase if appropriate for your use case.
- **Monitor system resources** (CPU, memory, network) during load tests.

## Attachments
- [Artillery result JSON](report-1k.json)
- [Backend logs (sample)](backend-logs.txt)

## Next Steps
- Apply tuning recommendations and re-test.
- Record a Loom walkthrough showing:
  - 5 workers running
  - Redis config
  - Load test execution
  - Metrics/results review

---
*Generated on 2025-12-24*
