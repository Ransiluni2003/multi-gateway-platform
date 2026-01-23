# Stripe Webhook Setup & Testing Guide

**Status:** Setup Ready for Testing  
**Date:** January 21, 2026  
**Approach:** Stripe CLI (Recommended for development)

---

## 📋 Overview

This guide sets up Stripe webhooks to handle:
1. `payment_intent.succeeded` - Payment completed → Order status: completed
2. `payment_intent.payment_failed` - Payment failed → Order status: failed  
3. `charge.refunded` - Refund processed → Order status: refunded

---

## 🔧 Part A: Get Stripe Test Keys

### Option 1: Via Stripe Dashboard (If accessible)
1. Go to https://dashboard.stripe.com/
2. Sign in or create account
3. Test mode (toggle in top-left)
4. Go to Developers → API Keys
5. Copy:
   - **Secret Key** (starts with `sk_test_`)
   - **Publishable Key** (starts with `pk_test_`)

### Option 2: Using Stripe CLI (No dashboard needed)
```bash
# Install Stripe CLI (if not already installed)
# Download from: https://stripe.com/docs/stripe-cli

# Login to Stripe account
stripe login

# You'll get test keys without dashboard access
```

---

## ⚙️ Part B: Configure Environment Variables

**File:** `.env.local`

```bash
STRIPE_SECRET_KEY="sk_test_YOUR_SECRET_KEY_HERE"
STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_test_YOUR_WEBHOOK_SECRET_HERE"
```

**Current Setup:**
```bash
# Already in .env.local with placeholder values
# Replace the "sk_test_" and "pk_test_" values with your actual test keys
```

---

## 🎯 Part C: Test Webhook with Stripe CLI

### Step 1: Install Stripe CLI

**Windows:**
```powershell
# Download and install
choco install stripe-cli

# Or download from: https://stripe.com/docs/stripe-cli
```

**Verify Installation:**
```bash
stripe --version
```

### Step 2: Authenticate with Stripe

```bash
stripe login
# You'll be redirected to browser to authenticate
# Confirm in browser
# CLI will save credentials
```

### Step 3: Start Dev Server

```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev

# Server runs at http://localhost:3000
```

### Step 4: Listen for Webhook Events

**In a NEW terminal window:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Expected Output:**
```
> Ready! Your webhook signing secret is: whsec_test_1234567890abcdef...
> Forwarding to http://localhost:3000/api/webhooks/stripe
```

**IMPORTANT:** Copy the webhook signing secret and add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET="whsec_test_1234567890abcdef..."
```

---

## 📤 Part D: Trigger Test Webhook Events

**In ANOTHER terminal window (keep previous terminal running):**

### Event 1: Payment Succeeded

```bash
stripe trigger payment_intent.succeeded
```

**Expected Response:**
```
{
  "status": "success",
  "livemode": false,
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "status": "succeeded",
      "amount": 2000,
      "metadata": {
        "orderId": "order_12345"
      }
    }
  }
}
```

**What Happens:**
1. Webhook sent to `POST /api/webhooks/stripe`
2. Signature verified using `STRIPE_WEBHOOK_SECRET`
3. Order status updated to `completed`
4. Payment record updated with `succeeded` status
5. Console logs: `✅ Payment succeeded for order order_12345`

---

### Event 2: Payment Failed

```bash
stripe trigger payment_intent.payment_failed
```

**Expected Response:** Payment failed event delivered

**What Happens:**
1. Order status updated to `failed`
2. Payment record updated with `failed` status
3. Console logs: `❌ Payment failed for order ...`

---

### Event 3: Charge Refunded

```bash
stripe trigger charge.refunded
```

**Expected Response:** Charge refunded event delivered

**What Happens:**
1. Order status updated to `refunded`
2. Payment record updated with refund details
3. Refund amount tracked
4. Console logs: `🔄 Refund processed for order ...`

---

## 📊 Verification Checklist

### Webhook Received:
```bash
# Check terminal running "stripe listen"
# Should show:
# > event received: payment_intent.succeeded
# > forwarding to localhost:3000/api/webhooks/stripe
# > {"success": true, "received": true}
```

### API Response:
```
✓ Status 200 OK
✓ Response includes eventId and eventType
✓ No error messages
```

### Database Updated:
```bash
# Check dev.db for order status changes
# Order should have status: "completed", "failed", or "refunded"
# Payment record should have matching status
```

### Console Logs:
```
✅ Payment succeeded for order order_12345
❌ Payment failed for order order_67890
🔄 Refund processed for order order_54321
```

---

## 🎬 Recording Loom Demo

### Demo Structure (5-7 minutes total):

**Segment 1: Webhook Setup (1 min)**
- Show `stripe listen` command running
- Display webhook secret being displayed
- Show `.env.local` configuration

**Segment 2: Trigger & Receive Events (2 min)**
- Run `stripe trigger payment_intent.succeeded`
- Show webhook listener receiving event
- Show API returning 200 OK with eventId

**Segment 3: Database Verification (2 min)**
- Open database viewer (or query dev.db)
- Show order status changed to "completed"
- Show payment record updated
- Show timestamp of update

**Segment 4: Multiple Events (2 min)**
- Trigger payment_intent.payment_failed
- Show order status → "failed"
- Trigger charge.refunded
- Show order status → "refunded"
- Verify all 3 events processed

---

## 🐛 Troubleshooting

### Error: "Missing STRIPE_WEBHOOK_SECRET"
**Fix:** Update `.env.local` with webhook secret from `stripe listen` output

### Error: "Invalid signature"
**Fix:** Ensure webhook secret in `.env.local` matches output from `stripe listen`

### Error: "Webhook secret not configured"
**Fix:** Restart dev server after updating `.env.local`

### CLI: "No account found"
**Fix:** Run `stripe login` and complete browser authentication

### Webhook Not Received:
**Fix:** Ensure `stripe listen` is running in separate terminal
**Fix:** Check that dev server is running on localhost:3000

### Database Not Updating:
**Fix:** Check console logs for errors
**Fix:** Verify `prisma.order` and `prisma.payment` in mock client

---

## 📝 Code Overview

### Webhook Handler: `/api/webhooks/stripe`
```typescript
// Receives webhook event from Stripe
// Verifies signature with STRIPE_WEBHOOK_SECRET
// Routes to handleStripeWebhook()
// Returns 200 OK with eventId
```

### Event Handler: `stripe-utils.ts`
```typescript
handleStripeWebhook(event) {
  switch(event.type) {
    case 'payment_intent.succeeded':
      ✓ Update payment status to 'succeeded'
      ✓ Update order status to 'completed'
      ✓ Log success message
      
    case 'payment_intent.payment_failed':
      ✓ Update payment status to 'failed'
      ✓ Update order status to 'failed'
      ✓ Log failure message
      
    case 'charge.refunded':
      ✓ Update payment status to 'refunded'
      ✓ Update order status to 'refunded'
      ✓ Track refund amount and reason
      ✓ Log refund message
  }
}
```

### Payment Creation: `createPaymentIntent()`
```typescript
// Called from checkout flow
// Creates Stripe payment intent
// Stores in database with metadata (orderId)
// Returns clientSecret for frontend payment form
```

---

## ✅ Next Steps

1. **Get Test Keys:**
   - [ ] Option A: Access Stripe dashboard and copy test keys
   - [ ] Option B: Use `stripe login` to get credentials

2. **Configure Environment:**
   - [ ] Update `.env.local` with actual test keys
   - [ ] Restart dev server

3. **Test Webhook:**
   - [ ] Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - [ ] Copy webhook secret to `.env.local`
   - [ ] Restart dev server again
   - [ ] Trigger test events with `stripe trigger`

4. **Verify Database:**
   - [ ] Check order status updates in dev.db
   - [ ] Verify payment records created
   - [ ] Confirm console logs showing events processed

5. **Record Loom Demo:**
   - [ ] Set up 3 terminal windows (dev server, stripe listen, stripe trigger)
   - [ ] Follow Loom demo structure above
   - [ ] Record 5-7 minute video
   - [ ] Save and share link

---

## 🔗 Webhook Endpoint

**Production URL:**
```
https://yourdomain.com/api/webhooks/stripe
```

**Local Development:**
```
http://localhost:3000/api/webhooks/stripe
```

**Register in Stripe Dashboard:**
1. Developers → Webhooks → Add Endpoint
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events: 
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
4. Copy webhook signing secret → `.env.local`

---

## 📚 Resources

- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Webhook Events:** https://stripe.com/docs/api/events
- **Payment Intents:** https://stripe.com/docs/api/payment_intents
- **Webhooks Guide:** https://stripe.com/docs/webhooks

---

**Status: 🟢 READY TO TEST**

Follow the steps above to test webhooks with Stripe CLI!
