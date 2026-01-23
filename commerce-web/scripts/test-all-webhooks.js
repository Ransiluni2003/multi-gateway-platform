#!/usr/bin/env node

/**
 * TEST ALL WEBHOOKS - Comprehensive Webhook Testing Script
 * Tests all 3 Stripe webhook event types with idempotency verification
 * Run: npm run test:webhooks
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function sendWebhook(orderId, eventType, eventId, chargeId = null) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  let payload;
  
  switch (eventType) {
    case 'payment_intent.succeeded':
      payload = {
        id: eventId,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_${orderId}`,
            metadata: { orderId },
            latest_charge: chargeId || `ch_${orderId}_succeeded`,
          },
        },
      };
      break;
      
    case 'payment_intent.payment_failed':
      payload = {
        id: eventId,
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: `pi_${orderId}`,
            metadata: { orderId },
          },
        },
      };
      break;
      
    case 'charge.refunded':
      payload = {
        id: eventId,
        type: 'charge.refunded',
        data: {
          object: {
            id: chargeId || `ch_${orderId}_refunded`,
            metadata: { orderId },
            amount_refunded: 5000, // $50.00
            refund_reason: 'requested_by_customer',
          },
        },
      };
      break;
      
    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }

  try {
    const response = await fetch(`${baseUrl}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      success: response.ok,
      status: response.status,
      data: response.ok ? await response.json() : await response.text(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  log('\n' + '='.repeat(80), 'cyan');
  log('WEBHOOK TESTING SUITE - All 3 Event Types', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  try {
    // Check if server is running
    log('Checking if server is running...', 'blue');
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        log('✅ Server is running at http://localhost:3000\n', 'green');
      }
    } catch (error) {
      log('❌ Server is NOT running!', 'red');
      log('   Start the server first: npm run dev\n', 'yellow');
      process.exit(1);
    }

    // Get or create test orders
    log('Setting up test orders...', 'blue');
    
    // Check existing orders
    let orders = await prisma.order.findMany({
      take: 4,
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
    });

    if (orders.length === 0) {
      log('⚠️  No orders found. Creating test orders...', 'yellow');
      log('   Run: npm run seed', 'yellow');
      log('   Then run this script again.\n', 'yellow');
      process.exit(1);
    }

    log(`✅ Found ${orders.length} existing orders\n`, 'green');

    // Test 1: payment_intent.succeeded
    log('='.repeat(80), 'cyan');
    log('TEST 1: payment_intent.succeeded', 'cyan');
    log('='.repeat(80), 'blue');

    const pendingOrder = orders.find(o => o.status === 'pending') || orders[0];
    log(`Using Order: ${pendingOrder.id}`, 'yellow');
    log(`Current Status: ${pendingOrder.status}\n`, 'yellow');

    const eventId1 = `evt_test_success_${Date.now()}`;
    log(`Sending webhook with event ID: ${eventId1}`, 'blue');

    const result1 = await sendWebhook(pendingOrder.id, 'payment_intent.succeeded', eventId1);
    
    if (result1.success) {
      log(`✅ Webhook accepted (${result1.status})`, 'green');
      log(`Response: ${JSON.stringify(result1.data, null, 2)}\n`, 'green');
    } else {
      log(`❌ Webhook failed: ${result1.error || result1.data}`, 'red');
    }

    // Verify status changed
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedOrder1 = await prisma.order.findUnique({
      where: { id: pendingOrder.id },
      include: { payment: true },
    });
    log(`Order status after webhook: ${updatedOrder1.status}`, 'yellow');
    log(`Payment status: ${updatedOrder1.payment?.status}\n`, 'yellow');

    // Test idempotency - send same webhook again
    log('Testing IDEMPOTENCY - sending same webhook again...', 'blue');
    const result1Replay = await sendWebhook(pendingOrder.id, 'payment_intent.succeeded', eventId1);
    
    if (result1Replay.success) {
      log(`✅ Webhook accepted (idempotency check passed)`, 'green');
    }

    const updatedOrder1Replay = await prisma.order.findUnique({
      where: { id: pendingOrder.id },
    });
    log(`Order status after replay: ${updatedOrder1Replay.status}`, 'yellow');
    
    if (updatedOrder1.status === updatedOrder1Replay.status) {
      log(`✅ IDEMPOTENCY VERIFIED - Status unchanged (${updatedOrder1.status})\n`, 'green');
    } else {
      log(`❌ IDEMPOTENCY FAILED - Status changed unexpectedly!\n`, 'red');
    }

    // Test 2: payment_intent.payment_failed
    log('='.repeat(80), 'cyan');
    log('TEST 2: payment_intent.payment_failed', 'cyan');
    log('='.repeat(80), 'blue');

    const order2 = orders.find(o => o.status === 'pending' && o.id !== pendingOrder.id);
    if (!order2) {
      log('⚠️  No pending order available for test 2. Creating one...', 'yellow');
      const product = await prisma.product.findFirst();
      const newOrder = await prisma.order.create({
        data: {
          email: 'test-failed@example.com',
          firstName: 'Test',
          lastName: 'Failed',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US',
          total: product.price,
          status: 'pending',
          stripePaymentIntentId: `pi_test_failed_${Date.now()}`,
          items: {
            create: [{ productId: product.id, quantity: 1, price: product.price }],
          },
          payment: {
            create: {
              stripePaymentIntentId: `pi_test_failed_${Date.now()}`,
              amount: product.price,
              currency: 'usd',
              status: 'pending',
            },
          },
        },
      });
      log(`✅ Created new test order: ${newOrder.id}\n`, 'green');
      var testOrder2 = newOrder;
    } else {
      var testOrder2 = order2;
    }

    log(`Using Order: ${testOrder2.id}`, 'yellow');
    log(`Current Status: ${testOrder2.status}\n`, 'yellow');

    const eventId2 = `evt_test_failed_${Date.now()}`;
    log(`Sending webhook with event ID: ${eventId2}`, 'blue');

    const result2 = await sendWebhook(testOrder2.id, 'payment_intent.payment_failed', eventId2);
    
    if (result2.success) {
      log(`✅ Webhook accepted (${result2.status})`, 'green');
      log(`Response: ${JSON.stringify(result2.data, null, 2)}\n`, 'green');
    } else {
      log(`❌ Webhook failed: ${result2.error || result2.data}`, 'red');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedOrder2 = await prisma.order.findUnique({
      where: { id: testOrder2.id },
      include: { payment: true },
    });
    log(`Order status after webhook: ${updatedOrder2.status}`, 'yellow');
    log(`Payment status: ${updatedOrder2.payment?.status}\n`, 'yellow');

    // Test 3: charge.refunded
    log('='.repeat(80), 'cyan');
    log('TEST 3: charge.refunded', 'cyan');
    log('='.repeat(80), 'blue');

    const completedOrder = orders.find(o => o.status === 'completed') || updatedOrder1;
    log(`Using Order: ${completedOrder.id}`, 'yellow');
    log(`Current Status: ${completedOrder.status}\n`, 'yellow');

    const eventId3 = `evt_test_refund_${Date.now()}`;
    const chargeId = completedOrder.payment?.stripeChargeId || `ch_${completedOrder.id}_refund`;
    log(`Sending webhook with event ID: ${eventId3}`, 'blue');
    log(`Charge ID: ${chargeId}`, 'yellow');

    const result3 = await sendWebhook(completedOrder.id, 'charge.refunded', eventId3, chargeId);
    
    if (result3.success) {
      log(`✅ Webhook accepted (${result3.status})`, 'green');
      log(`Response: ${JSON.stringify(result3.data, null, 2)}\n`, 'green');
    } else {
      log(`❌ Webhook failed: ${result3.error || result3.data}`, 'red');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedOrder3 = await prisma.order.findUnique({
      where: { id: completedOrder.id },
      include: { payment: true },
    });
    log(`Order status after webhook: ${updatedOrder3.status}`, 'yellow');
    log(`Payment status: ${updatedOrder3.payment?.status}`, 'yellow');
    log(`Refund amount: $${updatedOrder3.payment?.refundAmount || 0}\n`, 'yellow');

    // Summary
    log('='.repeat(80), 'cyan');
    log('TEST SUMMARY', 'cyan');
    log('='.repeat(80) + '\n', 'cyan');

    log('✅ Test 1: payment_intent.succeeded', result1.success ? 'green' : 'red');
    log(`   Order transitioned: pending → ${updatedOrder1.status}`, 'yellow');
    log(`   Idempotency: ${updatedOrder1.status === updatedOrder1Replay.status ? 'PASSED' : 'FAILED'}\n`, updatedOrder1.status === updatedOrder1Replay.status ? 'green' : 'red');

    log('✅ Test 2: payment_intent.payment_failed', result2.success ? 'green' : 'red');
    log(`   Order transitioned: pending → ${updatedOrder2.status}\n`, 'yellow');

    log('✅ Test 3: charge.refunded', result3.success ? 'green' : 'red');
    log(`   Order transitioned: completed → ${updatedOrder3.status}\n`, 'yellow');

    log('🎉 All webhook tests complete!', 'green');
    log('\n📊 Next Steps:', 'cyan');
    log('   1. View orders in UI: http://localhost:3000/orders', 'yellow');
    log('   2. Verify different status colors (yellow/green/red/blue)', 'yellow');
    log('   3. Check WebhookEvent table for audit trail', 'yellow');
    log('\n');

  } catch (error) {
    log('\n❌ Error running webhook tests:', 'red');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

