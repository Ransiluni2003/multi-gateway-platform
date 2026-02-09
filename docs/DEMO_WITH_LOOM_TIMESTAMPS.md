# How to Demo (Loom Timestamps)

Target duration: 8-10 minutes

## Timeline

00:00-00:40 Intro and repo orientation
- Show README and docs/README_START_HERE.md

00:40-02:10 Auth and security headers
- GET /api/auth/csrf-token
- Demo a login and show security headers

02:10-03:30 Signed storage (upload + download)
- Run npm run demo:storage
- Show upload URL request and download URL TTL

03:30-05:10 Payments and checkout flow
- Use Postman: authorize, capture, and list transactions
- Reference LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md for the exact steps

05:10-06:20 Webhook and audit logging
- Show webhook verification path
- Hit /api/audit-logs and show recent entries

06:20-07:30 Share links and ACL (optional)
- Show ACL metadata and share link creation
- Reference docs/SECURE_FILE_SHARING_POLICY.md

07:30-08:30 Close out
- Mention CI/CD automation and monitoring
- Point to docs/SECURITY_REVIEW.md and docs/KEY_FLOWS.md

## Loom Script Anchors

- Bundle + Mock Payments walkthrough: LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md
- CI/CD walkthrough: LOOM_CICD_WALKTHROUGH.md
- Failure drill demo: LOOM_FAILURE_DRILL.md
- Secure file sharing demo: docs/LOOM_SECURE_FILE_SHARING.md

## Notes

- Add actual Loom URLs next to each anchor once recordings are finalized.
- Keep screen zoom at 125 percent for readability.
