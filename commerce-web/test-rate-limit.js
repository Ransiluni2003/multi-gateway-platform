#!/usr/bin/env node

/**
 * Simple Rate Limiting Test Script
 * 
 * Sends rapid requests to demonstrate rate limiting and 429 responses
 * Perfect for Loom demos - shows clear visual output
 * 
 * Usage:
 *   node test-rate-limit.js [URL]
 * 
 * Example:
 *   node test-rate-limit.js http://localhost:3000
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const ENDPOINT = '/api/test/rate-limit';
const NUM_REQUESTS = 15; // Send 15 requests (limit is 10)

// Colors
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

function makeRequest(url, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const postData = JSON.stringify(body);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = protocol.request(options, (res) => {
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
    req.write(postData);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(colorize('\n========================================', 'cyan'));
  console.log(colorize('   RATE LIMITING VERIFICATION TEST', 'bold'));
  console.log(colorize('========================================\n', 'cyan'));

  console.log(colorize(`Target URL:`, 'gray'), BASE_URL + ENDPOINT);
  console.log(colorize(`Rate Limit:`, 'gray'), '10 requests per minute');
  console.log(colorize(`Test Plan:`, 'gray'), `Send ${NUM_REQUESTS} rapid requests`);
  console.log(colorize(`Expected:`, 'gray'), 'First 10 succeed, next 5 get 429\n');

  console.log(colorize('Starting test in 2 seconds...', 'yellow'));
  await sleep(2000);
  console.log();

  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0,
  };

  for (let i = 1; i <= NUM_REQUESTS; i++) {
    try {
      const url = `${BASE_URL}${ENDPOINT}`;
      const body = {
        test: 'rate-limit-demo',
        requestNumber: i,
      };

      const response = await makeRequest(url, body);

      let statusDisplay;
      let details = '';

      if (response.statusCode === 200 || response.statusCode === 400) {
        // 200 = valid coupon, 400 = invalid coupon (both are "success" for rate limit purposes)
        statusDisplay = colorize(`✓ ${response.statusCode}`, 'green');
        results.success++;
        
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining !== undefined) {
          details = colorize(`  [${remaining} remaining]`, 'gray');
        }
      } else if (response.statusCode === 429) {
        statusDisplay = colorize(`✗ 429 TOO MANY REQUESTS`, 'red');
        results.rateLimited++;
        
        const retryAfter = response.headers['retry-after'];
        if (retryAfter) {
          details = colorize(`  [Retry after ${retryAfter}s]`, 'gray');
        }
      } else {
        statusDisplay = colorize(`? ${response.statusCode}`, 'yellow');
        results.errors++;
      }

      console.log(`Request ${i.toString().padStart(2, ' ')}: ${statusDisplay}${details}`);

      // Show rate limit headers on first 429
      if (response.statusCode === 429 && results.rateLimited === 1) {
        console.log();
        console.log(colorize('  📊 Rate Limit Headers:', 'yellow'));
        console.log(colorize(`     X-RateLimit-Limit:     ${response.headers['x-ratelimit-limit'] || 'N/A'}`, 'gray'));
        console.log(colorize(`     X-RateLimit-Remaining: ${response.headers['x-ratelimit-remaining'] || 'N/A'}`, 'gray'));
        console.log(colorize(`     X-RateLimit-Reset:     ${response.headers['x-ratelimit-reset'] || 'N/A'}`, 'gray'));
        console.log(colorize(`     Retry-After:           ${response.headers['retry-after'] || 'N/A'} seconds`, 'gray'));
        console.log();
      }

      // Small delay between requests
      await sleep(150);
    } catch (error) {
      console.log(colorize(`Request ${i}: ERROR - ${error.message}`, 'red'));
      results.errors++;
    }
  }

  // Summary
  console.log();
  console.log(colorize('========================================', 'cyan'));
  console.log(colorize('   TEST RESULTS', 'bold'));
  console.log(colorize('========================================', 'cyan'));
  console.log();
  console.log(colorize(`✓ Allowed:      ${results.success}`, 'green'));
  console.log(colorize(`✗ Rate Limited: ${results.rateLimited}`, 'red'));
  if (results.errors > 0) {
    console.log(colorize(`? Errors:       ${results.errors}`, 'yellow'));
  }
  console.log();

  if (results.rateLimited > 0) {
    console.log(colorize('✅ SUCCESS! Rate limiting is working correctly.', 'green'));
    console.log(colorize('   Requests beyond the limit were blocked with 429 status.\n', 'gray'));
    process.exit(0);
  } else {
    console.log(colorize('❌ FAILED! No rate limiting detected.', 'red'));
    console.log(colorize('   All requests succeeded when some should have been blocked.\n', 'gray'));
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(colorize(`\n❌ Error: ${error.message}`, 'red'));
  console.log(colorize(`   Make sure the server is running at: ${BASE_URL}\n`, 'gray'));
  process.exit(1);
});

main();
