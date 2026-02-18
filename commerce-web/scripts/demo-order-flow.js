#!/usr/bin/env node

/**
 * Complete Order & Payment Flow Demo
 * 
 * This demonstrates the complete checkout flow:
 * 1. Create an order
 * 2. Create a payment intent
 * 3. Simulate webhook events
 * 4. Verify database updates
 */

const https = require('https');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINTS = {
  createOrder: '/api/orders',
  getOrder: '/api/orders',
  paymentIntent: '/api/payment-intent',
  webhook: '/api/webhooks/stripe',
};

// Utility function to make HTTP requests
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            body: parsed,
            raw: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: null,
            raw: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  log(title, 'cyan');
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Demo data
const sampleOrder = {
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zipCode: '94105',
  country: 'USA',
  items: [
    {
      productId: 'prod_1', // Ensure this product exists
      quantity: 2,
    },
  ],
};

// Main demo flow
async function runDemo() {
  let orderId;
  let paymentIntentId;

  try {
    logSection('Step 1: Create Order');
    logInfo('Creating a new order with sample data...');
    console.log('Order Data:', JSON.stringify(sampleOrder, null, 2));

    const createOrderResponse = await makeRequest('POST', API_ENDPOINTS.createOrder, sampleOrder);

    if (createOrderResponse.status !== 200) {
      logError(`Failed to create order: ${createOrderResponse.status}`);
      console.log('Response:', createOrderResponse.raw);
      process.exit(1);
    }

    const { orderId: newOrderId, total } = createOrderResponse.body;
    orderId = newOrderId;

    logSuccess(`Order created with ID: ${orderId}`);
    logInfo(`Total amount: $${(total / 100).toFixed(2)}`);

    // Step 2: Create payment intent
    logSection('Step 2: Create Payment Intent');
    logInfo(`Creating payment intent for order ${orderId}...`);

    const paymentIntentResponse = await makeRequest(
      'POST',
      API_ENDPOINTS.paymentIntent,
      {
        orderId,
        amount: total,
        email: sampleOrder.email,
      }
    );

    if (paymentIntentResponse.status !== 200) {
      logError(`Failed to create payment intent: ${paymentIntentResponse.status}`);
      console.log('Response:', paymentIntentResponse.raw);
      process.exit(1);
    }

    const { clientSecret, paymentIntentId: newPaymentIntentId } = paymentIntentResponse.body;
    paymentIntentId = newPaymentIntentId;

    logSuccess(`Payment intent created: ${paymentIntentId}`);
    logInfo(`Client secret: ${clientSecret.substring(0, 30)}...`);

    // Step 3: Check initial order status
    logSection('Step 3: Verify Initial Order Status');
    logInfo(`Checking order status before payment...`);

    const initialOrderResponse = await makeRequest(
      'GET',
      `${API_ENDPOINTS.getOrder}?id=${orderId}`
    );

    if (initialOrderResponse.body.order) {
      const order = initialOrderResponse.body.order;
      logInfo(`Order status: ${order.status}`);
      logInfo(`Payment status: ${order.payment ? order.payment.status : 'no payment record'}`);
    }

    // Step 4: Simulate webhooks
    logSection('Step 4: Simulate Webhook Events');

    // Event 1: Payment Succeeded
    logInfo('Simulating payment_intent.succeeded webhook...');
    logWarning('Note: This is a manual simulation for demo purposes');
    logInfo('In production, Stripe will send real webhooks automatically');

    console.log('\nYou can test webhooks using:');
    console.log(`  stripe trigger payment_intent.succeeded`);
    console.log(`  stripe trigger payment_intent.payment_failed`);
    console.log(`  stripe trigger charge.refunded`);

    // Step 5: Instructions for actual testing
    logSection('Step 5: Next Steps');

    console.log(`
1. 📱 Use the payment form with test card:
   - Card Number: 4242 4242 4242 4242
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)

2. ✅ For payment success:
   - Use card: 4242 4242 4242 4242
   - Webhook will update order to "completed"

3. ❌ For payment failure:
   - Use card: 4000 0000 0000 0002
   - Webhook will update order to "failed"

4. 🔄 For refunds:
   - Use card: 4000 0000 0000 0069
   - Process refund in Stripe Dashboard
   - Webhook will update order to "refunded"

5. 📊 Monitor database updates:
   SELECT * FROM Payment WHERE orderId = '${orderId}';
   SELECT * FROM Order WHERE id = '${orderId}';

6. 🔔 Set up webhook listener locally:
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
    `);

    logSuccess('Demo flow complete!');
    log('\nKey Information for Testing:', 'cyan');
    log(`  Order ID:              ${orderId}`, 'cyan');
    log(`  Payment Intent ID:     ${paymentIntentId}`, 'cyan');
    log(`  Customer Email:        ${sampleOrder.email}`, 'cyan');
    log(`  Total Amount:          $${(total / 100).toFixed(2)}`, 'cyan');

  } catch (error) {
    logError(`Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('GET', API_ENDPOINTS.getOrder + '?id=test');
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('\n');
  log('╔' + '═'.repeat(58) + '╗', 'cyan');
  log('║' + ' '.repeat(10) + 'Stripe Webhooks - Complete Flow Demo' + ' '.repeat(12) + '║', 'cyan');
  log('╚' + '═'.repeat(58) + '╝', 'cyan');

  logInfo('Checking if server is running...');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    logError('Could not connect to server at ' + BASE_URL);
    logInfo('Please start the development server first:');
    log('  npm run dev', 'yellow');
    process.exit(1);
  }

  logSuccess('Server is running!');

  await runDemo();

  console.log('\n');
}

main();
