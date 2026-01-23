# Network Failure Drill - Complete Guide

This guide covers simulating service failures, testing retry/DLQ/recovery behavior, and documenting the results for the Multi-Gateway Platform.

---

## Overview

**Purpose:** Demonstrate system resilience by:
1. Stopping a critical service (payments)
2. Observing retry behavior and error handling
3. Testing Dead Letter Queue (DLQ) if configured
4. Verifying complete recovery after restart

**Evidence Required:**
- Before/during/after logs
- Load test reports (during outage & post-recovery)
- Loom video walkthrough (5-7 minutes)

---

## Quick Start

### Automated Drill (Recommended)

```bash
# Ensure Docker services are running
docker-compose up -d

# Run complete failure drill
node run-failure-drill.js
```

This automatically:
1. Captures baseline state
2. Stops payments service
3. Runs load test during outage
4. Restarts service
5. Validates recovery
6. Saves all logs and reports

**Output Location:** `logs/failure-drill/`

---

## Manual Drill (Step-by-Step)

### Prerequisites

```bash
# Start all services
docker-compose up -d

# Verify services are healthy
docker-compose ps
curl http://localhost:5000/health
```

### Phase 1: Baseline

```bash
# Capture baseline logs
docker-compose logs --tail=100 api payments gateway worker > logs/failure-drill/baseline-logs.txt

# Verify health
curl -i http://localhost:5000/health
```

### Phase 2: Simulate Failure

```bash
# Stop target service
docker-compose stop payments

# Verify it's stopped
docker-compose ps payments
# Should show "Exited"
```

### Phase 3: Load Test During Outage

```bash
# Run load test
cd loadtest
npx artillery run artillery.yml --output ../logs/failure-drill/artillery-during-outage.json
cd ..

# Capture outage logs
docker-compose logs --tail=200 api gateway worker > logs/failure-drill/outage-logs.txt
```

**Expected Results:**
- High error rate (5xx, timeouts)
- Connection refused errors
- Retry attempts visible in logs

### Phase 4: Check Retry/DLQ Behavior

```bash
# Check logs for retries
docker-compose logs api | grep -i "retry\|attempt\|backoff"

# Check DLQ if using BullMQ/Redis
redis-cli LLEN bull:payments:failed
redis-cli LRANGE bull:payments:failed 0 5
```

### Phase 5: Recovery

```bash
# Restart service
docker-compose start payments

# Wait for startup
sleep 5

# Verify recovery
docker-compose ps payments
curl -i http://localhost:5000/health

# Capture recovery logs
docker-compose logs --tail=100 payments api > logs/failure-drill/recovery-logs.txt
```

### Phase 6: Post-Recovery Validation

```bash
# Run load test again
cd loadtest
npx artillery run artillery.yml --output ../logs/failure-drill/artillery-post-recovery.json
cd ..
```

**Expected Results:**
- Low error rate (<1%)
- Normal response times
- Successful requests

---

## Key Metrics to Capture

### During Outage
| Metric | Expected Value |
|--------|----------------|
| Error Rate | >50% (high) |
| Response Time | Timeout/spike |
| Retry Attempts | Visible in logs |
| DLQ Entries | Jobs moved to DLQ |

### After Recovery
| Metric | Expected Value |
|--------|----------------|
| Error Rate | <1% (normal) |
| Response Time | <200ms (healthy) |
| Success Rate | >99% |
| Recovery Time | ~5-10 seconds |

---

## Evidence Files

After running the drill, you'll have:

```
logs/failure-drill/
├── baseline-logs-*.txt          # Before failure
├── outage-logs-*.txt            # During outage
├── outage-after-load-*.txt      # After load test during outage
├── recovery-logs-*.txt          # After restart
├── artillery-during-outage-*.json   # Load test results (outage)
├── artillery-post-recovery-*.json   # Load test results (recovered)
└── drill-results-*.json         # Summary of all phases
```

---

## Loom Video Walkthrough

Follow **`LOOM_FAILURE_DRILL.md`** for a complete step-by-step recording script.

**Segments to Cover:**
1. Introduction & baseline (30s)
2. Baseline state demonstration (1 min)
3. Simulate service failure (1 min)
4. Load test during outage (2 min)
5. Examine failure behavior (1 min)
6. Service recovery (1 min)
7. Post-recovery validation (1 min)
8. DLQ processing if applicable (30s)
9. Summary & evidence (30s)

**Total Duration:** 5-7 minutes

---

## Expected Behavior

### System Behavior During Outage

**API Gateway:**
- Returns 5xx errors for payment-related endpoints
- May implement circuit breaker pattern
- Logs connection errors

**Worker Queues:**
- Jobs fail to process
- Retry attempts based on configuration
- Failed jobs move to DLQ if configured

**Other Services:**
- Continue operating normally
- Health checks pass for non-payment services

### System Behavior After Recovery

**Immediate:**
- Service starts accepting connections
- Health checks pass
- Logs show successful initialization

**Within 30 seconds:**
- Full traffic restored
- Error rate drops to normal
- Response times stabilize

---

## Retry & DLQ Configuration

### Check Current Configuration

```bash
# Check if retries are configured
grep -r "retry\|maxAttempts" backend/src/

# Check DLQ configuration
grep -r "deadLetterQueue\|DLQ" backend/src/
```

### Expected Retry Behavior

**BullMQ (if configured):**
- Default: 3 retry attempts
- Exponential backoff
- Failed jobs → DLQ after max attempts

**API Circuit Breaker (if configured):**
- Opens after N failures
- Half-open state for testing
- Closes on success

---

## Troubleshooting

### Service Won't Stop

```bash
# Force stop
docker-compose kill payments

# Or remove and recreate
docker-compose rm -f payments
docker-compose up -d payments
```

### Service Won't Start

```bash
# Check logs for errors
docker-compose logs payments

# Rebuild if needed
docker-compose build payments
docker-compose up -d payments
```

### No Retry Logs Visible

- Retries may happen too fast to see
- Check application configuration
- May need to add more logging

### DLQ Not Working

- Verify Redis connection
- Check BullMQ configuration
- Ensure DLQ is enabled in queue options

---

## PR Description Template

```markdown
## Network Failure Drill: Service Outage Simulation

### Overview
Simulated payments service failure to demonstrate:
- Retry and backpressure behavior
- Dead Letter Queue (DLQ) handling
- Complete recovery process

### Execution
1. **Baseline:** All services healthy, baseline logs captured
2. **Failure:** Stopped payments service via `docker-compose stop payments`
3. **Outage:** Ran load test during outage
   - Error rate: X% (expected high)
   - Retries: X attempts visible in logs
   - DLQ: X jobs moved to DLQ (if applicable)
4. **Recovery:** Restarted service via `docker-compose start payments`
   - Recovery time: ~5-10 seconds
   - Health check: ✅ PASSED
5. **Validation:** Post-recovery load test
   - Error rate: <1%
   - Success rate: >99%
   - Response time: Normal

### Evidence
- **Loom Video:** [Link to walkthrough]
- **Logs:** `logs/failure-drill/` (baseline, outage, recovery)
- **Load Test Reports:** 
  - During outage: `artillery-during-outage-*.json`
  - Post-recovery: `artillery-post-recovery-*.json`
- **Summary:** `drill-results-*.json`

### Key Observations
- ✅ System handled outage gracefully
- ✅ Retry logic working as expected
- ✅ [DLQ captured failed jobs] OR [No DLQ configured - manual recovery]
- ✅ Full recovery within 10 seconds
- ✅ Other services remained operational

### Files Added
- `run-failure-drill.js` - Automated drill runner
- `LOOM_FAILURE_DRILL.md` - Video walkthrough guide
- `FAILURE_DRILL_GUIDE.md` - Complete documentation
```

---

## Next Steps

1. ✅ Run the drill: `node run-failure-drill.js`
2. ✅ Review logs in `logs/failure-drill/`
3. ✅ Record Loom video using `LOOM_FAILURE_DRILL.md`
4. ✅ Add evidence to PR
5. ✅ Share Loom link with supervisor

---

**Ready to run? Execute:** `node run-failure-drill.js`
