# Complete Stripe Webhooks Implementation - Walkthrough

## 📚 Overview

This document provides a complete walkthrough of the Stripe webhook implementation for the commerce platform. The system automatically updates orders and payments when Stripe events occur.

---

## 🎯 What Was Implemented

### Three Critical Webhook Events

1. **`payment_intent.succeeded`** - Payment completed successfully
2. **`payment_intent.payment_failed`** - Payment failed (card declined, insufficient funds, etc.)
3. **`charge.refunded`** - Refund has been processed

### Database Tracking

Each webhook event is tracked with:
- Event type (`lastWebhookEvent`)
- Timestamp (`lastWebhookTime`)
- Status updates
- Transaction IDs and refund information

### Order Lifecycle Management

```
User creates order → pending
         ↓
Payment processed → Stripe webhook received
         ↓
Webhook updates database → Order status changes
         ↓
Customer notified → Transaction complete
```

---

## 🔧 Technical Architecture

### Endpoint Structure

```
/api/webhooks/stripe  (POST)
    ↓
Verify signature
    ↓
Parse event type
    ↓
Route to handler
    ↓
Update database
    ↓
Return 200 OK
```

### Event Processing Flow

```typescript
// Step 1: Receive webhook
POST /api/webhooks/stripe with Stripe-Signature header

// Step 2: Verify signature (security)
verifyWebhookSignature(body, signature, secret)

// Step 3: Parse event type
switch(event.type) {
  case 'payment_intent.succeeded':    // Success handler
  case 'payment_intent.payment_failed': // Failure handler
  case 'charge.refunded':              // Refund handler
}

// Step 4: Update database
prisma.payment.update()
prisma.order.update()

// Step 5: Return success
HTTP 200 { success: true }
```

---

## 📋 Implementation Files

### Core Files

| File | Purpose | Key Functions |
|------|---------|----------------|
| `src/app/api/webhooks/stripe/route.ts` | Webhook endpoint | POST handler for webhook requests |
| `src/lib/stripe-utils.ts` | Event handlers | `handleStripeWebhook()`, `verifyWebhookSignature()` |
| `src/lib/stripe.ts` | Stripe SDK | Initializes Stripe client |
| `src/app/api/payment-intent/route.ts` | Payment creation | `createPaymentIntent()` |
| `prisma/schema.prisma` | Database schema | Order, Payment, OrderItem models |

### Documentation

| File | Content |
|------|---------|
| `STRIPE_WEBHOOKS_IMPLEMENTATION.md` | Detailed implementation guide |
| `STRIPE_WEBHOOKS_QUICK_REFERENCE.md` | Quick start and troubleshooting |
| `COMPLETE_WALKTHROUGH.md` | This file |

### Test Utilities

| File | Purpose |
|------|---------|
| `scripts/test-webhooks.js` | Simulate webhook events locally |
| `scripts/demo-order-flow.js` | Demo complete order flow |
| `scripts/verify-setup.js` | Verify all components configured |

---

## 🚀 Getting Started (Step-by-Step)

### Step 1: Verify Installation
```bash
node scripts/verify-setup.js
```

This checks:
- All files exist
- Dependencies installed
- Database schema configured
- Environment variables ready

### Step 2: Get Stripe Credentials

Visit [Stripe Dashboard](https://dashboard.stripe.com):

1. **API Keys** (Developers → API Keys):
   - Copy "Publishable Key" (starts with `pk_test_`)
   - Copy "Secret Key" (starts with `sk_test_`)

2. **Webhook Signing Secret** (Developers → Webhooks):
   - Add endpoint with URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - Copy "Signing secret" (starts with `whsec_`)

### Step 3: Configure Environment

**Option A: Using Stripe CLI (Recommended for Local Dev)**

```bash
# 1. Install Stripe CLI
# Go to: https://stripe.com/docs/stripe-cli

# 2. Login to your Stripe account
stripe login

# 3. Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 4. Terminal will display webhook signing secret
# Copy it and add to .env:
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Option B: Manual Configuration**

Create `.env` file:
```dotenv
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 4: Start Development Server

```bash
npm run dev
```

Your server is now running at `http://localhost:3000`

### Step 5: Initialize Database (if needed)

```bash
npx prisma migrate dev
npx prisma db seed
```

---

## 🧪 Testing the Implementation

### Test 1: Signature Verification

The endpoint validates every webhook using Stripe's signature method:

```typescript
// ✅ Valid signature → Webhook processed
// ❌ Invalid signature → 400 Bad Request

POST /api/webhooks/stripe
Headers: {
  'stripe-signature': 't=1234567890,v1=abc123xyz...'
}
```

### Test 2: Event Handling

Test each event type:

```bash
# Payment succeeded
node scripts/test-webhooks.js \
  --event payment_intent.succeeded \
  --orderId order_123 \
  --secret whsec_xxxxx

# Payment failed
node scripts/test-webhooks.js \
  --event payment_intent.payment_failed \
  --orderId order_123 \
  --secret whsec_xxxxx

# Refund processed
node scripts/test-webhooks.js \
  --event charge.refunded \
  --orderId order_123 \
  --secret whsec_xxxxx
```

### Test 3: Database Updates

After sending a webhook, verify database:

```bash
# Check payment status
SELECT * FROM Payment WHERE orderId = 'order_123';

# Check order status
SELECT * FROM Order WHERE id = 'order_123';

# Verify webhook tracking
SELECT lastWebhookEvent, lastWebhookTime FROM Payment WHERE orderId = 'order_123';
```

Expected results:

| Event | Payment Status | Order Status | Notes |
|-------|----------------|--------------|-------|
| `payment_intent.succeeded` | `succeeded` | `completed` | Payment successful |
| `payment_intent.payment_failed` | `failed` | `failed` | Card declined |
| `charge.refunded` | `refunded` | `refunded` | Refund processed |

### Test 4: With Real Payment Flow

Using test card numbers:

```
✅ Success:      4242 4242 4242 4242
❌ Decline:      4000 0000 0000 0002
🔄 Refundable:   4000 0000 0000 0069

Expiry: Any future date (e.g., 12/25)
CVC:    Any 3 digits (e.g., 123)
```

Flow:
1. Create order via API or UI
2. Get `clientSecret` from payment intent endpoint
3. Submit payment with test card
4. Stripe processes payment
5. Webhook automatically sent to your endpoint
6. Database updates automatically
7. Order status changes to `completed` or `failed`

---

## 📊 Database Schema

### Payment Table

```prisma
model Payment {
  id                      String    @id @default(cuid())
  orderId                 String    @unique
  order                   Order     @relation(fields: [orderId], references: [id])
  
  // Stripe Info
  stripePaymentIntentId   String    @unique
  stripeChargeId          String?
  
  // Payment Details
  amount                  Float
  currency                String    @default("usd")
  status                  String    // "pending", "succeeded", "failed", "refunded"
  
  // Webhook Tracking
  lastWebhookEvent        String?   // "payment_intent.succeeded", etc.
  lastWebhookTime         DateTime?
  
  // Refund Info
  refundAmount            Float     @default(0)
  refundReason            String?
  refundedAt              DateTime?
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

model Order {
  id                      String    @id @default(cuid())
  email                   String
  total                   Float
  status                  String    // "pending", "completed", "failed", "refunded"
  
  // Stripe Integration
  stripePaymentIntentId   String?   @unique
  stripeTransactionId     String?
  
  // Customer Info
  firstName               String
  lastName                String
  address                 String
  city                    String
  state                   String
  zipCode                 String
  country                 String
  
  // Relations
  items                   OrderItem[]
  payment                 Payment?
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}
```

---

## 🔍 Webhook Event Details

### Event 1: payment_intent.succeeded

**Trigger:** Payment successfully processed

**Payload Example:**
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "status": "succeeded",
      "amount": 5000,
      "metadata": {
        "orderId": "order_abc123"
      },
      "latest_charge": "ch_1234567890"
    }
  }
}
```

**Database Updates:**
```sql
UPDATE Payment SET
  status = 'succeeded',
  stripeChargeId = 'ch_1234567890',
  lastWebhookEvent = 'payment_intent.succeeded',
  lastWebhookTime = NOW()
WHERE stripePaymentIntentId = 'pi_1234567890';

UPDATE Order SET
  status = 'completed'
WHERE id = 'order_abc123';
```

**Console Output:**
```
✅ Payment succeeded for order order_abc123
```

### Event 2: payment_intent.payment_failed

**Trigger:** Payment failed (card declined, insufficient funds, etc.)

**Payload Example:**
```json
{
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "status": "requires_payment_method",
      "amount": 5000,
      "metadata": {
        "orderId": "order_abc123"
      },
      "last_payment_error": {
        "code": "card_declined",
        "message": "Your card was declined"
      }
    }
  }
}
```

**Database Updates:**
```sql
UPDATE Payment SET
  status = 'failed',
  lastWebhookEvent = 'payment_intent.payment_failed',
  lastWebhookTime = NOW()
WHERE stripePaymentIntentId = 'pi_1234567890';

UPDATE Order SET
  status = 'failed'
WHERE id = 'order_abc123';
```

**Console Output:**
```
❌ Payment failed for order order_abc123
```

### Event 3: charge.refunded

**Trigger:** Refund issued (full or partial)

**Payload Example:**
```json
{
  "type": "charge.refunded",
  "data": {
    "object": {
      "id": "ch_1234567890",
      "amount_refunded": 5000,
      "metadata": {
        "orderId": "order_abc123"
      },
      "refunds": {
        "data": [
          {
            "id": "re_1234567890",
            "amount": 5000,
            "reason": "requested_by_customer",
            "status": "succeeded"
          }
        ]
      }
    }
  }
}
```

**Database Updates:**
```sql
UPDATE Payment SET
  status = 'refunded',
  refundAmount = 50.00,
  refundReason = 'requested_by_customer',
  refundedAt = NOW(),
  lastWebhookEvent = 'charge.refunded',
  lastWebhookTime = NOW()
WHERE stripeChargeId = 'ch_1234567890';

UPDATE Order SET
  status = 'refunded'
WHERE id = 'order_abc123';
```

**Console Output:**
```
🔄 Refund processed for order order_abc123
```

---

## 🛡️ Security Features

### 1. Signature Verification

Every webhook is verified using HMAC-SHA256:

```typescript
verifyWebhookSignature(body, signature, secret)
// ✅ Returns event if signature valid
// ❌ Throws error if signature invalid
```

**Why:** Ensures the webhook came from Stripe and not an attacker

### 2. Stripe API Key Protection

```typescript
// ✅ Secret key kept private in .env
STRIPE_SECRET_KEY=sk_test_xxxxx

// ❌ Never included in client code
// ❌ Never logged to console
// ❌ Never committed to git
```

### 3. Webhook Secret Protection

```typescript
// ✅ Webhook secret kept in .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

// ❌ Never exposed in responses
// ❌ Never logged to console
```

### 4. HTTPS Requirement

In production, Stripe only sends webhooks to HTTPS endpoints

### 5. Idempotency

Same webhook can arrive multiple times. Database uses unique constraints:

```prisma
stripePaymentIntentId   String   @unique
```

If webhook arrives twice, second update still succeeds without errors.

---

## 🚨 Troubleshooting

### Issue: Webhooks Not Received

**Check:**
1. Is the endpoint publicly accessible?
2. Is Stripe CLI running? (`stripe listen --forward-to ...`)
3. Is the webhook URL correct in Stripe Dashboard?
4. Check firewall allows Stripe IPs

**Fix:**
```bash
# Restart Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Check logs
tail -f ~/.stripe/logs
```

### Issue: Signature Verification Failed

**Error:** `Invalid signature`

**Cause:** Wrong webhook secret in `.env`

**Fix:**
1. Get correct secret from Stripe Dashboard → Webhooks
2. Update `.env` with `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
3. Restart app

### Issue: Order Not Found

**Error:** `Order not found when processing webhook`

**Cause:** Webhook arrived before order was created

**Fix:**
1. Create order BEFORE creating payment intent
2. Ensure order ID in webhook metadata matches database

### Issue: Database Connection Error

**Error:** Database update fails

**Check:**
1. Is database running?
2. Are migrations up to date? (`npx prisma migrate dev`)
3. Is Prisma connected correctly? (`prisma.ts`)

**Fix:**
```bash
npx prisma migrate dev
npx prisma db seed
```

---

## 📈 Monitoring & Observability

### Webhook Event Tracking

Query recent webhooks:
```sql
SELECT 
  orderId,
  lastWebhookEvent,
  lastWebhookTime,
  status
FROM Payment
ORDER BY lastWebhookTime DESC
LIMIT 10;
```

### Payment Status Distribution

```sql
SELECT 
  status,
  COUNT(*) as count
FROM Payment
GROUP BY status;
```

### Failed Payments

```sql
SELECT 
  orderId,
  lastWebhookTime,
  status
FROM Payment
WHERE status = 'failed'
ORDER BY lastWebhookTime DESC;
```

### Refunded Orders

```sql
SELECT 
  orderId,
  refundAmount,
  refundReason,
  refundedAt
FROM Payment
WHERE status = 'refunded'
ORDER BY refundedAt DESC;
```

---

## ✅ Deployment Checklist

- [ ] All environment variables set (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- [ ] Webhook endpoint URL configured in Stripe Dashboard (production domain)
- [ ] Events subscribed: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] HTTPS enabled (Stripe requires HTTPS in production)
- [ ] Error monitoring configured (Sentry, LogRocket, etc.)
- [ ] Tested with real payments (in test mode first)
- [ ] Webhook logs reviewed in Stripe Dashboard
- [ ] Team trained on webhook monitoring
- [ ] Backup/recovery plan in place

---

## 🔗 Useful Resources

- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Stripe Payment Intents](https://stripe.com/docs/api/payment_intents)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Event Types Reference](https://stripe.com/docs/api/events/types)
- [Testing Guide](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

---

## 📞 Support

**For Stripe API Questions:**
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Dashboard](https://dashboard.stripe.com)

**For Implementation Questions:**
- Review `STRIPE_WEBHOOKS_IMPLEMENTATION.md` for detailed technical details
- Check `STRIPE_WEBHOOKS_QUICK_REFERENCE.md` for quick troubleshooting
- Run `node scripts/verify-setup.js` to check configuration

---

## ✨ Summary

The Stripe webhook implementation is **complete and production-ready**:

✅ **Webhook Endpoint** - Accepts and verifies Stripe webhooks  
✅ **Event Handlers** - Processes all three critical events  
✅ **Database Integration** - Tracks payments and orders  
✅ **Error Handling** - Robust error management  
✅ **Security** - Signature verification and secret protection  
✅ **Monitoring** - Webhook event tracking and audit trail  
✅ **Documentation** - Complete guides and troubleshooting  
✅ **Testing** - Test scripts and demo flow  

**Next Steps:**
1. Configure Stripe webhook endpoint in dashboard
2. Test locally with Stripe CLI
3. Verify database updates
4. Deploy to production
5. Monitor webhook delivery

---

**Status:** ✅ Complete and Ready for Production  
**Last Updated:** 2026-01-17  
**Maintainer:** Platform Engineering Team
