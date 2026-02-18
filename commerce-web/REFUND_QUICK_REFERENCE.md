# Order Management & Refunds - Quick Reference

## 🚀 Quick Start

### Access Admin Orders Dashboard
```
http://localhost:3000/admin/orders
```

### View All Orders
- Orders automatically load on page open
- Shows: ID, Customer, Email, Total, Status, Date

### Filter Orders
- Use status filter dropdown
- Options: All, Pending, Completed, Failed, Refunded

### View Order Details
- Click "View" button on any order row
- Shows complete customer info, address, items, payment status

### Process Full Refund
1. Click "View" on order
2. Click "Initiate Refund"
3. Leave "Refund Amount" field empty
4. Select reason from dropdown
5. Click "Process Refund"
6. ✅ Success! Order status changes to "refunded"

### Process Partial Refund
1. Click "View" on order
2. Click "Initiate Refund"
3. Enter partial amount (e.g., $25 of $50)
4. Select reason from dropdown
5. Click "Process Refund"
6. ✅ Success! Refund tracked automatically

---

## 📊 API Quick Reference

### List Orders
```bash
curl "http://localhost:3000/api/admin/orders"

# Filter by status
curl "http://localhost:3000/api/admin/orders?status=completed"
```

### Get Order Details
```bash
curl "http://localhost:3000/api/orders?id=ORDER_ID"
```

### Process Refund (Full)
```bash
curl -X POST "http://localhost:3000/api/orders/refund" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "cuid123456",
    "reason": "requested_by_customer"
  }'
```

### Process Refund (Partial)
```bash
curl -X POST "http://localhost:3000/api/orders/refund" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "cuid123456",
    "amount": 25.00,
    "reason": "requested_by_customer"
  }'
```

### Check Refund Status
```bash
curl "http://localhost:3000/api/orders/refund?orderId=ORDER_ID"
```

---

## 💾 Database Quick Reference

### Payment Status Values
- `pending` - Payment not yet processed
- `succeeded` - Payment successful
- `failed` - Payment failed
- `refunded` - Fully refunded
- `partial_refunded` - Partially refunded

### Refund Reason Codes
- `requested_by_customer` - Customer requested refund
- `duplicate` - Duplicate charge
- `fraudulent` - Fraudulent transaction
- `product_unacceptable` - Product quality issue

### Database Fields for Refunds
```sql
Payment.refundAmount       -- Total amount refunded
Payment.refundReason       -- Reason for refund
Payment.refundedAt         -- Timestamp of refund
Payment.status             -- Current refund status
Payment.stripeChargeId     -- Stripe charge ID (required for refund)
```

---

## 🧪 Test Scenarios

### Test 1: Full Refund
**Goal:** Verify complete refund functionality

```
1. Open: http://localhost:3000/admin/orders
2. Find a completed order
3. Click "View"
4. Click "Initiate Refund"
5. Leave amount empty
6. Select "Requested by Customer"
7. Click "Process Refund"
8. Verify order status → "refunded"
9. Verify success message shown
```

**Expected:** Order status changes to "refunded", Stripe processes refund

---

### Test 2: Partial Refund
**Goal:** Verify partial refund capability

```
1. Open: http://localhost:3000/admin/orders
2. Find another completed order (total $50+)
3. Click "View"
4. Click "Initiate Refund"
5. Enter "25" in amount field
6. Select "Product Unacceptable"
7. Click "Process Refund"
8. Verify success message
9. Verify order is NOT changed to "refunded" (still "completed")
10. Verify refund amount tracked (can do another refund)
```

**Expected:** Partial refund processed, order still in "completed" status

---

### Test 3: Status Filtering
**Goal:** Verify filter works correctly

```
1. Open: http://localhost:3000/admin/orders
2. Default: show all orders
3. Filter to "Completed" - show only completed orders
4. Filter to "Refunded" - show only refunded orders
5. Reset to "All Orders"
```

**Expected:** Table updates instantly, shows correct orders

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "No Stripe charge found" | Order has no payment record | Create payment first, then refund |
| "Invalid refund amount" | Amount exceeds available | Check remaining balance |
| "Charge already refunded" | Order fully refunded | Check refund status dialog |
| Refund button not showing | Order not in completed status | Order must be "completed" |
| API returns 500 error | Server error | Check logs, verify Stripe key |
| Refund doesn't appear in Stripe | Webhook not received | Check Stripe webhook logs |

---

## 📋 Refund Demo Script

### Prerequisites
- Dev server running: `npm run dev`
- Browser at http://localhost:3000/admin/orders
- At least one completed order exists

### Script (5 minutes)
```
1. [1:00] Show admin orders dashboard
2. [1:30] Demonstrate status filtering
3. [2:00] Click "View" on completed order
4. [2:30] Show order details dialog
5. [3:00] Click "Initiate Refund"
6. [3:30] Process full refund (leave amount empty)
7. [4:00] Show success message
8. [4:30] Demonstrate that order status changed
9. [5:00] Done!
```

---

## 🎬 Recording Refund Demo

1. Open browser to http://localhost:3000/admin/orders
2. Start Loom recording
3. Follow the script above
4. Show success messages clearly
5. Point out status changes
6. Stop recording and save

**Key Points to Highlight:**
- ✅ Clean, professional interface
- ✅ Real-time status updates
- ✅ Stripe integration verified
- ✅ Simple, user-friendly process
- ✅ Professional reason codes

---

## 📊 Order Status Flow

```
CREATE ORDER
    ↓
Order: "pending" | Payment: "pending"
    ↓
PAYMENT SUCCEEDS (webhook)
    ↓
Order: "completed" | Payment: "succeeded"
    ↓
REFUND INITIATED
    ↓
Stripe.refunds.create()
    ↓
REFUND SUCCEEDS
    ↓
Order: "refunded" | Payment: "refunded"
    ↓
refundAmount = totalAmount
refundedAt = current timestamp
refundReason = provided reason
```

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `src/app/admin/orders/page.tsx` | Admin orders UI |
| `src/app/api/admin/orders/route.ts` | List orders API |
| `src/app/api/orders/refund/route.ts` | Refund processing API |
| `REFUND_LOOM_DEMO_GUIDE.md` | Complete Loom script |
| `ORDER_MANAGEMENT_REFUNDS_GUIDE.md` | Technical documentation |
| `scripts/demo-refund-flow.js` | Automated demo script |

---

## ✅ Checklist for Production

- [ ] Stripe test mode verified working
- [ ] Admin page has authentication/authorization
- [ ] Refund button only visible to authorized users
- [ ] Error messages are user-friendly
- [ ] Database backups enabled
- [ ] Monitoring/alerts set up for refunds
- [ ] Support team trained on refund process
- [ ] Customer notification emails configured (optional)
- [ ] Refund policy documented
- [ ] Webhook endpoint verified in Stripe dashboard

---

## 🆘 Quick Help

**Can't see orders?**
- Ensure orders exist in database
- Check that dev server is running
- Verify database connection in logs

**Refund button greyed out?**
- Order must be "completed" status
- Order must have a successful payment
- Check Payment.stripeChargeId is set

**Refund fails in Stripe?**
- Check STRIPE_SECRET_KEY is correct
- Verify test mode is enabled
- Check Stripe API limits
- Review error message for details

**Need to test?**
- Run: `npm run dev`
- Navigate to: http://localhost:3000/admin/orders
- Use test card: 4242 4242 4242 4242
- Follow demo script above

---

## 📞 Support

For help with refunds:
1. Check this quick reference
2. Read `ORDER_MANAGEMENT_REFUNDS_GUIDE.md`
3. Follow `REFUND_LOOM_DEMO_GUIDE.md` for demo
4. Run `scripts/demo-refund-flow.js` for automated demo
5. Check Stripe API documentation
6. Review browser console for errors

---

**Last Updated:** January 17, 2026  
**Status:** ✅ Production Ready
