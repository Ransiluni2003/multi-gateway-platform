# Stripe Integration - Complete Setup & Testing Guide

**Status:** ✅ Ready for Testing  
**Date:** January 21, 2026  
**Approach:** Stripe CLI (Development) → Dashboard (Production)

---

## 📋 What's Already Done

### ✅ Webhook Handler Created
- File: `src/app/api/webhooks/stripe/route.ts`
- Receives Stripe events
- Verifies signatures
- Routes to event handlers

### ✅ Event Handlers Implemented
- File: `src/lib/stripe-utils.ts`
- Handles 3 event types:
  1. **payment_intent.succeeded** → Order: completed
  2. **payment_intent.payment_failed** → Order: failed
  3. **charge.refunded** → Order: refunded

### ✅ Payment Model Created
- `Order` model tracks order status
- `Payment` model tracks Stripe payment data
- `OrderItem` model tracks line items

### ✅ Environment Configured
- `.env.local` ready with placeholder keys
- All required variables defined

---

## 🎯 What You Need to Do TODAY

### Task 1: Get Stripe Test Keys (5 minutes)

**Choose ONE Option:**

**Option A: Dashboard Access (Preferred)**
1. Go to https://dashboard.stripe.com/
2. Sign in or create free account
3. Enable Test Mode (toggle top-left)
4. Go to **Developers** → **API Keys**
5. Copy these values:
   ```
   Secret Key: sk_test_51234567890abcdefghijklmnopqrst
   Publishable Key: pk_test_0987654321abcdefghijklmnopqrst
   ```

**Option B: Stripe CLI (No dashboard needed)**
```bash
# Install Stripe CLI
# Windows: choco install stripe-cli
# Mac: brew install stripe/stripe-cli/stripe
# Linux: Download from stripe.com/docs/stripe-cli

# Login with Stripe account
stripe login

# Automatically provides test keys
```

---

### Task 2: Update .env.local (2 minutes)

**File:** `d:\multi-gateway-platform\commerce-web\.env.local`

```bash
DATABASE_URL="file:D:\\multi-gateway-platform\\commerce-web\\dev.db"

# Your actual test keys from Stripe
STRIPE_SECRET_KEY="sk_test_YOUR_SECRET_KEY_HERE"
STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_test_YOUR_WEBHOOK_SECRET_HERE"
```

**⚠️ Important:** Replace placeholder values with actual keys!

---

### Task 3: Test Webhooks with Stripe CLI (10 minutes)

#### Step A: Start Dev Server

```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev

# Wait for: "ready - started server on 0.0.0.0:3000"
```

#### Step B: Start Stripe Listener (NEW Terminal)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Output:
# > Ready! Your webhook signing secret is: whsec_test_1234567890...
# > Forwarding to http://localhost:3000/api/webhooks/stripe
```

**ACTION:** Copy the webhook secret displayed and update `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET="whsec_test_1234567890..."
```

**ACTION:** Restart dev server (Ctrl+C, then `npm run dev`)

#### Step C: Trigger Test Events (ANOTHER Terminal)

**Event 1: Successful Payment**
```bash
stripe trigger payment_intent.succeeded
```

**Expected:**
- Webhook listener shows: `event received: payment_intent.succeeded`
- Dev server logs: `✅ Payment succeeded for order ...`
- Database: Order status → "completed"

---

**Event 2: Failed Payment**
```bash
stripe trigger payment_intent.payment_failed
```

**Expected:**
- Webhook listener receives event
- Dev server logs: `❌ Payment failed for order ...`
- Database: Order status → "failed"

---

**Event 3: Refund Processed**
```bash
stripe trigger charge.refunded
```

**Expected:**
- Webhook listener receives event
- Dev server logs: `🔄 Refund processed for order ...`
- Database: Order status → "refunded"

---

## ✅ Verification Checklist

- [ ] Stripe CLI installed and authenticated
- [ ] Test keys obtained (sk_test_..., pk_test_...)
- [ ] .env.local updated with keys
- [ ] Dev server running at localhost:3000
- [ ] `stripe listen` command running in separate terminal
- [ ] Webhook secret copied to .env.local
- [ ] Dev server restarted after env update
- [ ] `stripe trigger payment_intent.succeeded` returns success
- [ ] Dev console shows: `✅ Payment succeeded`
- [ ] Order status in database: "completed"
- [ ] `stripe trigger payment_intent.payment_failed` works
- [ ] Order status updates to: "failed"
- [ ] `stripe trigger charge.refunded` works
- [ ] Order status updates to: "refunded"

---

## 🎬 Recording Loom Demo

**File:** `STRIPE_WEBHOOK_LOOM_DEMO.md`

**Duration:** 5-7 minutes

**Segments:**
1. Setup & Configuration (1 min)
2. Stripe Listener Ready (1 min)
3. payment_intent.succeeded (2 min)
4. payment_intent.payment_failed (1.5 min)
5. charge.refunded (1.5 min)
6. Summary (1 min)

**What to Show:**
```
✓ Webhook handler code
✓ Event handler logic
✓ Stripe CLI listening
✓ Triggering events
✓ Database updates
✓ Console logs
```

---

## 🔧 Technical Deep Dive

### How Webhooks Work

```
1. Payment happens in Stripe
   ↓
2. Stripe sends webhook event
   ↓
3. Stripe CLI (dev) or Stripe infrastructure (prod) forwards to your endpoint
   ↓
4. Your server receives: POST /api/webhooks/stripe
   ↓
5. Verify signature with STRIPE_WEBHOOK_SECRET
   ↓
6. Parse event type
   ↓
7. Update database based on event
   ↓
8. Return 200 OK to Stripe
```

### Webhook Signature Verification

```typescript
// In route.ts:
const sig = request.headers.get('stripe-signature');
const body = await request.text();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// In stripe-utils.ts:
export function verifyWebhookSignature(body, signature, secret): Stripe.Event {
  // Uses Stripe SDK to verify:
  // 1. Event hasn't been tampered with
  // 2. Secret matches configured value
  // 3. Signature timestamp is recent (prevents replay attacks)
  return getStripeClient().webhooks.constructEvent(body, signature, secret);
}
```

### Event Handler Logic

```typescript
// payment_intent.succeeded
→ Update Payment: status = "succeeded"
→ Update Order: status = "completed"
→ Log: ✅ Payment succeeded

// payment_intent.payment_failed
→ Update Payment: status = "failed"
→ Update Order: status = "failed"
→ Log: ❌ Payment failed

// charge.refunded
→ Update Payment: status = "refunded"
→ Update Payment: refundAmount, refundedAt
→ Update Order: status = "refunded"
→ Log: 🔄 Refund processed
```

---

## 🌐 Production Setup

### When Deployed to Production:

1. **Get Production Keys:**
   ```
   Production Secret Key: sk_live_...
   Production Publishable Key: pk_live_...
   ```

2. **Register Webhook in Dashboard:**
   - Go to Stripe Dashboard
   - Developers → Webhooks → Add Endpoint
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: Select the 3 required events
   - Copy webhook secret → production .env

3. **Update Environment:**
   ```bash
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_PUBLISHABLE_KEY="pk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_live_..."
   ```

4. **Test in Production:**
   - Use Stripe dashboard to send test events
   - Verify webhook is received
   - Verify database updates

---

## 📚 File References

### Webhook Endpoint
- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Purpose:** Receives POST requests from Stripe
- **Actions:** Verify signature, call handler, return response

### Event Handlers
- **File:** `src/lib/stripe-utils.ts`
- **Functions:**
  - `handleStripeWebhook(event)` - Routes event to specific handler
  - `verifyWebhookSignature(body, sig, secret)` - Validates event signature
  - `createPaymentIntent(input)` - Creates payment for checkout
  - `getPaymentIntent(id)` - Retrieves payment status
  - `cancelPaymentIntent(id)` - Cancels payment

### Stripe Client
- **File:** `src/lib/stripe.ts`
- **Purpose:** Initializes Stripe API client with secret key

### Database Models
- **File:** `prisma/schema.prisma`
- **Models:** Order, OrderItem, Payment

### Configuration
- **File:** `.env.local`
- **Variables:** STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET

---

## 🚀 Quick Start Command Reference

### Development Setup
```bash
# Terminal 1: Dev Server
npm run dev

# Terminal 2: Stripe Listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Test Events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

### Verification
```bash
# Check webhook received in Terminal 2
# Check logs in Terminal 1
# Check database updates via database viewer
```

---

## 💡 Tips & Best Practices

1. **Always Verify Signatures:**
   - Prevents unauthorized webhook processing
   - Required for security compliance

2. **Log All Events:**
   - Helps with debugging
   - Audit trail for transactions
   - Easy to see what Stripe sent

3. **Idempotent Updates:**
   - Process event multiple times safely
   - Stripe may retry if you don't return 200 OK
   - Use event ID to prevent duplicates

4. **Return 200 OK Immediately:**
   - Don't do long processing in webhook
   - Process asynchronously if needed
   - Stripe needs quick response

5. **Monitor Webhooks in Production:**
   - Check Stripe dashboard for delivery status
   - Monitor retry counts
   - Alert on failures

---

## 🎯 Success Criteria

✅ **Task Complete When:**

1. Stripe CLI installed and authenticated
2. Test keys obtained (sk_test_, pk_test_)
3. .env.local updated with all keys
4. `stripe listen` running successfully
5. Webhook secret configured
6. All 3 test events trigger successfully
7. Console logs show ✅/❌/🔄 messages
8. Database orders have status: completed, failed, refunded
9. Loom video recorded (5-7 min)
10. Video shows complete webhook flow

---

## 🔗 Next Steps After Today

1. ✅ Complete webhook testing
2. ⏳ Record Loom demo video
3. ⏳ Update submission summary with Stripe completion
4. ⏳ Deploy to production with live keys
5. ⏳ Test webhooks in production
6. ⏳ Monitor webhook health

---

**🟢 READY TO TEST!**

Follow the steps above to complete Stripe webhook integration testing today.
