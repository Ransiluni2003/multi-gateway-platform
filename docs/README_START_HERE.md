# 🚀 Start Here - Complete Onboarding Guide

**Single entry point for reviewers, new developers, and supervisors**

⏱️ **Time to get running:** 15 minutes  
📚 **Reading time:** 10 minutes

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Run Locally](#run-locally)
4. [Run Security Suite](#run-security-suite)
5. [Demo Flows](#demo-flows)
6. [Troubleshooting](#troubleshooting)
7. [Where to Look in Code](#where-to-look-in-code)
8. [Documentation Index](#documentation-index)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose | Install Command |
|------|---------|---------|----------------|
| **Node.js** | ≥ 20.0.0 | Runtime for backend + frontend | [Download](https://nodejs.org/) |
| **npm** | ≥ 10.0.0 | Package manager | Included with Node.js |
| **Git** | Latest | Version control | [Download](https://git-scm.com/) |
| **Docker** | Latest | Optional: Run full stack | [Download](https://docker.com/) |
| **MongoDB** | ≥ 7.0 | Database | [Download](https://www.mongodb.com/) or use Docker |
| **Redis** | ≥ 7.0 | Optional: Rate limiting (future) | [Download](https://redis.io/) or use Docker |

### Optional Services

- **Supabase Account:** For file storage demo ([signup](https://supabase.com/))
- **Stripe Account:** For payment testing ([signup](https://stripe.com/))
- **GitHub Account:** For CI/CD workflows

### Check Your Setup

```bash
# Verify versions
node --version    # Should be v20.0.0 or higher
npm --version     # Should be 10.0.0 or higher
git --version
docker --version  # Optional

# Check MongoDB (if running locally)
mongosh --version

# Check Redis (if running locally)
redis-cli --version
```

---

## Environment Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../commerce-web
npm install

# Return to root
cd ..
```

**Expected output:** No errors, ~900 packages installed across 3 directories

### Step 3: Configure Environment Variables

#### Backend (.env)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```bash
# Required - Basic Setup
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Required - JWT Secret (generate secure random string)
JWT_SECRET=your_jwt_secret_here_min_64_chars_long_please_use_crypto_random

# Required - MongoDB (local or cloud)
MONGO_URI=mongodb://localhost:27017/multi_gateway
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/multi_gateway

# Optional - Redis (in-memory fallback if not provided)
REDIS_URL=redis://localhost:6379

# Optional - Supabase Storage (required for file storage demo)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your_service_role_key_here
SUPABASE_BUCKET=your-bucket-name

# Optional - Payment Providers
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Optional - Monitoring
SENTRY_DSN=https://...
LOGTAIL_SOURCE_TOKEN=...
```

**Generate JWT Secret:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or OpenSSL
openssl rand -hex 64
```

#### Frontend (.env.local)

```bash
cd commerce-web
cp .env.example .env.local
```

Edit `commerce-web/.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Supabase (if using storage features)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe (if using payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 4: Database Setup

#### Option A: Local MongoDB

```bash
# Start MongoDB (if installed locally)
mongod --dbpath /path/to/data/directory

# OR use Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Update `MONGO_URI` in `.env`

#### Seed Demo Data

```bash
cd commerce-web
npm run seed
```

**Expected output:** Products, orders, and users created

---

## Run Locally

### Option 1: Quick Start (Recommended)

```bash
# From project root
npm run dev
```

This starts:
- ✅ Backend API: http://localhost:5000
- ✅ Frontend: http://localhost:3000

**Verify it's running:**

```bash
# Backend health check
curl http://localhost:5000/api/health

# Expected: {"status":"ok","timestamp":"..."}
```

```bash
# Frontend (open in browser)
open http://localhost:3000
```

### Option 2: Individual Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd commerce-web
npm run dev
```

### Option 3: Docker (Full Stack)

```bash
# Start all services (API, frontend, MongoDB, Redis, monitoring)
npm run dev:docker

# Verify
docker ps

# Stop
npm run docker:down
```

---

## Run Security Suite

All security features can be tested with automated scripts:

### Run All Tests (2 minutes)

```bash
npm run test:security
```

**Expected output:**
```
✅ 1/4: Security Headers Validation
✅ 2/4: Rate Limiting (429 responses)
✅ 3/4: Signed URL Storage E2E
✅ 4/4: Audit Logs Verification

ALL TESTS PASSED ✅
```

### Individual Test Commands

```bash
# Test 1: Security Headers (CSP, X-Frame-Options, etc.)
npm run verify:security-headers
# Expected: All headers present with green checkmarks

# Test 2: Rate Limiting
npm run verify:rate-limiting
# Expected: 429 after hitting rate limit threshold

# Test 3: Storage Demo (Upload → Download → Expiry)
npm run demo:storage
# Expected: Upload success, download works, URL expires after TTL

# Test 4: Audit Logs
npm run proof:audit-logs
# Expected: Recent security events logged (LOGIN, FILE_ACCESS, etc.)

# Test 5: Secrets Hygiene
npm run verify:secrets-hygiene
# Expected: No hardcoded secrets, only .env.example
```

---

## Demo Flows

### 1. Auth Flow (CSRF + Brute-Force Protection)

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test auth
node scripts/demo-security.js
```

**What this demonstrates:**
- ✅ CSRF token generation
- ✅ Rate limiting (5 attempts / 15 minutes)
- ✅ Brute-force protection (account lockout)
- ✅ Token rotation (15min access + 30day refresh)

**Expected output:**
```
✅ CSRF token obtained: abc123...
✅ Login successful (attempt 1/5)
✅ Login successful (attempt 2/5)
...
❌ Login blocked (attempt 6) - Rate limited
✅ Account locked after 5 failed attempts
```

### 2. File Storage Flow (Signed URLs + ACL)

```bash
npm run demo:storage
```

**What this demonstrates:**
- ✅ Upload URL generation (with MIME validation)
- ✅ Download URL generation (with TTL)
- ✅ URL expiry handling
- ✅ Audit logging for file access

**Expected output:**
```
📤 Requesting upload URL...
✅ Upload URL received (expires in 60s)
📁 Uploading test file...
✅ File uploaded successfully

📥 Requesting download URL...
✅ Download URL received (expires in 15min)
⏰ Waiting for expiry...
❌ Download failed: URL expired (expected)
```

### 3. Payment Flow (Stripe Integration)

```bash
# Start server
npm run dev

# Open Postman collection
# File: Bundle-Mock-Payments.postman_collection.json
```

**Steps:**
1. **Authorize:** POST `/api/payments/authorize` → Returns transaction ID
2. **Capture:** POST `/api/payments/capture` → Completes payment
3. **List:** GET `/api/payments/transactions` → Shows payment history

See detailed guide: [LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md](../LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md)

### 4. Webhook Flow (Stripe Signature Validation)

```bash
# Test webhook endpoint
node commerce-web/test-webhook-idempotency.js
```

**What this demonstrates:**
- ✅ HMAC signature verification
- ✅ Rate limiting (100 req/min)
- ✅ Audit logging for webhook events

### 5. Audit Logs Flow

```bash
# Generate audit events
npm run demo:security

# View logs (requires admin token)
curl http://localhost:5000/api/audit-logs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected entries:**
- `LOGIN_SUCCESS`, `LOGIN_FAILURE`
- `ISSUE_SIGNED_URL`, `VALIDATE_SHARE_LINK`
- `RATE_LIMIT_EXCEEDED`, `CSRF_VALIDATION_FAILED`

---

## Troubleshooting

### Common Issues

#### 1. "Port 5000 already in use"

**Error:** `EADDRINUSE: address already in use :::5000`

**Solutions:**
```bash
# Find process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9

# Or change port in backend/.env
PORT=5001
```

#### 2. "MongoDB connection failed"

**Error:** `MongoServerError: Authentication failed`

**Solutions:**
```bash
# Check MongoDB is running
mongosh

# Verify connection string
# Should be: mongodb://localhost:27017/multi_gateway
# OR: mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Check .env file has correct MONGO_URI
cat backend/.env | grep MONGO_URI
```

#### 3. "JWT_SECRET not configured"

**Error:** `Error: JWT_SECRET must be defined`

**Solution:**
```bash
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to backend/.env
JWT_SECRET=<generated_secret_here>
```

#### 4. "Supabase signed URL expired"

**Error:** `Storage API error: URL expired`

**Expected behavior:** This is normal! Signed URLs expire after TTL (60s in tests)

**Solution:** Request new signed URL via API

#### 5. "npm install fails"

**Error:** `ERESOLVE unable to resolve dependency tree`

**Solution:**
```bash
# Use legacy peer deps
npm install --legacy-peer-deps

# Or in commerce-web specifically
cd commerce-web
npm install --legacy-peer-deps
```

#### 6. "Rate limit hit during testing"

**Error:** `429 Too Many Requests`

**Expected behavior:** This proves rate limiting works!

**Solution:** Wait for rate limit window to reset (15 minutes for auth routes)

---

## Where to Look in Code

### Directory Structure

```
multi-gateway-platform/
├── backend/                      # Express API server
│   ├── src/
│   │   ├── middleware/          # 👈 Security middleware
│   │   │   ├── csrfProtection.ts        # CSRF double-submit cookie
│   │   │   ├── bruteForceProtection.ts  # Login attempt tracking
│   │   │   └── fileAccessMiddleware.ts  # ACL enforcement
│   │   ├── services/            # 👈 Business logic
│   │   │   ├── refreshTokenService.ts   # Token rotation
│   │   │   └── fileService.ts           # Signed URLs, ACLs
│   │   ├── routes/              # 👈 API endpoints
│   │   │   ├── authRoutes.ts            # Login, register, refresh
│   │   │   ├── fileAccessRoutes.ts      # File ACL management
│   │   │   ├── couponRoutes.ts          # Rate-limited validation
│   │   │   └── webhookRoutes.ts         # Payment webhooks
│   │   ├── models/              # 👈 Database schemas
│   │   │   ├── User.ts                  # User + refresh tokens
│   │   │   ├── File.ts                  # File + ACL + share links
│   │   │   └── AuditLog.ts              # Security events
│   │   └── server.ts            # 👈 Main entry point
│   └── tests/                   # 👈 Security tests
│       └── security.test.ts             # Jest tests
├── commerce-web/                # Next.js frontend
│   ├── src/app/
│   │   ├── api/                 # Next.js API routes
│   │   │   ├── storage/         # Upload/download endpoints
│   │   │   └── test/            # Demo pages
│   │   ├── admin/               # Admin UI (audit logs)
│   │   └── test/                # 👈 Security demo pages
│   │       ├── security-headers/ # Headers validation
│   │       ├── rate-limit/       # Rate limit demo
│   │       └── storage-demo/     # Signed URL demo
│   ├── next.config.ts           # 👈 Security headers config
│   └── prisma/                  # Database schema
├── scripts/                     # 👈 Automation scripts
│   ├── test-security.js                # All-in-one test runner
│   ├── validate-security-headers.js    # CSP validation
│   ├── verify-rate-limiting.js         # Rate limit tests
│   ├── demo-storage.js                 # Storage E2E demo
│   └── retention-cleanup.js            # Cron-ready cleanup
├── docs/                        # 👈 Documentation
│   ├── README_START_HERE.md            # ← You are here!
│   ├── SECURITY_REVIEW.md              # Threat model
│   ├── KEY_FLOWS.md                    # Flow diagrams
│   ├── ARCHITECTURE_DIAGRAM_SIMPLE.md  # System diagram
│   └── DEMO_WITH_LOOM_TIMESTAMPS.md    # Demo script
└── .github/workflows/           # 👈 CI/CD pipelines
    ├── ci-cd.yml                       # Deploy pipeline
    └── security-tests.yml              # Security automation
```

### Key Files by Feature

| Feature | Implementation Files | Tests | Documentation |
|---------|---------------------|-------|---------------|
| **CSRF Protection** | [backend/src/middleware/csrfProtection.ts](../backend/src/middleware/csrfProtection.ts) | [backend/tests/security.test.ts](../backend/tests/security.test.ts) | [SESSION_SECURITY_UPGRADE.md](SESSION_SECURITY_UPGRADE.md) |
| **Brute-Force Defense** | [backend/src/middleware/bruteForceProtection.ts](../backend/src/middleware/bruteForceProtection.ts) | [scripts/demo-security.js](../scripts/demo-security.js) | [SESSION_SECURITY_UPGRADE.md](SESSION_SECURITY_UPGRADE.md) |
| **Token Rotation** | [backend/src/services/refreshTokenService.ts](../backend/src/services/refreshTokenService.ts) | [backend/tests/security.test.ts](../backend/tests/security.test.ts) | [SESSION_SECURITY_UPGRADE.md](SESSION_SECURITY_UPGRADE.md) |
| **Rate Limiting** | [backend/src/routes/authRoutes.ts#L23](../backend/src/routes/authRoutes.ts#L23) | [scripts/verify-rate-limiting.js](../scripts/verify-rate-limiting.js) | [SECURITY_REVIEW.md](SECURITY_REVIEW.md) |
| **Signed URLs** | [backend/src/services/fileService.ts](../backend/src/services/fileService.ts) | [scripts/demo-storage.js](../scripts/demo-storage.js) | [SECURE_FILE_SHARING_POLICY.md](SECURE_FILE_SHARING_POLICY.md) |
| **File ACLs** | [backend/src/middleware/fileAccessMiddleware.ts](../backend/src/middleware/fileAccessMiddleware.ts) | [scripts/demo-storage.js](../scripts/demo-storage.js) | [SECURE_FILE_SHARING_POLICY.md](SECURE_FILE_SHARING_POLICY.md) |
| **Audit Logs** | [backend/src/models/AuditLog.ts](../backend/src/models/AuditLog.ts) | [scripts/verify-audit-logs.js](../scripts/verify-audit-logs.js) | [SECURITY_REVIEW.md](SECURITY_REVIEW.md) |
| **Security Headers** | [commerce-web/next.config.ts](../commerce-web/next.config.ts) | [scripts/validate-security-headers.js](../scripts/validate-security-headers.js) | [SECURITY_REVIEW.md](SECURITY_REVIEW.md) |

---

## Documentation Index

### 🚦 Start Here Documents
- **[README_START_HERE.md](README_START_HERE.md)** ← You are here!
- [KEY_FLOWS.md](KEY_FLOWS.md) - Request flow diagrams
- [ARCHITECTURE_DIAGRAM_SIMPLE.md](ARCHITECTURE_DIAGRAM_SIMPLE.md) - System architecture
- [DEMO_WITH_LOOM_TIMESTAMPS.md](DEMO_WITH_LOOM_TIMESTAMPS.md) - Demo script with timestamps

### 🔒 Security Documentation
- [SECURITY_REVIEW.md](SECURITY_REVIEW.md) - Threat model + decisions *(Required reading)*
- [SESSION_SECURITY_UPGRADE.md](SESSION_SECURITY_UPGRADE.md) - CSRF, brute-force, token rotation
- [SECURE_FILE_SHARING_POLICY.md](SECURE_FILE_SHARING_POLICY.md) - ACLs, share links, retention
- [SECURITY_TESTING_SUITE.md](SECURITY_TESTING_SUITE.md) - Test execution guide

### 📚 Feature Documentation
- [STRIPE_INTEGRATION_COMPLETE.md](../STRIPE_INTEGRATION_COMPLETE.md) - Payment setup
- [SUPABASE_EXPIRY_COMPLETE_STATUS.md](../SUPABASE_EXPIRY_COMPLETE_STATUS.md) - Storage integration
- [PRODUCT_SYSTEM_DOCUMENTATION_INDEX.md](../PRODUCT_SYSTEM_DOCUMENTATION_INDEX.md) - Product CRUD
- [COUPON_MODULE_DOCUMENTATION.md](SYSTEM_ORCHESTRATION_COMPLETE.md) - Coupon system

### 🔧 DevOps Documentation
- [CI_CD_SETUP_GUIDE.md](../CI_CD_SETUP_GUIDE.md) - GitHub Actions pipelines
- [GITHUB_SECRETS_SETUP_DETAILED.md](../GITHUB_SECRETS_SETUP_DETAILED.md) - Secret management
- [DOCKER_AND_ORCHESTRATION_GUIDE.md](SYSTEM_ORCHESTRATION_COMPLETE.md) - Docker setup
- [LOAD_TESTING_SETUP.md](../LOAD_TESTING_SETUP.md) - k6 load testing

### 🎬 Loom Recording Guides
- [LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md](../LOOM_BUNDLE_MOCK_PAYMENTS_DEMO.md) - Payment demo
- [LOOM_CICD_WALKTHROUGH.md](../LOOM_CICD_WALKTHROUGH.md) - CI/CD demo
- [LOOM_SECURE_FILE_SHARING.md](LOOM_SECURE_FILE_SHARING.md) - File security demo
- [LOOM_SESSION_SECURITY.md](LOOM_SESSION_SECURITY.md) - Auth security demo

### 📊 Project Status
- [FINAL_PROJECT_SUMMARY.md](../FINAL_PROJECT_SUMMARY.md) - Overall completion
- [COMPLETION_DASHBOARD.md](../COMPLETION_DASHBOARD.md) - Feature checklist
- [KNOWN_ISSUES_TODO.md](../KNOWN_ISSUES_TODO.md) - Known gaps & backlog

---

## Quick Commands Cheat Sheet

```bash
# Setup
npm install                       # Install all dependencies
npm run db:seed                   # Seed demo data

# Development
npm run dev                       # Start backend + frontend
npm run dev:docker                # Start full stack in Docker

# Testing
npm run test:security             # Run all security tests
npm run verify:security-headers   # Test CSP, X-Frame-Options
npm run verify:rate-limiting      # Test rate limits
npm run demo:storage              # Test signed URLs
npm run proof:audit-logs          # Test audit logging

# Demos
npm run demo:security             # Auth + CSRF + brute-force
npm run demo:storage              # File upload/download/expiry
npm run demo:preview              # Quick feature preview

# Database
npm run db:migrate                # Run Prisma migrations
npm run db:reset                  # Reset DB + reseed

# CI/CD (from repo root)
npm run ci:validate               # Trigger CI workflow locally
npm run ci:logs                   # View recent workflow runs
```

---

## Next Steps

1. ✅ **Run locally** → Follow [Run Locally](#run-locally)
2. ✅ **Test security** → Run `npm run test:security`
3. ✅ **Read flows** → Open [KEY_FLOWS.md](KEY_FLOWS.md)
4. ✅ **Review architecture** → Open [ARCHITECTURE_DIAGRAM_SIMPLE.md](ARCHITECTURE_DIAGRAM_SIMPLE.md)
5. ✅ **Understand security** → Read [SECURITY_REVIEW.md](SECURITY_REVIEW.md)
6. ✅ **Watch demo** → Follow [DEMO_WITH_LOOM_TIMESTAMPS.md](DEMO_WITH_LOOM_TIMESTAMPS.md)

---

**Need help?** Check [Troubleshooting](#troubleshooting) or open an issue on GitHub.

**Last Updated:** February 10, 2026
