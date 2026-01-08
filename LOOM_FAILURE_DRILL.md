# Network Failure Drill - Loom Walkthrough Guide

**Purpose:** Demonstrate service failure simulation, retry behavior, DLQ handling, and recovery.

---

## Pre-Recording Setup Checklist

### Services Required
- [ ] Docker containers running: `docker-compose up -d`
- [ ] Backend API: `cd backend && npm start` (port 5000)
- [ ] Services to test: api, payments, analytics, notifications, redis, mongo, workers

### Pre-run Verification
```bash
# Check all services are up
docker-compose ps

# Verify health endpoint
curl http://localhost:5000/health

# Check Redis connection
redis-cli PING

# Verify payments service is running
docker-compose ps payments
```

---

## Loom Recording Script (5-7 minutes)

### **Segment 1: Introduction & Setup (30 sec)**
**Screen:** Terminal with docker-compose ps output

```
"In this video, we'll simulate a critical service failure to demonstrate:
1. How the system handles service outages
2. Retry and backpressure behavior
3. Dead Letter Queue (DLQ) handling if configured
4. Complete recovery after service restart

We'll stop the 'payments' service, run load tests during the outage,
and observe how the system recovers."
```

**Show:**
- [ ] `docker-compose ps` showing all services healthy
- [ ] `curl http://localhost:5000/health` returning 200 OK

---

### **Segment 2: Baseline State (1 min)**
**Screen:** Terminal + browser with logs

```
"First, let's capture the baseline state with all services healthy."
```

**Run:**
```bash
node run-failure-drill.js
# OR manually:
docker-compose logs --tail=50 payments api gateway > logs/failure-drill/baseline-logs.txt
```

**Show:**
- [ ] Docker ps showing all services "Up"
- [ ] Baseline logs showing normal operation
- [ ] Health check returning successful response

---

### **Segment 3: Simulate Service Failure (1 min)**
**Screen:** Split view - terminal and docker desktop/docker ps

```
"Now we'll stop the payments service to simulate a critical failure."
```

**Run:**
```bash
docker-compose stop payments
docker-compose ps
```

**Show:**
- [ ] Command executing
- [ ] Docker ps showing payments service "Exited" status
- [ ] Other services still "Up"

---

### **Segment 4: Load Test During Outage (2 min)**
**Screen:** Terminal running Artillery

```
"Let's run a load test while the payments service is down.
We expect to see:
- Failed requests (5xx or timeouts)
- Retry attempts in logs
- Jobs potentially going to DLQ if configured"
```

**Run:**
```bash
cd loadtest
npx artillery run artillery.yml
```

**Show:**
- [ ] Artillery output showing errors/timeouts
- [ ] Real-time error rates increasing
- [ ] Response times spiking or timing out

**Simultaneously show (split screen):**
```bash
docker-compose logs --tail=100 -f api gateway worker
```

**Point out:**
- [ ] Error messages in API logs (connection refused, timeouts)
- [ ] Retry attempts if visible
- [ ] DLQ entries if configured (show queue counts)

---

### **Segment 5: Examine Failure Behavior (1 min)**
**Screen:** Logs and Artillery summary

```
"Looking at the results during outage, we can see:
- X% of requests failed (expected)
- Retry attempts in gateway/worker logs
- [If applicable] Jobs moved to DLQ queue
- System remains responsive for other services"
```

**Show:**
- [ ] Artillery summary with high error rate
- [ ] Captured logs showing retry logic
- [ ] DLQ count if applicable: `redis-cli LLEN bull:payments:failed`
- [ ] Other services still healthy

---

### **Segment 6: Service Recovery (1 min)**
**Screen:** Terminal

```
"Now let's restart the payments service and observe recovery."
```

**Run:**
```bash
docker-compose start payments
docker-compose ps
curl http://localhost:5000/health
```

**Show:**
- [ ] Payments service starting up
- [ ] Docker ps showing "Up" status
- [ ] Health check returning 200 OK
- [ ] Logs showing successful connections

**Wait 5 seconds, then show:**
```bash
docker-compose logs --tail=50 payments
```

**Point out:**
- [ ] Service initialization messages
- [ ] Successful startup
- [ ] Reconnection logs

---

### **Segment 7: Post-Recovery Validation (1 min)**
**Screen:** Terminal running Artillery again

```
"Let's verify full recovery by running another load test."
```

**Run:**
```bash
cd loadtest
npx artillery run artillery.yml
```

**Show:**
- [ ] Artillery output showing successful requests
- [ ] Low error rate (back to normal)
- [ ] Response times healthy
- [ ] Summary showing success

**Show logs:**
```bash
docker-compose logs --tail=50 payments api
```

**Point out:**
- [ ] Successful payment processing
- [ ] No more connection errors
- [ ] Normal operation restored

---

### **Segment 8: DLQ Processing (30 sec)** *(if applicable)*
**Screen:** Terminal or Redis CLI

```
"If we have a DLQ configured, let's check and reprocess failed jobs."
```

**Run:**
```bash
# Check DLQ count
redis-cli LLEN bull:payments:failed

# Or view failed jobs
redis-cli LRANGE bull:payments:failed 0 -1
```

**Show:**
- [ ] DLQ count/contents
- [ ] Reprocessing command if implemented
- [ ] Or note: "DLQ for manual review"

---

### **Segment 9: Summary & Evidence (30 sec)**
**Screen:** File explorer showing evidence files

```
"Summary of what we demonstrated:

BEFORE FAILURE:
✅ All services healthy
✅ Baseline logs captured

DURING OUTAGE:
❌ Payments service stopped
❌ High error rate in load test
📝 Retry attempts logged
📝 [DLQ] Failed jobs moved to DLQ

AFTER RECOVERY:
✅ Service restarted successfully
✅ Load test passed
✅ System fully recovered

Evidence files saved in logs/failure-drill/:
- baseline-logs.txt
- outage-logs.txt
- recovery-logs.txt
- artillery reports
- drill-results.json
"
```

**Show:**
- [ ] File explorer with logs/failure-drill/ directory
- [ ] Evidence files timestamps
- [ ] Artillery JSON reports

---

## Post-Recording Deliverables

### Files to Provide Supervisor
1. **Video:** Loom link (5-7 min walkthrough)
2. **Logs:**
   - `logs/failure-drill/baseline-logs-*.txt`
   - `logs/failure-drill/outage-logs-*.txt`
   - `logs/failure-drill/recovery-logs-*.txt`
3. **Artillery Reports:**
   - `logs/failure-drill/artillery-during-outage-*.json`
   - `logs/failure-drill/artillery-post-recovery-*.json`
4. **Results Summary:**
   - `logs/failure-drill/drill-results-*.json`

### Key Metrics to Highlight

**During Outage:**
- Error rate: X% (high, expected)
- Response time: X ms (timeout/spike)
- Failed requests: X out of Y
- Retry attempts: X (visible in logs)
- DLQ entries: X jobs (if applicable)

**After Recovery:**
- Error rate: <1% (back to normal)
- Response time: X ms (healthy)
- Successful requests: X out of Y
- Recovery time: ~5 seconds

---

## Tips for Smooth Recording

1. **Increase Terminal Font:** Use Ctrl++ for better visibility
2. **Split Screen:** Show terminal + docker ps or logs side-by-side
3. **Narrate Actions:** Explain what you're doing and what to expect
4. **Pause if Needed:** Wait for services to fully start/stop
5. **Use Timestamps:** Add Loom timestamps to key moments
6. **Show Evidence:** Always show the proof (logs, status, reports)

---

## Automated vs Manual

**Automated (Recommended):**
```bash
node run-failure-drill.js
```
- Runs all phases automatically
- Captures all logs
- Generates summary report

**Manual (for Loom demonstration):**
Run commands step-by-step as shown in segments above for better narration.

---

## Troubleshooting

### Service Won't Stop
```bash
docker-compose kill payments
```

### Service Won't Start
```bash
docker-compose up -d payments
docker-compose logs payments
```

### No Logs Appearing
```bash
# Check if service exists
docker-compose ps

# Force log output
docker-compose logs --tail=100 --follow payments
```

### Health Check Fails After Recovery
Wait 10-15 seconds for full initialization, then retry.

---

**Ready to record? Start with checking all services are up in Segment 1!**
