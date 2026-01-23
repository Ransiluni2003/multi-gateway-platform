# Stripe Webhook Testing - Loom Demo Script

**Duration:** 5-7 minutes  
**Focus:** Webhook events → Database updates → Order status changes

---

## 🎬 Pre-Recording Setup

### Terminal Preparation:

**Terminal 1: Dev Server**
```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev
# Waits for: "started server on 0.0.0.0:3000"
```

**Terminal 2: Stripe Listener (START AFTER DEV SERVER READY)**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy and save the webhook secret displayed
```

**Terminal 3: Test Events (KEEP READY)**
- Don't run yet, just have ready for recording

### Files to Have Open:
- `.env.local` (show configuration)
- `src/app/api/webhooks/stripe/route.ts` (show webhook handler)
- `src/lib/stripe-utils.ts` (show event handlers)
- Database viewer or terminal for checking database

---

## 📹 Recording Script

### SEGMENT 1: Setup & Configuration (1 minute)

**What to Show:**
- .env.local with Stripe keys configured
- Webhook handler route
- Event handling logic

**Steps:**
1. Open VSCode
2. Show `.env.local`:
   ```bash
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_test_..."
   ```

3. Show `src/app/api/webhooks/stripe/route.ts`
4. Show `src/lib/stripe-utils.ts` - explain three event types

**What to Say:**
```
"We have Stripe webhook configuration set up with three key environment 
variables: the secret key for API calls, the publishable key for frontend, 
and the webhook secret for signature verification.

The webhook handler at /api/webhooks/stripe receives events from Stripe, 
verifies the signature, and routes to the event handler which updates 
database records.

We handle three event types:
1. payment_intent.succeeded - when payment completes
2. payment_intent.payment_failed - when payment fails
3. charge.refunded - when a refund is processed"
```

---

### SEGMENT 2: Start Stripe Listener (1 minute)

**What to Show:**
- Stripe CLI listening and ready
- Webhook signing secret displayed
- Connection confirmed

**Steps:**
1. Show Terminal 2 with `stripe listen` command
2. Show output: "Ready! Your webhook signing secret is: whsec_test_..."
3. Show: "Forwarding to http://localhost:3000/api/webhooks/stripe"
4. Highlight: "Ready to receive events"

**What to Say:**
```
"Now we start the Stripe CLI webhook listener. This command connects to 
Stripe's infrastructure and forwards events to our local development server.

The CLI displays the webhook signing secret which matches our environment 
configuration. This secret is used to verify that events actually came from 
Stripe and haven't been tampered with.

The listener is now ready to receive events on localhost:3000."
```

---

### SEGMENT 3: Trigger payment_intent.succeeded (2 minutes)

**What to Show:**
1. Trigger command
2. Webhook listener receiving event
3. API response (200 OK)
4. Database updated
5. Console logs showing success

**Steps:**
1. In Terminal 3, show: `stripe trigger payment_intent.succeeded`
2. Hit Enter
3. Show Stripe CLI output in Terminal 2:
   ```
   > event received: payment_intent.succeeded
   > forwarding to localhost:3000/api/webhooks/stripe
   
   {
     "success": true,
     "received": true,
     "eventId": "evt_1234567890",
     "eventType": "payment_intent.succeeded"
   }
   ```

4. Show dev server console logs:
   ```
   ✅ Payment succeeded for order order_12345
   ```

5. Show database (check orders table):
   ```
   order_12345 | status: "completed" | updatedAt: 2026-01-21T...
   ```

**What to Say:**
```
"First event: payment_intent.succeeded. I'm running the Stripe CLI trigger 
command which simulates a successful payment from Stripe's systems.

The webhook listener receives the event and forwards it to our API endpoint 
at localhost:3000/api/webhooks/stripe. The API verifies the signature and 
returns 200 OK with the event ID.

In our server logs, we see the confirmation message: 'Payment succeeded for 
order order_12345'.

Most importantly, the order status in our database has been automatically 
updated from 'pending' to 'completed'. The webhook successfully updated the 
database!"
```

---

### SEGMENT 4: Trigger payment_intent.payment_failed (1.5 minutes)

**What to Show:**
1. Trigger payment_failed event
2. Webhook received
3. Order status changed to "failed"
4. Different console message

**Steps:**
1. In Terminal 3: `stripe trigger payment_intent.payment_failed`
2. Show webhook listener receiving it
3. Show API returns 200 OK
4. Show console: `❌ Payment failed for order ...`
5. Show database: order status now "failed"

**What to Say:**
```
"Second event: payment_intent.payment_failed. When a payment fails for any 
reason - insufficient funds, card declined, etc. - Stripe sends this event.

Again, the webhook handler receives it, verifies the signature, and processes 
the event. The console shows the failure message.

Notice the order status in the database has changed to 'failed'. This allows 
the frontend to show the user that their payment didn't go through, so they 
can retry or choose a different payment method."
```

---

### SEGMENT 5: Trigger charge.refunded (1.5 minutes)

**What to Show:**
1. Trigger refund event
2. Webhook received and processed
3. Order status changed to "refunded"
4. Payment record shows refund details

**Steps:**
1. In Terminal 3: `stripe trigger charge.refunded`
2. Show webhook listener receiving it
3. Show API returns 200 OK
4. Show console: `🔄 Refund processed for order ...`
5. Show database: 
   ```
   order status: "refunded"
   payment.refundAmount: 2000
   payment.refundedAt: 2026-01-21T...
   ```

**What to Say:**
```
"Third event: charge.refunded. This is triggered when a customer requests 
a refund or the merchant initiates one from the Stripe dashboard.

The webhook processes this event, updating both the order status to 'refunded' 
and the payment record with refund details like the amount refunded and 
timestamp.

This complete audit trail allows the business to track refunds, dispute 
handling, and customer service operations accurately."
```

---

### SEGMENT 6: Summary & Verification (1 minute)

**What to Show:**
- Database showing all 3 order statuses
- Console logs showing all 3 events
- Highlight the webhook flow

**Steps:**
1. Show all 3 orders in database with different statuses
2. Show all 3 console log messages
3. Explain the complete flow

**What to Say:**
```
"So we successfully demonstrated the complete webhook flow:

1. Stripe sends an event (payment_intent.succeeded, failed, or charge.refunded)
2. Stripe CLI forwards it to our local server
3. Our webhook handler verifies the signature
4. Event is processed and database is updated
5. Order status changes reflect the payment state

This setup ensures that whenever a payment event occurs in Stripe, our 
database is automatically synchronized. The order status always reflects the 
true payment state, which the frontend can display to users.

This is production-ready code - when deployed, the webhook endpoint URL is 
registered in the Stripe dashboard, and Stripe sends events to your 
production server the same way we tested locally with the CLI."
```

---

## 📊 Expected Results

### Segment 1-2:
```
✓ Webhook handler code visible
✓ Event types explained
✓ Stripe CLI listening
✓ Webhook secret displayed
```

### Segment 3:
```
✓ payment_intent.succeeded triggered
✓ CLI shows event received
✓ API returns 200 OK
✓ Console logs: "✅ Payment succeeded"
✓ Database: order.status = "completed"
```

### Segment 4:
```
✓ payment_intent.payment_failed triggered
✓ Webhook received and processed
✓ Console logs: "❌ Payment failed"
✓ Database: order.status = "failed"
```

### Segment 5:
```
✓ charge.refunded triggered
✓ Webhook received and processed
✓ Console logs: "🔄 Refund processed"
✓ Database: order.status = "refunded"
✓ Refund amount tracked
```

### Segment 6:
```
✓ All 3 order statuses visible
✓ All 3 console messages shown
✓ Flow explanation clear
```

---

## 🎯 Key Points to Emphasize

1. **Automatic Synchronization:**
   - Webhooks keep database in sync with Stripe
   - No polling needed
   - Real-time updates

2. **Signature Verification:**
   - Uses webhook secret to verify events are from Stripe
   - Prevents fraudulent events
   - Security best practice

3. **Multiple Event Types:**
   - Different events for different scenarios
   - Each updates order status appropriately
   - Complete payment lifecycle covered

4. **Error Handling:**
   - API returns 200 OK for successful webhook processing
   - 400 for invalid signature
   - 500 for processing errors
   - Stripe retries on failures

5. **Production Ready:**
   - Same code works in production
   - Just register webhook URL in Stripe dashboard
   - Stripe automatically sends events
   - No Stripe CLI needed in production

---

## 🚦 Checklist

- [ ] Dev server running (Terminal 1)
- [ ] Stripe CLI installed and authenticated
- [ ] Stripe listener running (Terminal 2)
- [ ] Webhook secret matches .env.local
- [ ] All 3 code files ready to show
- [ ] Database viewer/terminal ready
- [ ] Screen recording started
- [ ] Segment 1: Setup (1 min)
- [ ] Segment 2: Listener ready (1 min)
- [ ] Segment 3: payment_intent.succeeded (2 min)
- [ ] Segment 4: payment_intent.payment_failed (1.5 min)
- [ ] Segment 5: charge.refunded (1.5 min)
- [ ] Segment 6: Summary (1 min)
- [ ] Total time: 5-7 minutes
- [ ] Video saved and link copied

---

## 💡 Pro Tips

1. **Test Before Recording:**
   - Run all 3 events manually first
   - Verify database updates work
   - Note exact command syntax

2. **Terminal Layout:**
   - Position terminals side-by-side
   - Keep dev server terminal visible
   - Show webhook listener output clearly

3. **Pacing:**
   - Pause after showing each event received
   - Let viewers see console messages
   - Show database updates slowly
   - Emphasize the "automatic update" aspect

4. **Technical Accuracy:**
   - Use correct event type names
   - Show actual database field names
   - Use real Stripe command syntax
   - Mention the webhook secret verification

---

**Status: 🟢 READY TO RECORD**

Follow the segments above for a complete webhook demonstration!
