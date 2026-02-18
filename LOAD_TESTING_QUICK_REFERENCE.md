# 🎯 Load Testing Quick Reference Card

## 🚀 Quick Start (5 minutes)

```bash
# 1. Verify everything is ready
node loadtest/verify-setup.js

# 2. Run light load test (100 users, 2 min)
node loadtest/quick-test.js light

# 3. Open monitoring dashboard
open queue-monitor-dashboard.html

# 4. Check metrics
curl http://localhost:3000/queue/status
```

---

## 📊 Test Scenarios

| Scenario | Command | Load | Duration | Use Case |
|----------|---------|------|----------|----------|
| **Light** | `quick-test light` | 100 VU | 2 min | Baseline |
| **Medium** | `quick-test medium` | 250 VU | 3 min | Peak hour |
| **Heavy** | `quick-test heavy` | 500 VU | 3 min | High load |
| **Extreme** | `quick-test extreme` | 1000 VU | 5 min | Max capacity |
| **Endurance** | `quick-test endurance` | 100 VU | 30 min | Stability |
| **Spike** | `quick-test spike` | 2000 VU | 1 min | Traffic spike |
| **Full Suite** | `run-load-tests.js` | 100→1000 VU | 20 min | All tests |

---

## ✅ Success Criteria

### At 1000 Concurrent Users

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Payment p95 | <500ms | <800ms | >1500ms ❌ |
| Notif p95 | <300ms | <600ms | >1000ms ❌ |
| Webhook p95 | <1000ms | <2000ms | >3000ms ❌ |
| Error rate | <5% | <10% | >20% ❌ |
| Queue depth | <5000 | <10000 | >15000 ❌ |
| Redis memory | <70% | <80% | >95% ❌ |

---

## 🔍 Monitoring Endpoints

```bash
# All queue metrics
curl http://localhost:3000/queue/metrics

# Queue status summary
curl http://localhost:3000/queue/status

# Specific queue (payments/notifications/webhooks)
curl http://localhost:3000/queue/payments/metrics

# Post a test job
curl -X POST http://localhost:3000/queue/job \
  -H "Content-Type: application/json" \
  -d '{
    "queueName": "payments",
    "jobName": "process-payment",
    "data": {"orderId": "123", "amount": 100}
  }'
```

---

## 🆘 Troubleshooting

### Problem: Queue Depth Growing
```bash
# Check size
redis-cli llen 'bull:payments:1'

# Solutions:
# 1. Increase concurrency (in docker-compose.yml)
# 2. Scale workers: docker-compose scale worker=7
# 3. Check processor for blocking I/O
```

### Problem: High Latency (P99 > 2000ms)
```bash
# Check slow queries
redis-cli slowlog get 10

# Check latency
redis-cli --latency-history

# Solutions:
# 1. Reduce worker concurrency
# 2. Increase Redis memory (4GB → 8GB)
# 3. Add more worker replicas
```

### Problem: Redis Memory > 85%
```bash
# Check memory usage
redis-cli info memory

# Solutions:
# 1. Enable job cleanup (removeOnComplete: true)
# 2. Reduce job payload size
# 3. Implement job archiving
```

---

## 📈 Performance Tuning

### Increase Throughput
```typescript
// Increase concurrency
queueManager.registerQueue({
  name: 'notifications',
  concurrency: 15,  // ↑ from 10
});
```

### Reduce Latency
```typescript
// Reduce concurrency per worker (less contention)
queueManager.registerQueue({
  name: 'payments',
  concurrency: 3,  // ↓ from 5
});
```

### Scale Workers
```yaml
# docker-compose.yml
worker:
  deploy:
    replicas: 7  # ↑ from 5
```

---

## 📁 Key Files

```
loadtest/
  load-test-bullmq.js        ← k6 test script
  quick-test.js              ← Quick launcher
  run-load-tests.js          ← Full suite
  metrics-collector.js       ← Metrics collection
  verify-setup.js            ← Pre-flight check
  README.md                  ← Full guide

backend/src/queues/
  queueManager.ts            ← Core system
  handlers.ts                ← Queue handlers
  metricsRouter.ts           ← API endpoints

Root:
  queue-monitor-dashboard.html
  redis-load-test.conf
  SERVICE_SCALING_LOAD_TESTING_COMPLETE.md
```

---

## 🎓 Queue Types

### 1. Payments Queue
- **Concurrency:** 5
- **Retries:** 3 (exponential backoff)
- **Target P95:** <500ms
- **Use:** Financial transactions

### 2. Notifications Queue
- **Concurrency:** 10
- **Retries:** 2
- **Target P95:** <300ms
- **Use:** Email, SMS, push notifications

### 3. Webhooks Queue
- **Concurrency:** 8
- **Retries:** 5 (long backoff)
- **Target P95:** <1000ms
- **Use:** External webhooks, event delivery

---

## 💡 Pro Tips

1. **Dashboard During Tests**
   - Open dashboard in separate browser
   - Auto-refreshes every 5 seconds
   - Watch metrics in real-time

2. **Analyze Results**
   - Results saved in `loadtest-results/`
   - JSON format for further analysis
   - Compare across test runs

3. **Custom Tests**
   ```bash
   k6 run loadtest/load-test-bullmq.js \
     --vus 750 \
     --duration 10m \
     --out json=results.json
   ```

4. **Monitor During Tests**
   ```bash
   # Terminal tab while test runs
   watch -n 1 'redis-cli llen "bull:payments:1"'
   ```

---

## 🔄 Full Test Flow

```
1. Verify Setup
   ↓
2. Start Services (Redis, MongoDB, Backend)
   ↓
3. Open Monitoring Dashboard
   ↓
4. Run Load Test (light → heavy → extreme)
   ↓
5. Monitor Metrics in Real-Time
   ↓
6. Analyze Results (JSON files)
   ↓
7. Tune Configuration if Needed
   ↓
8. Deploy to Production
```

---

## 📞 Quick Commands

```bash
# Setup
npm install
docker-compose up -d redis mongo

# Verify
node loadtest/verify-setup.js

# Test (Light)
node loadtest/quick-test.js light

# Full Suite
node loadtest/run-load-tests.js

# Metrics
curl http://localhost:3000/queue/status

# Redis CLI
redis-cli -a redis-secure-password-dev
KEYS 'bull:*'
LLEN 'bull:payments:1'
INFO memory
```

---

**Last Updated:** January 9, 2026  
**Quick Ref Version:** 1.0
