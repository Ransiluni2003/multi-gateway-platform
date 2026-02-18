# 🚀 Quick Start Guide - Multi-Gateway Platform

Get the entire system running in **under 5 minutes**!

---

## Prerequisites Check

Before starting, ensure you have:

```bash
# Check Docker
docker --version          # Should be 20.x or higher
docker-compose --version  # Should be 2.x or higher

# Check Node.js
node --version           # Should be 18.x or higher
npm --version            # Should be 8.x or higher

# Check Git
git --version
```

If any are missing, install them first:
- **Docker Desktop**: https://www.docker.com/products/docker-desktop
- **Node.js**: https://nodejs.org (LTS version)
- **Git**: https://git-scm.com

---

## 3-Step Setup

### Step 1: Clone & Navigate

```bash
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your favorite editor
code .env      # VS Code
# or
vim .env       # Vim
# or
notepad .env   # Windows Notepad
```

**Required changes in `.env`:**

```env
# Get these from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_SECRET
```

> **Don't have Stripe keys?** Sign up free at https://stripe.com

### Step 3: Start Everything

```bash
# One command to rule them all!
npm run dev:docker
```

This command:
1. ✅ Builds all Docker images
2. ✅ Starts all services
3. ✅ Creates database with schema
4. ✅ Seeds 6 demo products
5. ✅ Shows logs in terminal

---

## Verify Installation

### Check Services (New Terminal)

```bash
# Verify all services are healthy
npm run verify:docker
```

**Expected output:**
```
✅ Commerce Web (Next.js)          [HTTP 200]
✅ API Gateway                     [HTTP 200]
✅ Payments Service                [HTTP 200]
✅ Mock Payment Gateway            [HTTP 200]
✅ Prometheus                      [HTTP 200]
✅ Database connection verified
🎉 System is ready for use!
```

### Access the Application

Open your browser to these URLs:

| Service | URL | What You'll See |
|---------|-----|----------------|
| **Commerce Web** | http://localhost:3001 | 6 demo products (laptops, keyboards, etc.) |
| **API Gateway** | http://localhost:5002/health | `{"status":"ok"}` |
| **Payments** | http://localhost:5003/api/payments/health | Payment service status |
| **Prometheus** | http://localhost:9090 | Metrics dashboard |
| **Grafana** | http://localhost:3300 | Monitoring dashboards |

---

## Demo Products

Your database is automatically seeded with:

1. **Premium Laptop** - $1,299.99 (10 in stock)
2. **Wireless Headphones** - $299.99 (25 in stock)
3. **USB-C Hub** - $49.99 (50 in stock)
4. **Monitor Stand** - $79.99 (15 in stock)
5. **Mechanical Keyboard** - $199.99 (20 in stock)
6. **Laptop Stand** - $59.99 (30 in stock)

**Test the checkout flow:**
1. Go to http://localhost:3001
2. Add items to cart
3. Proceed to checkout
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any future date, any CVC

---

## Common Commands

```bash
# === MANAGEMENT ===
npm run docker:up          # Start (background)
npm run docker:down        # Stop services
npm run docker:logs        # View all logs
npm run docker:restart     # Restart everything
npm run docker:clean       # Remove all data

# === DATABASE ===
npm run db:seed            # Reseed demo data
npm run db:migrate         # Run migrations
npm run db:reset           # Reset & reseed

# === TESTING ===
npm run test:e2e           # Run E2E tests
npm run test:webhooks      # Test Stripe webhooks
npm run verify:docker      # Verify health
```

---

## Troubleshooting

### ❌ "Port already in use"

```bash
# Check what's using the port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux

# Kill the process or change port in .env
COMMERCE_WEB_PORT=3002
```

### ❌ "Cannot connect to Docker"

```bash
# Start Docker Desktop, then:
docker ps

# If still fails, restart Docker Desktop
```

### ❌ "Build failed" or "Image not found"

```bash
# Clean rebuild
npm run docker:clean
npm run docker:up
```

### ❌ "Database not seeding"

```bash
# Manual seed
npm run db:reset
```

### ❌ Services not healthy

```bash
# Check logs
npm run docker:logs

# Check individual service
docker-compose logs commerce-web
docker-compose logs api
docker-compose logs payments
```

---

## What's Running?

After `npm run dev:docker`, you have:

### Frontend
- **Commerce Web** (Next.js) - E-commerce storefront

### Backend Services  
- **API Gateway** - Routes requests to services
- **Payments Service** - Processes payments via Stripe
- **Mock Payment Gateway** - Simulates external payment provider
- **Worker Pool** - Background job processing (5 replicas)

### Infrastructure
- **MongoDB** - Primary database for backend services
- **Redis** - Cache & job queue
- **SQLite** - Commerce web database (in Docker volume)

### Monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards

---

## Next Steps

1. **Explore the App**
   - Add products to cart
   - Complete checkout with Stripe test card
   - View order in admin panel

2. **Run Tests**
   ```bash
   npm run test:e2e
   npm run test:webhooks
   ```

3. **View Monitoring**
   - Prometheus: http://localhost:9090
   - Query metrics like `http_requests_total`

4. **Check Documentation**
   - [Docker Setup Guide](docs/DOCKER_SETUP.md)
   - [Docker Learning Notes](docs/docker-notes.md)
   - [Main README](README.md)

---

## Stopping the System

```bash
# Stop services (keeps data)
npm run docker:down

# Stop and remove all data
npm run docker:clean
```

---

## Getting Help

**Check health:**
```bash
npm run verify:docker
```

**View logs:**
```bash
npm run docker:logs
```

**Join us:**
- 📧 Issues: https://github.com/Ransiluni2003/multi-gateway-platform/issues
- 📖 Docs: [docs/](docs/)

---

**🎉 You're all set! Happy coding!**
