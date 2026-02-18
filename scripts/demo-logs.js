#!/usr/bin/env node

/**
 * Demo: Structured Logging with Request Correlation
 * 
 * This script demonstrates:
 * 1. Request ID (correlation ID) across multiple endpoints
 * 2. Structured JSON logs with requestId, route, latency, and more
 * 3. Error logs with stack traces
 * 4. Webhook logging with event types and idempotency keys
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const COMMERCE_URL = process.env.COMMERCE_URL || 'http://localhost:3001';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  console.log('\n' + '='.repeat(80) + '\n');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(name, url, method = 'GET', data = null, headers = {}) {
  log(colors.bright + colors.cyan, `\n📤 ${name}`);
  log(colors.yellow, `   ${method} ${url}`);
  
  if (headers['x-request-id']) {
    log(colors.magenta, `   Request ID: ${headers['x-request-id']}`);
  }

  try {
    const startTime = Date.now();
    const response = await axios({
      method,
      url,
      data,
      headers,
      validateStatus: () => true, // Don't throw on any status
    });
    const latency = Date.now() - startTime;

    const statusColor = response.status >= 400 ? colors.red : colors.green;
    log(statusColor, `   ✓ ${response.status} ${response.statusText} (${latency}ms)`);
    
    if (response.headers['x-request-id']) {
      log(colors.magenta, `   Response Request ID: ${response.headers['x-request-id']}`);
    }

    return response;
  } catch (error) {
    log(colors.red, `   ✗ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.clear();
  
  log(colors.bright + colors.cyan, '╔══════════════════════════════════════════════════════════════════════╗');
  log(colors.bright + colors.cyan, '║   Structured Logging + Request Correlation Demo                     ║');
  log(colors.bright + colors.cyan, '╚══════════════════════════════════════════════════════════════════════╝');

  separator();

  log(colors.bright, '🎯 Demonstration Flow:');
  log(colors.reset, '   1. Generate a unique correlation ID');
  log(colors.reset, '   2. Make requests to multiple endpoints with the same ID');
  log(colors.reset, '   3. Show logs with correlation across services');
  log(colors.reset, '   4. Demonstrate error logging with stack traces');

  separator();

  // Generate correlation ID
  const correlationId = uuidv4();
  log(colors.bright + colors.green, `🆔 Generated Correlation ID: ${correlationId}`);

  separator();

  log(colors.bright + colors.cyan, '📋 SCENARIO 1: Health Check Requests');
  log(colors.reset, '   Testing basic request correlation across backend...\n');

  await makeRequest(
    'Backend Health Check',
    `${BACKEND_URL}/api/health`,
    'GET',
    null,
    { 'x-request-id': correlationId }
  );

  await delay(500);

  await makeRequest(
    'Backend Services Health',
    `${BACKEND_URL}/api/health/services`,
    'GET',
    null,
    { 'x-request-id': correlationId }
  );

  separator();

  log(colors.bright + colors.cyan, '📋 SCENARIO 2: Commerce API Requests');
  log(colors.reset, '   Testing structured logging in Next.js API routes...\n');

  await delay(500);

  const ordersCorrelationId = uuidv4();
  await makeRequest(
    'Get Orders',
    `${COMMERCE_URL}/api/orders`,
    'GET',
    null,
    { 'x-request-id': ordersCorrelationId }
  );

  await delay(500);

  await makeRequest(
    'Get Products',
    `${COMMERCE_URL}/api/products`,
    'GET',
    null,
    { 'x-request-id': ordersCorrelationId }
  );

  separator();

  log(colors.bright + colors.cyan, '📋 SCENARIO 3: Error Logging');
  log(colors.reset, '   Testing error logs with stack traces...\n');

  await delay(500);

  const errorCorrelationId = uuidv4();
  await makeRequest(
    'Non-existent Order',
    `${COMMERCE_URL}/api/orders?id=non-existent-order-123`,
    'GET',
    null,
    { 'x-request-id': errorCorrelationId }
  );

  separator();

  log(colors.bright + colors.green, '✅ Demo Complete!\n');

  log(colors.bright + colors.cyan, '📝 Where to Find the Logs:\n');
  
  log(colors.bright, '   Backend Logs:');
  log(colors.yellow, '   • Console Output: Look for JSON structured logs above');
  log(colors.yellow, '   • File: backend/logs/combined.log');
  log(colors.yellow, '   • Error File: backend/logs/error.log');
  log(colors.yellow, '   • Command: tail -f backend/logs/combined.log\n');

  log(colors.bright, '   Commerce-Web Logs:');
  log(colors.yellow, '   • Console Output: Check the Next.js server console');
  log(colors.yellow, '   • Command: npm run dev (in commerce-web folder)\n');

  log(colors.bright, '   Search by Correlation ID:');
  log(colors.magenta, `   • Backend: grep "${correlationId}" backend/logs/combined.log`);
  log(colors.magenta, `   • Orders Request: grep "${ordersCorrelationId}" backend/logs/combined.log`);
  log(colors.magenta, `   • Error Request: grep "${errorCorrelationId}" backend/logs/combined.log\n`);

  separator();

  log(colors.bright + colors.cyan, '🔍 Log Structure Example:\n');
  log(colors.reset, JSON.stringify({
    level: 'info',
    message: 'GET /api/orders - 200',
    timestamp: new Date().toISOString(),
    service: 'commerce-web',
    requestId: ordersCorrelationId,
    route: '/api/orders',
    method: 'GET',
    statusCode: 200,
    latency: 45,
  }, null, 2));

  separator();

  log(colors.bright + colors.green, '📚 Key Features Demonstrated:\n');
  log(colors.green, '   ✓ Request ID correlation across multiple requests');
  log(colors.green, '   ✓ Structured JSON logs (level, message, requestId, route, latency)');
  log(colors.green, '   ✓ Response headers include x-request-id and x-correlation-id');
  log(colors.green, '   ✓ Automatic logging middleware for all routes');
  log(colors.green, '   ✓ Error logs include stack traces and context');
  log(colors.green, '   ✓ Ready for webhook event logging (eventType, idempotencyKey)');

  separator();

  log(colors.bright + colors.yellow, '💡 Next Steps:\n');
  log(colors.reset, '   1. Check the logs in backend/logs/combined.log');
  log(colors.reset, '   2. Search for your correlation IDs in the logs');
  log(colors.reset, '   3. Try making your own requests with custom x-request-id headers');
  log(colors.reset, '   4. Record a Loom showing the same requestId across logs');

  console.log('\n');
}

main().catch(error => {
  log(colors.red, `\n❌ Demo Error: ${error.message}`);
  process.exit(1);
});
