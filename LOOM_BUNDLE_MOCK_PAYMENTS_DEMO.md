# Loom Demo Script: Bundle Products + Mock Payments
## 2-Minute Walkthrough

### Total Duration: ~2 minutes
**Format:** Screen recording with voiceover

---

## Timeline & Talking Points

### **0:00 - 0:15 - INTRO (15 seconds)**

**Scene:** Show desktop with VSCode open showing the feature files

**Narration:**
"Hi! I'm demonstrating the new Bundle Products and Mock Payment Gateway features we just built. We have a complete API for managing product bundles, a mock payment system for testing, and a powerful admin dashboard for transaction management. Let me show you how it all works."

**Action:**
- Point to folder structure: `backend/src/models`, `backend/src/services`, `frontend/app/admin/transactions`

---

### **0:15 - 0:45 - BUNDLE CREATION (30 seconds)**

**Scene:** Open Postman, show "Create Bundle" request

**Narration:**
"First, let's create a bundle. We have a Starter Pack with two widgets and a 10% discount applied. I'll send this request and you can see it calculates the total price including tax automatically."

**Actions:**
1. Click on "Bundle Products" → "Create Bundle" in Postman
2. Show the request body with:
   - Items: Widget A (quantity 2, $19.99), Widget B (quantity 1, $39.99)
   - Discount: 10% percentage discount
3. Send request
4. Show response:
   - ✅ Status 201 (Created)
   - Bundle ID generated
   - Pricing object shows:
     - basePrice: ~$79.97
     - discountAmount: ~$7.99
     - tax: ~$5.76
     - total: ~$77.74
5. Copy bundle_id to environment variable

**Talking Points:**
- Our discount engine supports 4 types: percentage, fixed, tiered, BOGO
- Pricing is calculated automatically with tax
- All discounts are stacked properly

---

### **0:45 - 1:15 - PAYMENT SUCCESS FLOW (30 seconds)**

**Scene:** Postman → "Mock Payments - Success Flow"

**Narration:**
"Now let's process a payment. We'll authorize $69.11 with our test success card number. Notice it immediately shows the authorization is successful with an expiration date. Then we'll capture the payment, which locks in the funds."

**Actions:**
1. Click "Authorize Payment (Success)" request
2. Show payment_method with card: `4242424242424242` (success pattern)
3. Show amount: $69.11
4. Send request
5. Show response:
   - ✅ Status 200
   - transaction_id generated (e.g., `txn_abc123...`)
   - status: "success"
   - authorized_at and expires_at timestamps
6. Copy transaction_id to environment
7. Click "Get Transaction Details"
   - Show events array with `payment.authorized` event
8. Click "Capture Payment" 
9. Send capture request
10. Show response:
    - status: "captured"
    - captured_at timestamp
    - new capture transaction_id

**Talking Points:**
- Our payment flow mimics real gateways: authorize → capture → refund
- Each action creates an event for audit trail
- We track authorization expiration (7 days)

---

### **1:15 - 1:40 - PAYMENT FAILURE & ADMIN UI (25 seconds)**

**Scene:** Postman → "Mock Payments - Failure Scenarios"

**Narration:**
"Let me show you failure handling. If we try with a declined card number, we get a proper error response. Now let's check out the admin dashboard where you can see all transactions in real-time."

**Actions:**
1. Show "Card Declined" request with card: `4000000000000002`
2. Send request
3. Show error response:
   - ❌ Status 400
   - error_code: "card_declined"
   - error_message: "Your card was declined"
4. Switch to browser: `http://localhost:3001/admin/transactions`
5. Show transactions table with multiple transactions (success + declined)
6. Show table columns: Transaction ID, Order ID, Type, Status, Amount, Created At

**Talking Points:**
- We provide 6 deterministic card patterns for testing all scenarios
- The admin dashboard shows all transactions in a clean table

---

### **1:40 - 2:00 - ADMIN FEATURES (20 seconds)**

**Scene:** Admin dashboard

**Narration:**
"The admin panel has powerful filtering. You can filter by status, type, and date range. You can export all transactions to CSV. And you can click any transaction to see the full event timeline and process refunds."

**Actions:**
1. Click Status filter dropdown → Select "success"
2. Show table filtered to only success transactions
3. Click "Export CSV" button
   - Shows download happening
   - Mention CSV has transaction_id, order_id, type, status, amount, etc.
4. Click "View Details" on a captured transaction
   - Show modal with transaction details
   - Show Event Timeline section with:
     - payment.authorized ✅
     - payment.captured ✅
   - Show "Process Refund" button (if applicable)
5. Click "Process Refund" (or at least show it's there)
   - Confirm dialog appears
   - Show refund processes successfully

**Talking Points:**
- Multi-filter system for powerful transaction search
- CSV export for reporting and analysis
- Event timeline shows complete audit trail
- Admin can process refunds directly from this interface

---

### **2:00 - WRAP-UP (Outro)**

**Narration:**
"That's the complete feature! We have the Bundle Products API for creating and pricing bundles with flexible discounts, the Mock Payment Gateway for testing payment flows, and the Admin Dashboard for managing transactions. All endpoints are in the Postman collection, and we've got comprehensive tests covering all scenarios. The code is production-ready and fully documented."

**Final Scene:**
- Show file: `Bundle-Mock-Payments.postman_collection.json`
- Show files: PR documentation + implementation guide
- Quick screen capture of GitHub repo

---

## Recording Tips

### Equipment
- Screen resolution: 1920x1080 or higher
- Microphone: Clear, without background noise
- Screen recording tool: OBS, Loom, QuickTime, etc.

### Recording Best Practices
1. **Zoom:** Set VSCode and browser zoom to 125% for readability
2. **Dark Theme:** Use dark theme in IDE and Postman for contrast
3. **Pace:** Speak slowly and clearly, let each action settle for 1-2 seconds
4. **Pauses:** Add natural pauses between major sections
5. **Scroll:** Scroll slowly to make text readable
6. **Click Visibility:** Make sure clicks are visible/highlighted

### Recording Checklist
- [ ] Backend server running on port 5000
- [ ] Frontend running on port 3001
- [ ] Postman collection imported
- [ ] Test transactions created in database (for admin UI demo)
- [ ] Browser and IDE properly positioned
- [ ] Microphone tested and recording level set
- [ ] Screen recording software tested

---

## Detailed Script by Section

### SECTION 1: INTRO (0:00-0:15)

**Full Script:**
"Hi! I'm demonstrating the new Bundle Products and Mock Payment Gateway features that we've just implemented for our multi-gateway platform. This feature set includes three major components: a Bundle Builder API that lets you create and manage product bundles with flexible pricing, a Mock Payment Gateway for testing payment scenarios, and an Admin Dashboard for comprehensive transaction management. Let me walk you through how each piece works and how they integrate together."

**Visuals:**
- Show file explorer: `backend/src/` structure
- Show `models/` folder with Bundle, BundleItem, BundleDiscount, MockTransaction files
- Show `services/` folder with discountEngine, bundleService, mockPaymentService
- Show `frontend/app/admin/transactions/` files
- Show `Bundle-Mock-Payments.postman_collection.json`

---

### SECTION 2: BUNDLE CREATION (0:15-0:45)

**Full Script:**
"Let's start with bundle creation. I'll open our Postman collection where I've pre-configured all the API requests. Here's the Create Bundle endpoint. As you can see, we're creating a 'Starter Pack' with two products: Widget A which we'll include two of at $19.99 each, and Widget B for $39.99. We're also applying a 10% discount to the entire bundle. When I send this request, the system automatically calculates the final price including tax. Let me send it... and here's the response. We get a bundle ID, a breakdown of the pricing showing the base price, discount amount, subtotal, tax, and final total. The bundle is now created and stored in the database with all its items and discount rules."

**Visuals:**
- Click Postman: "Bundle Products" folder
- Show POST /api/bundles request
- Highlight the body with items array and discounts
- Send request
- Highlight response: bundle id, pricing object
- Show calculations:
  - basePrice: (19.99 × 2) + 39.99 = 79.97
  - discount: 79.97 × 0.10 = 7.997
  - subtotal: 79.97 - 8.00 = 71.97
  - tax: 71.97 × 0.08 = 5.76
  - total: 77.73

---

### SECTION 3: PAYMENT SUCCESS FLOW (0:45-1:15)

**Full Script:**
"Now let's process a payment for this bundle. I'll switch to the Success Flow section. Here's our Authorize Payment request. Notice the payment_method object with our test card number. We have six different card patterns for testing: this one is 4242-4242-4242-4242, which is our success pattern. We're authorizing $69.11 with order ID and metadata linking it back to the bundle. Let me send this... Great! We get a successful authorization with a transaction ID and an expiration date seven days from now. Now I'll get the transaction details to show you the event trail. As you can see, there's an event object showing the authorization event with timestamp. Now let's capture the payment to lock in the funds. I'll click Capture... and it succeeds. Notice it creates a new capture transaction linked to the original authorization. This is the standard payment flow: authorize first to verify funds, then capture to actually charge the card."

**Visuals:**
- Click Postman: "Mock Payments - Success Flow"
- Show POST /api/payments/mock/authorize
- Highlight: card_number: 4242424242424242
- Send, show response with transaction_id
- Click GET transaction details
- Show events array
- Show POST /api/payments/mock/capture
- Send capture
- Show success response with new transaction_id

---

### SECTION 4: FAILURE SCENARIOS (1:15-1:40)

**Full Script:**
"Let me quickly show you how we handle failures. I'll switch to the Failure Scenarios section. Here's a Card Declined request with a different test card. When I send this... we get a 400 error with error_code 'card_declined' and a helpful message. We support six different failure patterns, each representing a different decline reason. Now let's see all these transactions in our admin dashboard. I'll open the browser and navigate to the transactions page."

**Visuals:**
- Show POST /api/payments/mock/authorize with 4000000000000002
- Send request
- Show error response: status 400, error_code, error_message
- Switch to browser
- Navigate to http://localhost:3001/admin/transactions
- Show transactions table with success and declined transactions

---

### SECTION 5: ADMIN FEATURES (1:40-2:00)

**Full Script:**
"Perfect! Here's the Admin Transactions Dashboard. You can see all transactions in a clean table. The dashboard has powerful filtering capabilities. I can filter by status - let me select 'success' to show only successful transactions. I can also filter by transaction type, order ID, and date range. I can export all visible transactions to CSV for reporting. When I click on a transaction to see details, a modal opens showing the complete transaction history with an event timeline showing each step. For captured transactions, I can process a refund directly from here. Let me click Process Refund... it asks for confirmation, and when confirmed, the refund processes successfully and the transaction status updates to refunded."

**Visuals:**
- Show transactions table
- Click Status filter: select "success"
- Show table filtered
- Click "Export CSV" - show download
- Click "View Details" on a transaction
- Show modal with details and event timeline
- Show "Process Refund" button
- Click it (or show it exists)
- Show refund confirmation dialog
- Show success message

---

### SECTION 6: WRAP-UP (2:00 onwards)

**Full Script:**
"And that's the complete feature set! We have three integrated components working together: the Bundle API for creating and pricing product bundles with flexible discount rules including percentage, fixed, tiered, and BOGO discounts; the Mock Payment Gateway that simulates real payment processing with deterministic test cards for comprehensive testing; and the Admin Dashboard that gives you full visibility and control over all transactions with filtering, export, and refund capabilities. Everything is documented, tested, and ready for production. All API endpoints are organized in the Postman collection with pre-written test scripts, and we have comprehensive coverage of all success and failure scenarios. Thanks for watching!"

**Visuals:**
- Show PR file: PR_BUNDLE_MOCK_PAYMENTS.md
- Show implementation plan: BUNDLE_PRODUCTS_MOCK_PAYMENTS_PLAN.md
- Show Postman collection file
- Quick final shot of GitHub repo

---

## Audio Notes

### Tone & Pace
- Professional but friendly
- Speak clearly and at a moderate pace
- Emphasize key features and capabilities
- Let visual changes settle before speaking about the next item

### Key Phrases to Emphasize
- "Flexible discount engine"
- "Deterministic testing patterns"
- "Complete audit trail"
- "Real-time dashboard"
- "Production-ready"

---

## Post-Recording

### Editing
1. Trim intro/outro silence
2. Add title card (optional)
3. Color correct if needed
4. Ensure audio levels are consistent
5. Export as MP4 for Loom/YouTube

### Upload to Loom
1. Sign in to loom.com
2. Click "+ New recording"
3. Choose "Upload"
4. Select MP4 file
5. Add title: "Bundle Products + Mock Payments Demo"
6. Add description with feature highlights
7. Set sharing to "Public" or "Shared link"
8. Copy link to PR

### Verification Checklist
- [ ] Demo is 2 minutes or less
- [ ] All audio is clear and audible
- [ ] All text is readable on screen
- [ ] Demo flows smoothly
- [ ] All features are shown
- [ ] Code quality is evident
- [ ] Recording is in HD

---

## Alternative: Live Walkthrough

If recording feels too rushed, you can do a **live demonstration** instead:

1. **Setup:** Run both servers before starting
2. **Structure:** Follow timeline above, but speak naturally
3. **Backup Plan:** Have Postman collection ready if UI has issues
4. **Q&A:** Save 5 minutes for questions
5. **Record:** Use Zoom/Loom to record live session

---

**Total Production Time:** 15-30 minutes (including setup, recording, and basic editing)

