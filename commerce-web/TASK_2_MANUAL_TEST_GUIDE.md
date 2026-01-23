# Task 2: Full Checkout → Order → Admin Flow - Manual Testing Guide

## Overview
This guide demonstrates the complete flow: customer adds product, checks out, payment succeeds/fails, and admin sees order status updates.

## Prerequisites
- Dev server running: `npm run dev` (http://localhost:3000)
- Stripe test keys configured in `.env.local`
- Stripe webhook listener running (optional, can test with curl)

## Test Flow

### 1. Add Product (Customer View)
1. Navigate to http://localhost:3000/products
2. Click "View Details" on any product
3. Click "Add to Cart" button
4. Verify: Snackbar shows "Added to cart"

### 2. Checkout Flow
1. Click cart icon in header (or go to /cart)
2. Click "Proceed to Checkout"
3. Fill out checkout form:
   - First Name, Last Name, Email
   - Address, City, State, ZIP, Country
4. Click "Place Order"
5. Verify: Redirects to /checkout/success?orderId=XXX

### 3. Trigger Payment Success Webhook (Manual)
Open PowerShell/CMD and run:

```powershell
$orderId = "REPLACE_WITH_ORDER_ID_FROM_STEP_2"
$payload = @{
  id = "evt_test_success_1"
  type = "payment_intent.succeeded"
  data = @{
    object = @{
      id = "pi_test_$orderId"
      amount = 1999
      status = "succeeded"
      metadata = @{ orderId = $orderId }
      charges = @{ data = @( @{ id = "ch_success_$orderId" } ) }
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

Expected: Response 200 OK with `{"received":true}`

### 4. Verify Admin UI - Payment Success
1. Navigate to http://localhost:3000/admin/orders
2. Find the order by ID from step 2
3. Verify:
   - Status chip shows "completed" (green)
   - Stripe Charge ID shows "ch_success_XXX"
   - Payment Amount matches order total

### 5. Trigger Payment Failure Webhook
```powershell
$orderId2 = "CREATE_NEW_ORDER_AND_REPLACE_THIS"
$payload = @{
  id = "evt_test_failure_1"
  type = "payment_intent.payment_failed"
  data = @{
    object = @{
      id = "pi_test_$orderId2"
      amount = 1999
      status = "failed"
      metadata = @{ orderId = $orderId2 }
      last_payment_error = @{ message = "Card declined" }
    }
  }
} | ConvertTo-Json -Depth 10

# (repeat signature generation as above with new payload)
# POST to /api/webhooks/stripe with stripe-signature header
```

Expected: Admin UI shows order status "failed" (red chip)

### 6. Trigger Refund Webhook
```powershell
$orderId1 = "USE_FIRST_ORDER_ID"
$payload = @{
  id = "evt_test_refund_1"
  type = "charge.refunded"
  data = @{
    object = @{
      id = "ch_success_$orderId1"
      payment_intent = "pi_test_$orderId1"
      amount = 1999
      amount_refunded = 1999
      refunded = $true
    }
  }
} | ConvertTo-Json -Depth 10

# (repeat signature generation and POST)
```

Expected: Admin UI shows order status "refunded" (orange chip) with refund amount displayed

## Automated Test (Once Dev Server Issues Resolved)
Run: `npx playwright test tests/e2e/checkout-order-admin.spec.ts --headed`

The test automates all 6 steps above:
- Creates product via API
- Drives browser through add-to-cart → checkout → order creation
- Posts signed webhook payloads (success/failure/refund)
- Verifies admin UI displays correct statuses

## Evidence for Supervisor
1. **Screenshots**: Admin orders table showing 3 orders with statuses (completed, failed, refunded)
2. **Loom Video**: Record full flow from product add → checkout → webhook curl → admin verification
3. **Test Code**: Point to `tests/e2e/checkout-order-admin.spec.ts` as automation proof

## Key Implementations
- **Webhook Handler**: `/src/app/api/webhooks/stripe/route.ts` - validates HMAC-SHA256 signatures
- **Event Processors**: `/src/lib/stripe-utils.ts` - handles 3 event types (succeeded, failed, refunded)
- **Database Models**: Payment & Order models with `stripePaymentIntentId`, `stripeChargeId`, `refundAmount`
- **Admin UI**: `/src/app/admin/orders/page.tsx` - displays status chips and payment info

## Notes
- Dev server must be running on port 3000
- STRIPE_WEBHOOK_SECRET must be set in `.env.local`
- Manual webhook testing requires PowerShell for HMAC signature generation
- Alternatively, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
