# Demo Script with Loom Timestamps

**Complete walkthrough for supervisors and reviewers**

⏱️ **Target Duration:** 8-10 minutes  
🎥 **Loom Video:** [PLACEHOLDER - Insert URL after recording]

---

## Table of Contents

1. [Pre-Demo Setup](#pre-demo-setup)
2. [Timeline with Commands](#timeline-with-commands)
3. [Loom Recording Anchors](#loom-recording-anchors)
4. [Recording Tips](#recording-tips)

---

## Pre-Demo Setup

### Before Recording

```bash
# 1. Ensure services are running
npm run dev

# 2. Verify health
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"2026-02-10T..."}

# 3. Open tools
- Browser: http://localhost:3000
- Postman: Bundle-Mock-Payments.postman_collection.json
- Terminal: Ready for commands

# 4. Set zoom to 125% for readability
```

### Demo Data Setup

```bash# Seed demo users and products (if needed)
cd commerce-web
npm run seed

# Expected output:
# ✅ Created admin user: admin@example.com
# ✅ Created test user: user@example.com
# ✅ Seeded 15 products
```

---

## Timeline with Commands

### 00:00-00:40 | Introduction & Repository Orientation

**🎥 Loom Timestamp:** [00:00](PLACEHOLDER)

**What to Show:**
- Open repository in VS Code
- Show folder structure: `backend/`, `commerce-web/`, `docs/`, `scripts/`
- Navigate to [README_START_HERE.md](README_START_HERE.md)

**Script:**
> "This is the Multi-Gateway Platform - an e-commerce system with enterprise security features. I'll walk through authentication, file storage, payments, and our security automation. Everything is documented in README_START_HERE - this is your single entry point for understanding the system."

**Commands:**
```bash
# Show project structure
ls -la

# Show documentation
ls docs/

# Highlight key files
cat docs/README_START_HERE.md | head -n 30
```

**Expected Output:**
- Project tree visible
- Documentation index shown

---

### 00:40-02:10 | Authentication & Security Headers

**🎥 Loom Timestamp:** [00:40](PLACEHOLDER)

**What to Show:**
- CSRF token generation
- Login flow with rate limiting
- Security headers in browser DevTools

**Script:**
> "Authentication uses JWT tokens with CSRF protection and brute-force defense. Let me show you the complete flow starting with CSRF token generation."

**Commands:**

```bash
# 1. Get CSRF token
curl -v http://localhost:5000/api/auth/csrf-token

# Expected output:
# < Set-Cookie: csrf-token=abc123...; HttpOnly; SameSite=Strict
# { "csrfToken": "abc123..." }
```

```bash
# 2. Login with CSRF token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123..." \
  -H "Cookie: csrf-token=abc123..." \
  -d '{"email":"user@example.com","password":"Password123!"}'

# Expected output:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "60d5ec49f1b2c72b8c8e4f1a",
#     "email": "user@example.com"
#   }
# }
```

```bash
# 3. Test rate limiting (spam requests)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"wrong"}' &
done

# Expected output after 5th attempt:
# { "error": "Too many requests" }
# Status: 429
```

**Browser Demo:**
1. Open http://localhost:3000
2. Right-click → Inspect → Network tab
3. Refresh page
4. Click on any request → Headers tab

**Expected Headers:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' *.stripe.com
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### 02:10-03:30 | Signed Storage (Upload + Download + Expiry)

**🎥 Loom Timestamp:** [02:10](PLACEHOLDER)

**What to Show:**
- Upload URL generation with TTL
- Direct file upload to Supabase
- Download URL generation
- URL expiry demonstration

**Script:**
> "File storage uses signed URLs with time-limited access. Upload URLs expire in 60 seconds, download URLs in 15 minutes to 24 hours. Let me demonstrate the complete lifecycle including URL expiry."

**Commands:**

```bash
# Run automated storage demo
npm run demo:storage
```

**Expected Output:**
```
🔐 Storage Security Demo
=======================

Step 1: Requesting CSRF token...
✅ CSRF token obtained

Step 2: Logging in...
✅ Logged in successfully
✅ Access token received

Step 3: Requesting upload URL...
📤 Request: POST /api/files/upload-url
{
  "filename": "test-document.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 102400
}

✅ Upload URL received:
{
  "uploadUrl": "https://abc123.supabase.co/storage/v1/object/upload/...",
  "key": "user123/uuid-test-document.pdf",
  "expiresIn": 60
}

Step 4: Uploading file to Supabase...
✅ File uploaded successfully (102400 bytes)

Step 5: Requesting download URL...
📥 Request: GET /api/files/download-url?key=user123/uuid-test-document.pdf

✅ Download URL received:
{
  "downloadUrl": "https://abc123.supabase.co/storage/v1/object/download/...",
  "expiresIn": 900
}

Step 6: Downloading file...
✅ File downloaded successfully (102400 bytes)

Step 7: Waiting for URL to expire (15 minutes)...
⏰ Simulating 15 minute wait...

Step 8: Attempting download with expired URL...
❌ Download failed: 403 Forbidden
✅ URL expiry working correctly!

Summary:
✅ Upload URL generation: PASS
✅ Direct upload to storage: PASS
✅ Download URL generation: PASS
✅ Download successful: PASS
✅ URL expiry enforcement: PASS
✅ Audit logging: PASS

All storage security tests passed! ✅
```

---

### 03:30-05:10 | Payments & Checkout Flow

**🎥 Loom Timestamp:** [03:30](PLACEHOLDER)

**What to Show:**
- Payment authorization with Stripe
- Payment capture
- Transaction listing
- Audit log entries

**Script:**
> "Payment processing supports multiple providers with trace IDs for debugging. I'll demonstrate the authorize-capture flow using our Postman collection."

**Postman Collection:**
Open: `Bundle-Mock-Payments.postman_collection.json`

**Steps:**

1. **Authorize Payment**
   ```http
   POST http://localhost:5000/api/payments/authorize
   Content-Type: application/json
   Authorization: Bearer {{accessToken}}

   {
     "amount": 5000,
     "currency": "usd",
     "paymentMethod": "stripe",
     "items": [
       { "productId": "prod_123", "quantity": 2, "price": 2500 }
     ]
   }
   ```

   **Expected Response:**
   ```json
   {
     "transactionId": "pi_3ABC123xyz",
     "status": "authorized",
     "amount": 5000,
     "currency": "usd",
     "provider": "stripe",
     "traceId": "abc-def-ghi-jkl",
     "createdAt": "2026-02-10T10:30:00.000Z"
   }
   ```

2. **Capture Payment**
   ```http
   POST http://localhost:5000/api/payments/capture
   Content-Type: application/json
   Authorization: Bearer {{accessToken}}

   {
     "transactionId": "pi_3ABC123xyz"
   }
   ```

   **Expected Response:**
   ```json
   {
     "transactionId": "pi_3ABC123xyz",
     "status": "completed",
     "capturedAt": "2026-02-10T10:31:00.000Z"
   }
   ```

3. **List Transactions**
   ```http
   GET http://localhost:5000/api/payments/transactions?limit=10
   Authorization: Bearer {{accessToken}}
   ```

   **Expected Response:**
   ```json
   {
     "transactions": [
       {
         "transactionId": "pi_3ABC123xyz",
         "amount": 5000,
         "currency": "usd",
         "status": "completed",
         "provider": "stripe",
         "createdAt": "2026-02-10T10:30:00.000Z",
         "completedAt": "2026-02-10T10:31:00.000Z"
       }
     ],
     "total": 1
   }
   ```

**See Full Guide:** [LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md](../LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md)

---

### 05:10-06:20 | Webhooks & Audit Logging

**🎥 Loom Timestamp:** [05:10](PLACEHOLDER)

**What to Show:**
- Webhook signature validation
- Audit log retrieval
- Event filtering

**Script:**
> "Webhooks validate HMAC signatures, and all security events are logged to our audit system. Let me show you the audit trail from our previous actions."

**Commands:**

```bash
# 1. Simulate webhook (requires Stripe CLI or use test script)
curl -X POST http://localhost:5000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=123,v1=abc..." \
  -d '{
    "id": "evt_test_webhook",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_3ABC123xyz",
        "amount": 5000,
        "status": "succeeded"
      }
    }
  }'

# Expected output:
# { "received": true }
```

```bash
# 2. Retrieve audit logs (requires admin token)
curl http://localhost:5000/api/audit-logs?limit=20 \
  -H "Authorization: Bearer {{adminAccessToken}}"
```

**Expected Output:**
```json
{
  "logs": [
    {
      "event": "LOGIN_SUCCESS",
      "userId": "60d5ec49f1b2c72b8c8e4f1a",
      "ipAddress": "127.0.0.1",
      "timestamp": "2026-02-10T10:29:00.000Z",
      "metadata": { "email": "user@example.com" }
    },
    {
      "event": "ISSUE_SIGNED_URL",
      "userId": "60d5ec49f1b2c72b8c8e4f1a",
      "resourceType": "FILE",
      "resourceId": "60d5ec49f1b2c72b8c8e4f1b",
      "timestamp": "2026-02-10T10:29:30.000Z",
      "metadata": {
        "action": "upload",
        "filename": "test-document.pdf",
        "expiresIn": 60
      }
    },
    {
      "event": "PAYMENT_COMPLETED",
      "userId": "60d5ec49f1b2c72b8c8e4f1a",
      "resourceType": "TRANSACTION",
      "resourceId": "60d5ec49f1b2c72b8c8e4f1c",
      "timestamp": "2026-02-10T10:31:00.000Z",
      "metadata": {
        "amount": 5000,
        "provider": "stripe",
        "transactionId": "pi_3ABC123xyz"
      }
    },
    {
      "event": "WEBHOOK_RECEIVED",
      "resourceType": "TRANSACTION",
      "timestamp": "2026-02-10T10:31:15.000Z",
      "metadata": {
        "provider": "stripe",
        "eventType": "payment_intent.succeeded"
      }
    }
  ],
  "total": 42
}
```

**In Browser:**
- Navigate to http://localhost:3000/admin/audit-logs
- Show filterable table with all events

---

### 06:20-07:30 | Share Links & ACL (Optional)

**🎥 Loom Timestamp:** [06:20](PLACEHOLDER)

**What to Show:**
- File ACL metadata
- Share link creation
- Share link revocation

**Script:**
> "Files have granular access control with owner and group permissions. Share links use per-file tokens for secure temporary access."

**Commands:**

```bash
# 1. View file ACL
curl http://localhost:5000/api/files/metadata?key=user123/uuid-test-document.pdf \
  -H "Authorization: Bearer {{accessToken}}"
```

**Expected Output:**
```json
{
  "key": "user123/uuid-test-document.pdf",
  "filename": "test-document.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 102400,
  "owner": "60d5ec49f1b2c72b8c8e4f1a",
  "acl": {
    "users": ["60d5ec49f1b2c72b8c8e4f1a"],
    "groups": []
  },
  "shareLinks": [],
  "retention": {
    "deleteAfter": "2026-05-11T10:29:00.000Z"
  },
  "createdAt": "2026-02-10T10:29:30.000Z"
}
```

```bash
# 2. Create share link
curl -X POST http://localhost:5000/api/files/share-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{accessToken}}" \
  -d '{
    "key": "user123/uuid-test-document.pdf",
    "expiresIn": 3600,
    "maxDownloads": 5
  }'
```

**Expected Output:**
```json
{
  "shareToken": "shr_abc123xyz",
  "shareUrl": "http://localhost:3000/share/shr_abc123xyz",
  "expiresAt": "2026-02-10T11:29:30.000Z",
  "maxDownloads": 5,
  "downloadsUsed": 0
}
```

```bash
# 3. Revoke share link
curl -X DELETE http://localhost:5000/api/files/share-link/shr_abc123xyz \
  -H "Authorization: Bearer {{accessToken}}"

# Expected output:
# { "message": "Share link revoked successfully" }
```

**Reference:** [SECURE_FILE_SHARING_POLICY.md](SECURE_FILE_SHARING_POLICY.md)

---

### 07:30-08:30 | CI/CD Automation & Wrap-Up

**🎥 Loom Timestamp:** [07:30](PLACEHOLDER)

**What to Show:**
- GitHub Actions workflows
- Security test automation
- Documentation index

**Script:**
> "Everything we just demonstrated is automatically tested in our CI pipeline. Security tests run on every commit, and we have comprehensive documentation for every feature."

**Commands:**

```bash
# Show CI/CD workflows
ls .github/workflows/

# Expected output:
# ci-cd.yml
# ci-cd-hardened.yml
# security-tests.yml
```

```bash
# Run security tests locally (same as CI)
npm run test:security

# Expected output:
# ✅ 1/5: Secrets Hygiene
# ✅ 2/5: Security Headers Validation
# ✅ 3/5: Rate Limiting
# ✅ 4/5: Storage E2E
# ✅ 5/5: Audit Logs Verification
#
# ALL TESTS PASSED ✅
```

**Show Documentation:**
- [README_START_HERE.md](README_START_HERE.md) - Complete onboarding guide
- [SECURITY_REVIEW.md](SECURITY_REVIEW.md) - Threat model with 8 assets
- [KEY_FLOWS.md](KEY_FLOWS.md) - Request flow diagrams
- [ARCHITECTURE_DIAGRAM_SIMPLE.md](ARCHITECTURE_DIAGRAM_SIMPLE.md) - System architecture

**Closing:**
> "That's the complete security sprint demo. We've covered authentication with CSRF and brute-force protection, signed storage URLs with expiry, payments with audit trails, and webhook validation. Everything is documented, tested, and automated in CI. Questions welcome!"

---

## Loom Recording Anchors

### Primary Demo
- **Main Walkthrough:** [PLACEHOLDER - Insert URL after recording]
  - Complete 8-10 minute overview
  - All features demonstrated above

### Deep Dive Recordings
- **Bundle Mock Payments:** [LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md](../LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md)
  - Payment flow details: [PLACEHOLDER - Insert Loom URL]
  
- **CI/CD Pipeline:** [LOOM_CICD_WALKTHROUGH.md](../LOOM_CICD_WALKTHROUGH.md)
  - GitHub Actions demo: [PLACEHOLDER - Insert Loom URL]
  
- **Failure Drill:** [LOOM_FAILURE_DRILL.md](../LOOM_FAILURE_DRILL.md)
  - Chaos testing demo: [PLACEHOLDER - Insert Loom URL]
  
- **Secure File Sharing:** [LOOM_SECURE_FILE_SHARING.md](LOOM_SECURE_FILE_SHARING.md)
  - File ACL + share links: [PLACEHOLDER - Insert Loom URL]

---

## Recording Tips

### Before Recording

✅ **Environment Setup:**
- Close unnecessary browser tabs
- Clear terminal history: `clear`
- Set terminal font size: 14-16pt
- Set browser zoom: 125%
- Use fullscreen mode (F11)
- Turn off notifications

✅ **Pre-flight Checks:**
```bash
# Verify all services running
npm run dev

# Check health
curl http://localhost:5000/api/health
curl http://localhost:3000

# Prepare demo data
npm run db:seed
```

### During Recording

✅ **Best Practices:**
- Speak clearly and slowly
- Pause 2 seconds between sections
- Verbally announce each timestamp (e.g., "Now at 2 minutes 10 seconds...")
- Show expected outputs before running commands
- Highlight errors/failures as expected behavior
- Use cursor to point at important text

✅ **Screen Management:**
- Use 2 windows side-by-side:
  - Left: Browser (frontend + Postman)
  - Right: Terminal + VS Code
- Zoom in on small text
- Use Ctrl+L to clear terminal between commands

### After Recording

✅ **Post-Production:**
- Add chapter markers at each timestamp
- Add captions for key commands
- Upload to Loom with descriptive title
- Share link with supervisor
- Update this document with Loom URL

---

## Troubleshooting Common Demo Issues

### Issue 1: "Port already in use"
```bash
# Kill processes on port 5000 and 3000
taskkill /F /IM node.exe

# Or restart services
npm run dev
```

### Issue 2: "MongoDB connection failed"
```bash
# Start MongoDB
mongod --dbpath C:\data\db

# Or use Docker
docker run -d -p 27017:27017 mongo:7.0
```

### Issue 3: "JWT token expired during demo"
```bash
# Re-login to get fresh token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'

# Copy new accessToken
```

### Issue 4: "Demo storage fails (no Supabase)"
```bash
# Skip storage demo if Supabase not configured
# Show mock version instead:
npm run demo:storage:mock
```

---

## Quick Commands Reference

```bash
# Health check
curl http://localhost:5000/api/health

# CSRF token
curl http://localhost:5000/api/auth/csrf-token

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'

# Storage demo
npm run demo:storage

# Security tests
npm run test:security

# Audit logs
curl http://localhost:5000/api/audit-logs \
  -H "Authorization: Bearer {{adminToken}}"

# Seed demo data
cd commerce-web && npm run seed
```

---

**Last Updated:** February 10, 2026  
**Recording Status:** ⏳ Pending (Insert Loom URLs after recording)
