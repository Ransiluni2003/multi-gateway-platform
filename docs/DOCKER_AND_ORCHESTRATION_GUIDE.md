# System Orchestration & Docker Setup Guide

## 🎯 Overview

This guide covers making the Multi-Gateway Platform runnable on any machine with one command, comprehensive Docker setup, seeding, testing, and the new Coupon/Promo Code feature.

---

## Task 1: Dockerization ✅

### Current State
- ✅ Multi-stage Dockerfile already exists for Next.js
- ✅ docker-compose.yml configured with services
- ✅ .env.example with environment variables
- ✅ .dockerignore for optimized builds

### File Structure
```
d:\multi-gateway-platform\
├── Dockerfile                    # Multi-stage Next.js build
├── docker-compose.yml            # Services: web, api, db, redis, etc.
├── .env.example                  # Environment template
├── .dockerignore
└── commerce-web/
    ├── Dockerfile                # Next.js app container
    └── prisma/schema.prisma      # Database schema
```

### Docker Compose Services
```yaml
services:
  web:           # Next.js commerce app (port 3001)
  api:           # Backend gateway (port 5002)
  payments:      # Payment service (port 4001)
  mock-payment:  # Mock gateway (port 5001)
  prometheus:    # Metrics (port 9090)
  redis:         # Cache & sessions
  mongo:         # Document database
```

---

## Task 2: One-Command Startup ✅

### Quick Start (30 seconds)

```bash
# 1. Clone repository
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform

# 2. Setup environment
cp .env.example .env

# 3. Start everything
npm run dev:docker
```

**What happens automatically:**
- Pulls/builds all Docker images
- Starts all services in correct dependency order
- Seeds demo products and coupons
- Opens app at http://localhost:3001

### Available npm Scripts

```bash
# Docker operations
npm run dev:docker           # Start all services (interactive logs)
npm run docker:up            # Start in background (-d)
npm run docker:down          # Stop services
npm run docker:restart       # Restart everything
npm run docker:logs          # View live logs
npm run docker:clean         # Remove containers & volumes

# Database operations
npm run db:migrate           # Run pending migrations
npm run db:migrate:deploy    # Deploy migrations to production
npm run db:seed              # Seed demo products
npm run db:reset             # Reset DB & seed (⚠️ destructive)

# Testing
npm run test:e2e             # Run Playwright tests
npm run test:webhooks        # Test webhook handling
npm run verify:docker        # Check Docker startup
```

---

## Task 3: Reviewer-Grade README

### How to Run Locally (Docker)

#### Prerequisites
- Docker & Docker Compose (install from [docker.com](https://www.docker.com/products/docker-desktop))
- Git
- Node.js 18+ (for scripts)

#### Setup Steps

**Step 1: Clone & Configure**
```bash
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform
cp .env.example .env
```

**Step 2: Update Stripe Keys (Optional for Mock Payments)**

Edit `.env` with your Stripe test keys:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Get these from [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)

**Step 3: Start Application**
```bash
npm run dev:docker
```

**Step 4: Access Application**
- 🌐 Commerce App: http://localhost:3001
- 📊 Prometheus Metrics: http://localhost:9090
- 💳 Mock Payments: http://localhost:5001

### Demo Data

The application automatically seeds with:
- ✅ **6 Demo Products** (electronics, software, etc.)
- ✅ **Demo Coupons**:
  - `SAVE10` — 10% off (expires in 30 days)
  - `SUMMER20` — $20 off (expires in 14 days)
  - `WELCOME5` — 5% new customer discount (unlimited)
  - `BULK15` — 15% bulk discount
  - `EXPIRED` — Demo expired coupon (test error handling)
  - `INACTIVE` — Demo disabled coupon

### Verify Installation

```bash
# Check all services are healthy
npm run verify:docker

# Output should show:
# ✅ Web service responding
# ✅ API service responding
# ✅ Database connected
# ✅ Redis connected
```

---

## E2E Testing

### Run All Tests
```bash
npm run test:e2e
```

### Test Specific Feature
```bash
# Test checkout flow
npm run test:e2e -- checkout

# Test product CRUD
npm run test:e2e -- products

# Test orders
npm run test:e2e -- orders
```

### Test Webhook Handling
```bash
# Simulate Stripe webhook events
npm run test:webhooks
```

**Tests cover:**
- ✅ Product listing & filtering
- ✅ Add to cart / Update quantities
- ✅ Coupon validation & application
- ✅ Checkout form validation
- ✅ Order creation
- ✅ Webhook idempotency

---

## Task 4: New Feature — Coupon/Promo Code Module 🎁

### Feature Overview
Customers can apply discount codes at checkout. Admins can create, manage, and disable coupons.

### Database Schema

```prisma
model Coupon {
  code              String   @id      // "SAVE10", "SUMMER20"
  type              String             // "percent" or "amount"
  value             Float              // 10 (for 10%) or 20 (for $20)
  expiresAt         DateTime?
  maxRedemptions    Int?               // null = unlimited
  redemptionCount   Int    @default(0) // Current uses
  isActive          Boolean @default(true)
  description       String?            // "Summer sale - 20% off"
  orders            Order[]            // Relationship to orders using this coupon
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// Updated Order model includes:
model Order {
  // ... existing fields
  couponCode        String?            // References Coupon.code
  coupon            Coupon?  @relation(...)
  subtotal          Float              // Before discount
  discountAmount    Float @default(0)  // Discount applied
  total             Float              // After discount
}
```

### API Endpoints

#### Customer: Validate Coupon
```bash
POST /api/coupons/validate
Content-Type: application/json

{
  "code": "SAVE10",
  "subtotal": 99.99
}

# Response: 200 OK
{
  "valid": true,
  "code": "SAVE10",
  "type": "percent",
  "value": 10,
  "description": "10% off your purchase",
  "subtotal": 99.99,
  "discountAmount": 10.00,
  "total": 89.99
}

# Response: 400 Bad Request (invalid/expired/maxed out)
{
  "valid": false,
  "error": "Coupon has expired"
}
```

#### Admin: Create Coupon
```bash
POST /api/admin/coupons
Content-Type: application/json

{
  "code": "BLACKFRIDAY",
  "type": "percent",
  "value": 25,
  "description": "Black Friday Sale - 25% off everything",
  "maxRedemptions": 500,
  "expiresAt": "2024-12-01T23:59:59Z"
}

# Response: 201 Created
{
  "code": "BLACKFRIDAY",
  "type": "percent",
  "value": 25,
  "description": "Black Friday Sale - 25% off everything",
  "maxRedemptions": 500,
  "redemptionCount": 0,
  "isActive": true,
  "expiresAt": "2024-12-01T23:59:59Z",
  "createdAt": "2024-11-15T10:30:00Z"
}
```

#### Admin: List All Coupons
```bash
GET /api/admin/coupons

# Response: 200 OK
[
  {
    "code": "SAVE10",
    "type": "percent",
    "value": 10,
    "redemptionCount": 45,
    "maxRedemptions": 100,
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  ...
]
```

#### Admin: Update Coupon
```bash
PATCH /api/admin/coupons/SAVE10
Content-Type: application/json

{
  "isActive": false,
  "description": "Updated description"
}
```

#### Admin: Disable Coupon (Soft Delete)
```bash
DELETE /api/admin/coupons/SAVE10

# Response: 200 OK
{
  "message": "Coupon disabled",
  "code": "SAVE10"
}
```

### Frontend Components

#### CouponApplier Component
Located: `src/components/CouponApplier.tsx`

**Props:**
```typescript
interface CouponApplierProps {
  subtotal: number;
  onCouponApplied: (discount: CouponResult) => void;
  onCouponRemoved: () => void;
}
```

**Features:**
- Real-time coupon validation
- Shows discount breakdown
- Error messages (expired, invalid, maxed out)
- Remove applied coupon
- Accessible & responsive UI

**Usage in Checkout:**
```tsx
<CouponApplier
  subtotal={total / 100}
  onCouponApplied={(coupon) => {
    setAppliedCoupon(coupon);
    setDiscountAmount(coupon.discountAmount);
  }}
  onCouponRemoved={() => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  }}
/>
```

#### Admin Coupon Management Page
Located: `src/app/admin/coupons/page.tsx`

**Features:**
- ✅ List all coupons with status
- ✅ Create new coupon (dialog form)
- ✅ View redemption progress
- ✅ Disable coupons
- ✅ Filter by active/inactive
- ✅ Sort by creation date

**Access:** http://localhost:3001/admin/coupons

### Workflow: Apply Coupon at Checkout

```
1. User adds items to cart
2. On checkout page, sees "Have a Promo Code?" card
3. Enters coupon code: "SAVE10"
4. Clicks "Apply"
   ↓
5. Frontend calls POST /api/coupons/validate
   ├─ Checks: exists, active, not expired, redemption limit
   ├─ Calculates discount: 10% of $99.99 = $10.00
   └─ Returns: subtotal $99.99 → discount $10.00 → total $89.99
6. UI updates:
   ├─ Shows "✓ SAVE10: 10% off your purchase"
   ├─ Shows "Discount: -$10.00" in red
   └─ Updates total to $89.99
7. User clicks "Place Order"
   ↓
8. POST /api/orders includes:
   {
     "couponCode": "SAVE10",
     "discountAmount": 10.00,
     "subtotal": 99.99,
     "total": 89.99
   }
9. Backend:
   ├─ Creates Order with couponCode & discountAmount
   ├─ Increments Coupon.redemptionCount
   └─ Processes payment for $89.99
10. Order confirms with coupon on receipt
```

### Error Handling

**Invalid coupon:**
```
❌ Coupon not found
```

**Expired coupon:**
```
❌ Coupon has expired
```

**Redemption limit reached:**
```
❌ Coupon redemption limit reached
(45/50 used)
```

**Coupon disabled:**
```
❌ Coupon is inactive
```

**All errors return 400 Bad Request** with user-friendly messages.

---

## Seed Script

### Demo Data Seeding

```bash
# Seed products only
npm run db:seed:products

# Seed demo orders (for testing)
npm run db:seed:orders

# Run full seed (products + coupons)
npm run db:seed
```

### Coupon Seed Data

Script: `commerce-web/scripts/seed-coupons.js`

**Demo coupons created:**
```
✓ SAVE10: 10% off - 10% off your purchase (max: 100) - Expires: 2/28/2026
✓ SUMMER20: $20 off - $20 off orders over $50 (max: 50) - Expires: 2/12/2026
✓ WELCOME5: 5% off - 5% welcome discount (new customers) - No expiry
✓ BULK15: 15% off - 15% off bulk orders (max: 25) - Expires: 3/30/2026
✗ EXPIRED: 30% off - This coupon is expired (demo) - Expires: 1/28/2026
✗ INACTIVE: $50 off - This coupon is inactive (demo) - Expires: 2/28/2026
```

---

## Testing the Coupon Feature

### Manual Testing Steps

**1. Test Valid Coupon:**
```bash
# Start app
npm run dev:docker

# Visit http://localhost:3001/checkout
# Add items to cart
# Enter "SAVE10" at checkout
# Verify: 10% discount applied ✅
```

**2. Test Expired Coupon:**
```bash
# Enter "EXPIRED"
# Should see: "Coupon has expired"
# Discount not applied ✅
```

**3. Test Redemption Limit:**
```bash
# Create coupon with maxRedemptions: 1
# Place order with this coupon
# Place second order with same coupon
# Should see: "Coupon redemption limit reached"
# Second order fails ✅
```

**4. Test Coupon Management:**
```bash
# Visit http://localhost:3001/admin/coupons
# Create new coupon: "NEWYEAR25" (25% off)
# Verify coupon appears in list ✅
# Disable coupon
# Try to apply at checkout → Should fail ✅
```

### E2E Test Suite

```bash
npm run test:e2e -- coupon
```

**Tests cover:**
- ✅ Valid coupon application
- ✅ Invalid coupon error
- ✅ Expired coupon rejection
- ✅ Discount calculation (percent & amount)
- ✅ Order total updated correctly
- ✅ Admin coupon CRUD
- ✅ Coupon redemption counting

---

## Troubleshooting

### Issue: Docker containers not starting
```bash
# Check logs
npm run docker:logs

# Restart containers
npm run docker:restart

# Full clean and restart
npm run docker:clean && npm run dev:docker
```

### Issue: Database connection failed
```bash
# Reset database
npm run db:reset

# Verify connection
npm run verify:docker
```

### Issue: Port already in use
```bash
# Find process using port (e.g., 3001)
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or use different port in .env
```

### Issue: Coupon validation endpoint returns 500
```bash
# Check prisma client is initialized
# Verify .env has DATABASE_URL
# Run migrations
npm run db:migrate
```

---

## Production Deployment Checklist

- [ ] Update `.env` with production secrets
- [ ] Run `npm run db:migrate:deploy`
- [ ] Verify STRIPE_SECRET_KEY is set
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure Redis for session persistence
- [ ] Setup monitoring/alerts
- [ ] Test webhook delivery
- [ ] Verify coupon expiry logic
- [ ] Setup database backups
- [ ] Test failover procedures
- [ ] Review security headers

---

## Summary

| Task | Status | Notes |
|------|--------|-------|
| Dockerize App | ✅ Complete | Multi-stage, production-ready |
| One-Command Startup | ✅ Complete | `npm run dev:docker` |
| Updated README | ✅ Complete | Comprehensive setup guide |
| Coupon Feature | ✅ Complete | Full CRUD + checkout integration |

**Next Steps:**
1. Run `npm run dev:docker` to verify everything works
2. Visit http://localhost:3001 and test checkout
3. Use coupon code "SAVE10" for 10% discount
4. Admin panel at http://localhost:3001/admin/coupons

---

**Last Updated:** January 29, 2026  
**Maintained By:** Platform Development Team
