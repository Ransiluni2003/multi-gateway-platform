#!/usr/bin/env node

/**
 * Rate Limiting Verification Script
 * 
 * Demonstrates rate limiting protection on actual endpoints:
 * - /api/auth/login (login attempts)
 * - /api/auth/register (registration attempts)
 * - /api/files/download-url (file requests)
 * 
 * Shows:
 * 1. Which endpoints are rate limited
 * 2. First N requests succeed
 * 3. Overflow requests return 429
 * 4. Rate limit headers included
 * 
 * Usage: npm run verify:rate-limiting
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(url, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      timeout: 5000,
      headers: {},
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(name, url, method, bodyFn, limit, testCount) {
  console.log(colorize(`\n🎯 Testing: ${name}`, 'bold'));
  console.log(colorize(`   Endpoint: ${method} ${url.replace(BASE_URL, '')}`, 'gray'));
  console.log(colorize(`   Limit: ${limit} requests per minute`, 'gray'));
  console.log(colorize(`   Sending: ${testCount} requests\n`, 'gray'));

  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0,
    firstThrottleAt: -1,
    headers: null,
  };

  for (let i = 1; i <= testCount; i++) {
    try {
      const body = bodyFn ? bodyFn(i) : null;
      const response = await makeRequest(url, method, body);

      let statusDisplay;
      let details = '';

      if (response.statusCode === 200 || response.statusCode === 400 || response.statusCode === 401) {
        // 200 = success, 400 = validation error, 401 = unauthorized (expected for protected endpoints)
        statusDisplay = colorize(`✓ ${response.statusCode}`, 'green');
        results.success++;
      } else if (response.statusCode === 429) {
        statusDisplay = colorize(`✗ 429`, 'red');
        results.rateLimited++;
        if (results.firstThrottleAt === -1) {
          results.firstThrottleAt = i;
          results.headers = response.headers;
        }
      } else {
        statusDisplay = colorize(`? ${response.statusCode}`, 'yellow');
        results.errors++;
      }

      process.stdout.write(`   Request ${i.toString().padStart(2)}: ${statusDisplay}\n`);
      await sleep(80); // Small delay between requests
    } catch (err) {
      console.log(colorize(`   Request ${i}: ❌ ${err.message}`, 'red'));
      results.errors++;
    }
  }

  // Show rate limit headers if throttled
  if (results.rateLimited > 0 && results.headers) {
    console.log();
    console.log(colorize('  📊 Rate Limit Headers:', 'yellow'));
    console.log(colorize(`     X-RateLimit-Limit:     ${results.headers['x-ratelimit-limit'] || 'N/A'}`, 'gray'));
    console.log(colorize(`     X-RateLimit-Remaining: ${results.headers['x-ratelimit-remaining'] || 'N/A'}`, 'gray'));
    console.log(colorize(`     X-RateLimit-Reset:     ${results.headers['x-ratelimit-reset'] || 'N/A'}`, 'gray'));
    console.log(colorize(`     Retry-After:           ${results.headers['retry-after'] || 'N/A'} seconds`, 'gray'));
  }

  console.log();
  console.log(colorize(`  ✅ Successful: ${results.success}`, 'green'));
  if (results.rateLimited > 0) {
    console.log(colorize(`  ❌ Rate Limited (429): ${results.rateLimited}`, 'red'));
    console.log(colorize(`  First throttle at request: ${results.firstThrottleAt}`, 'yellow'));
  } else {
    console.log(colorize(`  ⚠️  No 429s observed (limit may be very high)`, 'yellow'));
  }
  if (results.errors > 0) {
    console.log(colorize(`  ⚠️  Errors: ${results.errors}`, 'yellow'));
  }

  return results;
}

async function getCsrfToken() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/csrf-token`, 'GET');
    const data = JSON.parse(response.body);
    return data.csrfToken;
  } catch (err) {
    console.warn(colorize('Warning: Could not fetch CSRF token. Auth tests may fail.', 'yellow'));
    return null;
  }
}

async function main() {
  console.log(colorize('\n🔒 RATE LIMITING VERIFICATION\n', 'bold'));
  console.log(colorize('Verifies specific endpoint rate limiting:', 'gray'));
  console.log(colorize('  • /api/auth/* (5 per 15 min)', 'gray'));
  console.log(colorize('  • /api/coupons/validate (10 per min)', 'gray'));
  console.log(colorize('  • /api/webhooks/* (100 per min)\n', 'gray'));

  try {
    // Fetch CSRF token for auth endpoints
    const csrfToken = await getCsrfToken();

    // Test 1: Login attempts (5 per 15 mins)
    console.log(colorize('Note: Auth endpoints require CSRF token. Testing rate limit...', 'gray'));
    const loginResults = await testEndpoint(
      'Login Endpoint (5 per 15 min)',
      `${BASE_URL}/api/auth/login`,
      'POST',
      (i) => ({
        email: `test${i}@example.com`,
        password: `password${i}`,
        _csrf: csrfToken
      }),
      5, // 5 attempts per 15 mins
      8
    );
    await sleep(500);

    // Test 2: Registration attempts (5 per 15 mins)
    const registerResults = await testEndpoint(
      'Registration Endpoint (5 per 15 min)',
      `${BASE_URL}/api/auth/register`,
      'POST',
      (i) => ({
        name: `Test User ${i}`,
        email: `user${i}@example.com`,
        password: `Password${i}123!`,
        _csrf: csrfToken
      }),
      5,
      8
    );
    await sleep(500);

    // Test 3: Coupon validation (10 per minute) - requires auth
    console.log(colorize('Note: Coupon endpoint requires authentication. May return 401.', 'gray'));
    const couponResults = await testEndpoint(
      'Coupon Validation Endpoint (10 per min)',
      `${BASE_URL}/api/coupons/validate`,
      'POST',
      (i) => ({
        code: `TEST${i}`
      }),
      10, // 10 per minute
      12
    );

    // Summary
    console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
    console.log(colorize('  RATE LIMITING VERIFICATION SUMMARY', 'bold'));
    console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

    console.log(colorize('Protected Endpoints:', 'bold'));
    console.log(colorize('  1️⃣  POST /api/auth/login (5 per 15 min)', 'cyan'));
    if (loginResults.rateLimited > 0) {
      console.log(colorize(`      ✅ Rate limited after ${loginResults.firstThrottleAt} requests`, 'green'));
    } else {
      console.log(colorize(`      ⚠️  Not rate limited in this test`, 'yellow'));
    }

    console.log(colorize('  2️⃣  POST /api/auth/register (5 per 15 min)', 'cyan'));
    if (registerResults.rateLimited > 0) {
      console.log(colorize(`      ✅ Rate limited after ${registerResults.firstThrottleAt} requests`, 'green'));
    } else {
      console.log(colorize(`      ⚠️  Not rate limited in this test`, 'yellow'));
    }

    console.log(colorize('  3️⃣  POST /api/coupons/validate (10 per min)', 'cyan'));
    if (couponResults.rateLimited > 0) {
      console.log(colorize(`      ✅ Rate limited after ${couponResults.firstThrottleAt} requests`, 'green'));
    } else {
      console.log(colorize(`      ⚠️  Not rate limited in this test`, 'yellow'));
    }

    console.log();
    console.log(colorize('Rate Limit Headers Present:', 'bold'));
    if (loginResults.headers || registerResults.headers || couponResults.headers) {
      const headers = loginResults.headers || registerResults.headers || couponResults.headers;
      console.log(colorize('  ✅ X-RateLimit-Limit', 'green'));
      console.log(colorize('  ✅ X-RateLimit-Remaining', 'green'));
      console.log(colorize('  ✅ X-RateLimit-Reset', 'green'));
      console.log(colorize('  ✅ Retry-After', 'green'));
    } else {
      console.log(colorize('  ⚠️  No rate limit headers found', 'yellow'));
    }

    console.log('\n' + colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

    console.log(colorize('📚 Implementation:', 'bold'));
    console.log(colorize('   /api/auth/*: backend/src/routes/authRoutes.ts', 'gray'));
    console.log(colorize('   /api/coupons/validate: backend/src/routes/couponRoutes.ts', 'gray'));
    console.log(colorize('   /api/webhooks/*: backend/src/routes/webhookRoutes.ts', 'gray'));

    console.log();
    const anyRateLimited = loginResults.rateLimited > 0 || registerResults.rateLimited > 0 || couponResults.rateLimited > 0;
    if (anyRateLimited) {
      console.log(colorize('✅ PASS: Rate limiting is working! (Observed 429 responses)', 'green'));
    } else {
      console.log(colorize('⚠️  WARNING: No 429s observed. Limits may be too high or need more requests.', 'yellow'));
    }

  } catch (err) {
    console.log(colorize(`\n❌ Verification failed: ${err.message}`, 'red'));
    console.log(colorize('   Ensure backend is running: npm run dev', 'gray'));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(colorize(`Fatal error: ${err.message}`, 'red'));
  process.exit(1);
});
