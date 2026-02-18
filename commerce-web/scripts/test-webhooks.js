#!/usr/bin/env node

/**
 * Stripe Webhook Testing Script
 * 
 * This script helps test the Stripe webhook implementation locally
 * without needing the full Stripe CLI
 * 
 * Usage:
 *   node scripts/test-webhooks.js --event payment_intent.succeeded --orderId order_123
 *   node scripts/test-webhooks.js --event payment_intent.payment_failed --orderId order_123
 *   node scripts/test-webhooks.js --event charge.refunded --orderId order_123
 */

const crypto = require('crypto');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i += 2) {
  if (args[i].startsWith('--')) {
    params[args[i].slice(2)] = args[i + 1];
  }
}

const EVENT_TYPE = params.event || 'payment_intent.succeeded';
const ORDER_ID = params.orderId || 'test_order_123';
const WEBHOOK_SECRET = params.secret || process.env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL = params.url || 'http://localhost:3000/api/webhooks/stripe';

console.log('\n🔔 Stripe Webhook Test Script');
console.log('━'.repeat(50));
console.log(`Event Type:     ${EVENT_TYPE}`);
console.log(`Order ID:       ${ORDER_ID}`);
console.log(`Webhook URL:    ${WEBHOOK_URL}`);
console.log('━'.repeat(50));

// Create mock webhook event payload based on type
function createPayload() {
  const basePayload = {
    id: `evt_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {},
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: EVENT_TYPE,
  };

  switch (EVENT_TYPE) {
    case 'payment_intent.succeeded':
      basePayload.data.object = {
        id: `pi_${Date.now()}`,
        object: 'payment_intent',
        amount: 5000,
        amount_capturable: 0,
        amount_received: 5000,
        charges: {
          object: 'list',
          data: [
            {
              id: `ch_${Date.now()}`,
              object: 'charge',
            },
          ],
        },
        client_secret: `pi_secret_${Date.now()}`,
        confirmation_method: 'automatic',
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        customer: null,
        description: null,
        last_payment_error: null,
        latest_charge: `ch_${Date.now()}`,
        livemode: false,
        metadata: {
          orderId: ORDER_ID,
        },
        next_action: null,
        on_behalf_of: null,
        payment_method: null,
        payment_method_types: ['card'],
        processing: null,
        receipt_email: 'customer@example.com',
        review: null,
        setup_future_usage: null,
        shipping: null,
        source: null,
        statement_descriptor: null,
        statement_descriptor_suffix: null,
        status: 'succeeded',
        transfer_data: null,
        transfer_group: null,
      };
      break;

    case 'payment_intent.payment_failed':
      basePayload.data.object = {
        id: `pi_${Date.now()}`,
        object: 'payment_intent',
        amount: 5000,
        amount_capturable: 0,
        amount_received: 0,
        charges: {
          object: 'list',
          data: [],
        },
        client_secret: `pi_secret_${Date.now()}`,
        confirmation_method: 'automatic',
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        customer: null,
        description: null,
        last_payment_error: {
          charge: null,
          code: 'card_declined',
          decline_code: 'generic_decline',
          doc_url: 'https://stripe.com/docs/error-codes/card-declined',
          message: 'Your card was declined',
          param: null,
          payment_intent: {
            id: `pi_${Date.now()}`,
            object: 'payment_intent',
          },
          payment_method: {
            id: `pm_${Date.now()}`,
            object: 'payment_method',
          },
          payment_method_type: 'card',
          type: 'card_error',
        },
        latest_charge: null,
        livemode: false,
        metadata: {
          orderId: ORDER_ID,
        },
        next_action: null,
        on_behalf_of: null,
        payment_method: null,
        payment_method_types: ['card'],
        processing: null,
        receipt_email: 'customer@example.com',
        review: null,
        setup_future_usage: null,
        shipping: null,
        source: null,
        statement_descriptor: null,
        statement_descriptor_suffix: null,
        status: 'requires_payment_method',
        transfer_data: null,
        transfer_group: null,
      };
      break;

    case 'charge.refunded':
      basePayload.data.object = {
        id: `ch_${Date.now()}`,
        object: 'charge',
        amount: 5000,
        amount_captured: 5000,
        amount_refunded: 5000,
        balance_transaction: `txn_${Date.now()}`,
        billing_details: null,
        captured: true,
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        customer: null,
        description: 'Order refund',
        destination: null,
        dispute: null,
        disputed: false,
        failure_balance_transaction: null,
        failure_code: null,
        failure_message: null,
        fraud_details: null,
        invoice: null,
        livemode: false,
        metadata: {
          orderId: ORDER_ID,
        },
        outcome: {
          network_status: 'approved_by_network',
          reason: null,
          risk_level: 'normal',
          risk_score: 32,
          seller_message: 'Payment complete.',
          type: 'authorized',
        },
        paid: true,
        payment_intent: `pi_${Date.now()}`,
        payment_method: `pm_${Date.now()}`,
        payment_method_details: {
          card: {
            brand: 'visa',
            checks: {
              address_line1_check: null,
              address_postal_code_check: null,
              cvc_check: 'pass',
            },
          },
          type: 'card',
        },
        receipt_email: 'customer@example.com',
        receipt_number: null,
        receipt_url: 'https://pay.stripe.com/receipts/test',
        refunded: true,
        refunds: {
          object: 'list',
          data: [
            {
              id: `re_${Date.now()}`,
              object: 'refund',
              amount: 5000,
              charge: `ch_${Date.now()}`,
              created: Math.floor(Date.now() / 1000),
              currency: 'usd',
              metadata: {},
              reason: 'requested_by_customer',
              receipt_number: null,
              source_transfer_reversal: null,
              status: 'succeeded',
              transfer_reversal: null,
            },
          ],
        },
        review: null,
        shipping: null,
        source: {
          brand: 'Visa',
          country: 'US',
          exp_month: 12,
          exp_year: 2025,
          fingerprint: 'test_fingerprint',
          funding: 'credit',
          id: `card_${Date.now()}`,
          last4: '4242',
          object: 'card',
        },
        source_transfer: null,
        statement_descriptor: null,
        statement_descriptor_suffix: null,
        status: 'succeeded',
        transfer_data: null,
        transfer_group: null,
      };
      break;

    default:
      console.error(`\n❌ Unknown event type: ${EVENT_TYPE}`);
      process.exit(1);
  }

  return basePayload;
}

// Sign webhook using Stripe's signature method
function signWebhook(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
  
  // Stripe uses: timestamp.payload with secret
  const signedContent = `${timestamp}.${body}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  return {
    timestamp,
    signature: `t=${timestamp},v1=${signature}`,
  };
}

// Send webhook to local endpoint
function sendWebhook(payload, signature, timestamp) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
        'User-Agent': 'Stripe Webhook Test Script',
      },
    };

    const body = JSON.stringify(payload);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

// Main execution
async function main() {
  if (!WEBHOOK_SECRET) {
    console.error('\n❌ Error: STRIPE_WEBHOOK_SECRET not found');
    console.error('   Set it via: --secret YOUR_SECRET or STRIPE_WEBHOOK_SECRET env var\n');
    process.exit(1);
  }

  try {
    const payload = createPayload();
    const { timestamp, signature } = signWebhook(payload, WEBHOOK_SECRET);

    console.log('\n📤 Sending webhook...\n');

    const response = await sendWebhook(payload, signature, timestamp);

    console.log(`Response Status: ${response.statusCode}`);
    console.log(`Response Body:\n  ${response.body}\n`);

    if (response.statusCode === 200) {
      console.log('✅ Webhook delivered successfully!');
    } else if (response.statusCode >= 400) {
      console.log('⚠️  Webhook returned error status');
    }

    console.log('\n📋 Event Details:');
    console.log(`  Event ID:   ${payload.id}`);
    console.log(`  Type:       ${payload.type}`);
    console.log(`  Order ID:   ${ORDER_ID}`);
    console.log(`  Timestamp:  ${new Date(payload.created * 1000).toISOString()}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error sending webhook:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

main();
