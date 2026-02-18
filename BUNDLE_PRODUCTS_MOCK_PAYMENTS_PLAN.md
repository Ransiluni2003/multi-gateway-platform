# Bundle Products + Mock Payments - Implementation Plan

## 1. Database Schema

### bundles table
```sql
CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### bundle_items table
```sql
CREATE TABLE bundle_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### bundle_discounts table
```sql
CREATE TABLE bundle_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
  discount_type VARCHAR(50) NOT NULL, -- percentage, fixed, tiered, bogo
  discount_value DECIMAL(10,2) NOT NULL,
  conditions JSONB, -- {min_quantity: 2, apply_to: 'cheapest'}
  priority INTEGER DEFAULT 0,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### mock_transactions table
```sql
CREATE TABLE mock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  type VARCHAR(50) NOT NULL, -- authorize, capture, refund
  status VARCHAR(50) NOT NULL, -- success, failure, pending
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  deterministic_outcome VARCHAR(50), -- based on card number patterns
  metadata JSONB,
  error_code VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### transaction_events table
```sql
CREATE TABLE transaction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES mock_transactions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- payment.authorized, payment.captured, payment.refunded
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2. API Endpoints

### Bundle Builder API

#### POST /api/bundles
Create a new bundle
```json
Request:
{
  "name": "Starter Pack",
  "description": "Get started with essentials",
  "items": [
    { "product_id": "prod_123", "quantity": 2, "unit_price": 19.99 },
    { "product_id": "prod_456", "quantity": 1, "unit_price": 39.99 }
  ],
  "discounts": [
    {
      "discount_type": "percentage",
      "discount_value": 10,
      "conditions": {}
    }
  ]
}

Response: 201
{
  "id": "bundle_789",
  "name": "Starter Pack",
  "total_price": 71.99,
  "discount_amount": 7.99,
  "final_price": 63.99,
  "tax": 5.12,
  "grand_total": 69.11
}
```

#### GET /api/bundles
List all bundles with filters
```
Query params: ?status=active&search=starter
```

#### GET /api/bundles/:id
Get bundle details with calculated pricing

#### PUT /api/bundles/:id
Update bundle

#### DELETE /api/bundles/:id
Delete bundle

#### POST /api/bundles/:id/calculate-price
Calculate bundle price with all discounts applied
```json
Request:
{
  "quantity": 2,
  "coupon_code": "SAVE20"
}

Response:
{
  "base_price": 79.98,
  "bundle_discount": 7.99,
  "coupon_discount": 14.40,
  "subtotal": 57.59,
  "tax": 4.61,
  "total": 62.20
}
```

#### POST /api/bundles/:id/invoice
Generate invoice for bundle purchase
```json
Response:
{
  "invoice_id": "INV-2026-001234",
  "bundle_id": "bundle_789",
  "line_items": [...],
  "subtotal": 71.99,
  "discounts": 7.99,
  "tax": 5.12,
  "total": 69.11,
  "pdf_url": "/invoices/INV-2026-001234.pdf"
}
```

---

### Mock Payment Gateway API

#### POST /api/payments/mock/authorize
Authorize a payment (hold funds)
```json
Request:
{
  "amount": 69.11,
  "currency": "USD",
  "payment_method": {
    "card_number": "4242424242424242", // Success pattern
    "exp_month": "12",
    "exp_year": "2027",
    "cvv": "123"
  },
  "order_id": "order_123",
  "metadata": {
    "bundle_id": "bundle_789"
  }
}

Response: 200
{
  "transaction_id": "txn_abc123",
  "status": "success",
  "amount": 69.11,
  "currency": "USD",
  "authorized_at": "2026-01-13T10:30:00Z",
  "expires_at": "2026-01-20T10:30:00Z"
}

// Deterministic patterns:
// 4242424242424242 → success
// 4000000000000002 → card_declined
// 4000000000009995 → insufficient_funds
// 4000000000000069 → expired_card
// 4000000000000127 → incorrect_cvc
```

#### POST /api/payments/mock/capture
Capture authorized payment
```json
Request:
{
  "transaction_id": "txn_abc123",
  "amount": 69.11  // optional, can capture partial amount
}

Response: 200
{
  "transaction_id": "txn_abc123",
  "status": "captured",
  "amount": 69.11,
  "captured_at": "2026-01-13T11:00:00Z"
}
```

#### POST /api/payments/mock/refund
Refund captured payment
```json
Request:
{
  "transaction_id": "txn_abc123",
  "amount": 69.11,  // optional, can refund partial amount
  "reason": "customer_request"
}

Response: 200
{
  "refund_id": "rfnd_xyz789",
  "transaction_id": "txn_abc123",
  "status": "refunded",
  "amount": 69.11,
  "refunded_at": "2026-01-13T12:00:00Z"
}
```

#### GET /api/payments/mock/transactions
List all mock transactions with filters
```
Query params: ?status=success&from_date=2026-01-01&to_date=2026-01-13&order_id=order_123
```

#### GET /api/payments/mock/transactions/:id
Get transaction details with event history

---

## 3. Event Shapes

### payment.authorized
```json
{
  "event_type": "payment.authorized",
  "transaction_id": "txn_abc123",
  "order_id": "order_123",
  "amount": 69.11,
  "currency": "USD",
  "payment_method": "card",
  "timestamp": "2026-01-13T10:30:00Z"
}
```

### payment.captured
```json
{
  "event_type": "payment.captured",
  "transaction_id": "txn_abc123",
  "order_id": "order_123",
  "amount": 69.11,
  "currency": "USD",
  "timestamp": "2026-01-13T11:00:00Z"
}
```

### payment.refunded
```json
{
  "event_type": "payment.refunded",
  "transaction_id": "txn_abc123",
  "refund_id": "rfnd_xyz789",
  "order_id": "order_123",
  "amount": 69.11,
  "reason": "customer_request",
  "timestamp": "2026-01-13T12:00:00Z"
}
```

### payment.failed
```json
{
  "event_type": "payment.failed",
  "transaction_id": "txn_abc123",
  "order_id": "order_123",
  "amount": 69.11,
  "error_code": "card_declined",
  "error_message": "Your card was declined",
  "timestamp": "2026-01-13T10:30:00Z"
}
```

---

## 4. Frontend - Admin Transactions Page

### Location
`frontend/pages/admin/transactions.tsx`

### UI Components

#### Filters Section
- Date range picker (from/to)
- Status dropdown (all, success, failure, pending, refunded)
- Transaction type filter (authorize, capture, refund)
- Order ID search
- Amount range filter

#### Transactions Table
Columns:
- Transaction ID (clickable)
- Order ID (clickable link to order details)
- Type (badge)
- Status (colored badge)
- Amount
- Currency
- Payment Method
- Created At
- Actions (View Details, Refund button if applicable)

#### Export Button
- CSV Export with current filters applied
- Columns: transaction_id, order_id, type, status, amount, currency, created_at, error_message

#### Transaction Details Modal
- Full transaction info
- Event timeline
- Related order details
- Refund action (if captured)

### State Management
```typescript
interface TransactionFilters {
  status?: 'success' | 'failure' | 'pending' | 'refunded';
  type?: 'authorize' | 'capture' | 'refund';
  from_date?: string;
  to_date?: string;
  order_id?: string;
  min_amount?: number;
  max_amount?: number;
}

interface Transaction {
  id: string;
  transaction_id: string;
  order_id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  error_code?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 5. Discount Rules Engine

### Discount Types

#### 1. Percentage Discount
```javascript
function applyPercentageDiscount(basePrice, discountValue) {
  return basePrice * (discountValue / 100);
}
```

#### 2. Fixed Amount Discount
```javascript
function applyFixedDiscount(basePrice, discountValue) {
  return Math.min(basePrice, discountValue);
}
```

#### 3. Tiered Discount
```javascript
function applyTieredDiscount(quantity, unitPrice, tiers) {
  // tiers: [{ min_qty: 2, discount: 5 }, { min_qty: 5, discount: 10 }]
  const applicableTier = tiers
    .filter(t => quantity >= t.min_qty)
    .sort((a, b) => b.discount - a.discount)[0];
  
  return applicableTier 
    ? (unitPrice * quantity * applicableTier.discount / 100)
    : 0;
}
```

#### 4. BOGO (Buy One Get One)
```javascript
function applyBOGODiscount(items, conditions) {
  // conditions: { buy: 2, get: 1, apply_to: 'cheapest' }
  const { buy, get, apply_to } = conditions;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const setsCount = Math.floor(totalItems / (buy + get));
  
  const sortedItems = apply_to === 'cheapest' 
    ? items.sort((a, b) => a.unit_price - b.unit_price)
    : items;
  
  return setsCount * get * sortedItems[0].unit_price;
}
```

---

## 6. Postman Collection Structure

### Folder: Bundle Products
1. **Create Bundle** - POST /api/bundles
2. **List Bundles** - GET /api/bundles
3. **Get Bundle Details** - GET /api/bundles/:id
4. **Calculate Bundle Price** - POST /api/bundles/:id/calculate-price
5. **Update Bundle** - PUT /api/bundles/:id
6. **Generate Invoice** - POST /api/bundles/:id/invoice
7. **Delete Bundle** - DELETE /api/bundles/:id

### Folder: Mock Payments - Success Flow
1. **Authorize Payment (Success)** - POST /api/payments/mock/authorize
   - Card: 4242424242424242
2. **Get Transaction Details** - GET /api/payments/mock/transactions/:id
3. **Capture Payment** - POST /api/payments/mock/capture
4. **Refund Payment** - POST /api/payments/mock/refund

### Folder: Mock Payments - Failure Scenarios
1. **Card Declined** - POST /api/payments/mock/authorize
   - Card: 4000000000000002
2. **Insufficient Funds** - POST /api/payments/mock/authorize
   - Card: 4000000000009995
3. **Expired Card** - POST /api/payments/mock/authorize
   - Card: 4000000000000069
4. **Incorrect CVC** - POST /api/payments/mock/authorize
   - Card: 4000000000000127

### Folder: Transaction Management
1. **List All Transactions** - GET /api/payments/mock/transactions
2. **Filter by Status** - GET /api/payments/mock/transactions?status=success
3. **Filter by Date Range** - GET /api/payments/mock/transactions?from_date=2026-01-01&to_date=2026-01-13
4. **Filter by Order** - GET /api/payments/mock/transactions?order_id=order_123

### Environment Variables
```json
{
  "base_url": "http://localhost:3000",
  "bundle_id": "{{bundle_id}}",
  "transaction_id": "{{transaction_id}}",
  "order_id": "{{order_id}}"
}
```

### Tests (Postman Scripts)
```javascript
// Test: Successful authorization
pm.test("Status is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Transaction ID is returned", function() {
  const json = pm.response.json();
  pm.expect(json.transaction_id).to.exist;
  pm.environment.set("transaction_id", json.transaction_id);
});

pm.test("Status is success", function() {
  const json = pm.response.json();
  pm.expect(json.status).to.eql("success");
});
```

---

## 7. Test Cases

### Unit Tests - Bundle Pricing

```javascript
// tests/unit/bundle-pricing.test.js
describe('Bundle Pricing', () => {
  test('calculates base price correctly', () => {
    const bundle = {
      items: [
        { quantity: 2, unit_price: 19.99 },
        { quantity: 1, unit_price: 39.99 }
      ]
    };
    expect(calculateBasePrice(bundle)).toBe(79.97);
  });

  test('applies percentage discount', () => {
    const basePrice = 100;
    const discount = { type: 'percentage', value: 10 };
    expect(applyDiscount(basePrice, discount)).toBe(10);
  });

  test('applies tiered discount for quantity 5', () => {
    const tiers = [
      { min_qty: 2, discount: 5 },
      { min_qty: 5, discount: 10 }
    ];
    expect(applyTieredDiscount(5, 20, tiers)).toBe(10);
  });

  test('BOGO applies to cheapest item', () => {
    const items = [
      { quantity: 1, unit_price: 30 },
      { quantity: 1, unit_price: 20 }
    ];
    const conditions = { buy: 1, get: 1, apply_to: 'cheapest' };
    expect(applyBOGODiscount(items, conditions)).toBe(20);
  });
});
```

### Integration Tests - Mock Payments

```javascript
// tests/integration/mock-payments.test.js
describe('Mock Payments', () => {
  test('successful authorization with valid card', async () => {
    const response = await request(app)
      .post('/api/payments/mock/authorize')
      .send({
        amount: 50.00,
        currency: 'USD',
        payment_method: { card_number: '4242424242424242' }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.transaction_id).toBeDefined();
  });

  test('card declined with specific card number', async () => {
    const response = await request(app)
      .post('/api/payments/mock/authorize')
      .send({
        amount: 50.00,
        payment_method: { card_number: '4000000000000002' }
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error_code).toBe('card_declined');
  });

  test('capture authorized payment', async () => {
    // First authorize
    const authResponse = await authorizePayment();
    const txnId = authResponse.body.transaction_id;
    
    // Then capture
    const captureResponse = await request(app)
      .post('/api/payments/mock/capture')
      .send({ transaction_id: txnId, amount: 50.00 });
    
    expect(captureResponse.status).toBe(200);
    expect(captureResponse.body.status).toBe('captured');
  });

  test('refund captured payment', async () => {
    const txnId = await authorizeThenCapture();
    
    const refundResponse = await request(app)
      .post('/api/payments/mock/refund')
      .send({ 
        transaction_id: txnId, 
        amount: 50.00,
        reason: 'customer_request' 
      });
    
    expect(refundResponse.status).toBe(200);
    expect(refundResponse.body.status).toBe('refunded');
  });

  test('events are created for each transaction', async () => {
    const authResponse = await authorizePayment();
    const txnId = authResponse.body.transaction_id;
    
    const events = await getTransactionEvents(txnId);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('payment.authorized');
  });
});
```

### E2E Tests - Admin Transactions UI

```javascript
// tests/e2e/admin-transactions.spec.js
describe('Admin Transactions Page', () => {
  test('displays transactions list', async () => {
    await page.goto('/admin/transactions');
    const rows = await page.$$('table tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  test('filters by status', async () => {
    await page.goto('/admin/transactions');
    await page.selectOption('#status-filter', 'success');
    await page.click('#apply-filters');
    
    const statusBadges = await page.$$eval('.status-badge', 
      badges => badges.map(b => b.textContent)
    );
    expect(statusBadges.every(s => s === 'success')).toBe(true);
  });

  test('exports to CSV', async () => {
    await page.goto('/admin/transactions');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-csv')
    ]);
    
    expect(download.suggestedFilename()).toMatch(/transactions.*\.csv/);
  });

  test('links to order details', async () => {
    await page.goto('/admin/transactions');
    await page.click('tr:first-child .order-link');
    
    expect(page.url()).toContain('/admin/orders/');
  });

  test('opens transaction details modal', async () => {
    await page.goto('/admin/transactions');
    await page.click('tr:first-child .view-details');
    
    const modal = await page.$('.transaction-modal');
    expect(modal).toBeTruthy();
  });
});
```

---

## 8. Implementation Steps

### Phase 1: Database & Backend Foundation (Day 1-2)
1. Create migration files for all tables
2. Implement Bundle model and repository
3. Implement MockTransaction model and repository
4. Create discount rules engine

### Phase 2: Bundle Builder API (Day 3-4)
1. POST /api/bundles - Create bundle
2. GET /api/bundles - List bundles
3. GET /api/bundles/:id - Get bundle details
4. POST /api/bundles/:id/calculate-price - Price calculator
5. POST /api/bundles/:id/invoice - Invoice generator
6. Add unit tests for discount calculations

### Phase 3: Mock Payment Gateway (Day 5-6)
1. POST /api/payments/mock/authorize - Authorization logic
2. POST /api/payments/mock/capture - Capture logic
3. POST /api/payments/mock/refund - Refund logic
4. Implement deterministic card number patterns
5. Add event emission for all payment actions
6. Add integration tests

### Phase 4: Admin Transactions UI (Day 7-8)
1. Create transactions page with table
2. Implement filters (status, date, type)
3. Add CSV export functionality
4. Create transaction details modal
5. Add order linking
6. Add E2E tests

### Phase 5: Documentation & Demo (Day 9-10)
1. Build Postman collection with all endpoints
2. Add pre-request and test scripts
3. Create README for bundle products feature
4. Record 2-min Loom demo showing:
   - Creating a bundle
   - Calculating price with discounts
   - Authorizing payment (success & failure)
   - Viewing transactions in admin
   - Exporting CSV
   - Refunding payment
5. Open PR with full description

---

## 9. Loom Demo Script (2 minutes)

### Intro (10 sec)
"Hi, I'm demonstrating the Bundle Products and Mock Payment Gateway features."

### Bundle Creation (30 sec)
1. Show Postman: POST /api/bundles
2. Create "Starter Pack" with 3 products
3. Add 10% bundle discount
4. Show response with calculated pricing

### Payment Flow (40 sec)
1. Show successful authorization with card 4242...
2. Show event log - payment.authorized
3. Capture the payment
4. Show admin transactions page with new transaction
5. Demonstrate card decline with card 4000...0002

### Admin Features (30 sec)
1. Filter transactions by status "success"
2. Click order link to show connection
3. Export to CSV and open file
4. Open transaction details modal
5. Perform refund action

### Wrap-up (10 sec)
"All endpoints are in the Postman collection. The PR includes full test coverage."

---

## 10. PR Checklist

- [ ] All database migrations created and tested
- [ ] Bundle CRUD endpoints working
- [ ] Discount rules engine with all 4 types
- [ ] Invoice generation working
- [ ] Mock payment authorize/capture/refund working
- [ ] Deterministic card patterns implemented
- [ ] Event emission for all payment actions
- [ ] Admin transactions page complete
- [ ] Filters working (status, date, type, order)
- [ ] CSV export functional
- [ ] Order linking working
- [ ] Unit tests for discount calculations (>90% coverage)
- [ ] Integration tests for payment flows (>85% coverage)
- [ ] E2E tests for admin UI (critical paths)
- [ ] Postman collection with all endpoints
- [ ] Postman tests for success/failure scenarios
- [ ] 2-min Loom demo recorded
- [ ] README documentation updated
- [ ] API documentation (OpenAPI/Swagger)
- [ ] No console.log or debug code
- [ ] Code reviewed and linted

---

**Estimated Timeline:** 10 working days
**Team Size:** 1-2 developers
**Dependencies:** Existing products table, orders table, Supabase auth
