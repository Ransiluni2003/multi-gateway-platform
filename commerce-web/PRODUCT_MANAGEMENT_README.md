# Commerce Web - Product Management System

## 🎯 Project Overview

Complete e-commerce product management system built with **Next.js 16**, **Prisma**, and **Material-UI**. Includes a customer-facing product catalog and a full-featured admin panel for managing products.

## ✨ Features

### 👥 Customer Features
- **Product Grid** - Browse all products with responsive layout
- **Search & Filter** - Find products by name, description, or status
- **Product Details** - View full product information with image gallery
- **Add to Cart** - Quick add-to-cart functionality

### 🛠️ Admin Features
- **Create Products** - Add new products with images, pricing, and inventory
- **Edit Products** - Update existing product information
- **Delete Products** - Remove products from catalog
- **Inventory Management** - Track and update stock levels
- **Status Control** - Mark products as active or inactive

## 🏗️ Architecture

```
commerce-web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── products/route.ts          # CRUD API endpoints
│   │   ├── products/
│   │   │   ├── page.tsx                   # Product listing
│   │   │   └── [id]/
│   │   │       └── page.tsx               # Product detail page
│   │   ├── admin/
│   │   │   └── products/
│   │   │       └── page.tsx               # Admin panel
│   │   └── layout.tsx                     # Root layout
│   ├── components/
│   │   ├── Header.tsx                     # Navigation
│   │   └── ...
│   └── lib/
│       ├── prisma.ts                      # Database client
│       └── ...
├── prisma/
│   ├── schema.prisma                      # Database schema
│   ├── migrations/                        # Schema migrations
│   └── seed.js                            # Sample data
├── package.json
└── README.md
```

## 🗄️ Database Schema

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  price       Float
  description String
  images      String   // JSON array
  stock       Int      @default(0)
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Setup database
npx prisma migrate dev --name init_products

# Generate Prisma Client
npx prisma generate
```

### Running the App

```bash
# Development mode
npm run dev

# Open in browser
# Customer: http://localhost:3000/products
# Admin:    http://localhost:3000/admin/products
```

## 📊 API Endpoints

### GET /api/products
Fetch all products with optional filtering

**Query Parameters:**
- `status` - Filter by status: "active" or "inactive"
- `search` - Search by product name or description
- `id` - Get specific product by ID

**Example:**
```bash
GET /api/products                          # All products
GET /api/products?status=active            # Active only
GET /api/products?search=headphones        # Search
GET /api/products?id=clx123abc             # Single product
```

**Response:**
```json
{
  "products": [
    {
      "id": "clx123abc",
      "name": "Wireless Headphones",
      "price": 79.99,
      "description": "Premium headphones...",
      "images": ["url1", "url2"],
      "stock": 50,
      "status": "active",
      "createdAt": "2026-01-16T10:00:00Z",
      "updatedAt": "2026-01-16T10:00:00Z"
    }
  ]
}
```

### POST /api/products
Create a new product

**Body:**
```json
{
  "name": "Product Name",
  "price": 99.99,
  "description": "Product description",
  "images": ["url1", "url2"],
  "stock": 100,
  "status": "active"
}
```

**Response:** 201 Created - Returns created product

### PUT /api/products
Update an existing product

**Body:**
```json
{
  "id": "clx123abc",
  "name": "Updated Name",
  "price": 89.99,
  "stock": 75
}
```

**Response:** Updated product object

### DELETE /api/products
Delete a product

**Query Parameters:**
- `id` - Product ID to delete

**Example:**
```bash
DELETE /api/products?id=clx123abc
```

**Response:**
```json
{
  "message": "Product deleted successfully"
}
```

## 📱 Pages

### `/products` - Product Listing
- Responsive grid layout (1-4 columns based on screen size)
- Product cards with image, name, price, status
- Status filter dropdown (All, Active, Inactive)
- Search functionality
- "View Details" button for each product

### `/products/[id]` - Product Detail
- Large product image with gallery thumbnails
- Full product information
- Stock availability indicator
- "Add to Cart" button
- Back button to products list

### `/admin/products` - Admin Dashboard
- Table of all products
- Create button (opens modal form)
- Edit button for each product
- Delete button with confirmation
- Real-time form validation
- Success/error notifications

## 🎨 UI Components

Built with **Material-UI (MUI)** v7:
- Grid / Layout
- Cards
- Buttons
- Chips
- Dialogs
- TextFields
- Select/Dropdowns
- Tables
- Icons

## 🌓 Theme Support

- Light Mode (default)
- Dark Mode toggle in header
- Theme persisted in localStorage
- Responsive design for all screen sizes

## 📝 Database Seeding

### Option 1: API-based seeding (Recommended)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Seed database
npm run seed
```

### Option 2: Manual seeding

Run the Prisma seed script:
```bash
npx prisma db seed
```

Or manually insert products via the Admin panel:
1. Go to http://localhost:3000/admin/products
2. Click "Add Product"
3. Fill in the form
4. Click "Create"

## 🔍 Testing Checklist

- [ ] Visit `/products` - See product grid
- [ ] Click product card - Go to detail page
- [ ] Use search box - Find products
- [ ] Filter by status - Show only active/inactive
- [ ] Click "Add to Cart" - Add to cart (if logged in)
- [ ] Visit `/admin/products` - Access admin panel
- [ ] Create product - New product appears in list
- [ ] Edit product - Update and verify changes
- [ ] Delete product - Remove from catalog
- [ ] Test on mobile - Responsive layout works

## 🛠️ Development

### ESLint
```bash
npm run lint       # Check for errors
npm run lint:fix   # Auto-fix errors
```

### Prettier
```bash
npm run format     # Format code
```

### TypeScript
```bash
npm run build      # Type check and build
```

## 📦 Dependencies

### Core
- `next@16.1.1` - React framework
- `react@19.2.3` - UI library
- `@prisma/client@7.2.0` - ORM
- `@mui/material@7.3.7` - UI components

### Dev Tools
- `typescript@5` - Type safety
- `eslint@9` - Linting
- `prettier@3.2.5` - Code formatting

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm run start
```

### Environment Variables
Create `.env` file:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://yourdomain.com"
```

### Hosting Options
- **Vercel** (Recommended for Next.js)
- **Railway**
- **Netlify**
- **AWS**
- **Google Cloud**

## 📊 Performance Features

- Server-side rendering (SSR) for SEO
- Static generation where possible
- Optimized images
- Database indexing on status and createdAt
- Responsive design
- Code splitting

## 🔒 Security Considerations

- Input validation on all API routes
- Error handling without exposing internals
- TypeScript for type safety
- ESLint for code quality
- CORS-ready for API consumption

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Reset database
rm dev.db
npx prisma migrate dev --name init_products
npm run seed
```

### Products Not Showing
1. Check database is seeded: `npm run seed`
2. Verify API route: `GET /api/products` in browser
3. Check browser console for errors

### Build Errors
```bash
# Clear cache and rebuild
rm -r .next
npm run build
```

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [MUI Docs](https://mui.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

## 📄 License

MIT - See LICENSE file for details

## 🤝 Support

For issues or questions, open a GitHub issue or contact the development team.

---

**Status:** ✅ Production Ready  
**Last Updated:** January 16, 2026  
**Version:** 1.0.0
