#!/usr/bin/env node

/**
 * Webhook Idempotency Test Suite
 * Tests that replayed Stripe webhooks don't cause double-processing
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test scenarios
const tests = [
  {
    name: 'Test 1: Idempotency Check (Replayed Event)',
    description:
      'Send the same webhook twice. Second should be skipped due to idempotency.',
    steps: [
      '1. Create an order with status "pending"',
      '2. Send: payment_intent.succeeded webhook',
      '   Expected: Order → "completed"',
      '3. Send THE SAME webhook again (exact copy)',
      '   Expected: Order remains "completed" (no duplicate)',
      '   Expected log: "⏭️  Event already processed"',
    ],
    verification: [
      'Query Order table: order.status = "completed" (only 1 update)',
      'Query WebhookEvent table: stripeEventId exists (count = 1)',
      'Check server logs: "⏭️  Event already processed" message appears',
    ],
  },

  {
    name: 'Test 2: Status Transition Validation',
    description:
      'Try invalid transition. Should be rejected even if not idempotent.',
    steps: [
      '1. Create an order with status "completed"',
      '2. Send: charge.refunded webhook',
      '   Expected: Order → "refunded" (valid transition)',
      '3. Create another order with status "pending"',
      '4. Send: charge.refunded webhook (invalid transition)',
      '   Expected: Order stays "pending" (transition rejected)',
      '   Expected log: "⚠️  Invalid status transition: pending → refunded"',
    ],
    verification: [
      'Query Order: second order.status still = "pending"',
      'Query WebhookEvent: event recorded even though rejected',
      'Check server logs: "⚠️  Invalid status transition" message',
    ],
  },

  {
    name: 'Test 3: End-to-End Workflow with Idempotency',
    description:
      'Complete user journey: checkout → payment → webhook → admin view.',
    steps: [
      '1. Visit http://localhost:3000/products',
      '2. Add product to cart',
      '3. Checkout → Place order',
      '   Order created with status "pending"',
      '4. Visit http://localhost:3000/orders',
      '   Status shows "pending"',
      '5. Trigger payment_intent.succeeded webhook',
      '6. Refresh /orders',
      '   Status changes to "completed" ✅',
      '7. Replay the same webhook',
      '8. Refresh /orders',
      '   Status still "completed" (no duplicate) ✅',
    ],
    verification: [
      'UI reflects correct status after each step',
      'No manual DB queries needed',
      'Order appears only once in list',
      'Payment record matches order status',
    ],
  },

  {
    name: 'Test 4: Payment Lifecycle with Multiple Events',
    description:
      'Verify complete flow: pending → completed → refunded with all webhooks.',
    steps: [
      '1. Create order → status "pending"',
      '2. Send payment_intent.succeeded → status "completed"',
      '3. Send charge.refunded → status "refunded"',
      '4. Verify each transition in /orders page',
    ],
    verification: [
      'Order status transitions correctly through all states',
      'Payment record shows all events in lastWebhookEvent timeline',
      'No errors in server logs',
      'WebhookEvent table has 2 entries for this order',
    ],
  },

  {
    name: 'Test 5: Webhook Failure Recovery',
    description:
      'Verify webhook error handling and recording for debugging.',
    steps: [
      '1. Send malformed webhook (missing orderId)',
      '2. Expected: Error caught, event recorded with errorMessage',
      '3. Check WebhookEvent.status = "failed"',
      '4. Verify errorMessage contains error details',
    ],
    verification: [
      'WebhookEvent.status = "failed"',
      'WebhookEvent.errorMessage is populated',
      'Server returns error response (not 500)',
      'Order remains in "pending" state (no partial update)',
    ],
  },
];

// Print test suite
log('\n' + '='.repeat(80), 'cyan');
log('WEBHOOK IDEMPOTENCY TEST SUITE', 'cyan');
log('='.repeat(80) + '\n', 'cyan');

tests.forEach((test, index) => {
  log(`\n${test.name}`, 'blue');
  log('-'.repeat(60), 'blue');
  log(`Description: ${test.description}\n`, 'yellow');

  log('📋 Steps:', 'green');
  test.steps.forEach(step => log(`   ${step}`));

  log('\n✅ Verification:', 'green');
  test.verification.forEach(check => log(`   • ${check}`));
});

// Add instructions section
log('\n\n' + '='.repeat(80), 'cyan');
log('MANUAL TESTING INSTRUCTIONS', 'cyan');
log('='.repeat(80) + '\n', 'cyan');

log('Step 1: Start Development Server', 'blue');
log(`$ cd commerce-web && npm run dev\n`);

log('Step 2: Create Test Order (Option A: UI)', 'blue');
log(`1. Open http://localhost:3000/products
2. Add product to cart
3. Click checkout
4. Fill form and click "Place Order"
5. Note the order ID from response\n`);

log('Step 3: Create Test Order (Option B: Script)', 'blue');
log(`$ node scripts/create-test-orders-api.js\n`);

log('Step 4: Verify Initial State', 'blue');
log(`1. Open http://localhost:3000/orders
2. Find your test order
3. Verify status is "pending"\n`);

log('Step 5: Send Webhook (First Time)', 'blue');
log(`# Use Stripe CLI for proper signature
$ stripe trigger payment_intent.succeeded

# OR use curl with test signature
$ curl -X POST http://localhost:3000/api/webhooks/stripe \\
  -H "Content-Type: application/json" \\
  -H "stripe-signature: t=123456789,v1=test_signature" \\
  -d '{
    "id": "evt_test_' + Math.random().toString(36).slice(2) + '",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "metadata": { "orderId": "YOUR_ORDER_ID" },
        "latest_charge": "ch_test_123"
      }
    }
  }'\n`);

log('Step 6: Verify Status Changed (First Time)', 'blue');
log(`1. Refresh http://localhost:3000/orders
2. Your order status should be "completed" ✅
3. Check server logs for: "✅ Payment succeeded for order..."\n`);

log('Step 7: Replay Same Webhook (Idempotency Test)', 'blue');
log(`# Send the EXACT SAME webhook again
$ curl -X POST http://localhost:3000/api/webhooks/stripe \\
  -H "Content-Type: application/json" \\
  -H "stripe-signature: t=123456789,v1=test_signature" \\
  -d '{
    "id": "evt_test_' + Math.random().toString(36).slice(2) + '",  // Same ID!
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "metadata": { "orderId": "YOUR_ORDER_ID" },
        "latest_charge": "ch_test_123"
      }
    }
  }'\n`);

log('Step 8: Verify No Duplicate Processing', 'blue');
log(`1. Refresh http://localhost:3000/orders
2. Order status still "completed" (no change) ✅
3. Check server logs for: "⏭️  Event already processed"
4. Check Database → Query WebhookEvent table (should have 1 entry, not 2)\n`);

log('Step 9: Database Verification', 'blue');
log(`# Check WebhookEvent table (idempotency keys)
SELECT * FROM WebhookEvent WHERE stripeEventId LIKE 'evt_test_%';

# Check Order and Payment consistency
SELECT o.id, o.status, p.status, p.lastWebhookEvent, p.lastWebhookTime
FROM Order o
JOIN Payment p ON o.id = p.orderId
WHERE o.id = 'YOUR_ORDER_ID';

# Verify only 1 webhook event processed
SELECT COUNT(*) FROM WebhookEvent WHERE stripeEventId = 'evt_test_123';\n`);

// Summary
log('='.repeat(80), 'cyan');
log('EXPECTED RESULTS SUMMARY', 'cyan');
log('='.repeat(80) + '\n', 'cyan');

const summary = [
  '✅ First webhook delivery: Order status → "completed"',
  '✅ Replayed webhook: Status unchanged (idempotency prevents double-process)',
  '✅ Server logs show: "⏭️  Event already processed"',
  '✅ WebhookEvent table: 1 entry (not 2 duplicates)',
  '✅ UI always reflects true state without manual DB checks',
  '✅ Status transitions validated at database level',
  '✅ Invalid transitions rejected with warnings',
  '✅ Failed webhook attempts recorded for debugging',
];

summary.forEach(item => log(item, 'green'));

log('\n' + '='.repeat(80) + '\n', 'cyan');
log('For more details, see: PR_IDEMPOTENCY_WEBHOOK_SAFETY.md', 'yellow');
log('Run tests with: npm run test:webhooks\n', 'yellow');

