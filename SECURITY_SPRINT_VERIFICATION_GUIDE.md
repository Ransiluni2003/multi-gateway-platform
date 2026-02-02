# 🔒 Security Sprint Verification Guide

**Date:** February 2, 2026  
**Purpose:** Prove security features work end-to-end for production readiness

This guide provides **step-by-step instructions** with **visual proof** for each security feature. No "trust me" — every claim is verifiable.

---

## 📋 Quick Start

```powershell
# 1. Start all services
cd d:\multi-gateway-platform
npm run dev:docker

# 2. Run all verification scripts
npm run verify:security
```

---

## ✅ Verification Checklist

### 1️⃣ Security Headers Proof (Visual DevTools)

**What:** Prove CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy are present.

**How to verify:**

```powershell
# Terminal 1: Start commerce-web
cd commerce-web
npm run dev

# Terminal 2: Validate headers
node validate-security-headers.js http://localhost:3000
```

**Expected output:**
```
✅ Content-Security-Policy (CSP): PRESENT
✅ X-Frame-Options: PRESENT (DENY or SAMEORIGIN)
✅ X-Content-Type-Options: PRESENT (nosniff)
✅ Referrer-Policy: PRESENT
✅ Permissions-Policy: PRESENT (camera=(), microphone=())
```

**For Loom recording:**
1. Open http://localhost:3000/test/security-headers
2. Open DevTools (F12) → Network tab
3. Refresh page and select the document request
4. Click "Headers" tab → scroll to "Response Headers"
5. Show each header with green checkmarks on the test page

**Visual proof location:** [commerce-web/src/app/test/security-headers/page.tsx](commerce-web/src/app/test/security-headers/page.tsx)

---

### 2️⃣ Rate Limiting Proof (Show 429 Response)

**What:** Prove rate limits prevent abuse with HTTP 429 (Too Many Requests).

**Endpoints protected:**
- `/api/auth/*` — 5 requests per 15 minutes
- `/api/webhooks/*` — 100 requests per minute
- `/api/coupons/validate` — 10 requests per minute

**How to verify:**

```powershell
# Run automated rate limit test
node scripts/test-rate-limiting.js
```

**Expected output:**
```
Testing /api/auth/login (limit: 5 per 15 min)
Request 1: 200 OK
Request 2: 200 OK
Request 3: 200 OK
Request 4: 200 OK
Request 5: 200 OK
Request 6: ❌ 429 TOO MANY REQUESTS

Headers:
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-02-02T15:30:00.000Z
Retry-After: 900
```

**For Loom recording:**
1. Open terminal and run: `node scripts/test-rate-limiting.js`
2. Show the first 5 requests succeeding (200 OK)
3. Show request 6 getting blocked (429)
4. Show the rate limit headers in the response

**Manual test (browser):**
1. Open http://localhost:3000/test/rate-limit
2. Click "Test Rate Limit" button rapidly
3. After 5 clicks, see red banner: "⚠️ Rate limit exceeded"

---

### 3️⃣ Signed URL Storage Proof (End-to-End)

**What:** Prove file upload/download with signed URLs + expiry handling.

**Flow:**
1. Generate signed upload URL (expires in 5 minutes)
2. Upload file to Supabase using signed URL
3. Generate signed download URL (expires in 60 seconds)
4. Download file successfully
5. Wait for URL to expire → show graceful error + refresh

**How to verify:**

```powershell
# Run automated E2E test
cd commerce-web
npm run test:storage
```

**Expected output:**
```
✅ Upload signed URL generated (expires in 300s)
✅ File uploaded successfully
✅ Download signed URL generated (expires in 60s)
✅ File downloaded successfully
⏳ Waiting 65 seconds for URL to expire...
✅ Expired URL rejected with 403 Forbidden
✅ New signed URL generated after expiry
✅ File downloaded with fresh URL
```

**For Loom recording:**

**Option A: Automated test**
```powershell
npm run test:storage
```

**Option B: Manual UI test**
1. Open http://localhost:3000/test/storage-demo
2. Click "Upload File" → select a file → see success message
3. Click "Download File" → file downloads
4. Wait 60 seconds
5. Click "Download File" again → see "URL expired" banner
6. Click "Refresh & Download" → new URL generated, file downloads

**Visual proof locations:**
- [commerce-web/src/app/api/storage/upload/route.ts](commerce-web/src/app/api/storage/upload/route.ts)
- [commerce-web/src/app/api/storage/download/route.ts](commerce-web/src/app/api/storage/download/route.ts)
- [commerce-web/src/components/FileUpload.tsx](commerce-web/src/components/FileUpload.tsx)

---

### 4️⃣ Audit Logs Proof (Admin Screen)

**What:** Prove sensitive actions are logged and visible in admin dashboard.

**Actions logged:**
- `LOGIN_SUCCESS` / `LOGIN_FAILURE`
- `ISSUE_SIGNED_URL`
- `CREATE_PRODUCT` / `UPDATE_PRODUCT` / `DELETE_PRODUCT`
- `CREATE_COUPON` / `VALIDATE_COUPON`
- `RATE_LIMIT_EXCEEDED`
- `ACCESS_DENIED`

**How to verify:**

```powershell
# Seed audit logs with test data
cd commerce-web
npm run seed:audit-logs

# Start dev server
npm run dev
```

**For Loom recording:**
1. Open http://localhost:3000/admin/audit-logs
2. Show the table with last 20 audit log entries
3. Filter by action type (e.g., "LOGIN_SUCCESS")
4. Show columns: Timestamp, Actor, Action, Resource, Status, IP Address
5. Click "Generate Test Logs" to create new entries in real-time
6. Refresh page to show new entries appear

**Expected UI:**
```
Audit Logs (Last 20 actions)

Timestamp             Actor              Action              Resource    Status    IP Address
2026-02-02 10:15:32   admin@test.com    LOGIN_SUCCESS       User        ✅        127.0.0.1
2026-02-02 10:16:45   admin@test.com    ISSUE_SIGNED_URL    File:logo.png ✅      127.0.0.1
2026-02-02 10:17:12   admin@test.com    CREATE_PRODUCT      Product:123  ✅       127.0.0.1
2026-02-02 10:18:03   user@test.com     RATE_LIMIT_EXCEEDED API:auth     ❌       192.168.1.1
```

**Manual action test:**
1. Open http://localhost:3000/test/audit-log
2. Click buttons to trigger different actions:
   - "Login" → Creates LOGIN_SUCCESS log
   - "Create Product" → Creates CREATE_PRODUCT log
   - "Generate Signed URL" → Creates ISSUE_SIGNED_URL log
3. Go to http://localhost:3000/admin/audit-logs
4. See new entries appear in the list

**Visual proof location:** [commerce-web/src/app/admin/audit-logs/page.tsx](commerce-web/src/app/admin/audit-logs/page.tsx)

---

## 🧪 All-in-One Verification Script

Run all tests in sequence:

```powershell
node scripts/run-security-verification.js
```

**Expected output:**
```
🔒 Security Sprint Verification

1️⃣ Security Headers... ✅ PASS
2️⃣ Rate Limiting...    ✅ PASS (429 after 5 requests)
3️⃣ Signed URLs...      ✅ PASS (upload + download + expiry)
4️⃣ Audit Logs...       ✅ PASS (20 entries logged)

✅ ALL TESTS PASSED
```

---

## 📹 Loom Recording Checklist

When recording your verification Loom, show:

### Part 1: Security Headers (2 min)
- [ ] Open http://localhost:3000/test/security-headers
- [ ] Open DevTools → Network → refresh page
- [ ] Click document request → Headers tab
- [ ] Show each header with green checkmark on page

### Part 2: Rate Limiting (2 min)
- [ ] Run `node scripts/test-rate-limiting.js` in terminal
- [ ] Show first 5 requests succeed (200)
- [ ] Show 6th request blocked (429)
- [ ] Show X-RateLimit-* headers in response

### Part 3: Signed URLs (3 min)
- [ ] Open http://localhost:3000/test/storage-demo
- [ ] Upload a file → show success
- [ ] Download file → show it works
- [ ] Wait 60 seconds (or fast-forward video)
- [ ] Try download again → show "expired" error
- [ ] Click refresh → download works again

### Part 4: Audit Logs (2 min)
- [ ] Open http://localhost:3000/test/audit-log
- [ ] Click 3 action buttons (Login, Create Product, Generate URL)
- [ ] Open http://localhost:3000/admin/audit-logs
- [ ] Show last 20 entries with timestamps, actors, actions
- [ ] Filter by action type to prove filtering works

---

## 🚀 Production Readiness Checklist

Before marking complete:

- [ ] All 4 tests pass locally
- [ ] Screenshots/Loom uploaded
- [ ] PR includes before/after proof
- [ ] README.md updated with security section
- [ ] All `.env.example` secrets documented
- [ ] No hardcoded secrets in code
- [ ] Docker Compose includes all security features

---

## 📂 Files to Show Reviewer

**Implementation files:**
```
commerce-web/
├── src/lib/
│   ├── rateLimit.ts          ← Rate limiting logic
│   ├── withRateLimit.ts      ← Rate limit middleware
│   └── auditLog.ts           ← Audit logging utility
├── src/app/api/
│   ├── storage/
│   │   ├── upload/route.ts   ← Signed upload URLs
│   │   └── download/route.ts ← Signed download URLs
│   └── admin/
│       └── audit-logs/route.ts ← Audit log API
├── src/app/admin/
│   └── audit-logs/page.tsx   ← Audit log admin UI
└── next.config.ts            ← Security headers config
```

**Test/verification files:**
```
commerce-web/
├── validate-security-headers.js
└── src/app/test/
    ├── security-headers/page.tsx
    ├── rate-limit/page.tsx
    ├── storage-demo/page.tsx
    └── audit-log/page.tsx

scripts/
├── test-rate-limiting.js
├── test-storage-e2e.js
└── run-security-verification.js
```

---

## 🎯 Single Command for Reviewer

```powershell
# Clone repo → Run everything
git clone <repo-url>
cd multi-gateway-platform
npm install
npm run dev:docker
npm run verify:security

# Or for manual testing:
npm run dev
# Then open: http://localhost:3000/test/security-headers
```

---

## ❓ Troubleshooting

**Headers not showing?**
```powershell
# Check next.config.ts has headers() function
cat commerce-web/next.config.ts | grep -A 20 "async headers"

# Restart dev server
npm run dev
```

**Rate limiting not working?**
```powershell
# Check withRateLimit is applied to routes
grep -r "withRateLimit" commerce-web/src/app/api/

# Clear in-memory rate limit store
# (Restart Node.js process)
```

**Signed URLs failing?**
```powershell
# Check Supabase credentials
cat .env | grep SUPABASE

# Check storage bucket exists
npm run check:storage
```

**Audit logs empty?**
```powershell
# Seed test data
cd commerce-web
npm run seed:audit-logs

# Check database connection
npx prisma studio
```

---

## 📚 Related Documentation

- [Security Implementation Checklist](SECURITY_IMPLEMENTATION_CHECKLIST.md)
- [Docker Orchestration Guide](docs/DOCKER_AND_ORCHESTRATION_GUIDE.md)
- [CI/CD Pipeline Guide](CI_CD_SETUP_GUIDE.md)

---

**Questions?** This guide ensures zero "works on my machine" risk. Every claim is testable in <5 minutes.
