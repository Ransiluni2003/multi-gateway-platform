#!/usr/bin/env node

/**
 * Stripe Webhooks Setup Verification Script
 * 
 * This script verifies that all components of the Stripe webhook
 * integration are properly configured.
 */

const fs = require('fs');
const path = require('path');

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

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function cross() {
  return `${colors.red}✗${colors.reset}`;
}

const checks = [];

// Helper to track checks
function addCheck(name, passed, details = '') {
  checks.push({ name, passed, details });
  const symbol = passed ? checkmark() : cross();
  const message = passed ? colors.green : colors.red;
  console.log(`${symbol} ${message}${name}${colors.reset}${details ? ` - ${details}` : ''}`);
}

// Check file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Check file contains text
function fileContains(filePath, text) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(text);
}

// Main verification
function verify() {
  console.log('\n');
  log('╔' + '═'.repeat(58) + '╗', 'cyan');
  log('║' + ' '.repeat(12) + 'Stripe Webhooks Setup Verification' + ' '.repeat(13) + '║', 'cyan');
  log('╚' + '═'.repeat(58) + '╝', 'cyan');

  // Section 1: File Structure
  logSection('1. File Structure');

  addCheck(
    'Webhook endpoint exists',
    fileExists('src/app/api/webhooks/stripe/route.ts'),
    'Route handler for webhooks'
  );

  addCheck(
    'Stripe utilities exist',
    fileExists('src/lib/stripe-utils.ts'),
    'Payment intent and webhook handlers'
  );

  addCheck(
    'Stripe client exists',
    fileExists('src/lib/stripe.ts'),
    'Stripe SDK initialization'
  );

  addCheck(
    'Payment intent endpoint exists',
    fileExists('src/app/api/payment-intent/route.ts'),
    'Creates payment intents'
  );

  addCheck(
    'Prisma schema exists',
    fileExists('prisma/schema.prisma'),
    'Database models'
  );

  // Section 2: Implementation Details
  logSection('2. Implementation Details');

  addCheck(
    'Webhook signature verification',
    fileContains('src/app/api/webhooks/stripe/route.ts', 'verifyWebhookSignature'),
    'Validates webhook authenticity'
  );

  addCheck(
    'Webhook event handling',
    fileContains('src/app/api/webhooks/stripe/route.ts', 'handleStripeWebhook'),
    'Routes events to handlers'
  );

  addCheck(
    'payment_intent.succeeded handler',
    fileContains('src/lib/stripe-utils.ts', 'payment_intent.succeeded'),
    'Handles successful payments'
  );

  addCheck(
    'payment_intent.payment_failed handler',
    fileContains('src/lib/stripe-utils.ts', 'payment_intent.payment_failed'),
    'Handles failed payments'
  );

  addCheck(
    'charge.refunded handler',
    fileContains('src/lib/stripe-utils.ts', 'charge.refunded'),
    'Handles refunds'
  );

  addCheck(
    'Database order updates',
    fileContains('src/lib/stripe-utils.ts', 'prisma.order.update'),
    'Updates order status on webhook'
  );

  addCheck(
    'Database payment tracking',
    fileContains('src/lib/stripe-utils.ts', 'prisma.payment.update'),
    'Tracks webhook events'
  );

  // Section 3: Database Schema
  logSection('3. Database Schema');

  addCheck(
    'Payment model exists',
    fileContains('prisma/schema.prisma', 'model Payment'),
    'Stores payment information'
  );

  addCheck(
    'Order model has stripePaymentIntentId',
    fileContains('prisma/schema.prisma', 'stripePaymentIntentId'),
    'Links orders to Stripe'
  );

  addCheck(
    'Payment has lastWebhookEvent field',
    fileContains('prisma/schema.prisma', 'lastWebhookEvent'),
    'Tracks webhook events'
  );

  addCheck(
    'Payment has lastWebhookTime field',
    fileContains('prisma/schema.prisma', 'lastWebhookTime'),
    'Timestamps webhook processing'
  );

  addCheck(
    'Payment has refund tracking',
    fileContains('prisma/schema.prisma', 'refundAmount') &&
    fileContains('prisma/schema.prisma', 'refundedAt'),
    'Stores refund information'
  );

  // Section 4: Environment Variables
  logSection('4. Environment Configuration');

  const envPath = '.env';
  const envExists = fileExists(envPath);
  addCheck('.env file exists', envExists, 'Configuration file');

  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    addCheck(
      'STRIPE_SECRET_KEY set',
      envContent.includes('STRIPE_SECRET_KEY='),
      'Required for API calls'
    );

    addCheck(
      'STRIPE_WEBHOOK_SECRET set',
      envContent.includes('STRIPE_WEBHOOK_SECRET='),
      'Required for webhook verification'
    );

    addCheck(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set',
      envContent.includes('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='),
      'Used in frontend'
    );
  }

  // Section 5: Dependencies
  logSection('5. Dependencies');

  const packageJsonPath = 'package.json';
  let packageContent = {};

  if (fileExists(packageJsonPath)) {
    try {
      packageContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (e) {
      console.log('Could not parse package.json');
    }
  }

  const deps = packageContent.dependencies || {};

  addCheck(
    'stripe package installed',
    !!deps.stripe,
    `Version: ${deps.stripe || 'not found'}`
  );

  addCheck(
    '@stripe/react-stripe-js installed',
    !!deps['@stripe/react-stripe-js'],
    `Version: ${deps['@stripe/react-stripe-js'] || 'not found'}`
  );

  addCheck(
    '@stripe/stripe-js installed',
    !!deps['@stripe/stripe-js'],
    `Version: ${deps['@stripe/stripe-js'] || 'not found'}`
  );

  addCheck(
    '@prisma/client installed',
    !!deps['@prisma/client'],
    `Version: ${deps['@prisma/client'] || 'not found'}`
  );

  addCheck(
    'next installed',
    !!deps['next'],
    `Version: ${deps['next'] || 'not found'}`
  );

  // Section 6: Documentation
  logSection('6. Documentation');

  addCheck(
    'Implementation guide exists',
    fileExists('STRIPE_WEBHOOKS_IMPLEMENTATION.md'),
    'Complete setup and testing guide'
  );

  addCheck(
    'Quick reference exists',
    fileExists('STRIPE_WEBHOOKS_QUICK_REFERENCE.md'),
    'Quick start and troubleshooting'
  );

  // Section 7: Test Utilities
  logSection('7. Test Utilities');

  addCheck(
    'Webhook test script exists',
    fileExists('scripts/test-webhooks.js'),
    'For manual webhook testing'
  );

  addCheck(
    'Demo flow script exists',
    fileExists('scripts/demo-order-flow.js'),
    'Complete order flow demonstration'
  );

  // Summary
  logSection('Summary');

  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;
  const percentage = Math.round((passed / total) * 100);

  log(`${passed}/${total} checks passed (${percentage}%)\n`, percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red');

  // Recommendations
  if (passed < total) {
    logSection('Recommendations');

    checks.forEach(check => {
      if (!check.passed) {
        console.log(`  • ${check.name}`);
      }
    });

    console.log('\nRun the following to set up:');
    console.log('  npm install                    # Install dependencies');
    console.log('  npx prisma migrate dev         # Run database migrations');
    console.log('  # Copy .env.stripe.example to .env and fill in values');
  } else {
    logSection('Next Steps');

    console.log(`
1. Configure Stripe Dashboard:
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint with URL: https://yourdomain.com/api/webhooks/stripe
   - Select events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
   - Copy webhook secret to STRIPE_WEBHOOK_SECRET in .env

2. Test locally:
   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe
   - Copy displayed webhook secret to .env

3. Start development server:
   - npm run dev

4. Test webhooks:
   - node scripts/test-webhooks.js --event payment_intent.succeeded
   - Or use Stripe CLI: stripe trigger payment_intent.succeeded

5. Verify database updates:
   - Check Payment and Order tables are updated

🎉 All checks passed! Ready for testing.
    `);
  }

  console.log('\n');
}

verify();
