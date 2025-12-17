# Loom Script: Failure Drill & 1k-VU Load Test (3–5 min)

## Title
"Multi-Gateway Platform: Failure Recovery & 1k-VU Load Test"

## Agenda (10–15 sec)
- What the platform is (gateway, payments, analytics, notifications, workers)
- What I’ll demonstrate: failure drill and 1k-VU load test

## Part 1: Compose Failure Drill (1–2 min)
1. Show running services:
   ```powershell
   docker-compose ps
   ```
2. Simulate failure:
   ```powershell
   docker-compose stop mongo
   docker-compose ps
   ```
   Explain service isolation (Redis stays up; API shows dependency errors gracefully).
3. Recovery:
   ```powershell
   docker-compose start mongo
   docker-compose logs mongo --tail=30
   ```
   Narrate WiredTiger recovery logs ("startup complete", "listening on", recovery time).
4. Mention evidence doc: [docs/docker-compose-failure-drill.md](docker-compose-failure-drill.md)

## Part 2: 1k-VU Load Test (1–2 min)
1. Ensure services are up:
   ```powershell
   docker-compose up -d api payments analytics notifications redis mongo worker
   ```
2. Run the test and save report:
   ```powershell
   cd loadtest
   npx artillery run artillery-1k.yml -o report-1k.json
   ```
3. Narrate results:
   - Requests and request rate
   - Errors under stress (timeouts/conn resets)
   - 401 indicates endpoints expect auth; this run focuses on throughput
   - Workers are stable; Redis tuned for high concurrency
4. Show summary file: [loadtest/results-1k.md](../loadtest/results-1k.md)

## Close (20–30 sec)
- Where to find artifacts: JSON report, README, docs
- Next steps: add auth for realistic success rates, rate limits, dashboards
- Thank you
