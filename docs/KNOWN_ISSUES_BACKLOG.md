# Known Issues and Next Backlog

Date: February 6, 2026

## Known Issues (Current)

1) Rate limiting uses in-memory storage
- Impact: multi-node deployments do not share counters
- Mitigation: move limiter storage to Redis

2) Audit log retention not enforced
- Impact: logs can grow without cleanup
- Mitigation: implement retention job and archive to cold storage

3) Upload malware scanning not implemented
- Impact: risk of malicious content in storage
- Mitigation: async scan pipeline before download

4) Signed URL revocation is token-based only
- Impact: previously issued signed URLs remain valid until TTL
- Mitigation: rotate per-object secret or move to share tokens

5) CSP still allows unsafe-inline and unsafe-eval
- Impact: weaker XSS posture
- Mitigation: remove unsafe directives once frontend is compatible

6) File list queries lack pagination in some areas
- Impact: slow list for very large datasets
- Mitigation: add cursor-based pagination

## Next Backlog (Planned)

1) Redis-backed rate limiting and brute-force tracking
2) Malware scanning worker with quarantine bucket
3) Audit log retention job with 90-day default
4) Tightened CSP and CSP violation reporting endpoint
5) Signed URL hard revocation (per-object secret rotation)
6) Storage lifecycle rules and cleanup automation
7) Admin UI for ACL/share link management
8) Centralized secrets rotation playbook
