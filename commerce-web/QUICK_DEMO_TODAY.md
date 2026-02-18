# 🚀 QUICK START: Webhook Idempotency Demo (Today's Learning)

**Time Required:** 5 minutes  
**Date:** January 22, 2026

---

## ⚡ FASTEST DEMO PATH

### Step 1: Start Server (30 seconds)
```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev
```

### Step 2: View Current State (30 seconds)
Open in browser: **http://localhost:3000/orders**

### Step 3: Create Test Order (1 minute)
- Go to: **http://localhost:3000/products**
- Click any product → "Add to Cart"
- Click "Go to Checkout"
- Fill form (use: test@example.com)
- Click "Place Order"
- **COPY THE ORDER ID** from the response

### Step 4: Verify Initial Status (10 seconds)
- Go back to: **http://localhost:3000/orders**
- Find your order → Status should say **"PENDING"** (yellow chip)

### Step 5: Simulate Webhook - Option A (Stripe CLI)
```bash
# If you have Stripe CLI installed
stripe trigger payment_intent.succeeded
```

### Step 5: Simulate Webhook - Option B (curl - easier!)
```bash
# Replace YOUR_ORDER_ID_HERE with the ID you copied
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"evt_test_demo_$(date +%s)\",\"type\":\"payment_intent.succeeded\",\"data\":{\"object\":{\"id\":\"pi_test_123\",\"metadata\":{\"orderId\":\"YOUR_ORDER_ID_HERE\"},\"latest_charge\":\"ch_test_123\"}}}"
```

**PowerShell Version:**
```powershell
$orderId = "YOUR_ORDER_ID_HERE"
$eventId = "evt_test_demo_" + [DateTimeOffset]::Now.ToUnixTimeSeconds()
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

### Step 6: Verify Status Changed (10 seconds)
- Refresh: **http://localhost:3000/orders**
- Your order status should now be **"COMPLETED"** (green chip) ✅

### Step 7: TEST IDEMPOTENCY - Replay Webhook (1 minute)

**Run the EXACT SAME curl/PowerShell command again**  
(Make sure to use the SAME event ID!)

```powershell
# PowerShell - with SAME event ID
$orderId = "YOUR_ORDER_ID_HERE"
$eventId = "evt_test_demo_123456"  # SAME ID as before!
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

### Step 8: Verify NO Duplicate Processing (10 seconds)
- Refresh: **http://localhost:3000/orders** again
- Order status should STILL be **"COMPLETED"** (no change) ✅
- Check terminal/server logs for message:  
  **"⏭️ Event already processed at..."**

---

## ✅ SUCCESS CRITERIA

You've successfully demonstrated idempotency if:

1. ✅ First webhook: status changed from "pending" → "completed"
2. ✅ Replayed webhook: status stayed "completed" (no duplicate update)
3. ✅ Server logs show: "⏭️ Event already processed"
4. ✅ UI reflects correct state without manual DB checking

---

## 🎯 WHAT THIS PROVES

### Idempotency Works:
- Same Stripe event sent twice → only processed once
- Event ID tracked in `WebhookEvent` table
- Replays automatically detected and skipped

### Status Transitions Enforced:
- Only valid transitions allowed (pending → completed ✅)
- Invalid transitions rejected (failed → completed ❌)

### End-to-End Flow Complete:
- Customer creates order → Stripe webhook → Status updates → UI reflects state
- **No manual DB checking needed!**

---

## 📊 STATUS TRANSITION QUICK REF

```
PENDING ──→ COMPLETED ──→ REFUNDED
   │
   └──────→ FAILED
```

**Valid:**
- pending → completed ✅
- pending → failed ✅
- completed → refunded ✅

**Invalid (Rejected):**
- failed → completed ❌
- refunded → completed ❌
- completed → pending ❌

---

## 🐛 TROUBLESHOOTING

### Webhook returns 400 error?
- Check your order ID is correct
- Verify server is running (localhost:3000)

### Status not changing?
- Check terminal logs for errors
- Verify order ID in webhook payload
- Make sure dev server is running

### Can't find order in /orders page?
- Click "Refresh" button
- Check you're looking at the right order ID

---

## 📝 KEY FILES TO SHOW SUPERVISOR

1. **Code:** [src/lib/stripe-utils.ts](d:\multi-gateway-platform\commerce-web\src\lib\stripe-utils.ts)
   - Lines 10-75: Idempotency functions + status rules

2. **Database:** [prisma/schema.prisma](d:\multi-gateway-platform\commerce-web\prisma\schema.prisma)
   - Lines 113-126: WebhookEvent model

3. **PR Description:** [PR_IDEMPOTENCY_WEBHOOK_SAFETY.md](d:\multi-gateway-platform\commerce-web\PR_IDEMPOTENCY_WEBHOOK_SAFETY.md)
   - Complete explanation with diagrams

4. **This File:** [IDEMPOTENCY_COMPLETE.md](d:\multi-gateway-platform\commerce-web\IDEMPOTENCY_COMPLETE.md)
   - Full completion summary

---

## 🎤 2-MINUTE DEMO SCRIPT

**"Let me show you webhook idempotency in action..."**

1. **(30s)** "Here's an order with status PENDING" → Show /orders page
2. **(20s)** "I'll trigger a payment_intent.succeeded webhook" → Run curl
3. **(10s)** "Refresh... now it's COMPLETED" → Show status changed
4. **(30s)** "Now watch: I'll send the SAME webhook again" → Run curl again
5. **(20s)** "Refresh... still COMPLETED, no duplicate" → Show no change
6. **(10s)** "Check logs: 'Event already processed'" → Show terminal

**"That's idempotency: replayed events are automatically detected and skipped!"**

---

## 📞 READY TO DEMO?

Open these tabs now:
1. **Terminal:** Running `npm run dev`
2. **Browser Tab 1:** http://localhost:3000/products
3. **Browser Tab 2:** http://localhost:3000/orders
4. **Editor:** [src/lib/stripe-utils.ts](d:\multi-gateway-platform\commerce-web\src\lib\stripe-utils.ts)

You're ready! Follow Steps 1-8 above. Good luck! 🚀

