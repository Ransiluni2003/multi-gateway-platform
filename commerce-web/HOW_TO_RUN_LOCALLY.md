# 🚀 How to Run Locally - Complete Guide

This guide helps reviewers run and test the complete e-commerce system with webhook idempotency.

---

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd d:\multi-gateway-platform\commerce-web
npm install
```

### 2. Setup Database
```bash
# Run migrations
npx prisma migrate dev

# Seed demo data (products + orders with all statuses)
npm run seed
```

### 3. Start Development Server
```bash
npm run dev
```

Server will start at **http://localhost:3000**

### 4. View the Application
- **Products:** http://localhost:3000/products
- **Orders:** http://localhost:3000/orders
- **Checkout:** Add product to cart → Click checkout

---

## 🧪 Testing Commands

### Run All Tests
```bash
# E2E tests (Playwright)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Webhook tests (all 3 event types)
npm run test:webhooks

# Webhook idempotency demo
npm run demo:webhooks
```

### Seed Data
```bash
# Seed everything (products + orders)
npm run seed

# Seed only products
npm run seed:products

# Seed only orders
npm run seed:orders
```

---

## 📋 Complete Workflow Test

### Step 1: Seed Database
```bash
npm run seed
```

**Expected result:**
- 6 products created
- 4 orders created with different statuses:
  - 1 PENDING (yellow)
  - 1 COMPLETED (green)
  - 1 FAILED (red)
  - 1 REFUNDED (blue)

### Step 2: View Orders
Open: **http://localhost:3000/orders**

**Expected result:**
- See all 4 orders with color-coded status chips
- No manual database queries needed
- UI reflects database state

### Step 3: Test Webhooks
```bash
npm run test:webhooks
```

**Expected result:**
- ✅ payment_intent.succeeded → order becomes COMPLETED
- ✅ payment_intent.payment_failed → order becomes FAILED
- ✅ charge.refunded → order becomes REFUNDED
- ✅ Idempotency test: replayed webhook doesn't duplicate update

### Step 4: Verify in UI
Refresh: **http://localhost:3000/orders**

**Expected result:**
- Order statuses updated based on webhook events
- Different colored chips visible
- Payment information shown (charge IDs, refund amounts)

---

## 🎯 Key Features to Review

### 1. Webhook Idempotency
**Test:** Send the same webhook twice with identical event ID

```bash
# The test:webhooks script automatically tests this
npm run test:webhooks
```

**Expected behavior:**
- First webhook: Order status changes
- Second webhook (same event ID): Order status unchanged
- Server logs: "⏭️ Event already processed"
- WebhookEvent table: Only 1 record for that event ID

### 2. Status Transition Rules
**Valid transitions:**
- `pending → completed` ✅
- `pending → failed` ✅
- `completed → refunded` ✅

**Invalid transitions (rejected):**
- `failed → completed` ❌
- `refunded → completed` ❌
- `* → pending` ❌

**Test:** The webhook test script validates these automatically

### 3. Orders Page
**Features:**
- Real database integration (Prisma + SQLite)
- Color-coded status chips
- Payment information display
- Refresh button
- Responsive design

**Test:** Navigate to http://localhost:3000/orders after seeding

### 4. Checkout Flow
**Test:**
1. Go to http://localhost:3000/products
2. Click "Add to Cart" on any product
3. Click cart icon → "Go to Checkout"
4. Fill form (use: test@example.com)
5. Click "Place Order"
6. Order appears in /orders with "PENDING" status

### 5. Cart Persistence
**Test:**
- Add items to cart
- Navigate away
- Come back → cart items still there (localStorage)

---

## 🔍 Manual Webhook Testing (CLI)

If you want to test webhooks manually:

### Option 1: Using Stripe CLI (Recommended)
```bash
stripe trigger payment_intent.succeeded
```

### Option 2: Using curl
```bash
# Replace YOUR_ORDER_ID with actual order ID
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_manual_test_123",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "metadata": { "orderId": "YOUR_ORDER_ID" },
        "latest_charge": "ch_test_123"
      }
    }
  }'
```

### Option 3: Using PowerShell
```powershell
$orderId = "YOUR_ORDER_ID"
$eventId = "evt_test_" + [DateTimeOffset]::Now.ToUnixTimeSeconds()
$body = @{
    id = $eventId
    type = "payment_intent.succeeded"
    data = @{
        object = @{
            id = "pi_test_123"
            metadata = @{ orderId = $orderId }
            latest_charge = "ch_test_123"
        }
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/stripe" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

## 📊 Database Inspection (Optional)

If you want to inspect the database directly:

```bash
# Open Prisma Studio
npx prisma studio
```

This opens a UI at http://localhost:5555 where you can browse:
- Products
- Orders
- Payments
- WebhookEvents (idempotency tracking)
- OrderItems

**However:** The goal is that you DON'T need this - the UI should show everything!

---

## 🎓 E2E Test Coverage

The E2E tests cover:

1. **Checkout Flow**
   - Product browsing
   - Add to cart
   - Cart persistence
   - Checkout form validation
   - Order creation

2. **Order Status Updates**
   - Webhook → database update
   - UI reflects changes
   - No manual DB inspection needed

3. **Admin View**
   - Orders list shows all statuses
   - Payment information visible
   - Refresh functionality

**Run tests:**
```bash
npm run test:e2e
```

---

## 🐛 Troubleshooting

### Server won't start
**Check:**
```bash
# Kill any existing process on port 3000
npx kill-port 3000

# Try again
npm run dev
```

### Database errors
**Solution:**
```bash
# Reset database
npx prisma migrate reset

# Reseed
npm run seed
```

### Webhook tests failing
**Check:**
1. Is server running? (npm run dev)
2. Did you seed data? (npm run seed)
3. Check server logs for errors

### Orders page empty
**Solution:**
```bash
# Seed demo data
npm run seed

# Or create orders manually through UI
```

---

## 📦 Project Structure

```
commerce-web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── orders/          # Order API endpoints
│   │   │   └── webhooks/stripe/ # Webhook handler (idempotency here)
│   │   ├── orders/              # Orders admin page
│   │   ├── products/            # Products page
│   │   └── checkout/            # Checkout flow
│   ├── components/              # React components
│   ├── context/                 # Cart context
│   └── lib/
│       ├── stripe-utils.ts      # Webhook logic + idempotency
│       └── prisma.ts            # Database client
├── prisma/
│   ├── schema.prisma            # Database schema (WebhookEvent model)
│   └── migrations/              # Database migrations
├── scripts/
│   ├── seed-demo-data.js        # Complete seed script
│   ├── test-all-webhooks.js     # Webhook test suite
│   └── create-test-orders-api.js # Order creation utility
└── tests/
    └── e2e/                     # Playwright E2E tests
```

---

## 🎯 What to Review

### 1. Idempotency Implementation
**Files:**
- `src/lib/stripe-utils.ts` (lines 10-75, 155-260)
- `prisma/schema.prisma` (lines 113-126 - WebhookEvent model)

**Test:** Run `npm run test:webhooks` and verify:
- Same webhook sent twice → only processes once
- WebhookEvent table has 1 record (not 2)

### 2. Status Transition Rules
**Files:**
- `src/lib/stripe-utils.ts` (lines 16-30 - VALID_STATUS_TRANSITIONS)

**Test:** Run `npm run test:webhooks` and verify:
- Valid transitions work (pending → completed)
- Invalid transitions rejected (failed → completed)

### 3. Complete Workflow
**Test:**
1. Seed: `npm run seed`
2. View: http://localhost:3000/orders (4 orders with different statuses)
3. Webhook: `npm run test:webhooks`
4. Refresh UI: Statuses updated, no DB inspection needed

### 4. Documentation
**Files:**
- `PR_IDEMPOTENCY_WEBHOOK_SAFETY.md` - Full PR description
- `IDEMPOTENCY_COMPLETE.md` - Implementation summary
- `QUICK_DEMO_TODAY.md` - 5-minute demo guide

---

## ⏱️ Time Estimates

- **Initial setup:** 5 minutes
- **Seed + view UI:** 2 minutes
- **Run webhook tests:** 2 minutes
- **Manual testing:** 5 minutes
- **Code review:** 15 minutes

**Total:** ~30 minutes for complete review

---

## 🎥 Loom Recording Checklist

For the required Loom video, demonstrate:

1. **Setup** (1 min)
   - Run `npm install`
   - Run `npm run seed`
   - Show seeded products/orders in UI

2. **Test Commands** (2 min)
   - Run `npm run test:webhooks`
   - Show all 3 webhook types tested
   - Show idempotency verification

3. **UI Verification** (2 min)
   - Open http://localhost:3000/orders
   - Show 4 orders with different colored statuses
   - Show payment details
   - Demonstrate that UI reflects database state

4. **Webhook → UI Flow** (2 min)
   - Create pending order
   - Run webhook test
   - Refresh /orders page
   - Show status changed (e.g., pending → completed)
   - Show no manual DB queries needed

**Total Loom Time:** ~7 minutes

---

## 📞 Support

If you encounter issues:

1. Check terminal logs for errors
2. Verify all dependencies installed (`npm install`)
3. Ensure port 3000 is available
4. Try resetting database: `npx prisma migrate reset && npm run seed`

---

## ✅ Success Criteria

After following this guide, you should be able to:

- [x] Start the application locally
- [x] See seeded products and orders
- [x] Run webhook tests successfully
- [x] Verify idempotency (replayed webhooks skipped)
- [x] See all status transitions in UI
- [x] Confirm status rules enforced
- [x] Complete checkout flow
- [x] No manual database inspection needed

**Everything works through the UI!** 🎉

