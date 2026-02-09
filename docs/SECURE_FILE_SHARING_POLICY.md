# Secure File Sharing Policy Layer - Implementation Guide

**Status:** Complete  
**Date:** February 5, 2026  
**Components:** 5 (Schema, Middleware, Service, Routes, API)

---

## 📋 Overview

This document describes the comprehensive file sharing policy layer added to the platform, providing:

1. **Role-Based Access Control (RBAC)** — Admin and customer permission checks
2. **Per-File ACL Metadata** — Fine-grained access grants to individual users
3. **Share Link Revocation** — Temporary, expiring, revocable sharing tokens
4. **Retention Rules** — Automatic deletion of files after X days

All features include audit logging and are production-ready.

---

## 🏗️ Architecture

### Data Model Extensions

#### File Schema Enhancements
```typescript
// New fields in IFile interface
acl: ACLEntry[]              // Access control list
shareLinks: ShareLink[]      // Temporary share tokens
retentionDays?: number       // Auto-delete after X days
deleteScheduledAt?: Date     // When file will be deleted
deletedAt?: Date             // Soft-delete marker
accessCount: number          // Download/access tracking
lastAccessedAt?: Date        // Audit trail
```

#### ACL Entry Structure
```typescript
interface ACLEntry {
  userId: string;            // Who has access
  role: "viewer" | "editor" | "admin";  // Permission level
  grantedAt: Date;          // When granted
  grantedBy: string;        // Who granted it
}
```

#### Share Link Structure
```typescript
interface ShareLink {
  token: string;            // Unique share token (32 bytes hex)
  expiresAt: Date;          // When link expires
  maxDownloads?: number;    // Optional: max uses
  downloadCount: number;    // Current usage
  createdAt: Date;
  revokedAt?: Date;         // When revoked (null = active)
  createdBy: string;        // Who created the link
}
```

---

## 🔐 Access Control Rules

### Role-Based Access (RBAC)

| User Type | Action | Permission |
|-----------|--------|-----------|
| **File Owner** | View, Edit, Share, Delete | ✅ Always |
| **Admin** | Any action on any file | ✅ Bypass ACL |
| **Customer with "editor" ACL** | View, Edit, Revoke links | ✅ Yes |
| **Customer with "viewer" ACL** | View only | ✅ Yes |
| **No ACL entry** | Any action | ❌ Denied |

### Access Check Flow

```
User requests file
↓
Is file deleted?
├─→ YES: Return 404 ✗
└─→ NO: Continue
↓
Is user admin?
├─→ YES: Grant access ✅
└─→ NO: Continue
↓
Is user the owner (uploadedBy)?
├─→ YES: Grant access ✅
└─→ NO: Check ACL
↓
Check ACL for this user
├─→ Found with valid role: Grant access ✅
└─→ Not found or revoked: Deny (403) ✗
```

---

## 📤 Share Links (Secure Temporary Access)

### Creating a Share Link

**Endpoint:** `POST /api/files/:fileId/share`

**Request:**
```json
{
  "expiryHours": 24,      // 1-720 hours
  "maxDownloads": 5       // Optional: limit downloads
}
```

**Response:**
```json
{
  "message": "Share link created successfully",
  "shareToken": "a1b2c3d4e5f6...",  // 64-char hex
  "expiresAt": "2026-02-06T10:00:00Z",
  "file": { ... }
}
```

**Use Case:**
```javascript
// Frontend: User clicks "Share with external"
const { shareToken } = await api.post(
  `/files/${fileId}/share`,
  { expiryHours: 12, maxDownloads: 3 }
);

// Share this URL with others:
// https://yourapp.com/files/download?fileId={fileId}&shareToken={shareToken}
```

### Validating a Share Link

**Endpoint:** `POST /api/files/:fileId/share/validate` (anonymous)

**Request:**
```json
{
  "token": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Share link is valid",
  "file": {
    "filename": "invoice.pdf",
    "size": 125000,
    "contentType": "application/pdf"
  }
}
```

### Revoking a Share Link

**Endpoint:** `DELETE /api/files/:fileId/share/:token`

**Response:**
```json
{
  "message": "Share link revoked successfully",
  "file": { ... }
}
```

**Effect:** Link becomes immediately unusable; revoked links cannot be unrevoked.

### Share Link Validation Rules

- ✅ Token exists and is valid
- ✅ Token not revoked (revokedAt is null)
- ✅ Current time ≤ expiresAt
- ✅ downloadCount < maxDownloads (if set)

---

## 👥 ACL Management (Per-File Permissions)

### Grant Access to a User

**Endpoint:** `POST /api/files/:fileId/acl`

**Request:**
```json
{
  "userId": "user123",
  "role": "viewer"  // or "editor" or "admin"
}
```

**Response:**
```json
{
  "message": "Access granted successfully",
  "file": { ... }
}
```

**Roles:**
- `viewer` — Read-only access, cannot share or edit
- `editor` — Read/write, can create share links
- `admin` — Full control (though "admin" role is rare at user level)

### Revoke Access

**Endpoint:** `DELETE /api/files/:fileId/acl/:userId`

**Effect:** User can no longer access file; existing share links remain (use share link revocation to disable).

---

## 🗑️ Retention Policies (Auto-Delete)

### Set Retention Policy

**Endpoint:** `POST /api/files/:fileId/retention`

**Request:**
```json
{
  "retentionDays": 30  // 1-3650 days
}
```

**Response:**
```json
{
  "message": "Retention policy set successfully",
  "deleteScheduledAt": "2026-03-07T00:00:00Z",
  "file": { ... }
}
```

**Use Cases:**
- Compliance: Auto-delete after required retention period
- Cleanup: Automatically remove temporary/test files
- Privacy: Scheduled deletion of sensitive data

### Automatic Cleanup (Cron Job)

**Endpoint:** `POST /api/admin/files/retention/cleanup` (admin only)

**Call this periodically (e.g., hourly via cron):**
```bash
# In your deployment/cron scheduler
curl -X POST \
  https://api.yourapp.com/admin/files/retention/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Cron-ready script:**
```bash
node scripts/retention-cleanup.js
```

**Effect:** 
- Finds all files where `deleteScheduledAt ≤ now` and `deletedAt == null`
- Sets `deletedAt` to current time (soft delete)
- Files are now inaccessible but not physically deleted (allows recovery)

---

## 📊 File Metadata & Audit

### Get Full File Metadata

**Endpoint:** `GET /api/files/:fileId/metadata`

**Response:**
```json
{
  "file": {
    "_id": "...",
    "filename": "invoice.pdf",
    "uploadedBy": "admin@company.com",
    "acl": [
      {
        "userId": "customer1",
        "role": "viewer",
        "grantedAt": "2026-02-01T10:00:00Z",
        "grantedBy": "admin@company.com"
      }
    ],
    "shareLinks": [
      {
        "token": "a1b2c3...",
        "expiresAt": "2026-02-06T10:00:00Z",
        "maxDownloads": 5,
        "downloadCount": 2,
        "revokedAt": null
      }
    ],
    "retentionDays": 90,
    "deleteScheduledAt": "2026-05-06T00:00:00Z",
    "accessCount": 42,
    "lastAccessedAt": "2026-02-05T15:30:00Z"
  },
  "accessibleBy": [
    "admin@company.com",   // owner
    "customer1",
    "customer2"
  ],
  "activeShareLinks": 2,
  "isScheduledForDeletion": false
}
```

### Audit Fields

Every file tracks:
- `uploadedBy` — Original uploader
- `createdAt`, `updatedAt` — Timestamps
- `accessCount` — Total accesses (views/downloads)
- `lastAccessedAt` — Last access time
- `acl[].grantedBy` — Who granted permissions
- `shareLinks[].createdBy` — Who created the link
- All actions logged to backend logger

---

## 🔌 Integration with Download Endpoint

### Secure Download Flow

```javascript
// 1. Frontend: Validate share link (if shared access)
const validation = await api.post(
  `/files/${fileId}/share/validate`,
  { token: shareToken }
);

// 2. Backend checks:
//    - Share link exists & not revoked
//    - Not expired
//    - Download count < max
//    - File not deleted

// 3. If valid: Increment download counter
//    POST /files/{fileId}/share/increment

// 4. Generate signed URL and download
const signedUrl = await api.get(
  `/files/${fileId}/download?shareToken=${shareToken}`
);

// 5. Increment access count for file
await FileService.recordAccess(fileId);
```

---

## 🚀 Implementation Checklist

- [x] Enhanced `File` schema with ACL, shareLinks, retention fields
- [x] Database indexes for performance (shareToken, deleteScheduledAt, uploadedBy)
- [x] `fileAccessMiddleware.ts` — Role-based and ACL checks
- [x] `fileService.ts` — Business logic for all operations
- [x] `fileAccessRoutes.ts` — REST API endpoints
- [x] Share link token generation (crypto.randomBytes)
- [x] Retention policy processing (soft-delete with audit)
- [x] Comprehensive logging (all state changes)
- [x] Error handling (400, 403, 404, 500)
- [x] Input validation (role enums, date ranges, token formats)

---

## 📝 API Reference

### ACL Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/files/:fileId/acl` | Owner/Admin | Grant user access |
| DELETE | `/files/:fileId/acl/:userId` | Owner/Admin | Revoke user access |

### Share Link Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/files/:fileId/share` | Owner/Editor | Create share link |
| POST | `/files/:fileId/share/validate` | None | Validate token |
| DELETE | `/files/:fileId/share/:token` | Owner/Admin | Revoke share |

### Retention Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/files/:fileId/retention` | Owner/Admin | Set auto-delete |
| POST | `/admin/files/retention/cleanup` | Admin | Run cleanup job |

### Metadata Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/files/:fileId/metadata` | User (with access) | View all metadata |

---

## 🔄 Example Workflows

### Workflow 1: Sharing a File with a Customer

```typescript
// Customer service (as admin)
const admin = req.user; // authenticated admin

// 1. Grant viewer access
await FileService.grantAccess(
  fileId,
  "customer123",
  "viewer",
  admin._id.toString()
);

// 2. Create a 7-day share link
const { shareToken, expiresAt } = 
  await FileService.createShareLink(
    fileId,
    168,  // 7 days in hours
    10    // max 10 downloads
  );

// 3. Send URL to customer
const downloadUrl = 
  `https://api.app.com/files/download?fileId=${fileId}&shareToken=${shareToken}`;
```

### Workflow 2: Bulk Share with Expiry

```typescript
// Share with multiple customers for 24 hours
const customers = ["customer1", "customer2", "customer3"];

for (const customerId of customers) {
  // Grant access
  await FileService.grantAccess(
    fileId,
    customerId,
    "viewer",
    admin._id.toString()
  );

  // Send share link via email
  const { shareToken } = 
    await FileService.createShareLink(fileId, 24, 1);
  
  await emailService.send(customerId, {
    subject: "File Shared with You",
    body: `Download: ${downloadUrl}?shareToken=${shareToken}`
  });
}
```

### Workflow 3: Auto-Delete Sensitive Files

```typescript
// Upload sensitive compliance document
const file = await File.create({
  filename: "2026-audit-report.pdf",
  uploadedBy: admin._id,
  // ... other fields
});

// Set to auto-delete after 90 days
await FileService.setRetention(file._id, 90);

// Cron job runs daily to cleanup expired files
await FileService.processRetention();
```

---

## 🧪 Testing Guide

### Test 1: Grant and Revoke Access

```bash
# Grant viewer access to user
curl -X POST http://localhost:3000/api/files/FILE_ID/acl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "viewer"}'

# User can now access
# ...

# Revoke access
curl -X DELETE http://localhost:3000/api/files/FILE_ID/acl/user123 \
  -H "Authorization: Bearer $TOKEN"

# User can no longer access (should get 403)
```

### Test 2: Create and Validate Share Link

```bash
# Create share link (24 hours, max 3 downloads)
curl -X POST http://localhost:3000/api/files/FILE_ID/share \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiryHours": 24, "maxDownloads": 3}'

# Response: { "shareToken": "abc123..." }

# Validate link (no auth required)
curl -X POST http://localhost:3000/api/files/FILE_ID/share/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123..."}'

# Should return 200 with file info

# Revoke share
curl -X DELETE http://localhost:3000/api/files/FILE_ID/share/abc123 \
  -H "Authorization: Bearer $TOKEN"

# Validation now fails (should get 403 "revoked")
```

### Test 3: Retention & Auto-Delete

```bash
# Set 2-day retention (for testing)
curl -X POST http://localhost:3000/api/files/FILE_ID/retention \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 2}'

# Wait 2 days or manually update deleteScheduledAt in DB

# Run cleanup
curl -X POST http://localhost:3000/api/admin/files/retention/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# File should now be inaccessible (soft-deleted)
```

---

## 📊 Database Schema Updates

### Indexes Created

```typescript
// Index for retention cleanup queries
fileSchema.index({ deleteScheduledAt: 1 }, { sparse: true });

// Index for share token lookups
fileSchema.index({ "shareLinks.token": 1 }, { sparse: true });

// Index for user's files
fileSchema.index({ uploadedBy: 1 });
```

### Migration Script (if needed)

```javascript
// Run once to add new fields to existing files
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
```

---

## 🔒 Security Considerations

1. **Share Token Randomness** — Uses `crypto.randomBytes(32)` (256 bits of entropy)
2. **Soft Delete** — Files are marked deleted but not physically removed (recovery possible)
3. **ACL Audit Trail** — Every access grant/revoke logs who did it and when
4. **Share Link Expiry** — Tokens are time-limited and revocation is immediate
5. **Rate Limiting** — Pair with rate limiter to prevent share token brute-force
6. **HTTPS Only** — All share links should be transmitted over TLS
7. **No Token in Logs** — Tokens are truncated in logs (`token.slice(0, 8) + "..."`)

---

## 🎯 Next Steps (Optional Enhancements)

1. **Email Notifications** — Alert users when files are shared with them
2. **Activity Feed** — Show who accessed what when
3. **Download Logging** — Track individual downloads with IP/user-agent
4. **Watermarking** — Add digital watermarks to shared PDFs
5. **Encryption at Rest** — Encrypt file contents with envelope encryption
6. **Version Control** — Track file versions with separate ACL per version
7. **Expiring Downloads** — Generate URLs that expire after N downloads

---

**Status:** ✅ Complete and Production-Ready  
**Testing:** Manual test cases included above  
**Documentation:** Complete reference guide above  
**Code Quality:** Fully typed TypeScript with error handling
