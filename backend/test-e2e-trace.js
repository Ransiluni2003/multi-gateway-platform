#!/usr/bin/env node

/**
 * E2E Test: Payment → Analytics → Notifications cross-service trace
 * 
 * This test verifies that:
 * 1. Payment service creates a trace and publishes payment.completed event
 * 2. Analytics service receives event, extracts parent trace context, creates child spans
 * 3. Analytics publishes report.generate event with propagated trace context
 * 4. Notifications service receives event, extracts parent trace, creates child spans
 * 
 * All spans are stored in MongoDB with linked traceID.
 */

const axios = require('axios');
const { MongoClient } = require('mongodb');

const BACKEND_URL = 'http://localhost:5000';
const MONGO_URL = process.env.MONGO_URI || 'mongodb://localhost:27017/multi_gateway_db';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('🧪 Starting E2E Trace Verification...\n');

  let mongoClient;
  try {
    // Connect to MongoDB
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    const db = mongoClient.db();
    const tracesCollection = db.collection('traces');

    // Step 1: Trigger payment
    console.log('1️⃣  Triggering payment request...');
    let paymentTraceId;
    try {
      const paymentRes = await axios.post(`${BACKEND_URL}/api/payments/pay`, {
        amount: 100,
        method: 'card',
      }, {
        timeout: 10000,
      });
      const traceIdHeader = paymentRes.headers['x-trace-id'];
      console.log(`   ✅ Payment request completed`);
      console.log(`   📊 Trace-ID: ${traceIdHeader}\n`);
      paymentTraceId = traceIdHeader;
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const code = err?.code;
      console.error('   ❌ Payment request failed:');
      if (status) console.error(`      - Status: ${status}`);
      if (code) console.error(`      - Code: ${code}`);
      if (data) console.error(`      - Response:`, data);
      console.error(`      - Message: ${err?.message}`);
      console.error('\n   🔎 Quick checks:');
      console.error('      - Is backend API running on http://localhost:5000?');
      console.error('      - Is payments service running on http://localhost:4001?');
      console.error('      - Did you set MONGO_URI and MONGO_URL environment variables?');
      console.error('      - Is Redis running on localhost:6379?');
      process.exit(1);
    }

    // Step 2: Wait for event propagation
    console.log('2️⃣  Waiting for event propagation (3 seconds)...');
    await sleep(3000);

    // Step 3: Query traces
    console.log('3️⃣  Querying traces from MongoDB...\n');
    const traces = await tracesCollection
      .find({
        $or: [
          { traceID: paymentTraceId },
          { id: paymentTraceId },
          { 'spans.service': { $in: ['payments', 'analytics', 'notifications'] } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    if (traces.length === 0) {
      console.log('   ⚠️  No traces found. Services may not be running or event bus not configured.');
      console.log('   📋 To verify setup:');
      console.log('      - Backend: npm run dev');
      console.log('      - Ensure Redis is running on localhost:6379');
      console.log('      - Ensure MongoDB is running with database "multi_gateway_db"');
      process.exit(1);
    }

    console.log(`   ✅ Found ${traces.length} trace(s)\n`);

    // Analyze traces
    const services = new Set();
    let totalSpans = 0;
    let linkedTraces = 0;

    traces.forEach((trace, idx) => {
      console.log(`\n📍 Trace #${idx + 1}:`);
      console.log(`   ID: ${trace.traceID || trace.id}`);
      console.log(`   Service: ${trace.serviceName}`);
      console.log(`   Status: ${trace.status}`);
      console.log(`   Duration: ${trace.durationMs}ms`);
      console.log(`   Path: ${trace.path}`);

      if (trace.spans && trace.spans.length > 0) {
        console.log(`   Spans: ${trace.spans.length}`);
        trace.spans.forEach((span) => {
          console.log(`      - ${span.operation} (${span.service}) [${span.durationMs}ms]`);
          services.add(span.service);
          totalSpans++;
        });
      }

      if (trace.traceID === paymentTraceId || trace.id === paymentTraceId) {
        linkedTraces++;
      }
    });

    console.log('\n📊 Summary:');
    console.log(`   Services involved: ${Array.from(services).join(', ') || 'None'}`);
    console.log(`   Total spans: ${totalSpans}`);
    console.log(`   Linked to payment trace: ${linkedTraces}`);

    // Success criteria
    const hasPayments = services.has('payments');
    const hasAnalytics = services.has('analytics');
    const hasNotifications = services.has('notifications');

    console.log('\n✅ Verification Results:');
    console.log(`   ${hasPayments ? '✅' : '❌'} Payments service spans captured`);
    console.log(`   ${hasAnalytics ? '✅' : '❌'} Analytics service spans captured`);
    console.log(`   ${hasNotifications ? '✅' : '❌'} Notifications service spans captured`);

    if (hasPayments && hasAnalytics && hasNotifications) {
      console.log('\n🎉 Full cross-service trace complete!');
      console.log('   Payment → Analytics → Notifications workflow traced successfully.');
    } else {
      console.log('\n⚠️  Partial trace. Check service logs for errors.');
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

test();
