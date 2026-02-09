# PR: Secure File Sharing Policy Layer (Task 1)

**PR Title:** `feat: Add comprehensive file sharing policy layer with ACL, share links, and retention`

**PR Description:**

## 📋 Summary

Adds enterprise-grade file access control to the platform with four key features:
1. **Role-based access control (RBAC)** — Admins bypass all checks; customers have fine-grained ACL
2. **Per-file ACL metadata** — Granular permissions for each user (viewer/editor/admin)
3. **Share link revocation** — Temporary, expiring, revocable tokens for external sharing
4. **Retention rules** — Automatic deletion of files after X days with soft-delete protection

---

## 🎯 What's Included

### Code Changes

#### 1. **Backend Models** (`backend/src/models/File.ts`)
- Extended `IFile` interface with ACL, shareLinks, retention fields
- Added `ACLEntry` interface for access grants
- Added `ShareLink` interface for temporary sharing tokens
- Created database indexes for performance (shareToken, deleteScheduledAt, uploadedBy)

#### 2. **Middleware** (`backend/src/middleware/fileAccessMiddleware.ts`)
- `fileAccess()` — Enforces access control (owner, admin, or ACL)
- `fileWrite()` — Enforces write permissions (owner, admin, or editor ACL)
- Complete audit logging for all access decisions

#### 3. **Service Layer** (`backend/src/services/fileService.ts`)
- `grantAccess()` — Add user to ACL
- `revokeAccess()` — Remove user from ACL
- `createShareLink()` — Generate temporary token with expiry
- `validateShareLink()` — Check token validity (not revoked, not expired, download limit)
- `revokeShareLink()` — Immediately disable a token
- `setRetention()` — Schedule auto-deletion
- `processRetention()` — Soft-delete expired files (for cron job)
- `recordAccess()` — Increment access count
- `getFileMetadata()` — Return complete file info with ACL and share links

#### 4. **API Routes** (`backend/src/routes/fileAccessRoutes.ts`)
- `POST /files/:fileId/acl` — Grant user access
- `DELETE /files/:fileId/acl/:userId` — Revoke user access
- `POST /files/:fileId/share` — Create share link
- `POST /files/:fileId/share/validate` — Validate token (anonymous)
- `DELETE /files/:fileId/share/:token` — Revoke share link
- `POST /files/:fileId/retention` — Set auto-delete policy
- `POST /admin/files/retention/cleanup` — Run cleanup job (admin only)
- `GET /files/:fileId/metadata` — Get full file metadata

### Documentation

#### 5. **Implementation Guide** (`docs/SECURE_FILE_SHARING_POLICY.md`)
Complete reference with:
- Architecture overview and data model
- Access control rules and flows
- API reference with examples
- Testing guide with curl commands
- Security considerations
- Example workflows
- Database schema updates

#### 6. **Loom Recording Guide** (`docs/LOOM_SECURE_FILE_SHARING.md`)
12-minute recording outline with:
- Section-by-section narration
- Code highlights and timestamps
- Live demo suggestions
- Recording tips and checklist

---

## 🔐 Key Features

### Feature 1: Role-Based Access Control

| User Type | Can Access? | Can Share? | Can Auto-Delete? |
|-----------|-------------|-----------|-----------------|
| File Owner | ✅ Yes | ✅ Yes | ✅ Yes |
| Admin | ✅ Yes (any) | ✅ Yes (any) | ✅ Yes (any) |
| Editor (ACL) | ✅ Yes | ✅ Yes | ✅ Yes |
| Viewer (ACL) | ✅ Yes | ❌ No | ❌ No |
| No ACL | ❌ No | N/A | N/A |

### Feature 2: Share Links
```javascript
// Create 24-hour share link with max 5 downloads
const { shareToken } = await FileService.createShareLink(
  fileId,
  24,  // hours
  5    // max downloads
);
// Share with others: https://app.com/files/download?fileId={id}&shareToken={token}
```

### Feature 3: Retention & Auto-Delete
```javascript
// Auto-delete after 90 days
await FileService.setRetention(fileId, 90);

// Cron job (daily/hourly):
await FileService.processRetention();
// Soft-deletes all expired files
```

### Feature 4: Complete Audit Trail
Every file shows:
- Who uploaded it
- Who has access and what permissions
- All share links (active/revoked)
- Total downloads and last access time
- Scheduled deletion date

---

## 📊 Example Workflow

**Scenario:** Share an invoice with a customer for 7 days, max 3 downloads.

```typescript
// 1. Grant viewer access
await FileService.grantAccess(
  invoiceFileId,
  "customer123",
  "viewer",
  adminId
);

// 2. Create share link
const { shareToken, expiresAt } = await FileService.createShareLink(
  invoiceFileId,
  168,  // 7 days
  3     // max 3 downloads
);

// 3. Send to customer
const downloadUrl = 
  `https://api.app.com/files/download?fileId=${invoiceFileId}&shareToken=${shareToken}`;
sendEmail(customer, `Download: ${downloadUrl}`);

// 4. After 7 days or 3 downloads, link is exhausted
// Link remains in history but becomes unusable
```

---

## 🧪 Testing

### Test Case 1: ACL Grant/Revoke
```bash
# Grant viewer access
curl -X POST http://localhost:3000/api/files/FILE_ID/acl \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"userId": "user123", "role": "viewer"}'

# User can now access file
# ...

# Revoke access
curl -X DELETE http://localhost:3000/api/files/FILE_ID/acl/user123 \
  -H "Authorization: Bearer $TOKEN"

# User gets 403 Forbidden
```

### Test Case 2: Share Link Creation & Validation
```bash
# Create link (24 hours, max 5 downloads)
curl -X POST http://localhost:3000/api/files/FILE_ID/share \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"expiryHours": 24, "maxDownloads": 5}'
# Response: {"shareToken": "abc123..."}

# Validate (no auth required)
curl -X POST http://localhost:3000/api/files/FILE_ID/share/validate \
  -d '{"token": "abc123..."}'
# Response: {"valid": true, "file": {...}}

# Revoke
curl -X DELETE http://localhost:3000/api/files/FILE_ID/share/abc123 \
  -H "Authorization: Bearer $TOKEN"

# Next validation fails
```

### Test Case 3: Retention & Cleanup
```bash
# Set 2-day retention (for testing)
curl -X POST http://localhost:3000/api/files/FILE_ID/retention \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"retentionDays": 2}'

# Wait 2 days or update DB directly

# Run cleanup (admin only)
curl -X POST http://localhost:3000/api/admin/files/retention/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# File is now soft-deleted (inaccessible)
```

---

## 🔒 Security & Compliance

✅ **Cryptographic Share Tokens** — 256-bit random (crypto.randomBytes)  
✅ **Immediate Revocation** — No propagation delay  
✅ **Complete Audit Trail** — Who did what when  
✅ **Soft Delete** — Files recoverable for disaster recovery  
✅ **Rate Limiting Compatible** — Pair with rate limiter for share token brute-force protection  
✅ **HTTPS Only** — All tokens over TLS  
✅ **No Token Logging** — Tokens truncated in logs  

---

## 📦 Files Changed

```
backend/src/
├── models/
│   └── File.ts                          (MODIFIED: +120 lines)
├── middleware/
│   └── fileAccessMiddleware.ts          (NEW: +95 lines)
├── services/
│   └── fileService.ts                   (NEW: +250 lines)
└── routes/
    └── fileAccessRoutes.ts              (NEW: +240 lines)

docs/
├── SECURE_FILE_SHARING_POLICY.md        (NEW: +500 lines)
└── LOOM_SECURE_FILE_SHARING.md          (NEW: +300 lines)
```

**Total additions:** ~1,500 lines of production-ready code + documentation

---

## ✅ Checklist

- [x] Role-based access control (RBAC) implemented
- [x] Per-file ACL metadata and schema
- [x] Share link creation with expiry
- [x] Share link revocation (immediate)
- [x] Retention policy scheduling
- [x] Auto-delete soft-delete implementation
- [x] Download limit tracking per share link
- [x] Complete audit logging
- [x] Error handling (400, 403, 404, 500)
- [x] Input validation (enums, ranges)
- [x] Database indexes for performance
- [x] TypeScript type safety
- [x] Comprehensive API documentation
- [x] Example workflows documented
- [x] Testing guide with curl examples
- [x] Security analysis documented
- [x] Loom recording guide prepared

---

## 🚀 Deployment Notes

### Prerequisites
- MongoDB with indexing support
- Node.js 16+ for crypto module

### Configuration (Optional)
```env
# Default retention cleanup runs on each request
# For cron-based cleanup, call POST /admin/files/retention/cleanup hourly

# Example cron (Heroku Scheduler):
# POST https://api.yourapp.com/admin/files/retention/cleanup
# Authorization: Bearer $ADMIN_TOKEN
```

### Migration (if upgrading existing DB)
```javascript
// Add retention fields to existing files
db.files.updateMany(
  {},
  {
    $set: {
      acl: [],
      shareLinks: [],
      accessCount: 0,
      deletedAt: null
    }
  }
);

// Create indexes
db.files.createIndex({ deleteScheduledAt: 1 }, { sparse: true });
db.files.createIndex({ "shareLinks.token": 1 }, { sparse: true });
db.files.createIndex({ uploadedBy: 1 });
```

---

## 📖 Documentation Links

- **Full Implementation Guide:** [docs/SECURE_FILE_SHARING_POLICY.md](docs/SECURE_FILE_SHARING_POLICY.md)
- **Loom Recording Guide:** [docs/LOOM_SECURE_FILE_SHARING.md](docs/LOOM_SECURE_FILE_SHARING.md)
- **API Reference:** See file access routes section in implementation guide
- **Testing Guide:** See testing section in implementation guide

---

## 🎬 Video/Demo

**Loom Recording:** [To be recorded following the guide in LOOM_SECURE_FILE_SHARING.md]

Recording outline:
1. Overview (1 min)
2. Data model (2 min)
3. Access control flow (2 min)
4. Share links demo (3 min)
5. Retention policies (2 min)
6. Example workflow (2 min)

---

## 👥 Reviewers

This PR covers:
- **Backend Architecture** — Data model, middleware, service layer
- **API Design** — RESTful endpoints with proper authentication
- **Security** — Cryptographic tokens, access control, audit logging
- **Database** — Schema design with indexes
- **Documentation** — Complete guide + recording instructions

**Reviewer Focus Areas:**
1. ACL logic in `fileAccessMiddleware.ts`
2. Share token generation in `fileService.ts`
3. Retention cleanup logic (soft delete vs hard delete)
4. API endpoint authorization checks

---

## 🔄 Related PRs / Issues

- Part of: **Task 1 — Secure File Sharing Policy Layer**
- Dependencies: Requires authenticated user system (already in place)
- Blocking: None (standalone feature)

---

## 📝 Commit Messages

```
feat: Add file access control middleware
- Implement fileAccess() middleware for RBAC
- Implement fileWrite() for write permission checks
- Add audit logging for access decisions

feat: Extend File model with ACL and retention
- Add ACLEntry interface for fine-grained permissions
- Add ShareLink interface for temporary sharing
- Add retention fields for auto-delete scheduling
- Create database indexes for performance

feat: Implement file sharing service
- Add grantAccess() for ACL management
- Add createShareLink() with cryptographic tokens
- Add validateShareLink() with expiry/revocation checks
- Add setRetention() for retention policies
- Add processRetention() for cleanup jobs

feat: Add file access control API routes
- POST /files/:fileId/acl (grant access)
- DELETE /files/:fileId/acl/:userId (revoke access)
- POST /files/:fileId/share (create share link)
- POST /files/:fileId/share/validate (validate token)
- DELETE /files/:fileId/share/:token (revoke share)
- POST /files/:fileId/retention (set retention)
- POST /admin/files/retention/cleanup (cleanup job)
- GET /files/:fileId/metadata (get metadata)

docs: Add secure file sharing policy documentation
- Complete implementation guide with examples
- API reference with curl examples
- Testing guide and security analysis
- Loom recording guide for demo
```

---

**Status:** ✅ Ready for Review  
**PR Author:** Platform Team  
**Date:** February 5, 2026  
**Reviewers Assigned:** [Supervisor/Tech Lead]
