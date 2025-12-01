Load testing with Artillery

Overview
- This folder contains an `artillery.yml` scenario that simulates mixed API traffic and ramps up to ~1000 requests/sec.

Prerequisites
- Install Artillery locally or run with `npx` (no global install required):

  npx artillery --version

Run the test (PowerShell example)

  cd loadtest
  npx artillery run artillery.yml

Notes and tips
- The test targets `http://host.docker.internal:5000` so it can reach services running on the host from containers. If running on Linux, replace with `http://localhost:5000`.
- The scenario focuses on lightweight endpoints (`/api/health`, `/api/jobs/health`, `/api/analytics/fraud-trend`) to stress the system without hitting external services like Supabase.
- To stress the Redis queues directly, use the included helper `backend/loadTest.js` which enqueues many jobs.

Scaling workers for the test
- Use docker compose with the override to scale the worker service to 5 instances:

  docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build --scale worker=5

Monitoring during the run
- Check Redis metrics and queue stats:

  # inside host or container
  curl http://localhost:9100/metrics   # worker Prometheus metrics (if exposed)
  curl http://localhost:9090           # Prometheus UI if running locally

  # to inspect BullMQ queue counts
  curl http://localhost:5000/api/jobs/health

Recommended approach
- Start services and scale workers to 5, then run the Artillery scenario for 2 minutes to observe queue latency, retry counts and delays.
- Use Prometheus + Grafana or `redis-cli` and `MONITOR` to inspect slow operations.
