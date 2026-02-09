# Start Here

This is the quickest path to understand, run, and demo the Multi-Gateway Platform.

## Quick Start (10 minutes)

1) Install dependencies

```bash
npm install
```

2) Configure environment

- Copy .env.example to .env and fill in Mongo, Redis, and JWT values.
- Optional for storage: SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUPABASE_BUCKET.
- Optional upload guardrails: UPLOAD_ALLOWED_MIME_TYPES, UPLOAD_MAX_BYTES.

3) Run locally

```bash
npm run dev
```

4) Verify core security

```bash
npm run demo:security
```

5) Verify signed storage

```bash
npm run demo:storage
```

## Where to Go Next

- Architecture diagram: docs/ARCHITECTURE_DIAGRAM_SIMPLE.md
- Key flows: docs/KEY_FLOWS.md
- How to demo (with timestamps): docs/DEMO_WITH_LOOM_TIMESTAMPS.md
- Security review: docs/SECURITY_REVIEW.md
- Secure file sharing policy: docs/SECURE_FILE_SHARING_POLICY.md
- Known issues and backlog: docs/KNOWN_ISSUES_BACKLOG.md

## Common Checks

- Health endpoint: http://localhost:5000/api/health
- Audit logs: http://localhost:5000/api/audit-logs (admin token required)
- Signed URL demo: npm run demo:storage
