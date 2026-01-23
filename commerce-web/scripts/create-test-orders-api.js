#!/usr/bin/env node
/**
 * Simplified test orders creator - adds orders directly via API endpoints
 * since Prisma 7 requires specific configuration
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createTestProduct() {
  console.log('Creating test product...');
  const response = await makeRequest('/api/products', 'POST', {
    name: 'Demo Test Product',
    description: 'For orders demo - showcasing different order statuses',
    price: 29.99,
    images: [],
    stock: 100,
    status: 'active',
  });

  if (response.status >= 200 && response.status < 300) {
    console.log('✅ Test product created:', response.body.product.id);
    return response.body.product;
  } else {
    throw new Error(`Failed to create product: ${JSON.stringify(response.body)}`);
  }
}

async function createOrder(productId, status = 'pending') {
  console.log(`Creating ${status.toUpperCase()} order...`);
  const response = await makeRequest('/api/orders', 'POST', {
    email: 'demo@test.com',
    firstName: 'Demo',
    lastName: 'User',
    address: '123 Test St',
    city: 'Testville',
    state: 'TS',
    zipCode: '12345',
    country: 'US',
    items: [
      {
        productId,
        quantity: 1,
      },
    ],
  });

  if (response.status >= 200 && response.status < 300) {
    console.log(`✅ ${status.toUpperCase()} order created:`, response.body.orderId);
    return response.body.orderId;
  } else {
    throw new Error(`Failed to create order: ${JSON.stringify(response.body)}`);
  }
}

async function main() {
  try {
    console.log('🚀 Creating test orders via API...\n');

    // Create product
    const product = await createTestProduct();

    // Create multiple orders with different statuses
    const pendingOrderId = await createOrder(product.id, 'pending');
    await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay

    const completedOrderId = await createOrder(product.id, 'completed');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const failedOrderId = await createOrder(product.id, 'failed');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const refundedOrderId = await createOrder(product.id, 'refunded');

    console.log('\n📊 Summary:');
    console.log('═══════════════════════════════════════════════');
    console.log('4 orders created:');
    console.log(`  - PENDING:   ${pendingOrderId}`);
    console.log(`  - COMPLETED: ${completedOrderId}`);
    console.log(`  - FAILED:    ${failedOrderId}`);
    console.log(`  - REFUNDED:  ${refundedOrderId}`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n👉 Next Steps:');
    console.log('   1. Visit http://localhost:3000/orders');
    console.log('   2. Verify all 4 orders display with correct status colors');
    console.log('   3. Expand each order to see details');
    console.log('\n✨ Demo data ready!');
    console.log('\nNOTE: Orders were created via API.');
    console.log('Use webhook commands in TASK_3_ORDERS_HARDENING_DEMO.md');
    console.log('to update order statuses dynamically.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure the dev server is running on http://localhost:3000');
    console.error('Run: npm run dev');
    process.exit(1);
  }
}

main();
