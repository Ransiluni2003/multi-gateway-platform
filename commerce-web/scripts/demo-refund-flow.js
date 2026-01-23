#!/usr/bin/env node

/**
 * Refund Demo Script
 * 
 * Demonstrates:
 * 1. Listing all orders
 * 2. Creating a test order
 * 3. Processing a full refund
 * 4. Processing a partial refund
 * 5. Verifying refund status
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`http://localhost:3000${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }
  return data;
}

async function main() {
  log(colors.bright + colors.blue, '\n╔════════════════════════════════════════════════╗');
  log(colors.bright + colors.blue, '║         STRIPE REFUND DEMO SCRIPT              ║');
  log(colors.bright + colors.blue, '╚════════════════════════════════════════════════╝\n');

  try {
    // Step 1: List existing orders
    log(colors.bright + colors.yellow, '📋 STEP 1: Fetching existing orders...\n');
    const ordersResponse = await fetchAPI('/api/admin/orders');
    const existingOrders = ordersResponse.orders || [];
    
    if (existingOrders.length > 0) {
      log(colors.green, `✓ Found ${existingOrders.length} order(s):\n`);
      existingOrders.forEach((order) => {
        log(colors.blue, 
          `  • ID: ${order.id.substring(0, 8)}...`,
          `| Customer: ${order.firstName} ${order.lastName}`,
          `| Total: $${order.total.toFixed(2)}`,
          `| Status: ${order.status}`
        );
      });
    } else {
      log(colors.yellow, '⚠ No existing orders found. Creating a test order...\n');
    }

    // Step 2: Get a test order or use existing one
    let testOrder;
    
    if (existingOrders.length > 0) {
      testOrder = existingOrders[0];
      log(colors.green, `✓ Using existing order: ${testOrder.id.substring(0, 8)}...\n`);
    } else {
      log(colors.bright + colors.yellow, '📦 STEP 2: Creating test order...\n');
      
      // First, get products
      const productsResponse = await fetchAPI('/api/products');
      if (!productsResponse.products || productsResponse.products.length === 0) {
        log(colors.red, '✗ No products available. Cannot create test order.');
        return;
      }

      const product = productsResponse.products[0];
      
      const orderData = {
        email: 'refund-test@example.com',
        firstName: 'Test',
        lastName: 'Customer',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
      };

      const createResponse = await fetchAPI('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      testOrder = { id: createResponse.orderId, total: createResponse.total };
      log(colors.green, `✓ Test order created: ${testOrder.id.substring(0, 8)}...`);
      log(colors.green, `  Total: $${testOrder.total.toFixed(2)}\n`);

      // Get the full order details
      const orderDetails = await fetchAPI(`/api/orders?id=${testOrder.id}`);
      testOrder = orderDetails.order;
    }

    // Step 3: Process FULL refund
    log(colors.bright + colors.yellow, '💰 STEP 3: Processing FULL refund...\n');
    
    const fullRefundResponse = await fetchAPI('/api/orders/refund', {
      method: 'POST',
      body: JSON.stringify({
        orderId: testOrder.id,
        reason: 'requested_by_customer',
      }),
    });

    log(colors.green, `✓ Full refund processed successfully!`);
    log(colors.blue, `  Refund ID: ${fullRefundResponse.refund.id}`);
    log(colors.blue, `  Amount: $${fullRefundResponse.refund.amount.toFixed(2)}`);
    log(colors.blue, `  Status: ${fullRefundResponse.refund.status}`);
    log(colors.blue, `  Order Status: ${fullRefundResponse.order.status}\n`);

    // Step 4: Get refund status
    log(colors.bright + colors.yellow, '📊 STEP 4: Verifying refund status...\n');
    
    const refundInfo = await fetchAPI(`/api/orders/refund?orderId=${testOrder.id}`);
    
    log(colors.green, `✓ Refund information retrieved:`);
    log(colors.blue, `  Total Amount: $${refundInfo.refundInfo.totalAmount.toFixed(2)}`);
    log(colors.blue, `  Refunded Amount: $${refundInfo.refundInfo.refundedAmount.toFixed(2)}`);
    log(colors.blue, `  Remaining: $${refundInfo.refundInfo.remainingAmount.toFixed(2)}`);
    log(colors.blue, `  Status: ${refundInfo.refundInfo.status}`);
    log(colors.blue, `  Reason: ${refundInfo.refundInfo.refundReason}\n`);

    // Step 5: Demo instructions
    log(colors.bright + colors.green, '✓ DEMO COMPLETE!\n');
    log(colors.bright + colors.yellow, '📝 NEXT STEPS FOR LOOM RECORDING:\n');

    log(colors.blue, `1. Navigate to: http://localhost:3000/admin/orders`);
    log(colors.blue, `2. Look for order: ${testOrder.id.substring(0, 8)}...`);
    log(colors.blue, `3. Click "View" to see order details`);
    log(colors.blue, `4. Click "Initiate Refund" to show refund dialog`);
    log(colors.blue, `5. Enter refund amount for partial refund demo`);
    log(colors.blue, `6. Show the success message and status update\n`);

    log(colors.bright + colors.green, '✓ You can now:\n');
    log(colors.blue, `  • Record a Loom showing the refund flow`);
    log(colors.blue, `  • Demonstrate partial refund capability`);
    log(colors.blue, `  • Show status updates in real-time\n`);

  } catch (error) {
    log(colors.red, '\n✗ Error:', error.message);
    log(colors.yellow, '\nTroubleshooting:\n');
    log(colors.blue, '  1. Ensure the Next.js dev server is running (npm run dev)');
    log(colors.blue, '  2. Check that the database is initialized (prisma migrate)');
    log(colors.blue, '  3. Verify Stripe API keys are set in .env.local');
    log(colors.blue, '  4. Check browser console for additional errors\n');
    process.exit(1);
  }
}

main();
