#!/usr/bin/env node

/**
 * SEED DEMO DATA SCRIPT
 * Creates products and orders with multiple statuses
 * Requires: npm run dev (dev server running on port 3000)
 * Usage: npm run seed
 */

const BASE_URL = 'http://localhost:3000';

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

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function seedProducts() {
  log('\n📦 Seeding Products...', 'cyan');
  
  const products = [
    {
      name: 'Premium Laptop',
      description: 'High-performance laptop for professionals',
      price: 1299.99,
      stock: 10,
    },
    {
      name: 'Wireless Headphones',
      description: 'Premium noise-canceling headphones',
      price: 299.99,
      stock: 25,
    },
    {
      name: 'USB-C Hub',
      description: '7-in-1 USB-C hub with multiple ports',
      price: 49.99,
      stock: 50,
    },
    {
      name: 'Monitor Stand',
      description: 'Adjustable monitor stand with USB ports',
      price: 79.99,
      stock: 15,
    },
    {
      name: 'Mechanical Keyboard',
      description: 'Premium mechanical keyboard with RGB',
      price: 199.99,
      stock: 20,
    },
    {
      name: 'Laptop Stand',
      description: 'Aluminum laptop stand for better ergonomics',
      price: 59.99,
      stock: 30,
    },
  ];

  let createdCount = 0;
  
  for (const product of products) {
    try {
      const response = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });

      if (response.ok) {
        const data = await response.json();
        log(`  ✅ Created: ${product.name}`, 'green');
        createdCount++;
      } else {
        const errorData = await response.json();
        log(`  ⚠️  ${product.name}: ${errorData.message || response.statusText}`, 'yellow');
      }
    } catch (error) {
      log(`  ❌ Error creating ${product.name}: ${error.message}`, 'red');
    }
    
    await delay(100);
  }
  
  log(`✅ Products created: ${createdCount}/${products.length}\n`, 'green');
  return createdCount > 0;
}

async function seedOrders() {
  log('\n📋 Seeding Orders...', 'cyan');
  
  // Get admin token first
  let adminToken = null;
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      adminToken = data.token;
      log(`  ✅ Admin authenticated`, 'green');
    } else {
      log(`  ⚠️  Could not authenticate admin`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Auth error: ${error.message}`, 'red');
  }

  const orders = [
    {
      status: 'PENDING',
      items: [
        { productId: 1, quantity: 1, price: 1299.99 },
      ],
      customerEmail: 'pending@example.com',
      customerName: 'Pending Customer',
      paymentMethod: 'card',
    },
    {
      status: 'COMPLETED',
      items: [
        { productId: 2, quantity: 1, price: 299.99 },
      ],
      customerEmail: 'completed@example.com',
      customerName: 'Completed Customer',
      paymentMethod: 'card',
    },
    {
      status: 'FAILED',
      items: [
        { productId: 3, quantity: 2, price: 49.99 },
      ],
      customerEmail: 'failed@example.com',
      customerName: 'Failed Customer',
      paymentMethod: 'card',
    },
    {
      status: 'REFUNDED',
      items: [
        { productId: 4, quantity: 1, price: 79.99 },
      ],
      customerEmail: 'refunded@example.com',
      customerName: 'Refunded Customer',
      paymentMethod: 'card',
    },
  ];

  let createdCount = 0;
  
  for (const order of orders) {
    try {
      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        const data = await response.json();
        log(`  ✅ Created: Order ${data.id} (${order.status})`, 'green');
        createdCount++;
      } else {
        const errorData = await response.json();
        log(`  ⚠️  ${order.status}: ${errorData.message || response.statusText}`, 'yellow');
      }
    } catch (error) {
      log(`  ❌ Error creating ${order.status} order: ${error.message}`, 'red');
    }
    
    await delay(100);
  }
  
  log(`✅ Orders created: ${createdCount}/${orders.length}\n`, 'green');
  return createdCount > 0;
}

async function main() {
  log('\n' + '='.repeat(80), 'cyan');
  log('DEMO DATA SEEDING', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  log('Prerequisites:', 'blue');
  log('  1. Dev server running: npm run dev', 'yellow');
  log('  2. Database initialized: npx prisma migrate dev', 'yellow');
  log('  3. API endpoints accessible on http://localhost:3000\n', 'yellow');

  // Check server is running
  log('🔍 Checking server connection...', 'cyan');
  let serverRunning = false;
  
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/products`, {
        method: 'GET',
      });
      if (response.ok) {
        serverRunning = true;
        log('✅ Server is running!\n', 'green');
        break;
      }
    } catch (error) {
      if (i < 4) {
        log(`  Attempt ${i + 1}/5: Retrying...`, 'yellow');
        await delay(1000);
      }
    }
  }

  if (!serverRunning) {
    log('❌ Cannot connect to dev server at http://localhost:3000', 'red');
    log('Please start the server first: npm run dev\n', 'yellow');
    process.exit(1);
  }

  // Seed data
  const productsSeeded = await seedProducts();
  const ordersSeeded = await seedOrders();

  // Summary
  log('='.repeat(80), 'cyan');
  log('SEEDING COMPLETE', 'cyan');
  log('='.repeat(80) + '\n', 'cyan');

  if (productsSeeded && ordersSeeded) {
    log('✅ Demo data seeding successful!\n', 'green');
    log('📺 Next Steps:', 'blue');
    log('  1. View products: http://localhost:3000/products', 'yellow');
    log('  2. View orders (admin): http://localhost:3000/orders', 'yellow');
    log('  3. Test webhooks: npm run test:webhooks', 'yellow');
    log('  4. Run E2E tests: npm run test:e2e', 'yellow');
    log('  5. See guide: HOW_TO_RUN_LOCALLY.md\n', 'yellow');
  } else {
    log('⚠️  Some data failed to seed. Check errors above.', 'yellow');
    log('This may be due to:', 'yellow');
    log('  - Server not running', 'yellow');
    log('  - Database not initialized', 'yellow');
    log('  - API endpoints not responding', 'yellow');
  }

  process.exit(productsSeeded && ordersSeeded ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
