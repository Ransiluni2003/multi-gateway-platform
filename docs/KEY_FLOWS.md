# Key Flows

## Auth Flow

1) Client requests CSRF token: GET /api/auth/csrf-token
2) Client registers or logs in with CSRF header.
3) Backend validates credentials and issues access token.
4) Refresh token is set as httpOnly cookie.
5) Protected routes require Authorization: Bearer <token>.

## Checkout Flow

1) Client submits checkout request to /api/payments/pay.
2) Gateway forwards to payments service with trace ID.
3) Payments service authorizes and captures payment.
4) Transaction events are recorded and surfaced in admin UI.

## Webhook Flow

1) Payment provider posts to /api/webhooks/*.
2) Signature is validated.
3) Event is parsed and persisted.
4) Audit log entry is created.

## Storage Flow (Signed URLs)

1) Client requests upload URL: POST /api/files/upload-url with filename, contentType, sizeBytes.
2) Server validates MIME allowlist and size cap.
3) Server issues signed upload URL and logs audit event (scanStatus: pending placeholder).
4) Client uploads directly to storage using signed URL.
5) Client requests download URL: GET /api/files/download-url?key=...&expires=...
6) Server issues signed download URL with TTL clamp and logs audit event.
7) Share link revocation uses per-file share tokens; hard-revocation can rotate per-object secret (future).

## Audit Log Flow

1) Sensitive actions call logAuditEvent.
2) Event is written to MongoDB (best effort).
3) Admin retrieves entries via GET /api/audit-logs.
4) Logs are used for demo verification and incident review.
