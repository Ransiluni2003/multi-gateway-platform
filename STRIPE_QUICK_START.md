# ⚡ Stripe Integration - Quick Setup Guide

## 5-Minute Setup

### Step 1: Get Stripe Keys (2 min)
1. Visit https://dashboard.stripe.com/apikeys
2. Copy **Publishable Key** (pk_test_...)
3. Copy **Secret Key** (sk_test_...)

### Step 2: Configure Environment (1 min)
Create `commerce-web/.env.local`:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET_HERE
```

### Step 3: Setup Webhook (2 min)
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://localhost:3000/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy webhook secret → `.env.local`

### Step 4: Run Migrations
```bash
cd commerce-web
npx prisma migrate dev --name add-stripe-payment
npm run dev
```

### Step 5: Test the Flow
```
1. Go to http://localhost:3000/products
2. Add item to cart
3. Click Checkout
4. Use test card: 4242 4242 4242 4242
5. See success page!
```

---

## Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |

**Expiry:** Any future date | **CVC:** Any 3 digits

---

## API Endpoints

### Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "city": "NYC",
    "state": "NY",
    "zipCode": "10001",
    "country": "US",
    "items": [{"productId": "PRODUCT_ID", "quantity": 1}]
  }'
```

### Create Payment Intent
```bash
curl -X POST http://localhost:3000/api/payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "amount": 99.99,
    "email": "test@example.com"
  }'
```

### Get Order
```bash
curl http://localhost:3000/api/orders?id=ORDER_ID
```

---

## Webhook Testing (Local Dev)

### Using Stripe CLI
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

---

## Database

Prisma models created:
- **Order**: Customer orders with billing info
- **OrderItem**: Line items in an order
- **Payment**: Payment tracking with Stripe IDs

```bash
# View database
sqlite3 commerce-web/dev.db

# Query orders
SELECT * FROM "Order";
SELECT * FROM "Payment";
```

---

## Status

✅ **Everything is implemented!**

- Payment Intent creation
- Secure checkout page
- Success/failure pages
- 3 webhook handlers
- Order lifecycle tracking
- Database persistence
- Error handling

---

**Ready to test!** 🚀
