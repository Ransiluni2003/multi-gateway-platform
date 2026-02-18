#!/usr/bin/env node

/**
 * Security Demo Script
 * 
 * Demonstrates:
 * 1. Security headers are present (helmet.js)
 * 2. Rate limiting in action (15 requests, 429 on overflow)
 * 
 * Usage: npm run demo:security
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const SECURITY_HEADERS_ENDPOINT = '/api/health';
const RATE_LIMIT_ENDPOINT = '/api/auth/login';

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

function makeRequest(url, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: { ...extraHeaders },
      timeout: 5000,
    };

    if (body) {
      const postData = JSON.stringify(body);
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      };
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

async function checkSecurityHeaders() {
  console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  🔐 SECURITY HEADERS VALIDATION', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

  try {
    const response = await makeRequest(BASE_URL + SECURITY_HEADERS_ENDPOINT);
    
    const requiredHeaders = {
      'content-security-policy': 'Content-Security-Policy (XSS protection)',
      'x-frame-options': 'X-Frame-Options (Clickjacking protection)',
      'x-content-type-options': 'X-Content-Type-Options (MIME sniffing)',
      'referrer-policy': 'Referrer-Policy (Privacy)',
      'permissions-policy': 'Permissions-Policy (Camera/Mic locks)',
    };

    let allPass = true;
    Object.entries(requiredHeaders).forEach(([key, desc]) => {
      const value = response.headers[key];
      if (value) {
        console.log(colorize('  ✅', 'green'), desc);
        console.log(colorize(`      Value: ${value.substring(0, 60)}${value.length > 60 ? '...' : ''}`, 'gray'));
      } else {
        console.log(colorize('  ❌', 'red'), desc);
        allPass = false;
      }
    });

    console.log();
    if (allPass) {
      console.log(colorize('✅ All security headers present!', 'green'));
    } else {
      console.log(colorize('⚠️  Some headers missing. Check helmet() config in backend/src/server.ts', 'yellow'));
    }
    return allPass;
  } catch (err) {
    console.log(colorize(`❌ Error checking headers: ${err.message}`, 'red'));
    console.log(colorize('   Make sure the server is running: npm run dev', 'gray'));
    return false;
  }
}

async function checkRateLimiting() {
  console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  ⏱️  RATE LIMITING TEST (10 req/min limit)', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

  console.log(colorize('Fetching CSRF token...', 'yellow'));
  const csrfInfo = await getCsrfContext();
  if (!csrfInfo) {
    console.log(colorize('⚠️  CSRF token unavailable. Rate limit test skipped.', 'yellow'));
    return;
  }

  console.log(colorize('Sending 15 requests rapidly...', 'yellow'));
  await sleep(1000);

  const results = { success: 0, rateLimited: 0, errors: 0 };
  let firstThrottleAt = -1;

  for (let i = 1; i <= 15; i++) {
    try {
      const response = await makeRequest(
        BASE_URL + RATE_LIMIT_ENDPOINT,
        'POST',
        { email: `ratelimit-${Date.now()}@example.com`, password: 'WrongPassword123!' },
        {
          'x-csrf-token': csrfInfo.token,
          'cookie': csrfInfo.cookie,
        }
      );

      let statusDisplay;
      if (response.statusCode === 200 || response.statusCode === 400 || response.statusCode === 401) {
        statusDisplay = colorize(`✓ ${response.statusCode}`, 'green');
        results.success++;
      } else if (response.statusCode === 429) {
        statusDisplay = colorize(`✗ 429`, 'red');
        results.rateLimited++;
        if (firstThrottleAt === -1) firstThrottleAt = i;
      } else {
        statusDisplay = colorize(`? ${response.statusCode}`, 'yellow');
        results.errors++;
      }

      process.stdout.write(`  Request ${i.toString().padStart(2)}: ${statusDisplay}\n`);
      await sleep(100);
    } catch (err) {
      console.log(colorize(`  Request ${i}: Error - ${err.message}`, 'red'));
      results.errors++;
    }
  }

  console.log();
  console.log(colorize(`  Successful (200):     ${results.success}`, 'green'));
  console.log(colorize(`  Rate Limited (429):   ${results.rateLimited}`, 'red'));
  console.log(colorize(`  Errors:               ${results.errors}`, 'yellow'));
  
  console.log();
  if (results.rateLimited > 0 && firstThrottleAt >= 11) {
    console.log(colorize('✅ Rate limiting working! First 429 after ~10 requests.', 'green'));
  } else if (results.rateLimited === 0) {
    console.log(colorize('⚠️  No 429 responses. Rate limiter may not be active.', 'yellow'));
    console.log(colorize('   Check backend/src/server.ts for express-rate-limit config.', 'gray'));
  } else {
    console.log(colorize('⚠️  Rate limiting too aggressive. Check config.', 'yellow'));
  }
}

async function getCsrfContext() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/csrf-token`, 'GET');
    if (response.statusCode !== 200) return null;

    const data = JSON.parse(response.body || '{}');
    const csrfToken = data.csrfToken;
    const setCookie = response.headers['set-cookie'] || [];
    const cookieHeader = Array.isArray(setCookie) ? setCookie : [setCookie];
    const xsrfCookie = cookieHeader
      .map((c) => c.split(';')[0])
      .find((c) => c.startsWith('XSRF-TOKEN='));

    if (!csrfToken || !xsrfCookie) return null;
    return { token: csrfToken, cookie: xsrfCookie };
  } catch {
    return null;
  }
}

async function main() {
  console.log(colorize('\n🔒 SECURITY DEMO START\n', 'bold'));

  const headersPass = await checkSecurityHeaders();
  await sleep(1000);
  await checkRateLimiting();

  console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  ✅ DEMO COMPLETE', 'green'));
  console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

  process.exit(headersPass ? 0 : 1);
}

main().catch(err => {
  console.error(colorize(`Fatal error: ${err.message}`, 'red'));
  process.exit(1);
});
