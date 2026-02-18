#!/usr/bin/env node

/**
 * Stripe Webhook Test Script
 * Quick verification that webhook handler is working
 * 
 * Usage: node test-stripe-webhook.js
 */

const http = require('http');

// Mock Stripe event
const mockEvent = {
  id: 'evt_test_1234567890',
  object: 'event',
  api_version: '2025-01-21',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'pi_test_1234567890',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 2000,
      amount_received: 2000,
      metadata: {
        orderId: 'order_test_12345'
      }
    }
  },
  livemode: false,
  pending_webhooks: 0,
  request: {
    id: null,
    idempotency_key: null
  },
  type: 'payment_intent.succeeded'
};

const eventJson = JSON.stringify(mockEvent);

console.log('🧪 Testing Stripe Webhook Endpoint\n');
console.log('📤 Sending test event to localhost:3000/api/webhooks/stripe');
console.log('Event type: payment_intent.succeeded\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/stripe',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(eventJson),
    'stripe-signature': 'test_signature_12345', // Mock signature
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📥 Response Status: ${res.statusCode}`);
    console.log(`📥 Response Headers:`, res.headers);
    console.log(`📥 Response Body:`, data);

    if (res.statusCode === 400) {
      console.log('\n✅ Got expected 400 error (signature validation)');
      console.log('This is correct - webhook needs valid Stripe signature');
    } else if (res.statusCode === 500) {
      console.log('\n⚠️  Server error - check environment variables');
      console.log('Required: STRIPE_WEBHOOK_SECRET');
    } else {
      console.log('\n✅ Endpoint is responding');
    }

    console.log('\n💡 To test with real Stripe events:');
    console.log('1. Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
    console.log('2. In another terminal: stripe trigger payment_intent.succeeded');
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
  console.error('\n💡 Make sure:');
  console.error('1. Dev server is running: npm run dev');
  console.error('2. Server is at localhost:3000');
  console.error('3. No firewall blocking connections');
});

req.write(eventJson);
req.end();
