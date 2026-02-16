# Proof Guide for Supervisor (Tasks A & B)

**Date:** 2026-02-16

This document shows exactly how to verify Tasks A and B in this repo, with commands and file references.

---

## A1 — Operational Security & Reliability Notes

**Requirement:** Create docs/PROD_READINESS_NOTES.md (max 2 pages) covering:
- SLO/SLA/Error Budget (simple terms)
- Logs/metrics/traces collected in this app
- Incident response checklist (auth/webhook/storage)
- Secure secret handling (rotation cadence + emergency rotation)
- Repo-specific references to scripts/verifiers

**Proof:**
- File: [docs/PROD_READINESS_NOTES.md](docs/PROD_READINESS_NOTES.md)

**What to show in Loom or review:**
- Open the file and scroll each section:
  - SLO/SLA/Error Budget section
  - Logs/Metrics/Traces section
  - Incident response checklist
  - Secret rotation cadence + emergency rotation
  - Verifier scripts listed at the end

---

## B1 — Structured Logging + Request Correlation

**Requirement:**
- Request ID injected per request
- Structured JSON logs (level, message, requestId, userId if available, route, latency)
- Error logs include stack + route + requestId
- Webhooks log event type + idempotency key / event ID
- Loom: show one request and find same requestId across middleware + handler
- Provide npm run demo:logs

**Proof (code):**
- Backend structured logger: [backend/src/utils/structuredLogger.ts](backend/src/utils/structuredLogger.ts)
- Backend request ID: [backend/src/middleware/requestId.js](backend/src/middleware/requestId.js)
- Backend request logging: [backend/src/middleware/requestLogger.ts](backend/src/middleware/requestLogger.ts)
- Webhook logging (backend): [backend/src/routes/webhookRoutes.ts](backend/src/routes/webhookRoutes.ts)
- Webhook logging (Stripe/PayPal controller): [backend/src/controllers/paymentsController.ts](backend/src/controllers/paymentsController.ts)
- Next API logging helper: [commerce-web/src/lib/request-logger.ts](commerce-web/src/lib/request-logger.ts)
- Next API structured logger: [commerce-web/src/lib/logger.ts](commerce-web/src/lib/logger.ts)

**Proof (script):**
- Command: npm run demo:logs
- Script: [scripts/demo-logs.js](scripts/demo-logs.js)

**How to show in Loom:**
1. Start backend and commerce-web in separate terminals.
2. Run:
   - npm run demo:logs
3. Pick a Request ID shown in the output and show it appears in the log stream.
4. Show a webhook log entry containing event type + event ID in console output.

---

## B2 — Health + Readiness Endpoints

**Requirement:**
- GET /api/health (basic up)
- GET /api/ready (DB reachable + storage reachable)
- Optional GET /api/version (git sha / build time)
- Provide npm run verify:health script

**Proof (code):**
- Backend endpoints: [backend/src/server.ts](backend/src/server.ts)

**Proof (script):**
- Command: npm run verify:health
- Script: [scripts/verify-health.js](scripts/verify-health.js)

**Expected output:**
- /api/health returns 200
- /api/ready returns 200 (or 503 if DB/storage down)
- /api/version returns version info

---

## B3 — Background Job Framework for Retention

**Requirement:**
- scripts/run-jobs.ts supports audit retention + file retention
- npm run jobs:dry-run and npm run jobs:run
- Structured job logs with counts (deleted/archived/skipped)
- Destructive mode requires JOB_RUN_CONFIRM=true

**Proof (code):**
- Job runner: [scripts/run-jobs.ts](scripts/run-jobs.ts)
- File retention logic: [backend/src/services/fileService.ts](backend/src/services/fileService.ts)
- Audit model: [backend/src/models/AuditLog.ts](backend/src/models/AuditLog.ts)

**Proof (scripts):**
- Dry run: npm run jobs:dry-run
- Real run: JOB_RUN_CONFIRM=true npm run jobs:run

**What to show in Loom:**
- Run dry-run, show JSON log with candidate counts
- Run real mode on test data, show deleted/archived/skipped counts

---

## B4 — Rate Limiting Store Factory + Test

**Requirement:**
- RATE_LIMIT_STORE=memory|redis|upstash
- Factory switch pattern
- Env examples in docs
- Real test script wired to npm run test:rate-limit
- Works in memory mode without Redis

**Proof (code):**
- Factory + store selection: [backend/src/services/rateLimiter/index.ts](backend/src/services/rateLimiter/index.ts)
- In-memory limiter: [backend/src/services/rateLimiter/InMemoryRateLimiter.ts](backend/src/services/rateLimiter/InMemoryRateLimiter.ts)
- Redis limiter: [backend/src/services/rateLimiter/RedisRateLimiter.ts](backend/src/services/rateLimiter/RedisRateLimiter.ts)
- Upstash limiter: [backend/src/services/rateLimiter/UpstashRateLimiter.ts](backend/src/services/rateLimiter/UpstashRateLimiter.ts)

**Proof (docs):**
- Env examples in: [docs/PROD_READINESS_NOTES.md](docs/PROD_READINESS_NOTES.md)

**Proof (script):**
- Command: npm run test:rate-limit
- Script: [scripts/test-rate-limit-store.js](scripts/test-rate-limit-store.js)

**Expected output:**
- Requests 1-10 succeed, requests 11-15 return 429

---

## One-Click Proof Commands (Summary)

Run these in repo root:

1. Logs + correlation demo
- npm run demo:logs

2. Health and readiness checks
- npm run verify:health

3. Rate limit test
- npm run test:rate-limit

4. Retention jobs
- npm run jobs:dry-run
- JOB_RUN_CONFIRM=true npm run jobs:run

---

## What to Show to Supervisor (Short Checklist)

- docs/PROD_READINESS_NOTES.md open and reviewed
- demo:logs output showing the same requestId in logs
- verify:health output showing /api/health, /api/ready, /api/version
- jobs:dry-run output with candidate counts
- jobs:run output with deleted/skipped counts (test data)
- test:rate-limit output with 429 responses
