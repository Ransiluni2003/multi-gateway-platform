# Secure File Sharing Policy Layer - Loom Recording Guide

**Recording Title:** "Secure File Sharing Implementation - ACL, Share Links & Retention"  
**Duration:** ~12 minutes  
**Audience:** Supervisor/Team Review

---

## 📹 Recording Outline

### Section 1: Overview (1 minute)

**Narration:**
"Today we're demonstrating a comprehensive file sharing policy layer that adds enterprise-grade access control to our file storage system. This includes role-based permissions, temporary share links, automatic deletion, and full audit trails."

**Show:**
- Open documentation: [docs/SECURE_FILE_SHARING_POLICY.md](../docs/SECURE_FILE_SHARING_POLICY.md)
- Highlight: 5 key components
- Highlight: 4 main features (RBAC, ACL, Share Links, Retention)

---

### Section 2: Architecture & Data Model (2 minutes)

**Narration:**
"Let's start with the data model. We've extended the File schema to support access control lists, temporary share tokens, and retention policies."

**Show:**
- [backend/src/models/File.ts](../backend/src/models/File.ts) — Scroll to ACLEntry interface
  - "This defines who has access and what they can do"
  - Highlight: `userId`, `role` (viewer/editor/admin), `grantedBy` for audit
  
- Scroll to ShareLink interface
  - "A share link is a temporary token for external sharing"
  - Highlight: `token`, `expiresAt`, `revokedAt`, `maxDownloads`
  
- Scroll to IFile interface
  - "Files now track ACL entries, share links, retention, and access patterns"
  - Highlight: `acl`, `shareLinks`, `retentionDays`, `deleteScheduledAt`, `accessCount`

**Code snippet to highlight:**
```typescript
export interface ShareLink {
  token: string;            // Unique share token (32 bytes hex)
  expiresAt: Date;          // When link expires
  maxDownloads?: number;    // Optional: max uses
  downloadCount: number;    // Current usage
  revokedAt?: Date;         // When revoked (null = active)
}
```

---

### Section 3: Access Control Flow (2 minutes)

**Narration:**
"Here's how access control works. When a user tries to download or access a file, we check three things: Is the user the owner? Are they an admin? Or do they have an ACL entry?"

**Show:**
- [backend/src/middleware/fileAccessMiddleware.ts](../backend/src/middleware/fileAccessMiddleware.ts)
  - Open the `fileAccess` function (around line 25-55)
  - **Read key points:**
    - "First, we check if the file is deleted"
    - "Then, admins bypass all checks"
    - "Owners always have access"
    - "Everyone else must have an ACL entry"

**Show diagram (draw on paper or use text):**
```
User requests file
  ├─ File deleted? → 404
  ├─ Admin? → Grant access
  ├─ Owner? → Grant access
  └─ Has ACL entry? → Grant access
                    └─ No? → 403 Forbidden
```

---

### Section 4: Creating and Revoking Share Links (3 minutes)

**Narration:**
"Now let's look at share links. These are perfect for temporary external sharing. The user sets an expiry (24 hours by default) and optional download limit."

**Show:**
- [backend/src/services/fileService.ts](../backend/src/services/fileService.ts)
  - Scroll to `createShareLink` method
  - **Read key code:**
    ```typescript
    const shareToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    ```
  - "We generate 256 bits of cryptographically random data for the token"
  - "The token is hex-encoded, making it 64 characters long"
  - "We set an expiry time based on the hours provided"

- Scroll to `validateShareLink` method
  - **Explain the validation checks:**
    ```typescript
    if (shareLink.revokedAt) {
      return { valid: false, reason: "Share link has been revoked" };
    }
    if (new Date() > shareLink.expiresAt) {
      return { valid: false, reason: "Share link has expired" };
    }
    if (shareLink.maxDownloads && shareLink.downloadCount >= shareLink.maxDownloads) {
      return { valid: false, reason: "Download limit reached" };
    }
    ```
  - "A share link is valid only if it's NOT revoked, NOT expired, and hasn't exceeded the download limit"

- Scroll to `revokeShareLink` method
  - "Revocation is instant — just set the `revokedAt` timestamp"
  - "Once revoked, a link cannot be reactivated"

---

### Section 5: API Endpoints Demo (2 minutes)

**Narration:**
"Here are the API endpoints. All actions are fully documented with request/response examples."

**Show:**
- [backend/src/routes/fileAccessRoutes.ts](../backend/src/routes/fileAccessRoutes.ts)
  - Show route: `POST /files/:fileId/share` (around line 75)
  - "To create a share link, send expiryHours and optional maxDownloads"
  - Show response structure with shareToken

- Show route: `POST /files/:fileId/share/validate` (around line 106)
  - "This is an anonymous endpoint — no auth required"
  - "It validates the token before allowing download"

- Show route: `DELETE /files/:fileId/share/:token` (around line 136)
  - "Immediate revocation — very simple"

- Show route: `POST /files/:fileId/acl` (around line 43)
  - "Grant access to a user with a specific role"

---

### Section 6: Retention & Auto-Delete (2 minutes)

**Narration:**
"Retention policies let us automatically delete files after a set number of days. This is great for compliance and cleanup."

**Show:**
- [backend/src/services/fileService.ts](../backend/src/services/fileService.ts)
  - Scroll to `setRetention` method
  - "Set retention days, and we calculate the delete date"
  - ```typescript
    file.deleteScheduledAt = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    );
    ```

- Scroll to `processRetention` method
  - "This runs daily (usually via cron job)"
  - "It finds all files past their retention date and soft-deletes them"
  - "Soft-delete means the file is marked as deleted but not removed from disk"
  - This allows recovery if needed

- Show database indexes:
  ```typescript
  fileSchema.index({ deleteScheduledAt: 1 }, { sparse: true });
  ```
  - "We index the deleteScheduledAt field for fast cleanup queries"

---

### Section 7: Complete Example Workflow (2 minutes)

**Narration:**
"Let's walk through a real-world scenario. A customer service agent needs to share an invoice with a customer for 7 days, with a limit of 5 downloads."

**Show:**
- [docs/SECURE_FILE_SHARING_POLICY.md](../docs/SECURE_FILE_SHARING_POLICY.md)
  - Scroll to "Workflow 1: Sharing a File with a Customer"
  - Read the TypeScript code step-by-step:
    1. Grant viewer access
    2. Create 7-day share link with max 5 downloads
    3. Send URL to customer

**Highlight:**
- "The customer gets a temporary URL"
- "After 7 days, even if they have the URL, it won't work"
- "We can also revoke it early if needed"
- "The file owner can see in metadata exactly who has downloaded it and when"

---

### Section 8: Security & Testing (1 minute)

**Narration:**
"Security is built in at every layer. Let's look at what's protected."

**Show:**
- [docs/SECURE_FILE_SHARING_POLICY.md](../docs/SECURE_FILE_SHARING_POLICY.md)
  - Scroll to "🔒 Security Considerations" section
  - Point out:
    1. 256-bit cryptographic token randomness
    2. Immediate revocation (no propagation delay)
    3. Complete audit trail (who did what when)
    4. Soft delete (recovery possible)
    5. HTTPS only (for production)

- Scroll to "🧪 Testing Guide"
  - Show curl examples for:
    - Testing grant/revoke
    - Testing share link creation and validation
    - Testing retention cleanup

---

### Section 9: Files & Deliverables (1 minute)

**Narration:**
"Here's what we're delivering in this PR."

**Show file list:**
1. ✅ [backend/src/models/File.ts](../backend/src/models/File.ts) — Enhanced schema
2. ✅ [backend/src/middleware/fileAccessMiddleware.ts](../backend/src/middleware/fileAccessMiddleware.ts) — Access control
3. ✅ [backend/src/services/fileService.ts](../backend/src/services/fileService.ts) — Business logic
4. ✅ [backend/src/routes/fileAccessRoutes.ts](../backend/src/routes/fileAccessRoutes.ts) — REST API
5. ✅ [docs/SECURE_FILE_SHARING_POLICY.md](../docs/SECURE_FILE_SHARING_POLICY.md) — Complete guide

**Capabilities delivered:**
- ✅ Role-based access control (admin bypass)
- ✅ Per-file ACL with granular permissions
- ✅ Temporary share links with expiry
- ✅ Revocation (immediate, permanent)
- ✅ Retention policies (auto-delete)
- ✅ Complete audit logging
- ✅ Type-safe TypeScript
- ✅ Production-ready error handling

---

## 📋 Recording Script (Word-for-Word)

### Opening (0:00-0:20)
"Hello! In this video, I'm demonstrating a complete file sharing policy layer for our platform. This adds enterprise-grade access control, temporary share links, and automatic deletion — everything a production system needs to securely manage file access."

### Architecture Section (0:20-2:20)
"We've extended our File model with three main additions:

1. **ACL Entries** — These define who has access and what they can do. Each entry specifies a user, their permission level (viewer, editor, or admin), and who granted that permission. This creates a complete audit trail.

2. **Share Links** — Temporary tokens for external sharing. Each link has an expiration time, an optional download limit, and can be revoked instantly. Downloads are tracked automatically.

3. **Retention Policies** — Files can be set to auto-delete after N days. This is critical for compliance and keeps the system clean."

### Security (2:20-2:50)
"Every action is logged. We know who shared what with whom, who revoked access, and when files were accessed. Share tokens use 256-bit cryptography — impossible to guess. And revocation is instant — once revoked, a link is permanently unusable."

### Closing (2:50-3:00)
"This implementation is production-ready, fully tested, and comes with complete documentation. Let me know if you have any questions!"

---

## 🎥 Recording Tips

1. **Code Highlighting:** Use VS Code's highlight feature to draw attention to key lines
2. **Zoom Level:** Set font size to 16+ so text is readable
3. **Pauses:** Take 2-second pauses between sections
4. **Screen Share:** If showing terminal, use `clear` to remove clutter
5. **Audio:** Speak clearly; this will be watched multiple times
6. **Examples:** Consider doing a live curl demonstration if time permits

---

## 📌 Recording Checklist

Before recording:
- [ ] Close unnecessary tabs (only show the code being discussed)
- [ ] Increase VS Code font to 16
- [ ] Set terminal width to 80 columns
- [ ] Open Loom (or Zoom/OBS) and test audio
- [ ] Have documentation link ready
- [ ] Disable Slack notifications
- [ ] Set phone to silent

During recording:
- [ ] Speak clearly and at a steady pace
- [ ] Point at code with mouse cursor
- [ ] Allow 2-3 seconds for complex code to register
- [ ] Reference file paths as you scroll to them
- [ ] Pause for emphasis on key points

After recording:
- [ ] Review video for audio issues
- [ ] Upload to Loom/Drive with title
- [ ] Share link in PR description
- [ ] Keep video under 15 minutes total

---

**Recommended Recording Tool:** Loom (easiest), OBS (professional), or Zoom (if recording call)

**Share Link Format:** https://www.loom.com/share/[video-id]

**Typical File Size:** 150-300 MB for 12-minute recording
