# Task 3: Orders Page Hardening - Complete Demo Guide

## Overview
This guide demonstrates that the /orders page:
- ✅ Reads from real DB data (Prisma ORM with SQLite)
- ✅ Shows correct status labels (pending, completed, failed, refunded)
- ✅ Updates after webhook events
- ✅ Handles all status states cleanly with proper color coding

## Prerequisites
```powershell
cd d:\multi-gateway-platform\commerce-web
npm run dev
```
Server should be running on http://localhost:3000

## Demo Flow: Create Orders with Multiple Status States

### Step 1: Create Test Orders Script

Save this as `create-test-orders.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestOrders() {
  try {
    // 1. Create a test product
    const product = await prisma.product.upsert({
      where: { id: 'test-product-demo' },
      update: {},
      create: {
        id: 'test-product-demo',
        name: 'Demo Test Product',
        description: 'For orders demo',
        price: 2999, // $29.99
        images: '[]',
        stock: 100,
        status: 'active',
      },
    });

    console.log('✅ Test product created:', product.name);

    // 2. Create PENDING order
    const order1 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'pending',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order1.id,
        stripePaymentIntentId: `pi_pending_${order1.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'pending',
      },
    });

    console.log('✅ PENDING order created:', order1.id);

    // 3. Create COMPLETED order
    const order2 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'completed',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order2.id,
        stripePaymentIntentId: `pi_success_${order2.id}`,
        stripeChargeId: `ch_success_${order2.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'succeeded',
        lastWebhookEvent: 'payment_intent.succeeded',
      },
    });

    console.log('✅ COMPLETED order created:', order2.id);

    // 4. Create FAILED order
    const order3 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'failed',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order3.id,
        stripePaymentIntentId: `pi_failed_${order3.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'failed',
        lastWebhookEvent: 'payment_intent.payment_failed',
      },
    });

    console.log('✅ FAILED order created:', order3.id);

    // 5. Create REFUNDED order
    const order4 = await prisma.order.create({
      data: {
        email: 'demo@test.com',
        firstName: 'Demo',
        lastName: 'User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        total: 2999,
        status: 'refunded',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 2999,
          },
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order4.id,
        stripePaymentIntentId: `pi_refunded_${order4.id}`,
        stripeChargeId: `ch_refunded_${order4.id}`,
        amount: 29.99,
        currency: 'usd',
        status: 'refunded',
        refundAmount: 29.99,
        refundedAt: new Date(),
        lastWebhookEvent: 'charge.refunded',
      },
    });

    console.log('✅ REFUNDED order created:', order4.id);

    console.log('\n📊 Summary:');
    console.log('4 orders created with different statuses:');
    console.log(`  - PENDING:   ${order1.id}`);
    console.log(`  - COMPLETED: ${order2.id}`);
    console.log(`  - FAILED:    ${order3.id}`);
    console.log(`  - REFUNDED:  ${order4.id}`);
    console.log('\n👉 Visit http://localhost:3000/orders to view them!');
  } catch (error) {
    console.error('❌ Error creating test orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrders();
```

### Step 2: Run Test Data Creation

```powershell
cd d:\multi-gateway-platform\commerce-web
node create-test-orders.js
```

Expected output:
```
✅ Test product created: Demo Test Product
✅ PENDING order created: clxxx...
✅ COMPLETED order created: clyyy...
✅ FAILED order created: clzzz...
✅ REFUNDED order created: claaa...

📊 Summary:
4 orders created with different statuses:
  - PENDING:   clxxx...
  - COMPLETED: clyyy...
  - FAILED:    clzzz...
  - REFUNDED:  claaa...

👉 Visit http://localhost:3000/orders to view them!
```

### Step 3: View Orders Page

1. Navigate to http://localhost:3000/orders
2. Verify you see all 4 orders displayed with:
   - ⚠️ **PENDING** - Yellow/Warning chip
   - ✅ **COMPLETED** - Green/Success chip
   - ❌ **FAILED** - Red/Error chip
   - 🔄 **REFUNDED** - Blue/Info chip

3. Click on each order to expand and verify:
   - Order items table shows product, price, quantity
   - Total matches expected amount ($29.99)
   - Shipping address is correct
   - **Payment Information section shows:**
     - Payment status chip
     - Stripe Charge ID (for completed/refunded)
     - Refund amount and date (for refunded orders)

### Step 4: Test Webhook Updates

Test that webhook events properly update the order status:

```powershell
# Get the PENDING order ID from step 2 output
$pendingOrderId = "PASTE_PENDING_ORDER_ID_HERE"

# Simulate payment success webhook
$payload = @{
  id = "evt_demo_success"
  type = "payment_intent.succeeded"
  data = @{
    object = @{
      id = "pi_pending_$pendingOrderId"
      amount = 2999
      status = "succeeded"
      metadata = @{ orderId = $pendingOrderId }
      charges = @{ data = @( @{ id = "ch_demo_success" } ) }
    }
  }
} | ConvertTo-Json -Depth 10

$secret = (Get-Content .env.local | Select-String "STRIPE_WEBHOOK_SECRET").ToString().Split('=')[1].Trim('"')
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$signedPayload = "$timestamp.$payload"
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($secret)
$hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($signedPayload))
$signature = [BitConverter]::ToString($hash).Replace('-','').ToLower()
$stripeSignature = "t=$timestamp,v1=$signature"

Invoke-WebRequest -Uri "http://localhost:3000/api/webhooks/stripe" `
  -Method POST `
  -Headers @{"stripe-signature"=$stripeSignature; "Content-Type"="application/json"} `
  -Body $payload
```

Expected:
- Response: 200 OK
- Server console logs: `✅ Payment succeeded for order clxxx...`

### Step 5: Verify Real-Time Update

1. Go back to http://localhost:3000/orders
2. Click **Refresh** button
3. Verify the previously PENDING order now shows:
   - Status: **COMPLETED** (green chip)
   - Payment Information section appears
   - Charge ID: `ch_demo_success`

## Verification Checklist

- [ ] Orders page displays at http://localhost:3000/orders
- [ ] Page shows "4 orders found" count
- [ ] All 4 status types displayed correctly:
  - [ ] PENDING (yellow)
  - [ ] COMPLETED (green)
  - [ ] FAILED (red)
  - [ ] REFUNDED (blue)
- [ ] Clicking order expands accordion with full details
- [ ] Order items table shows product, price, qty, subtotal
- [ ] Shipping address displays correctly
- [ ] Payment Information section shows:
  - [ ] Payment status chip
  - [ ] Charge ID for successful payments
  - [ ] Refund amount and date for refunds
- [ ] Refresh button fetches latest data
- [ ] Webhook event updates order status in DB
- [ ] Refreshing page shows updated status after webhook

## Database Verification (Optional)

Check DB directly:

```powershell
cd d:\multi-gateway-platform\commerce-web
npx prisma studio
```

Navigate to:
- **Order** table: Verify 4 orders with different status values
- **Payment** table: Verify payment records linked to orders
- **OrderItem** table: Verify items linked to orders

## Screenshots for Supervisor

Take screenshots showing:
1. **Orders list view** - All 4 orders with different colored status chips
2. **Expanded COMPLETED order** - Showing payment information with charge ID
3. **Expanded REFUNDED order** - Showing refund amount and date
4. **Browser DevTools Network tab** - Showing `/api/orders` response with real DB data
5. **Webhook POST response** - 200 OK from status update
6. **After refresh** - Updated status from webhook event

## Live Demo Script (for Loom)

1. **Intro** (10s): "Demonstrating Orders Page Hardening - Task 3"
2. **Show orders page** (20s): Navigate to /orders, point out 4 orders with different statuses
3. **Expand each order** (40s): Click through each order, highlight status chips and payment info
4. **Show DB proof** (15s): Open DevTools Network tab, show /api/orders JSON response
5. **Trigger webhook** (30s): Run PowerShell webhook command, show 200 OK response
6. **Verify update** (20s): Click Refresh button, show status changed from pending to completed
7. **Outro** (10s): "All status states handled cleanly, updates work via webhooks"

Total: ~2.5 minutes

## Implementation Highlights

**Files Modified:**
- `/src/app/orders/page.tsx` - Added payment info display, refresh button
- `/src/lib/stripe-utils.ts` - Webhook handlers update Order.status (completed/failed/refunded)
- `/src/app/api/orders/route.ts` - GET endpoint includes payment relation

**Status Flow:**
1. Order created → `status: 'pending'`
2. Payment succeeds → webhook → `status: 'completed'`
3. Payment fails → webhook → `status: 'failed'`
4. Charge refunded → webhook → `status: 'refunded'`

**DB Schema:**
```prisma
model Order {
  id        String   @id @default(cuid())
  status    String   // pending | completed | failed | refunded
  payment   Payment? @relation(...)
  items     OrderItem[]
  ...
}

model Payment {
  id                    String   @id @default(cuid())
  orderId               String   @unique
  status                String   // pending | succeeded | failed | refunded
  stripePaymentIntentId String   @unique
  stripeChargeId        String?
  refundAmount          Float?
  refundedAt            DateTime?
  lastWebhookEvent      String?
  ...
}
```

## Notes
- All data read from Prisma database (dev.db)
- Webhook signature validation ensures authenticity
- Real-time updates via webhook events
- Clean UI with MUI components and color-coded status chips
- Payment details only shown when available (not for pending orders without payment intent)
