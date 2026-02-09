 # Security Review

Date: February 7, 2026
Scope: Multi-Gateway Platform (API, frontend, storage, audit logging)

## Threat Model

| Asset | Threat | Mitigation | Residual Risk |
| --- | --- | --- | --- |
| User accounts and JWTs | Credential stuffing, brute force | Rate limiting, brute-force protection, short-lived access tokens, refresh rotation | Distributed attacks can still degrade auth, monitor and add Redis-based limits |
| API endpoints | Abuse, scraping, DoS | Global rate limiting, auth guards, input validation | Global limiter is in-memory, not shared across nodes |
| Payment flow | Tampering, replay | Server-side validation, audit logging, trace IDs, idempotency expectations | No formal replay cache for all endpoints |
| Webhooks | Forged events | HMAC signing (Stripe), strict verification | Misconfigured secrets could weaken verification |
| Storage objects | Unauthorized access, link sharing | Signed URLs, TTL clamp, ACL/share link controls, audit logs | Signed URL revocation depends on token rotation and share link management |
| Upload pipeline | Malicious files, large file abuse | MIME allowlist, size enforcement, pending malware scan flag | Malware scanning not implemented yet |
| Audit logs | Log tampering, missing events | Server-side logging with best-effort writes | No retention enforcement or immutable storage |
| Secrets and keys | Leakage via code or logs | Env-only configuration, no hardcoded keys | Secret rotation not automated |

## Security Decisions

- CSP scope
  - Frontend CSP is set in Next.js headers with default-src 'self', Stripe script/frame allowlist, and explicit connect-src for Stripe and Supabase. Unsafe inline/eval is allowed for framework compatibility.
  - Backend relies on helmet default headers.
- Rate limit thresholds
  - API default: 10,000 requests per 60s per IP.
  - Auth: 5 requests per 15 minutes.
  - Coupon validation: 10 requests per 60s.
  - Webhooks: 100 requests per 60s.
  - Gateway service: 100 requests per 60s.
- Signed URL TTL
  - Download URLs default to 15 minutes with clamp to 1-60 minutes.
  - Demo and tests often use 60 seconds.
  - Upload URL TTL follows Supabase defaults; server enforces content type and size.
  - Uploads return a scanStatus placeholder (pending) for future malware scanning.
- Signed storage controls
  - Allowlist: UPLOAD_ALLOWED_MIME_TYPES (fallback to default list).
  - Size cap: UPLOAD_MAX_BYTES (default 10 MB).
  - Per-file ACL and share links stored in File.shareLinks for revocation.
  - Future hard-revocation: rotate per-object secret to invalidate all prior URLs.
- Audit log retention
  - Decision: retain 90 days in MongoDB, archive monthly to cold storage.
  - Status: retention enforcement not implemented yet.

## Known Gaps and Future Improvements

- Add malware scanning (asynchronous pipeline) and enforce scan pass before download.
- Move rate limiting and brute-force tracking to Redis for multi-node consistency.
- Tighten CSP by removing unsafe-inline and unsafe-eval once frontend allows it.
- Implement audit log retention and optional immutable storage (WORM/S3 Object Lock).
- Add per-object secret rotation to hard-revoke signed URLs across storage backends.
- Automate retention cleanup via cron with scripts/retention-cleanup.js.
- Add secret rotation automation and key usage monitoring.
