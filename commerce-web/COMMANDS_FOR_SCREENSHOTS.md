# 📋 EXACT COMMANDS FOR SCREENSHOTS

Copy and paste these commands in order to get all screenshots.

---

## 🚀 STEP 1: Setup (Run Once)

```bash
cd d:\multi-gateway-platform\commerce-web
npm install
npx prisma migrate dev
```

---

## 📸 STEP 2: Get Screenshots (Run in Order)

### Screenshot 1: System Verification
```bash
npm run verify
```

**Expected output:** 6/7 checks passing ✅

---

### Screenshot 2: Seed Demo Data
```bash
npm run seed
```

**Expected output:**
```
✅ Products created: 6/6
✅ Orders created: 4/4
```

---

### Screenshot 3: Webhook Tests
```bash
npm run test:webhooks
```

**Expected output:**
```
✅ payment_intent.succeeded - PASSED
✅ payment_intent.payment_failed - PASSED
✅ charge.refunded - PASSED
✅ Idempotency test - PASSED
```

---

### Screenshot 4: E2E Tests
```bash
npm run test:e2e
```

**Expected output:**
```
✅ 1 passed
```

---

### Screenshot 5: Orders Page (Manual)

Open browser:
```
http://localhost:3000/orders
```

**Expected to see:**
- 4 orders with different colored status badges
- PENDING (yellow)
- COMPLETED (green)
- FAILED (red)
- REFUNDED (blue)

---

## 📝 Full Automated Sequence

Run in **Terminal 1**:
```bash
cd d:\multi-gateway-platform\commerce-web
npm run dev
```

Wait for: `> Ready in Xms`

Run in **Terminal 2**:
```bash
cd d:\multi-gateway-platform\commerce-web
npm run verify
npm run seed
npm run test:webhooks
npm run test:e2e
```

Then open browser to: `http://localhost:3000/orders`

---

## ✅ What You're Proving

| Command | Proves |
|---------|--------|
| `npm run verify` | Code quality ✅ |
| `npm run seed` | Testability ✅ |
| `npm run test:webhooks` | Webhook safety ✅ |
| `npm run test:e2e` | Automation ✅ |
| `/orders` page | UI correctness ✅ |

---

## 🎬 Total Time: ~10 minutes

1. Setup (5 min)
2. Run commands (3 min)
3. Screenshot results (2 min)

**All done!** Ready to show your supervisor.
