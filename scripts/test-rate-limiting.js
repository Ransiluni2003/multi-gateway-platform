#!/usr/bin/env node

/**
 * Rate Limiting Verification Script
 * 
 * Tests rate limiting on protected endpoints and verifies 429 responses
 * 
 * Usage:
 *   node scripts/test-rate-limiting.js [BASE_URL]
 * 
 * Examples:
 *   node scripts/test-rate-limiting.js http://localhost:3000
 *   node scripts/test-rate-limiting.js https://production.com
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TESTS = [
  {
    name: 'Auth Endpoint (Login)',
    endpoint: '/api/auth/login',
    method: 'POST',
    limit: 5,
    windowMinutes: 15,
    body: { email: 'test@example.com', password: 'password123' },
  },
  {
    name: 'Coupon Validation',
    endpoint: '/api/coupons/validate',
    method: 'POST',
    limit: 10,
    windowMinutes: 1,
    body: { code: 'TESTCODE' },
  },
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = protocol.request(requestOptions, (res) => {
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

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testEndpoint(test) {
  console.log('\n' + colorize('='.repeat(80), 'cyan'));
  console.log(colorize(`Testing: ${test.name}`, 'bold'));
  console.log(colorize(`Endpoint: ${test.endpoint}`, 'gray'));
  console.log(colorize(`Rate Limit: ${test.limit} requests per ${test.windowMinutes} minute(s)`, 'gray'));
  console.log(colorize('='.repeat(80), 'cyan'));
  console.log();

  const results = [];
  const numRequests = test.limit + 3; // Test beyond limit

  for (let i = 1; i <= numRequests; i++) {
    try {
      const url = `${BASE_URL}${test.endpoint}`;
      const response = await makeRequest(
        url,
        { method: test.method },
        test.body
      );

      const statusText = response.statusCode === 200 || response.statusCode === 400
        ? colorize(`${response.statusCode} OK`, 'green')
        : response.statusCode === 429
        ? colorize(`${response.statusCode} TOO MANY REQUESTS`, 'red')
        : colorize(`${response.statusCode}`, 'yellow');

      console.log(`Request ${i.toString().padStart(2, ' ')}: ${statusText}`);

      results.push({
        requestNum: i,
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
      });

      // If we hit rate limit, show headers
      if (response.statusCode === 429) {
        console.log();
        console.log(colorize('Rate Limit Headers:', 'yellow'));
        console.log(colorize(`  X-RateLimit-Limit:     ${response.headers['x-ratelimit-limit'] || 'N/A'}`, 'gray'));
        console.log(colorize(`  X-RateLimit-Remaining: ${response.headers['x-ratelimit-remaining'] || 'N/A'}`, 'gray'));
        console.log(colorize(`  X-RateLimit-Reset:     ${response.headers['x-ratelimit-reset'] || 'N/A'}`, 'gray'));
        console.log(colorize(`  Retry-After:           ${response.headers['retry-after'] || 'N/A'} seconds`, 'gray'));
        console.log();
      }

      // Small delay between requests
      await sleep(100);
    } catch (error) {
      console.log(colorize(`Request ${i}: ERROR - ${error.message}`, 'red'));
      results.push({
        requestNum: i,
        error: error.message,
      });
    }
  }

  // Analyze results
  console.log();
  console.log(colorize('Results:', 'bold'));

  const successRequests = results.filter((r) => r.statusCode && r.statusCode !== 429).length;
  const blockedRequests = results.filter((r) => r.statusCode === 429).length;
  const errorRequests = results.filter((r) => r.error).length;

  console.log(colorize(`  ✅ Successful requests: ${successRequests}`, 'green'));
  console.log(colorize(`  ❌ Blocked requests (429): ${blockedRequests}`, blockedRequests > 0 ? 'green' : 'red'));
  console.log(colorize(`  ⚠️  Error requests: ${errorRequests}`, errorRequests > 0 ? 'yellow' : 'green'));

  const passed = blockedRequests > 0 && successRequests <= test.limit + 1; // Allow +1 for buffer
  console.log();
  console.log(
    passed
      ? colorize('✅ RATE LIMIT TEST PASSED', 'green')
      : colorize('❌ RATE LIMIT TEST FAILED', 'red')
  );

  return passed;
}

async function runAllTests() {
  console.log();
  console.log(colorize('╔═══════════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║       🔒 Rate Limiting Verification Script                    ║', 'cyan'));
  console.log(colorize('╚═══════════════════════════════════════════════════════════════╝', 'cyan'));
  console.log();
  console.log(colorize(`Base URL: ${BASE_URL}`, 'gray'));
  console.log();

  const results = [];

  for (const test of TESTS) {
    const passed = await testEndpoint(test);
    results.push({ test: test.name, passed });
  }

  // Summary
  console.log('\n' + colorize('='.repeat(80), 'cyan'));
  console.log(colorize('SUMMARY', 'bold'));
  console.log(colorize('='.repeat(80), 'cyan'));
  console.log();

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    console.log(colorize(`${icon} ${result.test}`, color));
  });

  const allPassed = results.every((r) => r.passed);
  console.log();
  console.log(
    allPassed
      ? colorize('✅ ALL RATE LIMIT TESTS PASSED', 'green')
      : colorize('❌ SOME TESTS FAILED', 'red')
  );
  console.log();

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error(colorize(`\nFATAL ERROR: ${error.message}`, 'red'));
  process.exit(1);
});
