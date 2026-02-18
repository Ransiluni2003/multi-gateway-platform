# Quick Testing Reference - Coupon Feature

## ⚡ 30-Second Demo

```bash
# 1. Start app
npm run dev:docker

# 2. Open browser
# http://localhost:3001

# 3. Add items to cart → Checkout

# 4. Enter coupon: SAVE10
# See 10% discount applied ✅

# 5. Remove coupon → Total recalculates ✅
```

---

## 🧪 Test Scenarios

### Scenario 1: Valid Coupon (SAVE10)
```
Input:  code="SAVE10", subtotal=99.99
Output: discount=10.00, total=89.99 ✅
```

**Steps:**
1. Go to http://localhost:3001/checkout
2. Add items totaling $99.99
3. Enter "SAVE10"
4. Click "Apply"
5. Verify discount shows as -$10.00
6. Verify total is $89.99

---

### Scenario 2: Expired Coupon (EXPIRED)
```
Input:  code="EXPIRED"
Output: Error: "Coupon has expired" ✅
```

**Steps:**
1. At checkout, enter "EXPIRED"
2. Should see error message
3. No discount applied
4. Cannot proceed with order

---

### Scenario 3: Invalid Coupon
```
Input:  code="NOTREAL"
Output: Error: "Coupon not found" ✅
```

**Steps:**
1. At checkout, enter "NOTREAL"
2. Should see error immediately
3. Input field shows validation error

---

### Scenario 4: Inactive Coupon (INACTIVE)
```
Input:  code="INACTIVE"
Output: Error: "Coupon is inactive" ✅
```

**Steps:**
1. At checkout, enter "INACTIVE"
2. Should see error
3. Reason: Admin disabled this coupon

---

### Scenario 5: Redemption Limit Reached
```
Setup:  Create coupon with maxRedemptions=1
        Place order using coupon (redemptionCount=1/1)
Input:  Same coupon code on new order
Output: Error: "Coupon redemption limit reached" ✅
```

**Steps:**
1. Create coupon via /admin/coupons with maxRedemptions=1
2. Checkout and apply coupon successfully
3. Complete order
4. Start new order
5. Try to apply same coupon → Error

---

### Scenario 6: Percentage Discount (SAVE10 = 10%)
```
Coupon: type="percent", value=10
Input:  subtotal=100
Output: discount=10, total=90 ✅
```

---

### Scenario 7: Fixed Amount Discount (SUMMER20 = $20)
```
Coupon: type="amount", value=20
Input:  subtotal=100
Output: discount=20, total=80 ✅
```

---

### Scenario 8: Discount > Subtotal (edge case)
```
Coupon: type="amount", value=50
Input:  subtotal=30
Output: discount=30 (capped to subtotal), total=0 ✅
```

---

## 🔧 API Testing

### Test Coupon Validation API

```bash
# Using curl
curl -X POST http://localhost:3001/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "SAVE10", "subtotal": 99.99}'

# Expected response:
{
  "valid": true,
  "code": "SAVE10",
  "type": "percent",
  "value": 10,
  "description": "10% off your purchase",
  "subtotal": 99.99,
  "discountAmount": 10.00,
  "total": 89.99
}
```

### Test Coupon Admin API

```bash
# List all coupons
curl http://localhost:3001/api/admin/coupons

# Create new coupon
curl -X POST http://localhost:3001/api/admin/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SPRING30",
    "type": "percent",
    "value": 30,
    "description": "Spring sale - 30% off",
    "maxRedemptions": 100,
    "expiresAt": "2026-03-31T23:59:59Z"
  }'

# Disable coupon
curl -X DELETE http://localhost:3001/api/admin/coupons/SAVE10

# Update coupon
curl -X PATCH http://localhost:3001/api/admin/coupons/SAVE10 \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

---

## 📱 UI Testing Checklist

### Checkout Page
- [ ] CouponApplier card displays
- [ ] Input field is accessible (keyboard + mouse)
- [ ] "Apply" button disabled when input empty
- [ ] Success state shows coupon chip + discount
- [ ] Error state shows red alert with message
- [ ] "Remove" button removes applied coupon
- [ ] Discount amount shows in red (-$X.XX)
- [ ] Total updates dynamically
- [ ] Works on mobile (responsive)

### Admin Coupons Page
- [ ] Table loads with existing coupons
- [ ] Can scroll horizontally on small screens
- [ ] "Create Coupon" button opens dialog
- [ ] Dialog has all required fields:
  - [ ] Code (text)
  - [ ] Type (dropdown: percent/amount)
  - [ ] Value (number)
  - [ ] Description (text)
  - [ ] Max Redemptions (optional number)
  - [ ] Expires At (optional datetime)
- [ ] Form validation works
- [ ] Coupon appears in table after creation
- [ ] Status chip shows Active/Inactive
- [ ] Redemption count displays correctly
- [ ] Disable button works

---

## 🐛 Common Issues & Solutions

### Issue: "Coupon not found" but it exists
**Solution:** 
- Check coupon code case (convert to uppercase)
- Verify coupon is in database: `SELECT * FROM Coupon;`
- Run migrations: `npm run db:migrate`

### Issue: Discount not applying to order
**Solution:**
- Check POST /api/orders includes couponCode
- Verify Order table has coupon columns (run migration)
- Check redemptionCount incremented

### Issue: Admin page shows blank table
**Solution:**
- Check API endpoint: GET /api/admin/coupons
- Run seed script: `npm run db:seed`
- Check browser console for errors

### Issue: CouponApplier component not showing
**Solution:**
- Verify component imported in checkout-content.tsx
- Check component file exists: src/components/CouponApplier.tsx
- Clear Next.js cache: `rm -rf .next && npm run dev`

---

## ✅ Full Test Suite

```bash
# Run E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- checkout

# Run in UI mode
npm run test:e2e:ui

# Run webhook tests
npm run test:webhooks

# Verify Docker
npm run verify:docker
```

---

## 📊 Data Model Verification

### Verify Coupon Table

```sql
-- Check schema
.schema Coupon

-- Should show:
-- code (TEXT, PRIMARY KEY)
-- type (TEXT)
-- value (REAL)
-- expiresAt (DATETIME)
-- maxRedemptions (INTEGER)
-- redemptionCount (INTEGER)
-- isActive (BOOLEAN)
-- description (TEXT)
-- createdAt (DATETIME)
-- updatedAt (DATETIME)

-- Check indices
.indices Coupon
-- Should show isActive_idx and expiresAt_idx
```

### Verify Order Updates

```sql
-- Check Order table has coupon fields
PRAGMA table_info(Order);

-- Should include:
-- couponCode (TEXT)
-- subtotal (REAL)
-- discountAmount (REAL)
```

---

## 🎬 Video Recording Steps (for Loom)

1. **Setup Phase** (0:00-0:30)
   - Start Docker: `npm run dev:docker`
   - Show all services starting ✅

2. **Demo Coupons** (0:30-1:00)
   - List coupons: `curl http://localhost:3001/api/admin/coupons`
   - Show demo data loaded

3. **Apply Valid Coupon** (1:00-2:00)
   - Add items to cart
   - Go to checkout
   - Enter "SAVE10"
   - Show discount applied (-$10.00)
   - Show total updated

4. **Test Invalid Coupon** (2:00-2:30)
   - Enter "INVALID"
   - Show error message

5. **Test Admin Panel** (2:30-3:30)
   - Open http://localhost:3001/admin/coupons
   - Show coupon list
   - Create new coupon "DEMO50" (50% off)
   - Show in list
   - Test with new coupon in checkout

6. **Test Error Scenarios** (3:30-4:00)
   - Try expired coupon "EXPIRED"
   - Try inactive coupon "INACTIVE"
   - Try exceeded limit coupon

---

**Last Updated:** January 29, 2026
