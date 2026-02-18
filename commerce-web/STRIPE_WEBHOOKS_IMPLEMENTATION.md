# Stripe Webhooks Implementation Guide

## Overview

This document describes the complete Stripe webhook implementation for the checkout flow. The system handles three critical webhook events:

1. **`payment_intent.succeeded`** - Payment completed successfully
2. **`payment_intent.payment_failed`** - Payment failed
3. **`charge.refunded`** - Refund processed

## Architecture

### Order Lifecycle Flow

```
Create Order (pending)
    ↓
Create Payment Intent
    ↓
Customer submits payment
    ↓
Stripe validates payment
    ↓
Webhook received
    ↓
Payment & Order status updated in DB
    ↓
Customer notified
```

## Components

### 1. Webhook Endpoint
**Location:** `src/app/api/webhooks/stripe/route.ts`

Handles incoming webhook requests from Stripe with:
- Signature verification (validates request came from Stripe)
- Event parsing and delegation
- Error handling with proper HTTP responses

### 2. Stripe Utilities
**Location:** `src/lib/stripe-utils.ts`

Contains:
- `verifyWebhookSignature()` - Validates webhook signature using Stripe SDK
- `handleStripeWebhook()` - Routes events to appropriate handlers
- `createPaymentIntent()` - Creates payment intents
- Event handlers for all three webhook types

### 3. Database Schema
**Location:** `prisma/schema.prisma`

Key models:
- **Order** - Tracks order status and Stripe transaction IDs
- **Payment** - Detailed payment records with webhook tracking
- **OrderItem** - Individual items in the order

## Setup Instructions

### 1. Environment Configuration

Add to `.env`:

```dotenv
# Stripe Keys (from https://dashboard.stripe.com/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxx

# Webhook Secret (from https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
```

### 2. Stripe Dashboard Setup

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Configure as follows:
   - **URL:** `https://yourdomain.com/api/webhooks/stripe`
   - **Events:** Select these events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
4. Copy the **Signing secret** to `STRIPE_WEBHOOK_SECRET`

### 3. Local Development with Stripe CLI

For testing webhooks locally:

```bash
# 1. Install Stripe CLI (https://stripe.com/docs/stripe-cli)

# 2. Login to your Stripe account
stripe login

# 3. Forward webhook events to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 4. Copy the webhook signing secret displayed and add to .env
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

## Webhook Event Details

### Event 1: `payment_intent.succeeded`

**Triggered when:** Payment is successfully processed

**Database Updates:**
```
Payment Table:
  - status: 'succeeded'
  - stripeChargeId: (populated)
  - lastWebhookEvent: 'payment_intent.succeeded'
  - lastWebhookTime: (current timestamp)

Order Table:
  - status: 'completed'
```

**Example Payload:**
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "status": "succeeded",
      "amount": 50000,
      "currency": "usd",
      "metadata": {
        "orderId": "order_abc123"
      }
    }
  }
}
```

### Event 2: `payment_intent.payment_failed`

**Triggered when:** Payment fails (declined card, insufficient funds, etc.)

**Database Updates:**
```
Payment Table:
  - status: 'failed'
  - lastWebhookEvent: 'payment_intent.payment_failed'
  - lastWebhookTime: (current timestamp)

Order Table:
  - status: 'failed'
```

**Common Failure Reasons:**
- Card declined
- Insufficient funds
- Lost card
- Stolen card
- Expired card

### Event 3: `charge.refunded`

**Triggered when:** Refund is issued (full or partial)

**Database Updates:**
```
Payment Table:
  - status: 'refunded'
  - refundAmount: (refunded amount in dollars)
  - refundReason: (reason if provided)
  - refundedAt: (current timestamp)
  - lastWebhookEvent: 'charge.refunded'
  - lastWebhookTime: (current timestamp)

Order Table:
  - status: 'refunded'
```

## API Endpoints

### Create Payment Intent
```
POST /api/payment-intent
Body: {
  "orderId": "order_abc123",
  "amount": 50.00,
  "email": "customer@example.com"
}

Response: {
  "success": true,
  "clientSecret": "pi_1234567890_secret_xyz",
  "paymentIntentId": "pi_1234567890"
}
```

### Get Order with Payment
```
GET /api/orders?id=order_abc123

Response: {
  "success": true,
  "order": {
    "id": "order_abc123",
    "status": "completed",
    "total": 50.00,
    "payment": {
      "status": "succeeded",
      "stripePaymentIntentId": "pi_1234567890",
      "lastWebhookEvent": "payment_intent.succeeded",
      "lastWebhookTime": "2026-01-17T10:30:00Z"
    }
  }
}
```

## Testing

### Manual Testing with Test Cards

Stripe provides test card numbers for development:

```
✅ Success
  - Card: 4242 4242 4242 4242
  - Exp: Any future date
  - CVC: Any 3 digits
  - Result: Payment succeeds

❌ Decline
  - Card: 4000 0000 0000 0002
  - Exp: Any future date
  - CVC: Any 3 digits
  - Result: Payment fails

🔄 Refundable
  - Card: 4000 0000 0000 0069
  - Exp: Any future date
  - CVC: Any 3 digits
  - Result: Payment succeeds, can be refunded
```

### Testing Locally with Stripe CLI

1. Start your development server:
```bash
npm run dev
```

2. In another terminal, forward webhooks:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Copy the webhook secret to `.env`

4. Trigger test events:
```bash
# Simulate payment success
stripe trigger payment_intent.succeeded

# Simulate payment failure
stripe trigger payment_intent.payment_failed

# Simulate refund
stripe trigger charge.refunded
```

5. Monitor logs and database to verify updates

### Verification Steps

After triggering a webhook:

1. **Check Console Logs:**
   ```
   ✅ Payment succeeded for order order_abc123
   ❌ Payment failed for order order_abc123
   🔄 Refund processed for order order_abc123
   ```

2. **Query Database:**
   ```bash
   # Check payment status
   SELECT status, lastWebhookEvent, lastWebhookTime FROM Payment WHERE orderId = 'order_abc123';
   
   # Check order status
   SELECT status FROM Order WHERE id = 'order_abc123';
   ```

## Error Handling

### Signature Verification Errors

If webhook signature verification fails:
```
Response: 400 Bad Request
Body: { "error": "Invalid signature" }
```

**Causes:**
- Wrong webhook secret
- Request body modified
- Using wrong API version

### Webhook Secret Not Configured

```
Response: 500 Internal Server Error
Body: { "error": "Webhook secret not configured" }
```

**Fix:** Add `STRIPE_WEBHOOK_SECRET` to `.env`

### Database Update Failures

If database updates fail, the endpoint will return 500 error and log details.

**Common causes:**
- Order not found in database
- Database connection issues
- Invalid payment metadata

## Monitoring & Observability

### Webhook Event Tracking

All webhook events are tracked in the `Payment` table:
- `lastWebhookEvent` - Type of last event received
- `lastWebhookTime` - Timestamp of last event
- Enables replay detection and audit trails

### Payment Status States

```
pending → succeeded (complete)
      → failed (customer can retry)
      → refunded (refund processed)

completed ← succeeded
failed ← payment_failed
refunded ← charge.refunded
```

### Database Queries for Monitoring

```sql
-- All payments by status
SELECT status, COUNT(*) as count FROM Payment GROUP BY status;

-- Recent webhook events
SELECT orderId, lastWebhookEvent, lastWebhookTime 
FROM Payment 
ORDER BY lastWebhookTime DESC 
LIMIT 10;

-- Refunded orders
SELECT orderId, refundAmount, refundedAt 
FROM Payment 
WHERE status = 'refunded' 
ORDER BY refundedAt DESC;

-- Failed payments
SELECT orderId, lastWebhookTime 
FROM Payment 
WHERE status = 'failed' 
ORDER BY lastWebhookTime DESC;
```

## Troubleshooting

### Webhooks Not Being Received

1. Check webhook endpoint is publicly accessible
2. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. Check firewall/security rules allow Stripe IPs
4. Monitor webhook logs in Stripe Dashboard

### Payment Not Updating in Database

1. Check order exists with correct metadata
2. Verify database connection
3. Check Prisma migrations ran successfully
4. Review logs for specific error messages

### Test Cards Not Working

1. Ensure using valid test card numbers
2. Use any future expiry date
3. Use any 3-digit CVC
4. Verify account is in test mode

## Security Best Practices

1. **Keep secrets private:**
   - Never commit `.env` to git
   - Never log `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`

2. **Always verify signatures:**
   - The code does this automatically
   - Never trust webhook data without verification

3. **Handle idempotency:**
   - Same webhook can arrive multiple times
   - Database operations use unique constraints to prevent duplicates

4. **Validate order metadata:**
   - Always verify order exists before updating
   - Validate amount matches expected value

5. **Use HTTPS in production:**
   - Stripe only sends to HTTPS endpoints
   - Encrypt data in transit

## Next Steps

1. ✅ Webhook endpoint implemented
2. ✅ Event handlers implemented  
3. ✅ Database schema supports tracking
4. Configure Stripe webhook endpoint in dashboard
5. Add `.env` variables (STRIPE_WEBHOOK_SECRET)
6. Test locally with Stripe CLI
7. Deploy and configure production webhook endpoint
8. Monitor webhook delivery in Stripe Dashboard

## Checklist for Deployment

- [ ] `STRIPE_WEBHOOK_SECRET` added to production `.env`
- [ ] Webhook endpoint URL configured in Stripe Dashboard (production)
- [ ] Tested all three events locally
- [ ] Verified database updates working
- [ ] Monitored error logs
- [ ] Set up monitoring/alerting for failed webhooks
- [ ] Documented webhook endpoint for team
- [ ] Tested with real Stripe test account
- [ ] Reviewed Stripe Dashboard webhook logs
- [ ] Ready for production deployment

## Support & Resources

- **Stripe Webhooks Docs:** https://stripe.com/docs/webhooks
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Payment Intent API:** https://stripe.com/docs/api/payment_intents
- **Event Types:** https://stripe.com/docs/api/events/types
- **Testing Guide:** https://stripe.com/docs/testing

---

**Status:** ✅ Complete and Ready for Testing
**Last Updated:** 2026-01-17
