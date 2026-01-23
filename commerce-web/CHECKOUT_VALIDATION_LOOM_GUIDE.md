# Task 3: Checkout Validation - Loom Demo Guide

**Duration:** 5-7 minutes  
**Focus:** Checkout guardrails preventing invalid orders

---

## 🎬 Pre-Recording Setup

### Terminal:
```bash
# Start dev server
cd d:\multi-gateway-platform\commerce-web
npm run dev
```

### Browser Setup:
- Window 1: `http://localhost:3000` (Main app)
- Window 2: DevTools ready (F12)

---

## 📹 Recording Script

### **SEGMENT 1: Empty Cart Blocked (2 minutes)**

**What to show:**
- Clear cart completely
- Try to access checkout page

**Steps:**
1. Navigate to `/cart`
2. Click "Clear Cart" to empty it
3. Confirm cart is empty (shows "Cart is empty")
4. Navigate to `/checkout` manually or click checkout button
5. Show validation error blocking checkout

**What to say:**
```
"First, I'll demonstrate the empty cart validation. When a user tries  
to checkout with an empty cart, the system blocks them with a clear 
error message. Notice the red error alert at the top stating 'Your 
cart is empty. Please add items before checking out.'

The checkout button is disabled, and all form fields are non-interactive. 
There's a helpful 'Go to Cart' button that redirects users back to add items."
```

---

### **SEGMENT 2: Missing Product Data (2 minutes)**

**What to show:**
- Cart with items
- Simulate product data issue by showing error handling

**Steps:**
1. Add product to cart
2. Navigate to `/checkout`
3. Show that valid products pass validation
4. Explain error detection for missing/invalid products

**What to say:**
```
"The system validates every item in the cart before allowing checkout.
It checks:

1. Product exists in database
2. Product has valid name and price
3. Stock is available for requested quantity

If any product fails validation, users see specific error messages like:
- 'Product not found'
- 'Product has invalid data'
- 'Only X in stock (you have Y in cart)'

This prevents orders with corrupted or deleted products."
```

---

### **SEGMENT 3: Stock Validation (2 minutes)**

**What to show:**
- Product with limited stock
- Cart quantity exceeding stock

**Steps:**
1. Add a product with low stock (e.g., 3 items available)
2. Set cart quantity to 5 (more than stock)
3. Navigate to `/checkout`
4. Show error: "Product: Only 3 in stock (you have 5 in cart)"
5. Button disabled, form fields disabled
6. Go back to cart, adjust quantity
7. Checkout now proceeds

**What to say:**
```
"Here's real-time stock validation in action. I added 5 units of a 
product that only has 3 in stock. The checkout page immediately 
detects this mismatch and blocks the transaction.

The error message is specific: 'Only 3 in stock (you have 5 in cart)'.
Users can easily go back to their cart, adjust the quantity, and then 
proceed with checkout.

This prevents overselling and ensures inventory accuracy."
```

---

### **SEGMENT 4: Loading States & Button Behavior (1 minute)**

**What to show:**
- Form validation
- Button disabled when fields empty
- Button enabled when form complete

**Steps:**
1. With valid cart, go to `/checkout`
2. Leave form fields empty
3. Show "Place Order" button is disabled
4. Fill out form fields one by one
5. Button enables when all required fields filled
6. Click "Place Order"
7. Show loading spinner during processing

**What to say:**
```
"The checkout button intelligently enables and disables based on 
validation state. With empty fields, it's disabled. As you fill in 
required information, it becomes active.

When submitting, you see a loading spinner instead of the button 
text, preventing duplicate submissions. All form fields are also 
disabled during processing to avoid race conditions."
```

---

## 📊 Expected Results

### Empty Cart:
```
✓ Error alert visible at top
✓ "Your cart is empty" message shown
✓ Checkout button disabled
✓ Form fields disabled
✓ "Go to Cart" button visible and functional
```

### Invalid Product:
```
✓ Specific error message per issue
✓ "Product not found" or "Invalid data" shown
✓ Checkout blocked
✓ Form inactive
```

### Stock Validation:
```
✓ "Only X in stock" message visible
✓ Current cart quantity shown
✓ Checkout disabled
✓ Can navigate back to cart
```

### Form Validation:
```
✓ Button disabled with empty fields
✓ Button enabled with complete form
✓ Loading spinner during submission
✓ No duplicate submissions possible
```

---

## 🎯 Key Points to Emphasize

1. **Empty Cart Protection:**
   - Prevents wasted time on invalid checkouts
   - Clear messaging guides users back to shopping

2. **Product Validation:**
   - Real-time checks ensure data integrity
   - Specific error messages help users understand issues

3. **Stock Validation:**
   - Prevents overselling
   - Real-time inventory checks
   - Clear quantity mismatch messages

4. **User Experience:**
   - Disabled states prevent frustration
   - Loading indicators show progress
   - No confusing error states

5. **Error Prevention:**
   - Multiple validation layers
   - Form-level and cart-level checks
   - Graceful error handling

---

## 🚦 Checklist

- [ ] Dev server running
- [ ] Cart cleared for empty test
- [ ] Product with low stock ready
- [ ] Browser showing checkout page
- [ ] Screen recording started
- [ ] Segment 1: Empty cart blocked (2 min)
- [ ] Segment 2: Product validation (2 min)
- [ ] Segment 3: Stock validation (2 min)
- [ ] Segment 4: Loading states (1 min)
- [ ] Total time: 5-7 minutes
- [ ] Video saved and link copied

---

**Status: ✅ READY TO RECORD**
