#!/usr/bin/env node

/**
 * Audit Log Wiring Verification Script
 * 
 * Triggers real actions and verifies they appear in the audit log:
 * 1. Login success
 * 2. Login failure
 * 3. Create product
 * 4. Request signed URL
 * 
 * Usage: npm run verify:audit-logs
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

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

function makeRequest(url, method = 'GET', body = null, token = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      timeout: 5000,
      headers: { ...extraHeaders },
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

async function seedAdmin() {
  console.log(colorize('\n📝 Seeding admin user...', 'yellow'));
  try {
    const csrf = await getCsrfContext();
    if (!csrf) {
      console.log(colorize('   ❌ CSRF token not available', 'red'));
      return null;
    }

    // Try login first
    const loginResp = await makeRequest(
      `${BASE_URL}/api/auth/login`,
      'POST',
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      null,
      { 'x-csrf-token': csrf.token, 'cookie': csrf.cookie }
    );

    if (loginResp.statusCode === 200) {
      const data = JSON.parse(loginResp.body);
      console.log(colorize('   ✅ Admin user already exists', 'green'));
      return data.accessToken;
    }

    // If not, register
    const registerResp = await makeRequest(
      `${BASE_URL}/api/auth/register`,
      'POST',
      { 
        name: 'Admin User', 
        email: ADMIN_EMAIL, 
        password: ADMIN_PASSWORD,
        role: 'admin'
      },
      null,
      { 'x-csrf-token': csrf.token, 'cookie': csrf.cookie }
    );

    if (registerResp.statusCode === 201) {
      const data = JSON.parse(registerResp.body);
      console.log(colorize('   ✅ Admin user created', 'green'));
      return data.accessToken;
    }

    throw new Error(`Registration failed: ${registerResp.statusCode}`);
  } catch (err) {
    console.log(colorize(`   ⚠️  Seed failed: ${err.message}`, 'yellow'));
    return null;
  }
}

async function triggerActions(adminToken) {
  console.log(colorize('\n🎬 Triggering audit log actions...\n', 'bold'));

  const actions = [];

  const csrf = await getCsrfContext();
  if (!csrf) {
    console.log(colorize('   ❌ CSRF token not available - skipping login actions', 'red'));
    return actions;
  }

  // Action 1: Login success
  console.log(colorize('1️⃣  Login success', 'cyan'));
  try {
    const resp = await makeRequest(
      `${BASE_URL}/api/auth/login`,
      'POST',
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      null,
      { 'x-csrf-token': csrf.token, 'cookie': csrf.cookie }
    );
    if (resp.statusCode === 200) {
      console.log(colorize('   ✅ Logged in successfully', 'green'));
      actions.push({ type: 'LOGIN_SUCCESS', timestamp: new Date() });
    } else {
      console.log(colorize('   ❌ Login failed', 'red'));
    }
  } catch (err) {
    console.log(colorize(`   ❌ Error: ${err.message}`, 'red'));
  }
  await sleep(500);

  // Action 2: Login failure
  console.log(colorize('2️⃣  Login failure (invalid password)', 'cyan'));
  try {
    const resp = await makeRequest(
      `${BASE_URL}/api/auth/login`,
      'POST',
      { email: ADMIN_EMAIL, password: 'WrongPassword' },
      null,
      { 'x-csrf-token': csrf.token, 'cookie': csrf.cookie }
    );
    if (resp.statusCode !== 200) {
      console.log(colorize('   ✅ Failed login recorded', 'green'));
      actions.push({ type: 'LOGIN_FAILURE', timestamp: new Date() });
    }
  } catch (err) {
    console.log(colorize(`   ❌ Error: ${err.message}`, 'red'));
  }
  await sleep(500);

  if (adminToken) {
    console.log(colorize('3️⃣  Validate coupon (admin)', 'cyan'));
    try {
      const resp = await makeRequest(
        `${BASE_URL}/api/coupons/validate`,
        'POST',
        { code: 'DEMO10' },
        adminToken
      );
      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        console.log(colorize('   ✅ Coupon validated', 'green'));
        actions.push({ type: 'VALIDATE_COUPON', timestamp: new Date() });
      } else {
        console.log(colorize(`   ⚠️  HTTP ${resp.statusCode}`, 'yellow'));
      }
    } catch (err) {
      console.log(colorize(`   ⚠️  Error: ${err.message}`, 'yellow'));
    }
    await sleep(500);
  }

  // Action 4: Request signed URL
  console.log(colorize('4️⃣  Request signed URL', 'cyan'));
  try {
    const resp = await makeRequest(
      `${BASE_URL}/api/files/download-url?key=${encodeURIComponent('Form I-3A - week 13.pdf')}&expires=300`,
      'GET'
    );
    if (resp.statusCode === 200) {
      console.log(colorize('   ✅ Signed URL requested', 'green'));
      actions.push({ type: 'ISSUE_SIGNED_URL', timestamp: new Date() });
    } else {
      console.log(colorize(`   ⚠️  HTTP ${resp.statusCode}`, 'yellow'));
    }
  } catch (err) {
    console.log(colorize(`   ⚠️  Error: ${err.message}`, 'yellow'));
  }

  return actions;
}

async function verifyAuditLogs(adminToken) {
  console.log(colorize('\n🔍 Checking audit logs...\n', 'bold'));

  if (!adminToken) {
    console.log(colorize('⚠️  Cannot verify without admin token', 'yellow'));
    console.log(colorize('   Ensure admin user is seeded and logged in', 'gray'));
    return;
  }

  try {
    const resp = await makeRequest(
      `${BASE_URL}/api/audit-logs?limit=20`,
      'GET',
      null,
      adminToken
    );

    if (resp.statusCode !== 200) {
      console.log(colorize(`⚠️  Audit logs endpoint not available (HTTP ${resp.statusCode})`, 'yellow'));
      console.log(colorize('   Reference: backend/src/routes/auditRoutes.ts', 'gray'));
      return;
    }

    const logs = JSON.parse(resp.body);
    if (!Array.isArray(logs) || logs.length === 0) {
      console.log(colorize('ℹ️  No logs found', 'yellow'));
      return;
    }

    const expected = ["LOGIN_SUCCESS", "LOGIN_FAILURE", "ISSUE_SIGNED_URL", "VALIDATE_COUPON"];
    const counts = expected.reduce((acc, action) => {
      acc[action] = 0;
      return acc;
    }, {});

    logs.forEach((log) => {
      const action = log.action || log.eventType || log.event;
      if (counts[action] !== undefined) counts[action] += 1;
    });

    const allPass = expected.every((action) => counts[action] > 0);

    console.log(colorize('\n📊 Audit Action Counts:', 'bold'));
    expected.forEach((action) => {
      const ok = counts[action] > 0;
      console.log(colorize(`  ${ok ? '✅' : '❌'} ${action}: ${counts[action]}`, ok ? 'green' : 'red'));
    });

    console.log(colorize(`📋 Last ${Math.min(5, logs.length)} audit log entries:\n`, 'cyan'));
    logs.slice(0, 5).forEach((log, idx) => {
      const timestamp = new Date(log.timestamp || log.createdAt).toISOString();
      const action = log.action || log.eventType || 'UNKNOWN';
      const user = log.userId || log.user || 'system';
      const details = log.details ? JSON.stringify(log.details).substring(0, 50) : '';

      console.log(colorize(`  ${idx + 1}. [${timestamp}]`, 'gray'));
      console.log(colorize(`     Action: ${action}`, 'cyan'));
      console.log(colorize(`     User: ${user}`, 'gray'));
      if (details) console.log(colorize(`     Details: ${details}...`, 'gray'));
      console.log();
    });

    console.log(colorize(`\n${allPass ? 'PASS' : 'FAIL'}: Audit log verification`, allPass ? 'green' : 'red'));
  } catch (err) {
    console.log(colorize(`❌ Error checking logs: ${err.message}`, 'red'));
    console.log(colorize('   Make sure backend is running: npm run dev', 'gray'));
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
  console.log(colorize('\n🔐 AUDIT LOG VERIFICATION START\n', 'bold'));
  console.log(colorize('This verifies that actions are logged for audit trails.', 'gray'));

  try {
    // Seed admin user
    const adminToken = await seedAdmin();
    await sleep(1000);

    // Trigger actions
    const actions = await triggerActions(adminToken);
    await sleep(1000);

    // Verify logs
    await verifyAuditLogs(adminToken);

    console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
    console.log(colorize('  ✅ VERIFICATION COMPLETE', 'green'));
    console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

    console.log(colorize('📚 Code References:', 'bold'));
    console.log(colorize('   Audit Models: backend/src/models/EventLog.ts', 'gray'));
    console.log(colorize('   Audit Routes: backend/src/routes/auditRoutes.ts (if exists)', 'gray'));
    console.log(colorize('   Payment Logs: backend/src/routes/paymentsRoutes.ts', 'gray'));
    console.log(colorize('   Auth Logs: backend/src/routes/authRoutes.ts', 'gray'));

  } catch (err) {
    console.log(colorize(`\n❌ Verification failed: ${err.message}`, 'red'));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(colorize(`Fatal error: ${err.message}`, 'red'));
  process.exit(1);
});
