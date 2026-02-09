# Local Setup & Demo Scripts Guide

This guide shows how to run the platform locally and verify each security/features feature works.

---

## 🚀 Quick Start (No Docker - 2 mins)

### Prerequisites
- Node.js 18+
- npm
- Git

### Steps

```bash
# 1. Clone
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform

# 2. Install dependencies (root level)
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..

# 3. Setup environment
cp .env.example .env
# Edit .env with your Stripe & Supabase keys (see below)

# 4. Seed database
npm run db:seed

# 5. Start everything
npm run dev
```

**Expected Output:**
```
✓ Frontend running on http://localhost:3000
✓ Backend API running on http://localhost:5000
```

---

## 📋 Environment Configuration

### Root `.env` (Required)

```env
# Server
PORT=5000
NODE_ENV=development

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# JWT
JWT_SECRET=your_random_secret_key_here_min_32_chars

# Database (MongoDB)
MONGO_URI=mongodb://localhost:27017/payment-gateway
# OR MongoDB Atlas:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=Cluster

# Supabase (optional, for storage demos)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=uploads
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_BASE=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=uploads
```

### Get Your Keys

**Stripe:**
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Click **Developers** → **API Keys**
3. Copy **Secret Key** (sk_test_xxx)
4. In **Webhooks**, create endpoint for `http://localhost:3001/api/webhooks/stripe`
5. Copy webhook secret (whsec_xxx)

**Supabase (for storage demo):**
1. Go to [supabase.com](https://supabase.com) → Create project
2. Go to **Project Settings** → **API**
3. Copy **Project URL** and **Service Role Key**
4. Create a **Storage** bucket named `uploads` (private)
5. [See detailed setup](./docs/SUPABASE_LOCAL_SETUP.md)

**MongoDB:**
- Local: `mongodb://localhost:27017/payment-gateway` (requires `mongod` running)
- Atlas: Get connection string from [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

---

## 🌱 Seed Data

Before running demos, populate the database with test data:

```bash
npm run db:seed
```

This creates:
- ✅ Admin user (admin@example.com / password)
- ✅ 6 demo products
- ✅ Sample transactions for fraud detection

---

## 🎬 One-Command Demo Scripts

### Demo 1: Security Headers + Rate Limiting (20 sec)

```bash
npm run demo:security
```

**Shows:**
- 5 security headers present (CSP, X-Frame-Options, etc.)
- Rate limiting in action (15 requests, first 10 ✓, last 5 ✗ 429)

**Expected Output:**
```
🔐 SECURITY DEMO START

  ✅ Content-Security-Policy
  ✅ X-Frame-Options: DENY
  ✅ X-Content-Type-Options: nosniff
  ✅ Referrer-Policy
  ✅ Permissions-Policy

Request  1: ✓ 200
Request  2: ✓ 200
...
Request 11: ✗ 429
Request 12: ✗ 429
```

**Code References:**
- Security headers: [backend/src/server.ts](../backend/src/server.ts#L98-L105) (helmet.js)
- Rate limiting: [backend/src/server.ts](../backend/src/server.ts#L108-L115) (express-rate-limit)

---

### Demo 2: Storage (Signed URLs) (30 sec)

```bash
npm run demo:storage
```

**Shows:**
- Request upload signed URL
- Upload sample file
- Request download signed URL
- Show expiry behavior (60 sec)

**Expected Output:**
```
1️⃣  Request Upload Signed URL
   ✅ Upload URL obtained
   Key: demo-1707012345678.txt

2️⃣  Upload Sample File
   ✅ File uploaded successfully

3️⃣  Request Download Signed URL
   ✅ Download URL obtained
   Expires at: 2026-02-04T18:30:00Z

4️⃣  Demonstrate Expiry Behavior
   ✅ URL is fresh and valid
   Time left: 58 seconds
```

**Prerequisites:** Supabase configured (see [SUPABASE_LOCAL_SETUP.md](./docs/SUPABASE_LOCAL_SETUP.md))

**Code References:**
- Upload: [frontend/app/api/files/upload/route.js](../frontend/app/api/files/upload/route.js)
- Download: [frontend/app/api/files/download/route.js](../frontend/app/api/files/download/route.js)
- Expiry: [frontend/components/SupabaseDownloadButton.jsx](../frontend/components/SupabaseDownloadButton.jsx)

---

### Demo 3: Audit Logs Verification (20 sec)

```bash
npm run verify:audit-logs
```

**Triggers & verifies:**
1. Login success ✅
2. Login failure ✅
3. Create product ✅
4. Request signed URL ✅

**Expected Output:**
```
1️⃣  Login success
   ✅ Logged in successfully

2️⃣  Login failure
   ✅ Failed login recorded

3️⃣  Create product
   ✅ Product created

4️⃣  Request signed URL
   ✅ Signed URL requested

📋 Last 5 audit log entries:
   [2026-02-04T18:25:30Z] LOGIN_SUCCESS
   [2026-02-04T18:25:29Z] LOGIN_FAILURE
   [2026-02-04T18:25:28Z] CREATE_PRODUCT
   [2026-02-04T18:25:27Z] REQUEST_SIGNED_URL
```

**Code References:**
- Audit models: [backend/src/models/EventLog.ts](../backend/src/models/EventLog.ts)
- Payment logs: [backend/src/routes/paymentsRoutes.ts](../backend/src/routes/paymentsRoutes.ts#L21-L83)

---

## 📚 Where to Find Everything

| What | Where |
|------|-------|
| Security headers config | [backend/src/server.ts](../backend/src/server.ts#L98-L105) |
| Rate limiting config | [backend/src/server.ts](../backend/src/server.ts#L108-L115) |
| Signed URLs (upload) | [frontend/app/api/files/upload/route.js](../frontend/app/api/files/upload/route.js) |
| Signed URLs (download) | [frontend/app/api/files/download/route.js](../frontend/app/api/files/download/route.js) |
| Expiry handling | [frontend/components/SupabaseDownloadButton.jsx](../frontend/components/SupabaseDownloadButton.jsx) |
| Password hashing | [backend/src/routes/authRoutes.ts](../backend/src/routes/authRoutes.ts#L23) |
| JWT signing | [backend/src/routes/authRoutes.ts](../backend/src/routes/authRoutes.ts#L9-L13) |
| Audit logging | [backend/src/models/EventLog.ts](../backend/src/models/EventLog.ts) |
| Cookies (httpOnly) | [frontend/app/login/page.tsx](../frontend/app/login/page.tsx#L34) |

---

## ✅ Verification Checklist

Before marking complete:

- [ ] `npm run dev` starts both frontend + backend
- [ ] `npm run demo:security` shows 5 headers + rate limiting
- [ ] `npm run demo:storage` shows upload/download flow
- [ ] `npm run verify:audit-logs` shows recent actions
- [ ] `.env` has Stripe keys configured
- [ ] `.env` has Supabase keys (for storage demo)
- [ ] Database is seeded with test data
- [ ] No console errors on startup

---

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Kill Node processes
Get-Process -Name node | Stop-Process -Force
npm run dev
```

### "Cannot find module 'bcryptjs'"
```bash
# Reinstall backend dependencies
cd backend
npm install
cd ..
npm run dev
```

### "Supabase configuration missing"
- Check `.env.local` exists in root AND `frontend/` dirs
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### "MongoDB connection refused"
- Either: Start local MongoDB (`mongod` command)
- Or: Update `MONGO_URI` to MongoDB Atlas connection string

### Demo scripts say "Server not running"
- Ensure `npm run dev` is running in Terminal 1
- Run demo scripts in Terminal 2

---

## 📞 Support

For detailed docs:
- [Security & Crypto Notes](./docs/SECURITY_CRYPTO_NOTES.md)
- [Supabase Setup](./docs/SUPABASE_LOCAL_SETUP.md)
- [Docker Guide](./docs/DOCKER_AND_ORCHESTRATION_GUIDE.md)
