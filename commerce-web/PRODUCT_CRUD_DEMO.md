# Product CRUD Operations - Complete Demo Guide

## Overview
This document provides a complete walkthrough of the product management CRUD operations integrated into the commerce-web application. The system uses mock in-memory data storage (Prisma 7 compatibility workaround) for rapid development.

---

## ✅ Completed Features

### 1. **Product Data Model**
- **Fields**: id, name, price, description, images, stock, status, createdAt, updatedAt
- **Storage**: In-memory mock database (Maps to Prisma interface)
- **Status Options**: "active" or "inactive"

### 2. **API Routes** (`/api/products`)
- ✅ **GET** - Retrieve all products with optional filters
  - Query params: `status`, `search`, `id`
  - Supports searching by name or description
  - Supports filtering by status (active/inactive)
  
- ✅ **POST** - Create new product
  - Validates: name, price (required)
  - Auto-generates unique product ID
  - Returns created product with status 201

- ✅ **PUT** - Update existing product
  - Requires product ID
  - Partial updates supported
  - Returns updated product

- ✅ **DELETE** - Remove product
  - Requires product ID
  - Returns success message

### 3. **Admin Interface** (`/admin/products`)
✅ **Features:**
- Product listing table with Name, Price, Stock, Status
- Search functionality (by name or description)
- Status filter (Active/Inactive)
- Add Product button → Form dialog
- Edit button → Pre-populated form dialog
- Delete button with confirmation
- Loading state with spinner
- Error handling and alerts
- Product count display

✅ **Form Fields:**
- Name (required)
- Price (required, decimal)
- Description (optional, multiline)
- Images (comma-separated URLs)
- Stock (default 0)
- Status (active/inactive dropdown)

### 4. **Customer Product Catalog** (`/products`)
✅ **Features:**
- Grid layout (responsive: 12/6/4 columns on XS/SM/MD)
- Product cards with image, name, price
- Search bar (with Enter key support)
- Status filter dropdown
- Search button
- Individual product view link
- Stock and status chips
- "No products" message

---

## 🚀 Live Demo Workflow

### Demo Scenario: E-commerce Product Management

#### **Part 1: View Products as Customer**
1. Navigate to http://localhost:3000/products
2. See 3 default sample products:
   - Wireless Headphones ($79.99) - 15 in stock
   - USB-C Cable ($19.99) - 50 in stock
   - Phone Case ($24.99) - 0 in stock (Inactive)
3. Try search: Type "headphones"
4. Try filter: Select "Inactive" status
5. Observe: Product count updates, results filter

#### **Part 2: Admin - Create Product**
1. Log in as admin (pransiluni@gmail.com / pinithi123)
2. Navigate to http://localhost:3000/admin/products
3. Click "Add Product" button
4. Fill in form:
   - Name: "Screen Protector"
   - Price: "14.99"
   - Description: "Tempered glass screen protector for phones"
   - Images: "https://via.placeholder.com/300?text=ScreenProtector"
   - Stock: "30"
   - Status: "Active"
5. Click "Create Product"
6. **Expected**: New product appears in table, alert confirms

#### **Part 3: Admin - Edit Product**
1. Find "Wireless Headphones" in admin table
2. Click edit icon (pencil)
3. Change:
   - Price: "89.99" (was $79.99)
   - Stock: "5" (was 15)
4. Click "Update Product"
5. **Expected**: Table updates with new values

#### **Part 4: Admin - Filter Products**
1. Type "cable" in search box
2. **Expected**: Shows only USB-C Cable
3. Select status filter "Inactive"
4. **Expected**: Shows only Phone Case, hides active products
5. Clear filters to see all

#### **Part 5: Admin - Delete Product**
1. Find the newly created "Screen Protector"
2. Click delete icon (trash)
3. Confirm deletion
4. **Expected**: Product removed from table, disappears immediately

#### **Part 6: Verify Customer View Updated**
1. Go back to http://localhost:3000/products
2. See changes reflected (new price for Headphones, no Screen Protector if deleted)
3. Search and filter still work

---

## 📊 Default Sample Data

```json
[
  {
    "id": "prod1",
    "name": "Wireless Headphones",
    "price": 79.99,
    "description": "Premium wireless headphones with noise cancellation",
    "images": ["https://via.placeholder.com/300?text=Headphones"],
    "stock": 15,
    "status": "active"
  },
  {
    "id": "prod2",
    "name": "USB-C Cable",
    "price": 19.99,
    "description": "Fast charging USB-C cable 2 meters",
    "images": ["https://via.placeholder.com/300?text=Cable"],
    "stock": 50,
    "status": "active"
  },
  {
    "id": "prod3",
    "name": "Phone Case",
    "price": 24.99,
    "description": "Durable protective phone case",
    "images": ["https://via.placeholder.com/300?text=PhoneCase"],
    "stock": 0,
    "status": "inactive"
  }
]
```

---

## 🔐 Access Control

### Authentication Routes
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Check session

### Protected Routes (Middleware)
- `/admin/*` - Requires admin role, redirects to login if not authenticated
- `POST /api/products` - Requires admin role (403 Forbidden if customer)
- `PUT /api/products` - Requires admin role
- `DELETE /api/products` - Requires admin role
- `GET /api/products` - Public (all can view)

### Admin Credentials (from `.env`)
- **Email**: pransiluni@gmail.com
- **Password**: pinithi123

---

## 🛠️ Technical Implementation

### Backend: Mock Prisma Client
**File**: `src/lib/prisma.ts`
- Implements Prisma interface methods: `findMany()`, `findUnique()`, `create()`, `update()`, `delete()`
- Supports query operators: `where`, `orderBy`, `data`
- In-memory Map storage (data resets on server restart)
- **Note**: Replace with real Prisma when C++ build tools available

### API Handler
**File**: `src/app/api/products/route.ts`
- Standard REST patterns for GET/POST/PUT/DELETE
- Error handling with appropriate HTTP status codes
- JSON serialization for images (string ↔ array)
- Query parameter parsing for filters and search

### Frontend: React Components
- **Admin**: `/src/app/admin/products/page.tsx`
  - Server state management (products, filters, form data)
  - Dialog for add/edit forms
  - Real-time filter application
  - Error alerts and loading states
  
- **Customer**: `/src/app/products/page.tsx`
  - Grid layout with MUI Grid
  - Search and filter UI
  - Card-based product display

### Middleware
**File**: `middleware.ts`
- Routes admin endpoints to login if not authenticated
- Returns 403 Forbidden for non-admins on protected mutation endpoints
- Session token validation via JWT cookie

---

## 📈 Next Steps for Production

### 1. **Persistent Database**
- Replace mock with real SQLite/PostgreSQL
- Use Prisma Client with proper driver adapter
- Add database migrations

### 2. **Enhanced Features**
- Product categories and tags
- Product variants (size, color, etc.)
- Inventory tracking with low-stock alerts
- Product reviews and ratings
- Bulk operations (import/export)

### 3. **Performance**
- Add pagination (limit/offset)
- Implement caching (Redis)
- Add database indices on searchable fields
- Optimize image delivery (CDN, lazy loading)

### 4. **Admin Enhancements**
- Advanced filtering (price range, date range)
- Bulk edit/delete
- Export to CSV
- Product analytics dashboard
- Audit logs

---

## ✅ Testing Checklist

- [ ] Can create product with all fields
- [ ] Can view products as customer
- [ ] Can search by product name
- [ ] Can search by description
- [ ] Can filter by status (active/inactive)
- [ ] Can edit product and see changes immediately
- [ ] Can delete product with confirmation
- [ ] Cannot access admin as non-authenticated user
- [ ] Cannot create/edit/delete as non-admin customer
- [ ] API returns 401 for unauthenticated requests
- [ ] API returns 403 for non-admin users
- [ ] Images parse correctly (string → array conversion)
- [ ] Prices display with correct decimals
- [ ] Stock shows 0 when out of stock
- [ ] Error messages display on API failures

---

## 📝 Code Examples

### Create Product (Admin API)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Cookie: auth=<jwt-token>" \
  -d '{
    "name": "Screen Protector",
    "price": 14.99,
    "description": "Tempered glass",
    "images": ["https://example.com/img.jpg"],
    "stock": 30,
    "status": "active"
  }'
```

### Search Products (Public API)
```bash
curl "http://localhost:3000/api/products?search=cable&status=active"
```

### Update Product (Admin API)
```bash
curl -X PUT http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Cookie: auth=<jwt-token>" \
  -d '{
    "id": "prod1",
    "price": 89.99,
    "stock": 5
  }'
```

---

## 🎥 Recording Notes for Loom Demo

**Talking Points:**
1. "We've implemented a complete product CRUD system with role-based access"
2. "Customers can browse and search products freely"
3. "Admins have full product management with real-time updates"
4. "All changes are protected by JWT authentication and middleware"
5. "The system handles validation, error states, and user feedback gracefully"

**Demo Time**: ~5-7 minutes
- Spend 1 min showing customer view
- Spend 3-4 min on admin CRUD (create, edit, filter, delete)
- Spend 1 min showing updated customer view
- Spend 1 min explaining architecture

---

## 📞 Support

For issues or questions:
1. Check browser console (F12) for error messages
2. Check terminal output for server errors
3. Verify auth token is present in cookies
4. Ensure you're logged in as admin for protected operations
