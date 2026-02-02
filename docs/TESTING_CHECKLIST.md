# System Orchestration - Testing Checklist

Use this checklist to verify the complete Docker setup works correctly.

---

## Pre-Testing Setup

- [ ] Docker Desktop is running
- [ ] Git is installed
- [ ] Node.js 18+ is installed
- [ ] You have a Stripe test account
- [ ] Clean workspace (no previous installations)

---

## Fresh Clone Test

### Step 1: Clone Repository
```bash
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform
```

- [ ] Repository cloned successfully
- [ ] Changed to project directory

### Step 2: Environment Setup
```bash
cp .env.example .env
# Edit .env with your Stripe keys
```

**Edit these values in `.env`:**
```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
```

- [ ] `.env` file created
- [ ] Stripe keys added

### Step 3: Start Docker
```bash
npm run dev:docker
```

**Wait for output showing:**
- [ ] `✅ Built Next.js`
- [ ] `✅ Database migrations complete`
- [ ] `✅ Seeded products`
- [ ] All services showing logs

### Step 4: Verify (New Terminal)
```bash
cd multi-gateway-platform
npm run verify:docker
```

**Expected Output:**
- [ ] ✅ Commerce Web (Next.js) [HTTP 200]
- [ ] ✅ API Gateway [HTTP 200]
- [ ] ✅ Payments Service [HTTP 200]
- [ ] ✅ Mock Payment Gateway [HTTP 200]
- [ ] ✅ Prometheus [HTTP 200]
- [ ] ✅ Database connection verified
- [ ] 🎉 System is ready for use!

---

## Browser Testing

### Commerce Web (Port 3001)
Open: http://localhost:3001

- [ ] Page loads without errors
- [ ] Header navigation visible
- [ ] 6 products displayed:
  - [ ] Premium Laptop ($1,299.99)
  - [ ] Wireless Headphones ($299.99)
  - [ ] USB-C Hub ($49.99)
  - [ ] Monitor Stand ($79.99)
  - [ ] Mechanical Keyboard ($199.99)
  - [ ] Laptop Stand ($59.99)
- [ ] Product images load
- [ ] Prices formatted correctly

### Add to Cart Flow
- [ ] Click "Add to Cart" on a product
- [ ] Cart count increases
- [ ] Click cart icon
- [ ] Cart modal/page shows correct item
- [ ] Can update quantity
- [ ] Can remove item
- [ ] Total price calculates correctly

### Checkout Flow
- [ ] Click "Checkout" or "Proceed to Checkout"
- [ ] Checkout form loads
- [ ] Fill in customer details
- [ ] Stripe payment element loads
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Enter any future expiry (e.g., 12/34)
- [ ] Enter any CVC (e.g., 123)
- [ ] Click "Pay Now" or "Complete Order"
- [ ] Payment processes successfully
- [ ] Order confirmation page shows
- [ ] Order ID displayed

### Health Endpoints
- [ ] http://localhost:3001/api/health - Returns healthy status
- [ ] http://localhost:5002/health - API Gateway healthy
- [ ] http://localhost:5003/api/payments/health - Payments healthy

---

## Docker Commands Testing

### Management Commands
```bash
# Stop services
npm run docker:down
```
- [ ] All containers stop gracefully
- [ ] No errors in output

```bash
# Start services again (background)
npm run docker:up
```
- [ ] Services start in detached mode
- [ ] No errors shown
- [ ] `docker ps` shows all containers

```bash
# View logs
npm run docker:logs
```
- [ ] Logs stream from all services
- [ ] Can scroll through history
- [ ] Ctrl+C stops log streaming (services keep running)

```bash
# Check running containers
docker-compose ps
```
- [ ] All services show "Up" status
- [ ] Health checks show "(healthy)"

---

## Database Testing

### Persistence Test
```bash
# 1. Create some test data (via browser)
# Add products to cart, complete an order

# 2. Stop containers
npm run docker:down

# 3. Restart
npm run docker:up

# 4. Check browser again
# http://localhost:3001
```
- [ ] Products still visible
- [ ] Previous order data persists
- [ ] No data loss

### Seeding Test
```bash
# Reset and reseed
npm run db:reset
```
- [ ] Database resets successfully
- [ ] 6 demo products created
- [ ] No errors in output

```bash
# Manual seed
npm run db:seed
```
- [ ] Products seeded
- [ ] Shows count of created products

---

## Testing Functionality

### E2E Tests
```bash
cd commerce-web
npm run test:e2e
```

**Expected Results:**
- [ ] Playwright launches
- [ ] Tests run automatically
- [ ] Checkout flow test passes
- [ ] Order management test passes
- [ ] Refund test passes
- [ ] All tests complete with ✅
- [ ] No test failures

**Test Coverage Verified:**
- [ ] Add to cart
- [ ] Checkout process
- [ ] Payment processing
- [ ] Order creation
- [ ] Admin order view
- [ ] Refund processing

### Webhook Tests
```bash
cd commerce-web
npm run test:webhooks
```

**Expected Results:**
- [ ] All webhook tests pass
- [ ] Signature verification works
- [ ] Idempotency handling correct
- [ ] Payment intent updates work
- [ ] No errors in output

---

## Makefile Testing (Optional)

If `make` is available:

```bash
make help
```
- [ ] Help menu displays all commands

```bash
make setup
```
- [ ] Creates .env if missing
- [ ] Shows setup instructions

```bash
make up
```
- [ ] Starts services in background

```bash
make health
```
- [ ] Checks all service health
- [ ] Shows JSON responses

```bash
make ps
```
- [ ] Shows container status

```bash
make down
```
- [ ] Stops services cleanly

---

## Clean Slate Test

### Complete Cleanup
```bash
npm run docker:clean
```
- [ ] Prompts for confirmation (if implemented)
- [ ] Stops all containers
- [ ] Removes all volumes
- [ ] Removes all data

### Fresh Start
```bash
npm run docker:up
```
- [ ] Rebuilds from scratch
- [ ] Creates new volumes
- [ ] Seeds fresh data
- [ ] All services start healthy

---

## Documentation Verification

### README.md
- [ ] Quick Start section exists
- [ ] Docker instructions section exists
- [ ] Commands are copy-paste ready
- [ ] Service URLs table present
- [ ] Troubleshooting section exists
- [ ] Testing instructions included

### QUICK_START.md
- [ ] File exists and opens
- [ ] Prerequisites listed
- [ ] 3-step setup clear
- [ ] Demo products listed
- [ ] Commands reference included

### docs/DOCKER_SETUP.md
- [ ] File exists and opens
- [ ] Comprehensive guide (500+ lines)
- [ ] All commands explained
- [ ] Troubleshooting scenarios
- [ ] Testing instructions
- [ ] Service architecture diagram

### docs/docker-notes.md
- [ ] Docker concepts explained
- [ ] Dockerfile structure documented
- [ ] Volume persistence covered
- [ ] Environment variables explained
- [ ] Commands reference complete

---

## Troubleshooting Verification

Test each troubleshooting scenario:

### Port Conflict
```bash
# Start something on port 3001
# Try: npm run docker:up
```
- [ ] Error message is clear
- [ ] Documentation explains how to fix
- [ ] Can change port in .env
- [ ] Works after changing port

### Database Reset
```bash
npm run db:reset
```
- [ ] Works without errors
- [ ] Data is cleared
- [ ] New seed data created

### Build Issues
```bash
npm run docker:clean
docker system prune -a
npm run docker:up
```
- [ ] Clean build succeeds
- [ ] No cached issues

---

## Performance Checks

### Startup Time
- [ ] Cold start (first build): < 5 minutes
- [ ] Warm start (rebuild): < 2 minutes
- [ ] Hot start (restart): < 30 seconds

### Resource Usage
```bash
docker stats
```
- [ ] Memory usage reasonable (< 4GB total)
- [ ] CPU usage under control
- [ ] No runaway containers

---

## Security Checks

### Environment Files
- [ ] `.env` is in `.gitignore`
- [ ] No secrets in git history
- [ ] `.env.example` has dummy values
- [ ] README warns about secrets

### Container Security
- [ ] Services run as non-root user (where applicable)
- [ ] No unnecessary ports exposed
- [ ] Health checks implemented
- [ ] Restart policies configured

---

## Final Verification

### Complete User Journey
1. **Clone** → 2. **Configure** → 3. **Start** → 4. **Verify** → 5. **Use**

- [ ] Each step works without manual intervention
- [ ] Documentation is clear
- [ ] Commands work as documented
- [ ] Error messages are helpful
- [ ] Recovery procedures work

### Sign-Off Criteria
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] Documentation is complete
- [ ] Troubleshooting guides work
- [ ] System runs on fresh machine
- [ ] Demo data loads correctly
- [ ] E2E tests pass
- [ ] Webhook tests pass

---

## Notes & Issues Found

**Document any issues during testing:**

| Issue | Severity | Steps to Reproduce | Solution |
|-------|----------|-------------------|----------|
|       |          |                   |          |
|       |          |                   |          |

---

## Sign-Off

- [ ] **All tests passed**
- [ ] **Documentation verified**
- [ ] **Ready for production use**
- [ ] **Ready for supervisor review**

**Tested By:** _________________  
**Date:** _________________  
**Sign-Off:** _________________  

---

**Status:** 
- [ ] ✅ PASSED - All checks complete
- [ ] ⚠️ PASSED WITH NOTES - Minor issues documented
- [ ] ❌ FAILED - Major issues require fixes
