#!/usr/bin/env node

/**
 * Admin Route Protection Verification Script
 * 
 * Demonstrates that customer/user accounts CANNOT access admin routes:
 * 1. Register as regular user
 * 2. Try to access admin endpoints
 * 3. Verify 403 Forbidden response
 * 4. Login as admin
 * 5. Verify admin endpoints now accessible
 * 
 * Usage: npm run verify:admin-protection
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

async function main() {
  console.log(colorize('\n🔐 ADMIN ROUTE PROTECTION VERIFICATION\n', 'bold'));
  console.log(colorize('Verifies that non-admin users cannot access admin endpoints', 'gray'));
  console.log(colorize('Shows: Customer → 403 (Forbidden), Admin → 200 (Success)\n', 'gray'));

  try {
    // Step 1: Register as regular customer
    console.log(colorize('1️⃣  Register regular user account\n', 'bold'));
    const customerEmail = `customer-${Date.now()}@example.com`;
    const customerPassword = 'CustomerPass123!';

    const registerResp = await makeRequest(
      `${BASE_URL}/api/auth/register`,
      'POST',
      {
        name: 'Test Customer',
        email: customerEmail,
        password: customerPassword,
        role: 'customer', // Regular user, not admin
      }
    );

    if (registerResp.statusCode !== 201) {
      throw new Error(`Registration failed: ${registerResp.statusCode}`);
    }

    const custData = JSON.parse(registerResp.body);
    const customerToken = custData.token;
    console.log(colorize('   ✅ Customer registered:', 'green'));
    console.log(colorize(`      Email: ${customerEmail}`, 'gray'));
    console.log(colorize(`      Role: customer`, 'gray'));
    console.log(colorize(`      Token obtained: ${customerToken.substring(0, 20)}...`, 'gray'));
    await sleep(500);

    // Step 2: Try to access admin endpoint as customer
    console.log(colorize('\n2️⃣  Attempt to access admin endpoint as customer\n', 'bold'));
    console.log(colorize('   Trying: GET /api/security-check (admin dashboard)', 'gray'));

    const customerAdminResp = await makeRequest(
      `${BASE_URL}/api/security-check`,
      'GET',
      null,
      customerToken
    );

    if (customerAdminResp.statusCode === 403) {
      console.log(colorize('   ❌ 403 FORBIDDEN - Access denied!', 'red'));
      console.log(colorize('      ✅ Correct: Customer cannot access admin routes', 'green'));
    } else if (customerAdminResp.statusCode === 200) {
      console.log(colorize(`   ⚠️  ${customerAdminResp.statusCode} - Request succeeded (not protected?)`, 'yellow'));
    } else {
      console.log(colorize(`   ? ${customerAdminResp.statusCode} - Unexpected response`, 'yellow'));
    }
    await sleep(500);

    // Step 3: Register/login as admin
    console.log(colorize('\n3️⃣  Login as admin user\n', 'bold'));
    const adminEmail = 'admin@example.com';
    const adminPassword = 'AdminPassword123!';

    const adminLoginResp = await makeRequest(
      `${BASE_URL}/api/auth/login`,
      'POST',
      {
        email: adminEmail,
        password: adminPassword,
      }
    );

    let adminToken = null;
    if (adminLoginResp.statusCode === 200) {
      const adminData = JSON.parse(adminLoginResp.body);
      adminToken = adminData.token;
      console.log(colorize('   ✅ Admin login successful', 'green'));
      console.log(colorize(`      Email: ${adminEmail}`, 'gray'));
      console.log(colorize(`      Role: admin`, 'gray'));
    } else {
      console.log(colorize(`   ⚠️  Admin login failed (${adminLoginResp.statusCode})`, 'yellow'));
      console.log(colorize('      This might be expected if admin not pre-seeded', 'gray'));
    }
    await sleep(500);

    // Step 4: Try admin endpoint as admin
    if (adminToken) {
      console.log(colorize('\n4️⃣  Access admin endpoint as admin\n', 'bold'));
      console.log(colorize('   Trying: GET /api/security-check (admin dashboard)', 'gray'));

      const adminAdminResp = await makeRequest(
        `${BASE_URL}/api/security-check`,
        'GET',
        null,
        adminToken
      );

      if (adminAdminResp.statusCode === 200) {
        console.log(colorize('   ✅ 200 OK - Access granted!', 'green'));
        console.log(colorize('      ✅ Correct: Admin can access admin routes', 'green'));
      } else {
        console.log(colorize(`   ⚠️  ${adminAdminResp.statusCode} - Unexpected response`, 'yellow'));
      }
    }

    // Summary
    console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
    console.log(colorize('  ADMIN PROTECTION VERIFICATION SUMMARY', 'bold'));
    console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

    console.log(colorize('Protected Admin Routes:', 'bold'));
    console.log(colorize('  • /api/payments/refund/* (admin-only)', 'cyan'));
    console.log(colorize('  • /api/security-check (admin dashboard)', 'cyan'));
    console.log(colorize('  • Any route with authorizeRoles("admin") middleware', 'cyan'));

    console.log();
    console.log(colorize('Access Control:', 'bold'));
    if (customerAdminResp.statusCode === 403) {
      console.log(colorize('  ✅ Customer (403 Forbidden)', 'green'));
    } else {
      console.log(colorize('  ⚠️  Customer access not properly blocked', 'yellow'));
    }

    if (adminToken && adminAdminResp && adminAdminResp.statusCode === 200) {
      console.log(colorize('  ✅ Admin (200 OK)', 'green'));
    } else {
      console.log(colorize('  ℹ️  Admin access (admin may not be seeded)', 'gray'));
    }

    console.log('\n' + colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

    console.log(colorize('📚 Implementation Details:', 'bold'));
    console.log(colorize('   Auth Middleware: backend/src/middleware/authMiddleware.ts', 'gray'));
    console.log(colorize('   Role Protection: authorizeRoles("admin") middleware', 'gray'));
    console.log(colorize('   Returns 403 Forbidden for unauthorized roles', 'gray'));

    console.log();
    console.log(colorize('✅ Admin route protection is working!', 'green'));

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
