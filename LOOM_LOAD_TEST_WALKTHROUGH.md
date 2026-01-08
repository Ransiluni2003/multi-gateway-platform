# Load Testing Loom Walkthrough Guide

**Purpose:** Demonstrate the effects of Redis tuning and 5-worker scaling on 1000 VU load test performance.

---

## Pre-Recording Setup Checklist

### Terminal Windows Required (4 total)
- [ ] **T1 (Backend):** `cd backend && npm start` → runs on :5000
- [ ] **T2 (Frontend):** `cd frontend && npm run dev` → runs on :3001  
- [ ] **T3 (Docker):** `docker-compose up` → redis, mongo, workers, services
- [ ] **T4 (Load Test):** Ready for `node run-load-test-comparison.js`

### Pre-run Verification
```bash
# Verify backend is up
curl http://localhost:5000/health

# Verify Redis is accessible
redis-cli PING  # should return PONG

# Check Docker containers
docker-compose ps  # all services should be 'Up'

# Check worker count
docker-compose ps | grep worker  # should show 5 instances
```

---

## Loom Recording Script (8-10 minutes)

### **Segment 1: Introduction & Setup (1 min)**
**Screen:** Split view showing all 4 terminals

```
"In this video, we'll demonstrate the performance improvements from:
1. Scaling to 5 BullMQ worker replicas
2. Applying Redis optimization tuning
3. Running a 1000 Virtual User load test

We'll capture CPU, memory, and Redis metrics before and after the optimizations."
```

**Show:**
- [ ] All 4 terminals running (backend, frontend, docker-compose, load test ready)
- [ ] `docker-compose ps` output showing 5 worker replicas
- [ ] `redis-cli INFO SERVER` showing configuration

---

### **Segment 2: Baseline Metrics Collection (1.5 min)**
**Screen:** Focus on **T4 (Load Test)** and system monitor side-by-side

```
"First, we'll capture baseline metrics before any optimizations."
```

**Run:**
```bash
node capture-metrics.js baseline-before
```

**Show:**
- [ ] CPU Usage percentage
- [ ] Memory (GB and %)
- [ ] Redis connected clients
- [ ] Redis memory usage
- [ ] Saved metrics file

---

### **Segment 3: Baseline Load Test Execution (3 min)**
**Screen:** Focus on **T4** with Artillery output

```
"Now we run the 1000 VU load test with the baseline configuration.
The test has 4 phases:
- 30s warm-up at 10 VU/s
- 60s ramp-up to 100 VU/s
- 120s sustained load at 1000 VU/s
- 30s cool-down at 50 VU/s

Total duration: 240 seconds (~4 minutes)"
```

**Run:**
```bash
cd loadtest && npx artillery run artillery-1k.yml
```

**Show:**
- [ ] Artillery progress output
- [ ] Real-time request rates and response times
- [ ] Final summary with p95/p99 latencies
- [ ] Error rate and timeout information

---

### **Segment 4: Baseline Metrics Collection (After) (1 min)**
**Screen:** Focus on **T4**

```
"After the baseline test completes, we capture metrics again to show
resource utilization during and after the test."
```

**Run:**
```bash
node capture-metrics.js baseline-after
```

**Show:**
- [ ] Comparison with baseline-before metrics
- [ ] Changes in CPU, memory, Redis stats
- [ ] Evicted keys count

---

### **Segment 5: Optimizations Review (1.5 min)**
**Screen:** Split showing code editor and docker-compose logs

```
"Now let's review the optimizations we've applied:

1. WORKER SCALING: 5 BullMQ replicas for parallel job processing
   - Visible in docker-compose.override.yml
   - docker-compose ps shows all 5 running

2. REDIS TUNING: Applied via redis.conf
   - maxmemory 2GB prevents unbounded growth
   - maxmemory-policy allkeys-lru evicts least-recently-used keys
   - maxclients 10000 supports more concurrent connections
   - Persistence disabled for throughput

3. API IMPROVEMENTS: Connection pooling and backpressure handling
"
```

**Show:**
- [ ] `docker-compose ps` filtered for workers
- [ ] `cat redis.conf | grep -E "maxmemory|maxclients|timeout"`
- [ ] Worker pod logs showing job processing
- [ ] Redis memory management in action

---

### **Segment 6: Optimized Load Test Execution (3 min)**
**Screen:** Focus on **T4**

```
"Now we run the same 1000 VU load test again with optimizations in place.
We'll compare the results with the baseline to see the improvements."
```

**Run:**
```bash
cd loadtest && npx artillery run artillery-1k.yml
```

**Show:**
- [ ] Same phases as baseline (warm-up → ramp → sustained → cool-down)
- [ ] Artillery output showing potentially improved latencies
- [ ] Error rates and timeout counts

---

### **Segment 7: Optimized Metrics Collection (After) (1 min)**
**Screen:** Focus on **T4**

```
"Capturing final metrics to complete the comparison."
```

**Run:**
```bash
node capture-metrics.js optimized-after
```

**Show:**
- [ ] Metrics after optimized load test
- [ ] Visual comparison with baseline

---

### **Segment 8: Results Comparison & Analysis (1.5 min)**
**Screen:** Browser or text editor showing markdown report

```
"Let's examine the before/after comparison. The optimizations should show:

EXPECTED IMPROVEMENTS:
✅ CPU Usage: Lower peak utilization (more even distribution across workers)
✅ Memory: More stable memory usage with LRU eviction
✅ Redis Clients: Better connection handling
✅ Evicted Keys: Reduced or managed eviction due to LRU policy
✅ Throughput: Stable or improved request handling

FACTORS:
- More workers = better parallelism
- Redis tuning = prevents memory bloat and handles spikes
- Connection pooling = reuses connections efficiently
"
```

**Show:**
- [ ] Open `LOAD_TEST_COMPARISON_1K_VU.md`
- [ ] Scroll through metrics table
- [ ] Highlight key improvements (CPU %, Memory %, Evicted Keys)
- [ ] Comparison table side-by-side
- [ ] Raw data files in `loadtest/comparison-results/`

---

### **Segment 9: Production Recommendations (1 min)**
**Screen:** Focus on recommendations section in markdown

```
"Based on these results, here are recommendations for production:

1. AUTO-SCALING: Monitor CPU/Memory and scale workers based on load
2. CACHING: Implement selective data caching to reduce Redis pressure
3. CIRCUIT BREAKERS: Add fallback strategies for graceful degradation
4. MONITORING: Set up alerts for CPU >80%, Memory >85%, Redis eviction rate
5. DISTRIBUTED TRACING: Use OpenTelemetry to identify service bottlenecks
"
```

**Show:**
- [ ] Production recommendations section
- [ ] Architecture diagram or callout

---

### **Segment 10: Summary & Conclusion (30 sec)**
**Screen:** Show final comparison table one more time

```
"In summary:
- Baseline: Standard configuration with single worker
- Optimized: 5 workers + Redis tuning (maxmemory, LRU eviction, higher limits)

The improvements demonstrate that:
✅ Horizontal scaling (workers) improves throughput
✅ Redis tuning prevents memory exhaustion
✅ Connection pooling reduces latency

These optimizations prepare the system for production load."
```

**Final Show:**
- [ ] Metrics comparison table
- [ ] Key metrics highlighted
- [ ] Links to documentation

---

## Post-Recording Deliverables

### Files to Provide Supervisor
1. **Video:** Loom link with 8-10 min walkthrough
2. **Markdown Report:** `LOAD_TEST_COMPARISON_1K_VU.md` with metrics table
3. **Raw Data:**
   - `loadtest/comparison-results/report-baseline-1k.json`
   - `loadtest/comparison-results/report-optimized-1k.json`
   - Metric files: `loadtest/metrics-baseline-*.json`, `loadtest/metrics-optimized-*.json`
4. **Configuration Files:**
   - `redis.conf` (tuning details)
   - `docker-compose.override.yml` (5 workers setup)
   - `loadtest/artillery-1k.yml` (test configuration)

### Summary Stats for Presentation
- **Test Duration:** ~8 minutes total (2x 4-minute load tests)
- **Load Profile:** 1000 Virtual Users sustained for 120 seconds
- **Scenarios:** Health checks, payments, analytics, notifications
- **Improvements:** [Insert actual %'s from comparison table]

---

## Tips for Smooth Recording

1. **Network Cleanup:** Close other apps that consume bandwidth
2. **System Resources:** Close browsers/IDEs not needed for demo
3. **Terminal Zoom:** Use `Ctrl++` to enlarge terminal fonts for visibility
4. **Pause & Resume:** You can pause between segments if needed
5. **Audio Quality:** Use a quiet environment; consider external microphone
6. **Timestamps:** Loom will let you add timestamps to key moments

---

## Backup: If Tests Fail

If load tests encounter errors:
1. Check backend is running: `curl http://localhost:5000/health`
2. Restart Redis: `docker-compose restart redis`
3. Clear old data: `docker-compose down && docker-compose up`
4. Verify workers: `docker-compose logs worker`
5. Check ports aren't conflicting: `lsof -i :5000 :3001`

---

**Ready to record? Start with checking terminal setup in Segment 1!**
