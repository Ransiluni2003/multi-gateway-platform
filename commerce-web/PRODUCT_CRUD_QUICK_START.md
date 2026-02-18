# Quick Start: Product CRUD Testing

## 🚀 Get Started in 3 Steps

### Step 1: Verify Server is Running
```bash
# Terminal should show:
# ✓ Ready in XXXms
# Local: http://localhost:3000
```

### Step 2: Test as Customer
1. Open: http://localhost:3000/products
2. **Expected**: See 3 products in grid layout
   - Wireless Headphones ($79.99)
   - USB-C Cable ($19.99)
   - Phone Case ($24.99) - inactive
3. Try search: Type "headphones"
4. Try filter: Select "Inactive"

### Step 3: Test as Admin
1. Open: http://localhost:3000/login
2. Enter credentials:
   - Email: `pransiluni@gmail.com`
   - Password: `pinithi123`
3. Click "Login"
4. Go to: http://localhost:3000/admin/products
5. **Expected**: Admin panel with product table

---

## ✅ Quick Test Checklist

### Basic CRUD
- [ ] See products on customer page
- [ ] Search works (narrows results)
- [ ] Status filter works
- [ ] Login as admin works
- [ ] Admin product page loads
- [ ] Create product button works
- [ ] Edit button works
- [ ] Delete button works

### Form Validation
- [ ] Cannot create without name
- [ ] Cannot create without price
- [ ] Decimal prices work (e.g., 19.99)
- [ ] Stock updates correctly

### Real-time Updates
- [ ] Create product → appears in table immediately
- [ ] Edit product → changes visible immediately
- [ ] Delete product → removed from table immediately
- [ ] Changes appear for customers on refresh

---

## 🐛 Troubleshooting

### Issue: "Unable to connect to server"
**Solution**: 
- Ensure dev server is running: `npm run dev`
- Check port 3000 is available
- Try http://localhost:3000/health or just http://localhost:3000

### Issue: Login fails with "Invalid credentials"
**Solution**:
- Double-check email: `pransiluni@gmail.com`
- Double-check password: `pinithi123`
- Clear browser cookies and try again

### Issue: Products don't load
**Solution**:
- Check browser console (F12) for errors
- Refresh page
- Check server terminal for error messages
- Verify API endpoint: http://localhost:3000/api/products

### Issue: Can't delete/edit as admin
**Solution**:
- Ensure you're logged in (check header shows your email)
- Check browser console for 403 Forbidden errors
- Verify JWT cookie exists in DevTools → Cookies

### Issue: Form says "Required" but fields are filled
**Solution**:
- Clear extra spaces in fields
- Ensure price is a valid number
- Try refreshing page

---

## 📊 API Testing (Using Browser)

### View All Products
```
GET http://localhost:3000/api/products
```

### Search Products
```
GET http://localhost:3000/api/products?search=cable
```

### Filter by Status
```
GET http://localhost:3000/api/products?status=active
```

### Get Single Product
```
GET http://localhost:3000/api/products?id=prod1
```

### Create Product (Admin - requires login)
1. Open DevTools (F12)
2. Go to Console tab
3. Paste and modify:
```javascript
fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Test Product",
    price: 99.99,
    description: "Test description",
    images: ["https://via.placeholder.com/300"],
    stock: 10,
    status: "active"
  })
}).then(r => r.json()).then(d => console.log(d))
```

---

## 📸 Visual Inspection

### Customer Page (`/products`)
Expected Layout:
```
┌─ Search Bar ─ Status Filter ─ Search Button ─┐
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Product │  │ Product │  │ Product │     │
│  │  Card 1 │  │  Card 2 │  │  Card 3 │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                              │
│  Product count: 3 total                     │
└──────────────────────────────────────────────┘
```

### Admin Page (`/admin/products`)
Expected Layout:
```
┌─ Product Management ─────── Add Product Button ─┐
│                                                  │
│  Search Box │ Status Filter │ Showing 3 of 3   │
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ Name        │ Price  │ Stock │ Status│ Act. ││
│  │─────────────┼────────┼───────┼──────┼──────│
│  │ Headphones  │ $79.99 │ 15    │Active│ ✎ ✗  │
│  │ Cable       │ $19.99 │ 50    │Active│ ✎ ✗  │
│  │ Phone Case  │ $24.99 │ 0     │Off   │ ✎ ✗  │
│  └─────────────────────────────────────────────┘
│                                                  │
│  [Edit Dialog/Form visible when clicked]       │
└──────────────────────────────────────────────────┘
```

---

## 🎬 5-Minute Demo Script

**Total Time: ~5 minutes**

### Part 1: Customer Experience (1 min)
1. Open `/products`
2. Show grid of 3 products
3. Search: "cable" → shows 1
4. Filter: "Inactive" → shows Phone Case
5. Reset filters

### Part 2: Admin Creation (1.5 min)
1. Login as admin
2. Go to `/admin/products`
3. Click "Add Product"
4. Create: "Screen Protector" / $14.99 / 30 stock
5. Submit → appears in table

### Part 3: Admin Editing (1.5 min)
1. Edit "Wireless Headphones"
2. Change price to $89.99
3. Change stock to 5
4. Update → see changes immediately

### Part 4: Admin Deletion (0.5 min)
1. Delete the "Screen Protector"
2. Confirm → gone from table

### Part 5: Verification (0.5 min)
1. Refresh customer page
2. Show products reflect admin changes

**Key Talking Points:**
- "Full CRUD with role-based access"
- "Real-time updates across admin and customer views"
- "Protected API endpoints prevent unauthorized access"
- "Form validation on both client and server"

---

## 📱 Mobile Testing

Test on mobile/tablet (F12 → Toggle Device Toolbar):

**Customer Page**
- [ ] Grid collapses to 1-2 columns ✓
- [ ] Search and filter accessible ✓
- [ ] Product cards readable ✓
- [ ] Buttons clickable ✓

**Admin Page**
- [ ] Table scrolls horizontally ✓
- [ ] Actions buttons accessible ✓
- [ ] Dialog opens properly ✓
- [ ] Form inputs sized for mobile ✓

---

## 🎓 Learning Notes

### How CRUD Works Here

**CREATE**: 
- Form → Validate → Send POST → API creates → Return new ID

**READ**: 
- Fetch GET → Parse response → Filter in memory → Display

**UPDATE**:
- Get ID → Populate form → Send PUT → Update in memory → Refresh UI

**DELETE**:
- Get ID → Confirm → Send DELETE → Remove from memory → Refresh UI

### Why Mock Prisma?
- **Reason**: Prisma 7 requires compile-time datasource configuration
- **Solution**: In-memory Map that implements Prisma interface
- **Trade-off**: No persistence (data lost on server restart)
- **Production**: Replace with real SQLite/PostgreSQL + proper adapter

---

## 📚 Files to Review

After testing, explore these files:
- `src/app/admin/products/page.tsx` - Admin component
- `src/app/products/page.tsx` - Customer component
- `src/app/api/products/route.ts` - API endpoint
- `src/lib/prisma.ts` - Mock database
- `middleware.ts` - Auth & role protection

---

**Ready to test? Start with Step 1 above! 🚀**
