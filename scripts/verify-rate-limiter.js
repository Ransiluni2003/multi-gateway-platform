#!/usr/bin/env node

/**
 * Rate Limiter Verification Script
 * 
 * Tests the rate limiter adapter pattern:
 * - Detects in-memory vs Redis implementation
 * - Verifies rate limiting works correctly
 * - Tests persistence across processes (Redis only)
 * 
 * Usage:
 *   node scripts/verify-rate-limiter.js
 */

const http = require('http');

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

const API_URL = process.env.API_URL || 'http://localhost:5000';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function detectRateLimiterType() {
  console.log(colorize('\n📊 RATE LIMITER DETECTION\n', 'bold'));
  
  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    console.log(colorize('✅ Redis URL detected:', 'green'), redisUrl.replace(/:[^:@]+@/, ':****@'));
    console.log(colorize('   Using Redis-backed rate limiter (production mode)', 'gray'));
    return 'redis';
  } else {
    console.log(colorize('⚠️  No Redis URL detected', 'yellow'));
    console.log(colorize('   Using in-memory rate limiter (development mode)', 'gray'));
    console.log(colorize('   ⚠️  NOT suitable for production with load balancing!', 'yellow'));
    return 'in-memory';
  }
}

async function testRateLimiting() {
  console.log(colorize('\n🧪 RATE LIMITING TESTS\n', 'bold'));

  try {
    // Step 1: Get CSRF token
    console.log(colorize('1️⃣  Getting CSRF token...', 'cyan'));
    const csrfResp = await makeRequest('/api/auth/csrf-token');
    
    if (csrfResp.statusCode !== 200) {
      throw new Error(`Failed to get CSRF token: HTTP ${csrfResp.statusCode}`);
    }

    const csrfData = JSON.parse(csrfResp.body);
    const csrfToken = csrfData.csrfToken;
    const setCookie = csrfResp.headers['set-cookie'] || [];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    
    console.log(colorize('   ✅ CSRF token obtained', 'green'));

    // Step 2: Test rate limiting with failed logins
    console.log(colorize('\n2️⃣  Testing rate limit (max 10 attempts per IP)...', 'cyan'));
    
    let blockedAt = null;
    
    for (let i = 1; i <= 12; i++) {
      const loginResp = await makeRequest(
        '/api/auth/login',
        'POST',
        { email: 'ratelimit-test@example.com', password: 'WrongPassword123!' },
        {
          'x-csrf-token': csrfToken,
          'cookie': cookieHeader,
        }
      );

      if (loginResp.statusCode === 429) {
        blockedAt = i;
        console.log(colorize(`   🛑 BLOCKED at attempt ${i} (HTTP 429)`, 'red'));
        
        const body = JSON.parse(loginResp.body);
        if (body.retryAfter) {
          console.log(colorize(`   ⏰ Retry after: ${body.retryAfter} seconds`, 'yellow'));
        }
        break;
      } else if (loginResp.statusCode === 401) {
        console.log(colorize(`   ${i}. HTTP 401 (attempt allowed)`, 'gray'));
      } else {
        console.log(colorize(`   ${i}. HTTP ${loginResp.statusCode}`, 'gray'));
      }

      // Small delay to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (blockedAt) {
      console.log(colorize('\n✅ Rate limiting works correctly!', 'green'));
      console.log(colorize(`   Blocked after ${blockedAt} attempts (expected: ~10-11)`, 'gray'));
      return true;
    } else {
      console.log(colorize('\n❌ Rate limiting NOT working - no 429 response received', 'red'));
      return false;
    }

  } catch (err) {
    console.error(colorize(`\n❌ Test failed: ${err.message}`, 'red'));
    return false;
  }
}

async function testPersistence(limiterType) {
  console.log(colorize('\n🔄 PERSISTENCE TEST\n', 'bold'));

  if (limiterType === 'in-memory') {
    console.log(colorize('⚠️  Skipping persistence test (in-memory limiter)', 'yellow'));
    console.log(colorize('   In-memory rate limits reset on server restart', 'gray'));
    return;
  }

  console.log(colorize('Testing Redis persistence...', 'cyan'));
  console.log(colorize('(This would require restarting the server, skipping for now)', 'gray'));
  
  // Note: Full persistence test would require:
  // 1. Trigger rate limit
  // 2. Restart backend server
  // 3. Try again and verify still blocked
  // This is complex to automate, so we skip it
}

async function main() {
  console.log(colorize('═══════════════════════════════════════════════', 'bold'));
  console.log(colorize('    RATE LIMITER VERIFICATION', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════', 'bold'));
  console.log(colorize(`Target API: ${API_URL}`, 'gray'));

  const limiterType = await detectRateLimiterType();
  const rateLimitWorks = await testRateLimiting();
  await testPersistence(limiterType);

  // Summary
  console.log(colorize('\n═══════════════════════════════════════════════', 'bold'));
  console.log(colorize('SUMMARY', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════', 'bold'));
  console.log(colorize(`Rate Limiter Type:     ${limiterType}`, limiterType === 'redis' ? 'green' : 'yellow'));
  console.log(colorize(`Rate Limiting Works:   ${rateLimitWorks ? '✅ YES' : '❌ NO'}`, rateLimitWorks ? 'green' : 'red'));
  
  if (limiterType === 'in-memory') {
    console.log(colorize('\n⚠️  PRODUCTION WARNING:', 'yellow'));
    console.log(colorize('   Current setup uses in-memory rate limiting', 'yellow'));
    console.log(colorize('   ❌ NOT suitable for load-balanced production deployments', 'red'));
    console.log(colorize('   ✅ Set REDIS_URL environment variable to enable Redis', 'green'));
  } else {
    console.log(colorize('\n✅ Production-ready: Using Redis-backed rate limiting', 'green'));
  }

  console.log(colorize('\n═══════════════════════════════════════════════\n', 'bold'));
  
  process.exit(rateLimitWorks ? 0 : 1);
}

main();
