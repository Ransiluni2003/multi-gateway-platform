# Loom Recording Guide - Commerce Web Stripe Integration

**Date:** January 24, 2026  
**Purpose:** Record 3 demonstration videos to prove complete implementation  
**Total Duration:** ~15 minutes across 3 videos

---

## 🎯 Overview - What You'll Record

| Video # | Topic | Duration | Date Required |
|---------|-------|----------|---------------|
| Video 1 | Stripe CLI Webhook Testing | 5-7 min | 2026-01-20 |
| Video 2 | E2E Test Execution | 3-5 min | 2026-01-21 |
| Video 3 | Orders UI & Status Updates | 4-6 min | 2026-01-21 |

---

## 📋 Pre-Recording Checklist

### ✅ Before You Start:

1. **Install Loom** (if not already installed)
   - Go to: https://www.loom.com/download
   - Install desktop app for Windows
   - Sign in or create free account

2. **Prepare Your Environment**
   ```bash
   cd d:\multi-gateway-platform\commerce-web
   
   # Install dependencies if needed
   npm install
   
   # Make sure database is fresh
   npm run db:reset
   npm run seed
   ```

3. **Close Unnecessary Apps**
   - Close extra browser tabs
   - Close Slack, Discord, etc.
   - Keep only: VSCode, Terminal, Browser

4. **Check Your Setup**
   ```bash
   # Verify test keys are configured
   cat .env.local | Select-String "STRIPE"
   
   # Should see:
   # STRIPE_SECRET_KEY=sk_test_...
   # STRIPE_PUBLISHABLE_KEY=pk_test_...
   # STRIPE_WEBHOOK_SECRET=whsec_test_...
   ```

---

## 🎬 VIDEO 1: Stripe CLI Webhook Testing

**Duration:** 5-7 minutes  
**Purpose:** Prove webhooks work without Stripe dashboard access

### Step 1: Terminal Setup (1 minute)

**Open 3 PowerShell terminals in VSCode:**

Terminal 1 - Dev Server:
```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev
# Wait for: "started server on 0.0.0.0:3000"
```

Terminal 2 - Stripe CLI Listener:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook secret shown: whsec_test_...
```

Terminal 3 - Test Commands:
```bash
# Keep ready for later
cd d:\multi-gateway-platform\commerce-web
```

### Step 2: Show Configuration Files (1 minute)

**In VSCode, open these files in tabs:**
- `.env.local` - Show Stripe keys
- `src/app/api/webhooks/stripe/route.ts` - Show webhook endpoint
- `src/lib/stripe-utils.ts` - Show event handlers

### Step 3: Start Recording 🔴

**Loom Settings:**
- Screen + Camera (or screen only)
- Select "Full Screen" or "VSCode window"
- Click "Start Recording"

### Step 4: Explain Setup (1 minute)

**Script to say:**
```
"Hi, I'm demonstrating our Stripe webhook integration. 

We have three terminals running:
1. Dev server on port 3000
2. Stripe CLI listening for webhook events
3. A terminal ready for test commands

The Stripe CLI is forwarding events to our local webhook endpoint. 
This allows us to test webhooks without needing Stripe dashboard access.

Our webhook handler supports three events: payment succeeded, payment failed, 
and charge refunded."
```

### Step 5: Run Webhook Tests (3 minutes)

**In Terminal 3, run each test:**

Test 1 - Payment Success:
```bash
npm run test:webhooks
```

**As it runs, narrate:**
```
"First test: payment_intent.succeeded event. 
Watch Terminal 2 - you'll see the webhook received.
The order status in the database changes to COMPLETED."
```

**Show the output** - point to:
- ✅ Webhook received in Terminal 2
- ✅ Test output showing status change
- ✅ Idempotency check passed

Test 2 - View Results in Browser:
```bash
# Open browser to: http://localhost:3000/orders
```

**Show:**
- Orders page with different statuses
- COMPLETED order (green badge)
- Point to the updated timestamp

Test 3 - Refund Test:
```bash
# In Terminal 3, trigger refund webhook
# (The test:webhooks command tests all 3 events)
```

**Refresh browser:**
- Show REFUNDED order (blue badge)
- Show refund amount

### Step 6: Show Idempotency (1 minute)

**Run the same test again:**
```bash
npm run test:webhooks
```

**Narrate:**
```
"Now I'll send the same webhook again to demonstrate idempotency.
The system recognizes this is a duplicate event and skips processing.
No duplicate orders created."
```

**Show:**
- Terminal output: "Webhook already processed"
- Orders count unchanged in browser

### Step 7: Wrap Up (30 seconds)

**Script:**
```
"This demonstrates:
1. Webhooks work via Stripe CLI - no dashboard needed
2. All three event types handled correctly
3. Database updates reflected in UI
4. Idempotency prevents duplicate processing

The integration is complete and production-ready."
```

**Stop recording** ⏹️

---

## 🎬 VIDEO 2: E2E Test Execution

**Duration:** 3-5 minutes  
**Purpose:** Show end-to-end test passing (checkout → order → admin view)

### Step 1: Setup (1 minute)

**Open fresh terminals:**

Terminal 1:
```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev
# Wait for server ready
```

Terminal 2:
```bash
cd d:\multi-gateway-platform\commerce-web
# Ready for test command
```

**Open in VSCode:**
- `tests/e2e/checkout-order-admin.spec.ts` - Show test code

### Step 2: Start Recording 🔴

**Loom Settings:**
- Screen + Camera
- Capture full screen or VSCode + Browser

### Step 3: Explain E2E Test (1 minute)

**Show test file and narrate:**
```
"This is our end-to-end test for the complete checkout flow.

The test performs these steps:
1. Creates a product via API
2. Customer browses products page
3. Adds product to cart
4. Completes checkout flow
5. Verifies order created in database
6. Admin logs in and views order
7. Checks order status is correct

Let's run it."
```

### Step 4: Run E2E Test (2 minutes)

**In Terminal 2:**
```bash
npm run test:e2e
```

**As it runs, show:**
- Terminal output showing test progress
- If Playwright opens browser, show:
  - Product page loading
  - Add to cart action
  - Checkout form
  - Order confirmation

**Narrate:**
```
"The test is running through the full customer flow.
Playwright is automating the browser to simulate a real user.
Now it's verifying the admin can see the order."
```

**When test passes:**
```
"Test passed! All assertions verified:
- Order created with correct details
- Status correctly set
- Admin can view the order
- Payment information recorded"
```

### Step 5: Show Test Results (1 minute)

**Open Playwright report:**
```bash
npx playwright show-report
```

**Show:**
- Test duration
- All steps passed
- Screenshots (if any)

**Optional - Run UI Mode:**
```bash
npm run test:e2e:ui
```

**Show Playwright UI:**
- Test timeline
- Step-by-step execution
- Assertions

### Step 6: Wrap Up (30 seconds)

**Script:**
```
"E2E test confirms the complete user journey works:
Customer checkout flows to admin order management seamlessly.
All database updates, UI rendering, and business logic verified."
```

**Stop recording** ⏹️

---

## 🎬 VIDEO 3: Orders UI & Multiple Statuses

**Duration:** 4-6 minutes  
**Purpose:** Demonstrate orders page showing all statuses + live updates

### Step 1: Prepare Demo Data (1 minute)

**Terminal:**
```bash
cd d:\multi-gateway-platform\commerce-web

# Reset and seed database with multiple order statuses
npm run db:reset
npm run seed

# Start dev server
npm run dev
```

**Verify seed created orders:**
```bash
# In another terminal
npm run prisma:studio
# Or check database directly
```

### Step 2: Start Recording 🔴

**Loom Settings:**
- Screen + Camera
- Capture browser + VSCode side by side (if possible)

### Step 3: Show Orders Page (2 minutes)

**Open browser:**
```
http://localhost:3000/orders
```

**Narrate and demonstrate:**
```
"This is the orders admin page showing all customer orders.

Notice we have orders in four different statuses:
- PENDING (yellow badge) - Order created, payment not yet processed
- COMPLETED (green badge) - Payment succeeded
- FAILED (red badge) - Payment failed
- REFUNDED (blue badge) - Order was refunded

Each order shows:
- Order ID and customer name
- Total amount
- Payment status with color-coded badge
- Created and updated timestamps
- Payment method details"
```

**Scroll through orders**, pointing to:
- Different status colors
- Timestamps showing updates
- Payment IDs and charge IDs

### Step 4: Demonstrate Live Updates (2 minutes)

**Option A: Trigger Webhook Event**

In terminal:
```bash
# Send payment success webhook
npm run test:webhooks
```

**Refresh browser**:
```
"I just sent a webhook event for payment success.
Now when I refresh, you can see the order status changed from 
PENDING to COMPLETED. The timestamp also updated."
```

**Option B: Create New Order via API**

```bash
# Use PowerShell to create order
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/orders" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"productId":"123","quantity":1,"customerId":"cust_123"}'
```

**Refresh browser:**
```
"A new order just appeared. It starts in PENDING status.
This is how the real-time flow works - order created immediately,
status updates when webhook arrives."
```

### Step 5: Show Filtering/Sorting (Optional, 1 minute)

If your UI has filters:
```
"The admin can filter orders by status, search by customer name,
or sort by date to find specific orders quickly."
```

**Demonstrate:**
- Click status filter (if exists)
- Show sorting options
- Search functionality

### Step 6: Show Order Details (1 minute)

**Click an order** (if details page exists):
```
"Clicking an order shows full details including:
- All order items
- Payment information
- Customer details
- Status history
- Refund button for completed orders"
```

**Show the refund flow:**
- Click "Refund" button
- Show confirmation modal
- After refund, status changes to REFUNDED

### Step 7: Database Consistency Check (1 minute)

**Split screen: Browser + Database viewer**

Show:
```
"Let's verify data consistency. 
Here's the orders table in the database - same statuses as UI.
The Payment table also reflects the correct status.
Everything stays in sync via webhook handlers."
```

### Step 8: Wrap Up (30 seconds)

**Script:**
```
"This demonstrates:
1. Orders page displays all four statuses with color coding
2. Webhook events trigger real-time status updates
3. UI immediately reflects database changes
4. Admin has full visibility into order lifecycle
5. Refund flow works end-to-end

The system is production-ready with complete order management."
```

**Stop recording** ⏹️

---

## 📤 After Recording - Next Steps

### 1. Review Your Videos

Watch each video once to ensure:
- Audio is clear
- Screen is readable
- All key points covered
- No sensitive data visible (real API keys, passwords, etc.)

### 2. Upload & Get Links

- Go to Loom dashboard
- Find your 3 videos
- Click "Share" on each
- Copy the share link
- Set visibility to "Anyone with the link" or "Public"

### 3. Update Documentation

Create a new file: `LOOM_VIDEOS_EVIDENCE.md`

```markdown
# Loom Video Evidence - Commerce Web Stripe Integration

## Video 1: Stripe CLI Webhook Testing
**Date Recorded:** January 24, 2026  
**Duration:** X minutes  
**Link:** https://www.loom.com/share/xxxxx

**What's Shown:**
- Stripe CLI forwarding webhooks to local server
- All 3 webhook events tested (success, failed, refunded)
- Database updates in real-time
- Idempotency preventing duplicate processing
- No Stripe dashboard required

---

## Video 2: E2E Test Execution
**Date Recorded:** January 24, 2026  
**Duration:** X minutes  
**Link:** https://www.loom.com/share/yyyyy

**What's Shown:**
- Playwright E2E test running
- Full checkout flow automated
- Order creation verified
- Admin can view orders
- All assertions passing

---

## Video 3: Orders UI & Status Updates
**Date Recorded:** January 24, 2026  
**Duration:** X minutes  
**Link:** https://www.loom.com/share/zzzzz

**What's Shown:**
- Orders page with 4 different statuses
- Color-coded status badges
- Real-time updates from webhooks
- Refund flow demonstration
- Database consistency verified
```

### 4. Add Links to Follow-Up Answers

Update [FOLLOW_UP_ANSWERS.md](FOLLOW_UP_ANSWERS.md):

Add at the top:
```markdown
## 🎬 Video Demonstrations

**All three Loom videos recorded:** ✅

1. **Stripe Webhook Testing** - [Watch Video](https://www.loom.com/share/xxxxx)
2. **E2E Test Execution** - [Watch Video](https://www.loom.com/share/yyyyy)  
3. **Orders UI & Status Updates** - [Watch Video](https://www.loom.com/share/zzzzz)

See detailed descriptions in [LOOM_VIDEOS_EVIDENCE.md](LOOM_VIDEOS_EVIDENCE.md)
```

---

## 🎯 Quick Checklist

Use this while recording:

### Video 1 - Stripe Webhooks ✓
- [ ] Show .env.local with Stripe keys
- [ ] Show webhook handler code
- [ ] Start Stripe CLI listener
- [ ] Run webhook tests
- [ ] Show Terminal 2 receiving events
- [ ] Show browser orders page updating
- [ ] Demonstrate idempotency
- [ ] All 3 events tested (success, failed, refunded)

### Video 2 - E2E Test ✓
- [ ] Show test file code
- [ ] Run `npm run test:e2e`
- [ ] Show test execution in terminal
- [ ] Show browser automation (if visible)
- [ ] Show test passing
- [ ] Show Playwright report
- [ ] Verify all assertions passed

### Video 3 - Orders UI ✓
- [ ] Show orders page with 4 statuses
- [ ] Point out color coding
- [ ] Show PENDING orders
- [ ] Show COMPLETED orders
- [ ] Show FAILED orders
- [ ] Show REFUNDED orders
- [ ] Trigger live update via webhook
- [ ] Show refund flow
- [ ] Verify database consistency

---

## 💡 Pro Tips

### For Better Video Quality:

1. **Audio:**
   - Use headset microphone
   - Close windows to reduce background noise
   - Speak clearly and not too fast

2. **Screen:**
   - Increase font size in VSCode (Ctrl + Plus)
   - Increase terminal font size
   - Use dark theme for less eye strain
   - Close unnecessary windows

3. **Browser:**
   - Zoom to 110-125% for readability
   - Close extra tabs
   - Clear browser console before recording

4. **Pacing:**
   - Pause for 2 seconds between major steps
   - Let viewers see the results before moving on
   - Don't rush through terminal output

5. **Narration:**
   - Say what you're about to do before doing it
   - Explain what the output means
   - Point out key results with mouse cursor

### Common Mistakes to Avoid:

- ❌ Starting recording before server is ready
- ❌ Speaking too fast or mumbling
- ❌ Not showing terminal output long enough
- ❌ Forgetting to refresh browser to show updates
- ❌ Not explaining what's happening
- ❌ Showing real API keys (always use test keys)
- ❌ Too much silence - keep narrating

### If You Make a Mistake:

- Option 1: Pause, take breath, continue (Loom allows editing)
- Option 2: Stop recording, start fresh
- Option 3: Record in segments, combine later

---

## 🚀 Ready to Record?

Follow this order:

1. **Read this guide completely** ✓
2. **Run the Pre-Recording Checklist** ✓
3. **Record Video 1** (Webhooks) ✓
4. **Record Video 2** (E2E Test) ✓
5. **Record Video 3** (Orders UI) ✓
6. **Upload & Share Links** ✓
7. **Update Documentation** ✓

---

## ❓ Troubleshooting

### Stripe CLI not working?
```bash
# Reinstall or re-authenticate
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### E2E test failing?
```bash
# Make sure dev server is running first
npm run dev
# Then in another terminal:
npm run test:e2e
```

### Orders not showing?
```bash
# Reseed database
npm run db:reset
npm run seed
# Refresh browser
```

### Loom not recording?
- Check camera/microphone permissions
- Restart Loom app
- Try browser extension instead of desktop app

---

## 📞 Need Help?

If you get stuck:
1. Check error messages in terminal
2. Review [HOW_TO_RUN_LOCALLY.md](HOW_TO_RUN_LOCALLY.md)
3. Re-read relevant section of this guide
4. Try recording in smaller segments

---

**Good luck with your recordings! 🎬**

You've built an amazing system - now show it off! 💪
