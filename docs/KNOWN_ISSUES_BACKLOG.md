# Known Issues and Next Backlog

**Date:** February 6, 2026  
**Note:** This is a summary version. For comprehensive documentation, see [KNOWN_ISSUES_BACKLOG.md](../KNOWN_ISSUES_BACKLOG.md)

---

## 🔴 CRITICAL Issues

### 1. **Malware/Virus Scanning Not Implemented**
- **Impact:** Risk of malicious file uploads
- **Status:** Placeholder field exists (`scanStatus: "pending"`)
- **Required:** ClamAV, VirusTotal, or cloud scanning service before production
- **Priority:** BLOCKER for production launch

### 2. **Rate Limiting Uses In-Memory Storage**
- **Impact:** Multi-node deployments don't share counters
- **Status:** Works for single server, breaks in load-balanced setups
- **Required:** Migrate to Redis-backed rate limiting
- **Priority:** CRITICAL for horizontal scaling

### 3. **CSP Allows unsafe-inline and unsafe-eval**
- **Impact:** Weaker XSS protection
- **Status:** Framework limitation (Next.js + Material-UI)
- **Mitigation:** Wait for Next.js nonce support
- **Priority:** MEDIUM (framework-dependent)

---

## 🟡 HIGH Priority Items

### 4. **Audit Log Retention Not Enforced**
- **Impact:** Database grows unbounded
- **Solution:** Implement scheduled cleanup + S3 archival
- **Timeline:** Before 30 days of production use

### 5. **JWT Secret Rotation Not Implemented**
- **Impact:** Manual intervention required if compromised
- **Solution:** Support multiple valid secrets during rotation
- **Timeline:** Phase 2 enhancement

### 6. **Signed URL Revocation Limited**
- **Impact:** Short window (60s) where revoked URLs still work
- **Acceptable:** TTL-based approach is standard practice
- **Enhancement:** Per-object secret rotation (Phase 3)

---

## 🟢 IMPLEMENTED Features (Task C1)

### ✅ File Type Allowlist + Size Enforcement
- **Status:** COMPLETE
- **Config:** `UPLOAD_ALLOWED_MIME_TYPES`, `UPLOAD_MAX_BYTES`
- **Location:** [backend/src/server.ts](../backend/src/server.ts)

### ✅ Per-File ACL Metadata + Revocation
- **Status:** COMPLETE
- **Features:** Grant/revoke user access, role-based permissions
- **API:** `/api/files/:fileId/acl`

### ✅ Share Links with Revocation
- **Status:** COMPLETE
- **Features:** Token-based, expiry, download limits, revocation
- **API:** `/api/files/:fileId/share`

### ✅ Retention Policy + Cleanup Script
- **Status:** COMPLETE (cron setup required)
- **Script:** [scripts/retention-cleanup.js](../scripts/retention-cleanup.js)
- **API:** `/admin/files/retention/cleanup`

---

## 📋 Next Backlog (Planned Enhancements)

1. **Redis-backed rate limiting** - Prerequisite for multi-server deployments
2. **Malware scanning worker** - ClamAV or cloud service integration
3. **Audit log archival** - 90-day retention + S3 cold storage
4. **Tightened CSP** - When Next.js supports nonce-based CSP
5. **JWT secret rotation** - Graceful key versioning
6. **File listing pagination** - Cursor-based for 10k+ files
7. **Admin UI for ACL** - Visual management interface
8. **Secret rotation playbook** - Operational procedures

---

## 📚 Documentation

- **Comprehensive Guide:** [../KNOWN_ISSUES_BACKLOG.md](../KNOWN_ISSUES_BACKLOG.md)
- **Task C1 Details:** [TASK_C1_SAFE_OBJECT_STORAGE.md](TASK_C1_SAFE_OBJECT_STORAGE.md)
- **Security Review:** [SECURITY_REVIEW.md](SECURITY_REVIEW.md)
- **File Sharing Policy:** [SECURE_FILE_SHARING_POLICY.md](SECURE_FILE_SHARING_POLICY.md)

---

**Last Updated:** February 6, 2026  
**Maintained By:** Development Team
