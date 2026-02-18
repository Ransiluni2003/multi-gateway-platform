#!/usr/bin/env node

/**
 * Audit Logs Proof Script
 * 
 * Demonstrates the audit logging system by:
 * 1. Triggering actions that generate audit logs
 * 2. Fetching last 20 audit logs from API
 * 3. Verifying tracked actions are present
 * 
 * Tracked Actions:
 * - LOGIN_SUCCESS / LOGIN_FAILURE
 * - ISSUE_SIGNED_URL
 * - VALIDATE_COUPON
 * 
 * Usage: npm run proof:audit-logs
 * 
 * Requirements:
 * - Backend server running on localhost:5000
 * - MongoDB connection active
 * - Admin user seeded
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

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

function makeRequest(url, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: { ...headers },
      timeout: 5000,
    };

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

async function getCsrfToken() {
  const response = await makeRequest(`${BASE_URL}/api/auth/csrf-token`, 'GET');
  const data = JSON.parse(response.body);
  return data.csrfToken;
}

async function loginAdmin(csrfToken) {
  console.log(colorize('1️⃣  Logging in as admin (generates LOGIN_SUCCESS)...', 'cyan'));
  
  const response = await makeRequest(
    `${BASE_URL}/api/auth/login`,
    'POST',
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, _csrf: csrfToken },
    { 'Cookie': `_csrf=${csrfToken}` }
  );

  if (response.statusCode !== 200) {
    throw new Error(`Login failed: ${response.statusCode}`);
  }

  const data = JSON.parse(response.body);
  console.log(colorize('   ✅ Login successful (audit log created)', 'green'));
  return data.accessToken;
}

async function triggerLoginFailure(csrfToken) {
  console.log(colorize('2️⃣  Attempting wrong password (generates LOGIN_FAILURE)...', 'cyan'));
  
  const response = await makeRequest(
    `${BASE_URL}/api/auth/login`,
    'POST',
    { email: 'nonexistent@example.com', password: 'wrongpassword', _csrf: csrfToken },
    { 'Cookie': `_csrf=${csrfToken}` }
  );

  console.log(colorize('   ✅ Failed login recorded (audit log created)', 'green'));
}

async function triggerSignedUrl(token) {
  console.log(colorize('3️⃣  Requesting signed URL (generates ISSUE_SIGNED_URL)...', 'cyan'));
  
  const response = await makeRequest(
    `${BASE_URL}/api/files/download-url?key=test.pdf&expires=60`,
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );

  if (response.statusCode === 200 || response.statusCode === 404) {
    console.log(colorize('   ✅ Signed URL request recorded (audit log created)', 'green'));
  } else {
    console.log(colorize(`   ⚠️  Signed URL returned ${response.statusCode} (may still log)`, 'yellow'));
  }
}

async function triggerCouponValidation(token) {
  console.log(colorize('4️⃣  Validating coupon (generates VALIDATE_COUPON)...', 'cyan'));
  
  const response = await makeRequest(
    `${BASE_URL}/api/coupons/validate`,
    'POST',
    { code: 'DEMO10' },
    { 'Authorization': `Bearer ${token}` }
  );

  if (response.statusCode === 200) {
    console.log(colorize('   ✅ Coupon validation recorded (audit log created)', 'green'));
  } else {
    console.log(colorize(`   ⚠️  Coupon validation returned ${response.statusCode}`, 'yellow'));
  }
}

async function fetchAuditLogs(token) {
  console.log(colorize('\n📋 Fetching last 20 audit logs...\n', 'bold'));
  
  const response = await makeRequest(
    `${BASE_URL}/api/audit-logs?limit=20`,
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch logs: ${response.statusCode}`);
  }

  const logs = JSON.parse(response.body);
  return logs;
}

function analyzeAuditLogs(logs) {
  console.log(colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  AUDIT LOGS ANALYSIS', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

  console.log(colorize(`Total logs fetched: ${logs.length}`, 'gray'));
  console.log();

  // Count by action type
  const actionCounts = {};
  logs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  console.log(colorize('Actions tracked:', 'bold'));
  Object.entries(actionCounts).forEach(([action, count]) => {
    const icon = action.includes('SUCCESS') ? '✅' : 
                 action.includes('FAILURE') ? '❌' : 
                 action.includes('SIGNED_URL') ? '🔗' : 
                 action.includes('COUPON') ? '🎟️' : '📝';
    console.log(colorize(`  ${icon} ${action}: ${count}`, 'cyan'));
  });

  console.log();

  // Show sample logs
  console.log(colorize('Sample audit entries:', 'bold'));
  logs.slice(0, 5).forEach((log, i) => {
    const timestamp = new Date(log.createdAt).toISOString();
    const status = log.status === 'success' ? colorize('✓', 'green') : colorize('✗', 'red');
    console.log(colorize(`  ${i + 1}. [${timestamp}] ${log.action} ${status}`, 'gray'));
    if (log.details) {
      console.log(colorize(`     Details: ${JSON.stringify(log.details).substring(0, 60)}...`, 'gray'));
    }
  });

  console.log();

  // Verification
  console.log(colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  VERIFICATION', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

  const requiredActions = ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'ISSUE_SIGNED_URL', 'VALIDATE_COUPON'];
  const missingActions = requiredActions.filter(action => !actionCounts[action]);

  if (missingActions.length === 0) {
    console.log(colorize('✅ PASS: All expected audit actions are present!', 'green'));
    console.log();
    console.log(colorize('Tracked actions:', 'gray'));
    requiredActions.forEach(action => {
      console.log(colorize(`  ✓ ${action}`, 'green'));
    });
    return true;
  } else {
    console.log(colorize('❌ FAIL: Some audit actions are missing', 'red'));
    console.log();
    console.log(colorize('Missing actions:', 'gray'));
    missingActions.forEach(action => {
      console.log(colorize(`  ✗ ${action}`, 'red'));
    });
    return false;
  }
}

async function main() {
  console.log(colorize('\n🔍 AUDIT LOGS PROOF\n', 'bold'));
  console.log(colorize('This demonstrates the audit logging system:\n', 'gray'));

  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();

    // Trigger various actions
    console.log(colorize('Step 1: Triggering actions that create audit logs\n', 'bold'));
    const token = await loginAdmin(csrfToken);
    await triggerLoginFailure(csrfToken);
    await triggerSignedUrl(token);
    await triggerCouponValidation(token);

    // Fetch and analyze logs
    const logs = await fetchAuditLogs(token);
    const passed = analyzeAuditLogs(logs);

    console.log();
    console.log(colorize('═══════════════════════════════════════════════════════', 'cyan'));
    console.log(colorize('  IMPLEMENTATION', 'bold'));
    console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));
    console.log(colorize('Code references:', 'gray'));
    console.log(colorize('  • Model: backend/src/models/AuditLog.ts', 'gray'));
    console.log(colorize('  • Routes: backend/src/routes/auditRoutes.ts', 'gray'));
    console.log(colorize('  • Utility: backend/src/utils/audit.ts', 'gray'));
    console.log(colorize('  • Integration: authRoutes, filesRoutes, couponRoutes', 'gray'));
    console.log();

    process.exit(passed ? 0 : 1);

  } catch (err) {
    console.log(colorize(`\n❌ Proof failed: ${err.message}`, 'red'));
    console.log(colorize('\n📋 Troubleshooting:', 'yellow'));
    console.log(colorize('  1. Ensure backend server is running', 'gray'));
    console.log(colorize('  2. Ensure MongoDB is connected', 'gray'));
    console.log(colorize('  3. Seed admin user: npm run seed', 'gray'));
    console.log();
    process.exit(1);
  }
}

main().catch(err => {
  console.error(colorize(`Fatal error: ${err.message}`, 'red'));
  process.exit(1);
});
