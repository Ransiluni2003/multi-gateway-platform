# Stripe Webhooks - Quick Reference & Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Set Environment Variables
```bash
# Copy .env.stripe.example to reference
# Add these to your .env file:

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 2: Get Webhook Secret from Stripe
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter: `https://yourdomain.com/api/webhooks/stripe`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add to `.env` as `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`

### Step 3: Test Locally (Optional)
```bash
# Install Stripe CLI from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret displayed and add to .env
```

---

## 📋 Event Flow

### Payment Intent Succeeded
```
User submits payment
         ↓
Stripe processes charge
         ↓
✅ payment_intent.succeeded webhook
         ↓
Payment status → "succeeded"
Order status → "completed"
Customer → notified
```

### Payment Intent Failed
```
User submits payment
         ↓
Card declined / insufficient funds
         ↓
❌ payment_intent.payment_failed webhook
         ↓
Payment status → "failed"
Order status → "failed"
Customer → retry option
```

### Refund Processed
```
Admin initiates refund
         ↓
Stripe processes refund
         ↓
🔄 charge.refunded webhook
         ↓
Payment status → "refunded"
Refund amount recorded
Order status → "refunded"
```

---

## 🧪 Testing

### Using Test Cards
```
✅ Success:
   Number: 4242 4242 4242 4242
   
❌ Decline:
   Number: 4000 0000 0000 0002
   
🔄 Refundable:
   Number: 4000 0000 0000 0069
```

For all test cards:
- **Expiry:** Any future date (e.g., 12/25)
- **CVC:** Any 3 digits (e.g., 123)

### With Node Script
```bash
# Test payment success
node scripts/test-webhooks.js --event payment_intent.succeeded --orderId order_123

# Test payment failure
node scripts/test-webhooks.js --event payment_intent.payment_failed --orderId order_123

# Test refund
node scripts/test-webhooks.js --event charge.refunded --orderId order_123
```

### With Stripe CLI
```bash
# Start webhook listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded

# Watch your app logs for the webhook processing
```

---

## 📊 Database Queries

### Check Payment Status
```sql
SELECT 
  orderId,
  status,
  stripePaymentIntentId,
  lastWebhookEvent,
  lastWebhookTime
FROM Payment
WHERE orderId = 'order_abc123';
```

### View All Refunded Orders
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

### Monitor Recent Webhooks
```sql
SELECT 
  orderId,
  lastWebhookEvent,
  lastWebhookTime,
  status
FROM Payment
ORDER BY lastWebhookTime DESC
LIMIT 20;
```

---

## 🔍 Verification Checklist

After processing a webhook, verify:

- [ ] Console shows correct log message:
  - ✅ Payment succeeded for order {orderId}
  - ❌ Payment failed for order {orderId}
  - 🔄 Refund processed for order {orderId}

- [ ] Database updated correctly:
  - [ ] `Payment.status` changed
  - [ ] `Payment.lastWebhookEvent` set
  - [ ] `Payment.lastWebhookTime` updated
  - [ ] `Order.status` changed

- [ ] API response shows updates:
  ```bash
  curl "http://localhost:3000/api/orders?id=order_abc123"
  # Check status field in response
  ```

---

## 🛡️ Security Checklist

- [ ] `STRIPE_SECRET_KEY` is kept private (never committed)
- [ ] `STRIPE_WEBHOOK_SECRET` is kept private
- [ ] Webhook endpoint validates signature ✅ (done in code)
- [ ] Using HTTPS in production ✅
- [ ] Stripe account in test mode during development ✅

---

## 🚨 Troubleshooting

### Webhooks Not Arriving

**Check:**
1. Is your app running? (`npm run dev`)
2. Correct webhook URL in Stripe dashboard?
3. Correct webhook secret in `.env`?
4. Using Stripe CLI? Make sure you ran `stripe login`

**Solution:**
```bash
# Restart your app
npm run dev

# If using CLI, restart webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Signature Verification Failed

**Error:** `Invalid signature`

**Cause:** Wrong webhook secret

**Solution:**
1. Get correct secret from Stripe Dashboard → Webhooks → your endpoint
2. Update `.env` with `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
3. Restart app

### Order Not Found Error

**Error:** Database logs show order not found

**Cause:** Webhook arrived before order was created

**Solution:**
1. Ensure order is created before payment intent
2. Check order ID in webhook metadata matches database

### 400 Bad Request / Missing Signature Header

**Cause:** Webhook signature header missing

**Check:**
- Using Stripe CLI or official Stripe webhook?
- Custom webhook test might not include signature

---

## 📈 Monitoring in Production

### Set Up Slack Alerts (Optional)
In Stripe Dashboard → Webhooks:
- Enable notifications for failed deliveries
- Configure email alerts for critical events

### Monitor Webhook Logs
```bash
# Query failed payments
SELECT * FROM Payment WHERE status = 'failed' ORDER BY lastWebhookTime DESC;

# Alert on missing webhooks (status mismatch)
SELECT * FROM Order WHERE status != 'completed' AND createdAt < NOW() - INTERVAL 1 hour;
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `src/app/api/webhooks/stripe/route.ts` | Webhook endpoint handler |
| `src/lib/stripe-utils.ts` | Event processing logic |
| `src/app/api/payment-intent/route.ts` | Create payment intents |
| `prisma/schema.prisma` | Database schema |
| `scripts/test-webhooks.js` | Testing script |

---

## ✅ Webhook Event Reference

### 1. payment_intent.succeeded
- **When:** Payment succeeded
- **Database Update:** Payment status = "succeeded", Order status = "completed"
- **Fields Updated:** stripeChargeId, lastWebhookEvent, lastWebhookTime

### 2. payment_intent.payment_failed
- **When:** Payment failed (declined, insufficient funds, etc.)
- **Database Update:** Payment status = "failed", Order status = "failed"
- **Fields Updated:** lastWebhookEvent, lastWebhookTime

### 3. charge.refunded
- **When:** Full or partial refund issued
- **Database Update:** Payment status = "refunded", Order status = "refunded"
- **Fields Updated:** refundAmount, refundReason, refundedAt, lastWebhookEvent, lastWebhookTime

---

## 🔗 Useful Links

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Payment Intents](https://stripe.com/docs/api/payment_intents)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Test Cards](https://stripe.com/docs/testing#cards)
- [Webhook Event Types](https://stripe.com/docs/api/events/types)

---

## 💡 Common Tasks

### Refund a Payment
```bash
# Via Stripe Dashboard:
# 1. Go to Payments
# 2. Click the payment
# 3. Click "Refund" button
# Webhook automatically updates your database
```

### Check Payment Status
```bash
# API call
curl "http://localhost:3000/api/orders?id=order_123"
```

### Debug Webhook Issue
```bash
# Check recent webhooks
stripe logs list

# Resend failed webhook
stripe logs resend evt_xxxxx
```

---

**Status:** ✅ Ready for Development & Testing  
**Last Updated:** 2026-01-17
