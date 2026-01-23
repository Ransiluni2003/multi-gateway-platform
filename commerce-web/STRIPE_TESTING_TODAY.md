# Stripe Webhook Testing - TODAY'S CHECKLIST

**Date:** January 21, 2026  
**Time:** START NOW  
**Estimated Duration:** 45 minutes total

---

## 📋 QUICK START (Follow in Order)

### ⏱️ 5 minutes: GET STRIPE KEYS

**Choose ONE:**

#### Option A: Stripe Dashboard (Recommended)
- [ ] Go to https://dashboard.stripe.com/
- [ ] Sign in or create free account
- [ ] Toggle "Test Mode" on (top-left)
- [ ] Click Developers → API Keys
- [ ] Copy Secret Key: `sk_test_...`
- [ ] Copy Publishable Key: `pk_test_...`
- [ ] Keep these values safe

#### Option B: Stripe CLI (No Dashboard)
- [ ] Open terminal
- [ ] Run: `stripe login`
- [ ] Browser opens - confirm login
- [ ] CLI shows test keys automatically

---

### ⏱️ 2 minutes: UPDATE .ENV.LOCAL

**File:** `d:\multi-gateway-platform\commerce-web\.env.local`

```bash
DATABASE_URL="file:D:\\multi-gateway-platform\\commerce-web\\dev.db"

# Paste your actual keys here (replace placeholders)
STRIPE_SECRET_KEY="sk_test_YOUR_COPIED_KEY"
STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_COPIED_KEY"
STRIPE_WEBHOOK_SECRET="whsec_test_PLACEHOLDER_FOR_NOW"
```

- [ ] Saved .env.local with keys

---

### ⏱️ 1 minute: START DEV SERVER

**Terminal 1:**
```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev
```

Wait for:
```
✓ Ready in 3.2s.
✓ started server on 0.0.0.0:3000
```

- [ ] Dev server running

---

### ⏱️ 1 minute: START STRIPE LISTENER

**Terminal 2 (NEW WINDOW):**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Wait for output like:
```
> Ready! Your webhook signing secret is: whsec_test_1234567890abcdef...
> Forwarding to http://localhost:3000/api/webhooks/stripe
```

**IMPORTANT:** Copy the webhook secret displayed!

- [ ] Webhook secret copied: `whsec_test_...`

---

### ⏱️ 1 minute: UPDATE WEBHOOK SECRET

**Back to .env.local:**
```bash
STRIPE_WEBHOOK_SECRET="whsec_test_PASTE_COPIED_VALUE_HERE"
```

- [ ] Saved with webhook secret
- [ ] Stopped dev server (Ctrl+C in Terminal 1)
- [ ] Restarted: `npm run dev`
- [ ] Wait for "Ready" message

---

### ⏱️ 5 minutes: RUN TEST EVENTS

**Terminal 3 (ANOTHER NEW WINDOW):**

#### Event 1: Payment Succeeded
```bash
stripe trigger payment_intent.succeeded
```

CHECK Terminal 2 (webhook listener):
```
> event received: payment_intent.succeeded
> forwarding to http://localhost:3000/api/webhooks/stripe
{"success": true, "received": true}
```

CHECK Terminal 1 (dev server):
```
✅ Payment succeeded for order order_12345
```

- [ ] Event 1 received
- [ ] Console shows ✅ message

---

#### Event 2: Payment Failed
```bash
stripe trigger payment_intent.payment_failed
```

CHECK Terminal 2:
```
> event received: payment_intent.payment_failed
```

CHECK Terminal 1:
```
❌ Payment failed for order order_67890
```

- [ ] Event 2 received
- [ ] Console shows ❌ message

---

#### Event 3: Refund Processed
```bash
stripe trigger charge.refunded
```

CHECK Terminal 2:
```
> event received: charge.refunded
```

CHECK Terminal 1:
```
🔄 Refund processed for order order_54321
```

- [ ] Event 3 received
- [ ] Console shows 🔄 message

---

## ✅ VERIFICATION

After all 3 events processed, verify:

- [ ] All 3 events received by webhook listener
- [ ] All 3 console messages shown (✅/❌/🔄)
- [ ] No errors in console
- [ ] All API responses returned 200 OK

**Example of success:**
```
Terminal 1: ✅ Payment succeeded for order ...
Terminal 1: ❌ Payment failed for order ...
Terminal 1: 🔄 Refund processed for order ...
Terminal 2: 3 events received total
```

---

## 🎬 RECORD LOOM DEMO

**After verification passes:**

**See:** `STRIPE_WEBHOOK_LOOM_DEMO.md`

```
1. Show webhook code (1 min)
2. Start Stripe listener (1 min)
3. Trigger payment_intent.succeeded (2 min)
4. Trigger payment_intent.payment_failed (1.5 min)
5. Trigger charge.refunded (1.5 min)
6. Show database updates (1 min)
Total: 5-7 minutes
```

- [ ] Loom video recorded
- [ ] Video saved
- [ ] Link copied

---

## 🐛 TROUBLESHOOTING

### Problem: "Missing STRIPE_WEBHOOK_SECRET"
**Solution:** Update .env.local with webhook secret from `stripe listen` output

### Problem: "Invalid signature"
**Solution:** Make sure webhook secret matches exactly between `stripe listen` output and .env.local

### Problem: Dev server doesn't start
**Solution:** Check that port 3000 is available
```bash
# Kill any process on 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Problem: Webhook not received
**Solution:** 
1. Check `stripe listen` is running (Terminal 2)
2. Check dev server is on localhost:3000 (Terminal 1)
3. Restart both terminals

### Problem: Stripe CLI not installed
**Solution:**
```bash
choco install stripe-cli
# Or download from https://stripe.com/docs/stripe-cli
```

### Problem: No event output after trigger
**Solution:** Ensure dev server restarted AFTER updating .env.local

---

## 📊 COMPLETION CHECKLIST

### Setup Phase:
- [ ] Stripe keys obtained
- [ ] .env.local updated with keys
- [ ] Dev server running
- [ ] Stripe listener running
- [ ] Webhook secret updated
- [ ] Dev server restarted

### Testing Phase:
- [ ] payment_intent.succeeded triggered
- [ ] Event received by webhook
- [ ] Console logs: ✅ succeeded
- [ ] payment_intent.payment_failed triggered
- [ ] Event received by webhook
- [ ] Console logs: ❌ failed
- [ ] charge.refunded triggered
- [ ] Event received by webhook
- [ ] Console logs: 🔄 refunded

### Recording Phase:
- [ ] Loom demo recorded
- [ ] All 6 segments included
- [ ] Video saved
- [ ] Link ready to share

---

## ⏱️ TIME BREAKDOWN

| Task | Time | Status |
|------|------|--------|
| Get Stripe Keys | 5 min | ⏳ |
| Update .env | 2 min | ⏳ |
| Start dev server | 1 min | ⏳ |
| Start Stripe listener | 1 min | ⏳ |
| Update webhook secret | 1 min | ⏳ |
| Test 3 events | 5 min | ⏳ |
| Verification | 3 min | ⏳ |
| Record Loom | 10 min | ⏳ |
| **TOTAL** | **~30 min** | ⏳ |

---

## 🎯 SUCCESS LOOKS LIKE THIS

### Console Output:
```
✅ Payment succeeded for order order_12345
❌ Payment failed for order order_67890
🔄 Refund processed for order order_54321
```

### Webhook Listener Output:
```
> event received: payment_intent.succeeded
> forwarding to http://localhost:3000/api/webhooks/stripe
{
  "success": true,
  "received": true,
  "eventId": "evt_...",
  "eventType": "payment_intent.succeeded"
}
```

### Loom Video Shows:
- Webhook handler code
- Event processing logic
- Stripe CLI receiving 3 events
- Database updating automatically
- Complete payment lifecycle

---

## 📝 NOTES

**Keep these terminals running during testing:**
- Terminal 1: Dev server (don't stop)
- Terminal 2: Stripe listener (don't stop)
- Terminal 3: Run events (can close after)

**After testing:**
- Screenshot of all 3 console messages
- Screenshot of database showing order statuses
- Loom video link saved

---

## 🚀 NEXT STEPS

After completion:

1. ✅ Stripe webhooks tested
2. ✅ Loom demo recorded
3. ⏳ Update submission summary with Stripe status
4. ⏳ Create pull request
5. ⏳ Submit for supervisor review

---

**🟢 YOU'RE READY TO START!**

**Begin with:** Getting Stripe keys (5 minutes)

**Then follow:** Each section in order

**Result:** Complete webhook integration tested and demonstrated!

---

## 📞 QUICK REFERENCE

**Stripe Docs:**
- https://stripe.com/docs/stripe-cli
- https://stripe.com/docs/webhooks

**Our Guides:**
- `STRIPE_WEBHOOK_SETUP.md` - Detailed setup
- `STRIPE_WEBHOOK_LOOM_DEMO.md` - Recording script
- `STRIPE_INTEGRATION_COMPLETE.md` - Full technical guide
- `STRIPE_WEBHOOK_STATUS.md` - Current status report

---

**START NOW - Target: Completion by end of today!**
