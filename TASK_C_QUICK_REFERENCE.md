# Task C: Quick Proof Commands

## Run All Proofs

```bash
# C1: Security Headers (helmet.js middleware)
npm run verify:security-headers

# C2: Rate Limiting (429 responses)
npm run verify:rate-limiting

# C3: Signed URL E2E (upload/download/expiry)
npm run demo:storage

# C4: Audit Logs (last 20 actions)
npm run proof:audit-logs

# C5: Secrets Hygiene (.env.example, no commits)
npm run verify:secrets-hygiene
```

## Prerequisites

```bash
# 1. Start backend server
cd backend
npm run dev

# 2. Ensure MongoDB connected
# Check .env has MONGO_URI

# 3. Setup Supabase (if testing storage)
npm run setup:supabase

# 4. Seed admin user (if testing auth/audit)
cd backend
npm run seed
```

## Expected Output

### C1: Security Headers
```
✅ ALL SECURITY HEADERS VALIDATED SUCCESSFULLY!
Score: 100%
```

### C2: Rate Limiting
```
✅ PASS: Rate limiting is working! (Observed 429 responses)
/api/auth/* → Rate limited after 5 requests
/api/coupons/validate → Rate limited after 10 requests
```

### C3: Signed URL E2E
```
1️⃣  Request Upload Signed URL → ✅
2️⃣  Upload Sample File → ✅
3️⃣  Request Download Signed URL → ✅
4️⃣  Demonstrate Expiry Behavior → ✅
═══════════════════════════════════════
  ✅ STORAGE DEMO COMPLETE
```

### C4: Audit Logs
```
✅ PASS: All expected audit actions are present!

Tracked actions:
  ✓ LOGIN_SUCCESS
  ✓ LOGIN_FAILURE
  ✓ ISSUE_SIGNED_URL
  ✓ VALIDATE_COUPON
```

### C5: Secrets Hygiene
```
✅ .env.example exists (no secrets)
✅ .gitignore protections
✅ No hardcoded secrets
✅ Secrets hygiene verified!
```

## Rate Limits Configured

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 5 requests | 15 minutes |
| `/api/webhooks/*` | 100 requests | 1 minute |
| `/api/coupons/validate` | 10 requests | 1 minute |

## Audit Actions Tracked

- `LOGIN_SUCCESS` - Successful authentication
- `LOGIN_FAILURE` - Failed login attempts
- `ISSUE_SIGNED_URL` - File download/upload URL generation
- `VALIDATE_COUPON` - Coupon code validation

## Implementation Files

| Task | Files |
|------|-------|
| C1 | [backend/src/server.ts](backend/src/server.ts#L105) - helmet() |
| C2 | [backend/src/routes/authRoutes.ts](backend/src/routes/authRoutes.ts#L22-L28)<br>[backend/src/routes/webhookRoutes.ts](backend/src/routes/webhookRoutes.ts#L9-L15)<br>[backend/src/routes/couponRoutes.ts](backend/src/routes/couponRoutes.ts#L8-L14) |
| C3 | [backend/src/server.ts](backend/src/server.ts) - /api/files/* |
| C4 | [backend/src/models/AuditLog.ts](backend/src/models/AuditLog.ts)<br>[backend/src/routes/auditRoutes.ts](backend/src/routes/auditRoutes.ts)<br>[backend/src/utils/audit.ts](backend/src/utils/audit.ts) |
| C5 | [.env.example](.env.example)<br>[.gitignore](.gitignore) |

## Troubleshooting

### "Connection refused" errors
```bash
# Ensure backend is running
cd backend
npm run dev
```

### "MongoDB connection failed"
```bash
# Check .env has correct MONGO_URI
cat backend/.env | grep MONGO_URI
```

### "CSRF token missing"
```bash
# Ensure backend has cookie-parser
cd backend
npm install cookie-parser
```

### "Supabase bucket not found"
```bash
# Run Supabase setup
npm run setup:supabase
```

### "Admin user not found"
```bash
# Seed database
cd backend
npm run seed
```

## DevTools Verification (C1)

1. Open browser DevTools (F12)
2. Network tab
3. Visit `http://localhost:5000/api/health`
4. Click request → Headers → Response Headers
5. Verify security headers present:
   - `content-security-policy`
   - `x-frame-options`
   - `x-content-type-options`
   - `referrer-policy`
   - `x-dns-prefetch-control`

## Status

✅ All Task C requirements (C1-C5) complete
