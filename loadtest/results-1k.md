# 1k-VU Load Test Results (Artillery)

Date: 2025-12-16
Environment: Docker Compose (api, payments, analytics, notifications, redis, mongo)
Workers: 5 replicas (BullMQ); metrics exposed on :9100
Redis: Tuned via redis.conf (allkeys-lru, maxclients 10000, maxmemory 2gb)

## Summary
- Test profile: Warm-up (30s) → Ramp (60s) → 1000 VU/s (120s) → Cool-down (30s)
- Target: http://localhost:5002
- Scenarios: health, payments, analytics, notifications

## Key Metrics (from Artillery Summary)
- Requests: 127,800
- Average request rate: 150/sec (peak periods >700/sec)
- Response codes: 401 (48) — endpoints require auth; expected under unauthenticated load
- Errors:
  - ECONNREFUSED: 2,879
  - ECONNRESET: 9,899
  - ETIMEDOUT: 114,974 (service saturation/backpressure under 1k VU)
- Response time (4xx):
  - min: 56 ms
  - mean: 119 ms
  - p95: 149.9 ms
  - p99: 153 ms

## Observations
- Under 1k VU sustained, services reached saturation resulting in timeouts and connection resets.
- Rate limiting/backpressure surfaced as 429 and timeouts during earlier runs.
- 401 responses indicate endpoints expect authentication; this run intentionally omitted auth to focus on throughput.
- Workers were stable; metrics endpoints reported and processed job loop without runtime errors.

## Evidence Files
- JSON report: [loadtest/report-1k.json](loadtest/report-1k.json)
- Test config: [loadtest/artillery-1k.yml](loadtest/artillery-1k.yml)
- Redis tuning: [redis.conf](../redis.conf)
- Docker Compose: [docker-compose.yml](../docker-compose.yml), [docker-compose.override.yml](../docker-compose.override.yml)

## Screenshots Checklist
- Docker containers running (api/payments/analytics/notifications/redis/mongo/workers)
- Worker logs showing metrics server and Redis eviction warning
- Terminal running Artillery during 1k phase and final summary
- Optional: Grafana/Prometheus panels, if configured

## Next Tuning Ideas (Optional)
- Configure authentication tokens for realistic success rates
- Introduce queue buffering to absorb spikes; ensure Redis `maxmemory-policy` `noeviction` for BullMQ reliability
- Add per-service rate limits and circuit breakers; scale api replicas
- Instrument tracing and dashboards to visualize bottlenecks
