# 🐳 Docker Setup Guide - Commerce Web

Complete guide to run the Multi-Gateway Platform e-commerce application using Docker.

---

## Prerequisites

- Docker Desktop 20.x or higher
- Docker Compose 2.x or higher
- Git
- 4GB+ RAM available for Docker

---

## Quick Start (3 Commands)

```bash
# 1. Clone and navigate
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform

# 2. Setup environment
cp .env.example .env
# Edit .env with your Stripe keys (see Configuration section)

# 3. Start everything
npm run dev:docker
```

**That's it!** Open http://localhost:3001 to see the app with demo products.

---

## Configuration

### Required Environment Variables

Edit `.env` file and add your Stripe credentials:

```env
# Stripe (Get from: https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Commerce Web
COMMERCE_WEB_PORT=3001
COMMERCE_DATABASE_URL=file:./dev.db
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

**Note:** Everything else uses sensible defaults.

---

## Available NPM Commands

### Docker Management

```bash
# Start all services (detached)
npm run docker:up

# Start with logs (foreground)
npm run dev:docker

# Stop all services
npm run docker:down

# Restart everything
npm run docker:restart

# Stop and remove all data (clean slate)
npm run docker:clean

# View logs
npm run docker:logs
```

### Database Operations

```bash
# Run migrations (development)
npm run db:migrate

# Run migrations (production)
npm run db:migrate:deploy

# Seed demo data (products + orders)
npm run db:seed

# Reset database and reseed
npm run db:reset
```

### Testing

```bash
# Run E2E tests (Playwright)
npm run test:e2e

# Run webhook tests
npm run test:webhooks
```

---

## First-Time Setup Workflow

### Step 1: Clone Repository

```bash
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform
```

### Step 2: Configure Environment

```bash
# Copy example to actual .env
cp .env.example .env

# Edit with your editor (VS Code, vim, nano, etc.)
code .env  # or vim .env
```

**Minimum required changes:**
- Add your `STRIPE_SECRET_KEY`
- Add your `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Add your `STRIPE_WEBHOOK_SECRET` (if testing webhooks)

### Step 3: Start Docker Containers

```bash
# Build and start all services
docker-compose up --build
```

**What happens:**
1. ✅ Builds Next.js app in production mode
2. ✅ Creates SQLite database with schema
3. ✅ Runs Prisma migrations
4. ✅ Seeds demo products (6 items)
5. ✅ Starts app on http://localhost:3001

### Step 4: Verify

```bash
# Check health
curl http://localhost:3001/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","service":"commerce-web","database":"connected"}
```

**Open in browser:** http://localhost:3001

You should see:
- 6 demo products (laptops, headphones, keyboards, etc.)
- Working cart functionality
- Stripe checkout integration

---

## Manual Database Setup (If Needed)

If auto-setup fails, run manually:

```bash
# Enter container
docker-compose exec commerce-web sh

# Inside container:
npx prisma migrate deploy
npx prisma generate
npm run seed

# Exit
exit
```

---

## Architecture

### Services Overview

```
┌─────────────────────────────────────────┐
│  Commerce Web (Next.js)                 │
│  Port: 3001                             │
│  ├─ SQLite Database (Prisma)            │
│  ├─ Stripe Integration                  │
│  └─ Health Check: /api/health           │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  Backend Services                       │
│  ├─ API Gateway (5002)                  │
│  ├─ Payments Service (5003)             │
│  ├─ Mock Payment Gateway (5000)         │
│  ├─ Redis (6379)                        │
│  ├─ MongoDB (27017)                     │
│  └─ Prometheus (9090)                   │
└─────────────────────────────────────────┘
```

### Volume Persistence

Data persists across container restarts:

```yaml
volumes:
  commerce-db:       # SQLite database file
  mongo-data:        # MongoDB data
  redis-data:        # Redis cache
  prometheus-data:   # Metrics history
```

**To reset all data:**
```bash
npm run docker:clean  # Removes volumes
```

---

## Testing the Application

### 1. Seed Demo Data

```bash
# Seed from host machine (recommended)
npm run db:seed

# Or seed from inside container
docker-compose exec commerce-web npm run seed
```

**Creates:**
- 6 demo products with stock
- Product images and descriptions
- Price ranges: $49.99 - $1,299.99

### 2. Run E2E Tests

```bash
# Install Playwright (first time only)
cd commerce-web
npx playwright install

# Run tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

**Tests cover:**
- ✅ Checkout flow
- ✅ Order creation
- ✅ Payment processing
- ✅ Admin order management
- ✅ Refund processing

### 3. Test Stripe Webhooks

```bash
# Terminal 1: Start app
npm run dev:docker

# Terminal 2: Test webhooks
cd commerce-web
npm run test:webhooks
```

**Tests:**
- ✅ Webhook signature verification
- ✅ Idempotency handling
- ✅ Payment intent updates
- ✅ Order status changes

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux

# Kill the process or change port in .env
COMMERCE_WEB_PORT=3002
```

### Database Migration Errors

```bash
# Reset and recreate
npm run db:reset

# Or manually
docker-compose exec commerce-web sh
npx prisma migrate reset --force
npm run seed
```

### Build Fails

```bash
# Clean Docker build cache
docker-compose down
docker system prune -a
docker-compose up --build --force-recreate
```

### Health Check Failing

```bash
# Check logs
docker-compose logs commerce-web

# Check database
docker-compose exec commerce-web npx prisma studio
```

### Container Won't Start

```bash
# Check status
docker-compose ps

# Check specific service logs
docker-compose logs commerce-web

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

---

## Development Workflow

### Daily Development

```bash
# Morning: Start services
npm run docker:up

# Work on code (auto-reload enabled in dev mode)

# View logs as needed
npm run docker:logs

# Evening: Stop services
npm run docker:down
```

### Making Changes

```bash
# After changing Dockerfile or dependencies
npm run docker:restart

# After changing database schema
npm run db:migrate
npm run db:seed
```

### Testing Changes

```bash
# Run tests before committing
npm run test:e2e
npm run test:webhooks
```

---

## Production Considerations

### Environment Variables

```env
# Set for production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db  # Use PostgreSQL
```

### Database Migration

```bash
# Production migration (no prompts)
npm run db:migrate:deploy
```

### Security

- ✅ Never commit `.env` files
- ✅ Use secrets management (AWS Secrets Manager, etc.)
- ✅ Enable HTTPS in production
- ✅ Use PostgreSQL instead of SQLite
- ✅ Set up proper backup strategy

---

## Common Tasks Reference

```bash
# === DOCKER ===
npm run dev:docker           # Start with logs
npm run docker:up            # Start detached
npm run docker:down          # Stop services
npm run docker:restart       # Restart everything
npm run docker:clean         # Remove all data
npm run docker:logs          # View logs

# === DATABASE ===
npm run db:migrate           # Run migrations
npm run db:seed              # Seed demo data
npm run db:reset             # Reset & reseed

# === TESTING ===
npm run test:e2e             # End-to-end tests
npm run test:webhooks        # Webhook tests
```

---

## Support

For issues or questions:
1. Check logs: `npm run docker:logs`
2. Check health: `curl http://localhost:3001/api/health`
3. See main [README.md](../README.md) for more details

---

**Last Updated:** 2026-01-28  
**Docker Version:** 20.x+  
**Compose Version:** 2.x+
