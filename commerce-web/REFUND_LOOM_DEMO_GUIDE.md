# 🎥 Refund Loom Demo Guide
## Complete Script for Recording Order Management & Refunds

---

## 📋 Pre-Recording Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Browser zoomed to 150% for visibility
- [ ] Admin orders page loaded
- [ ] Test order created or existing order available
- [ ] Terminal ready for API calls
- [ ] Stripe test mode verified
- [ ] Microphone tested and unmuted
- [ ] Screen share set to browser window only

**Recording Length:** 12-15 minutes  
**Audience:** Supervisor/Manager  
**Goal:** Show complete order lifecycle with refund handling

---

## 🎬 SEGMENT 1: Introduction (0:00-1:00)

### Talking Points:
"We've implemented a complete order management system with full refund capabilities. This demo shows how admins can:
1. View all orders in a searchable dashboard
2. Filter orders by status
3. Process both full and partial refunds
4. Track refund status in real-time"

### Action:
- **SHOW:** Admin Orders page title and overview
- **PAUSE:** Let supervisor see the clean interface
- **HIGHLIGHT:** Order count, status chips, filter dropdown

**Key Message:** "Everything is tracked, secure, and Stripe-integrated."

---

## 🎬 SEGMENT 2: Order List & Filtering (1:00-3:00)

### Talking Points:
"First, let's look at the order dashboard. We can see all orders with key information:
- Order ID (with truncated display for security)
- Customer name and email
- Order total
- Current status (pending, completed, refunded, failed)
- Creation date

We can also filter by status to quickly find specific orders."

### Actions:
1. **SHOW:** Full orders table
   - Scroll through list
   - Show multiple orders if available
   - Point out status colors (green=completed, red=refunded)

2. **DEMO:** Status filtering
   - Click filter dropdown
   - Show options: All Orders, Pending, Completed, Failed, Refunded
   - Select "Completed" to filter
   - Show results update instantly
   - Reset to "All Orders"

### Key Points:
- ✅ Clean, organized interface
- ✅ Real-time filtering works instantly
- ✅ All critical info visible at a glance
- ✅ Easy to find specific orders

---

## 🎬 SEGMENT 3: Order Details (3:00-5:00)

### Talking Points:
"Now let's look at a specific order. When we click 'View' on any order, we see the complete details in a dialog:
- Full order ID and timestamp
- Complete customer information
- Full shipping address
- Order total amount
- Current status
- All items in the order with prices
- Refund information if applicable"

### Actions:
1. **CLICK:** "View" button on a completed order
2. **SHOW:** Order details dialog
   - Point to each field as you read them
   - Show customer info section
   - Scroll down to show items list
   - Highlight the order total prominently

3. **IMPORTANT:** If order is completed but NOT refunded:
   - Show the "Initiate Refund" button
   - Say: "This order is eligible for refund. We can process it right now."

### Key Points:
- ✅ All order information in one place
- ✅ Clear status display
- ✅ Item-level detail showing what was purchased
- ✅ Ready for refund action if needed

---

## 🎬 SEGMENT 4: Initiating Refund (5:00-9:00)

### Talking Points:
"The refund process is straightforward. Click 'Initiate Refund' to open the refund dialog. You have two options:
1. Full refund - leave the amount field empty
2. Partial refund - enter a specific amount

You also select the refund reason for compliance:
- Requested by Customer (most common)
- Duplicate
- Fraudulent
- Product Unacceptable"

### Actions - Full Refund Demo:

1. **CLICK:** "Initiate Refund" button
2. **SHOW:** Refund dialog appears
3. **READ ALOUD:** Dialog content
   - Order ID
   - Original total amount
   - Amount refunded so far (if any)
4. **LEAVE:** Amount field empty (for full refund)
5. **SELECT:** Reason dropdown
   - Show options
   - Select "Requested by Customer"
6. **CLICK:** "Process Refund" button
7. **WAIT:** Show processing state (spinner)

### Success Message:
```
✓ Full refund processed successfully
```

8. **SHOW:**
   - Refund ID (from Stripe)
   - Amount refunded
   - Status (succeeded)
   - Updated order status (now "refunded")

9. **WAIT 2 seconds** for message to sink in

### Key Points:
- ✅ Simple, clear refund dialog
- ✅ Protection against accidental refunds (must click confirm)
- ✅ Reason tracking for compliance
- ✅ Instant success feedback
- ✅ Order status updated automatically

---

## 🎬 SEGMENT 5: Partial Refund (9:00-12:00)

### Talking Points:
"What if the customer only needs a partial refund? We can handle that too. Let me select another order and show a partial refund."

### Actions:
1. **CLOSE** current dialog
2. **SELECT** another completed order (or create new one)
3. **CLICK:** "View" button
4. **CLICK:** "Initiate Refund"
5. **ENTER:** Partial amount (e.g., if total is $50, enter $20)
6. **SELECT:** Different reason (e.g., "Duplicate")
7. **CLICK:** "Process Refund"

### Show Results:
- Success message appears
- Show the refund confirmation with amount
- Point out order status changed appropriately
- Close dialog

### Explain:
"As you can see, partial refunds update the refund amount in the system. The remaining balance is tracked separately. If you need to refund more later, you can process additional refunds until the full amount is refunded."

### Key Points:
- ✅ Flexible refund amounts
- ✅ Multiple refunds supported
- ✅ Automatic tracking of total refunded
- ✅ Professional reason codes
- ✅ Stripe integration verified

---

## 🎬 SEGMENT 6: Verification & Summary (12:00-15:00)

### Talking Points:
"Let me show you the backend verification. The refund data is stored with:
1. Original payment information
2. Refund amounts and timestamps
3. Refund reasons
4. Stripe reference IDs

This ensures complete audit trail for compliance."

### Actions:
1. **OPEN** browser DevTools (F12)
2. **GO TO:** Application > Local Storage
3. **FIND:** Recent API calls or network tab
4. **SHOW:** Refund API response with:
   - Stripe refund ID
   - Amount
   - Status
   - Timestamp

OR alternatively:

1. **OPEN** Terminal
2. **SHOW:** Recent logs from `npm run dev`
3. **HIGHLIGHT:** Refund processing messages

### Final Message:
"The entire refund process is:
- ✅ Automated with Stripe
- ✅ Tracked in our database
- ✅ Compliant with Stripe's security
- ✅ Reversible within Stripe's guidelines
- ✅ User-friendly for admins

This means your support team can quickly process refunds without coding or direct Stripe access."

---

## 📊 Expected Outcomes Summary

By the end of this demo, your supervisor should see:

✅ **Admin Dashboard**
- Professional order management interface
- Clear status indicators
- Easy filtering and search

✅ **Order Details**
- Complete order information
- Customer data
- Item-level details

✅ **Refund Capability**
- Full refund support
- Partial refund support
- Multiple refund tracking
- Reason codes for compliance

✅ **Integration**
- Real-time Stripe integration
- Automatic status updates
- Audit trail

✅ **User Experience**
- Clear dialogs
- Instant feedback
- Professional UI

---

## 🎤 Expected Questions & Answers

### Q: Can customers request refunds themselves?
**A:** "The system currently provides admin refund capability. We can add a customer portal later if needed. For now, customers contact support, and admins process refunds through this dashboard."

### Q: What if a refund fails?
**A:** "The system displays clear error messages. Common failures include:
- Charge already refunded
- Refund exceeding original amount
- Network issues (retry available)
Each is handled with specific error messages."

### Q: Is this secure?
**A:** "Yes. All refunds go through Stripe's secure API. We verify webhook signatures using HMAC-SHA256. Refund reasons are logged for compliance. Only admins can initiate refunds."

### Q: Can we track refunds over time?
**A:** "Absolutely. Each payment record stores:
- Refund amount
- Refund timestamp
- Refund reason
- Stripe refund ID
You can query this data for reporting."

### Q: What's the refund timeline?
**A:** "Stripe processes refunds to the customer's account within 5-10 business days. Our system shows the refund as processed immediately after Stripe confirms it."

### Q: Multiple refunds on one order?
**A:** "Yes. You can process multiple partial refunds until fully refunded. The system tracks the total refunded amount and prevents refunding more than the original charge."

---

## 💡 Pro Recording Tips

1. **Pacing:** Speak slowly and clearly. Pause after completing each action.
2. **Screen Size:** Keep font size large (150% zoom) for readability
3. **Narration:** Explain what you're doing BEFORE you do it
4. **Pauses:** Add 2-3 second pauses after key actions for comprehension
5. **Success States:** Always show the success message for 3-5 seconds
6. **Error Handling:** If something goes wrong, explain what happened and why
7. **Eye Contact:** Look at camera occasionally (if recording with webcam overlay)
8. **Background:** Clean, professional desktop
9. **Audio:** Speak into microphone, avoid background noise

---

## 📝 Script Word Count & Timing

- **Introduction:** ~150 words (1 min)
- **Order List & Filtering:** ~200 words (2 min)
- **Order Details:** ~180 words (2 min)
- **Full Refund:** ~220 words (4 min)
- **Partial Refund:** ~150 words (3 min)
- **Verification:** ~180 words (2 min)
- **Q&A Preview:** ~120 words (1 min)

**Total:** ~1,180 words for 12-15 minute video

---

## ✅ Post-Recording Checklist

- [ ] Video recorded without major mistakes
- [ ] Audio clear and audible
- [ ] All segments completed
- [ ] Refunds processed successfully shown
- [ ] Status updates visible
- [ ] Success messages captured
- [ ] Export video in HD quality
- [ ] Upload to Loom (get shareable link)
- [ ] Test link before sharing

---

## 🚀 Ready to Record?

1. **Start Loom**
2. **Select screen** (browser window)
3. **Start recording**
4. **Follow segments 1-6 above**
5. **Stop recording**
6. **Export and share**

**You've got this! Your supervisor will be impressed.** 🎉

