#!/usr/bin/env node

/**
 * Audit Log Pagination Verification Script
 * 
 * Tests pagination functionality:
 * - Verifies pagination metadata
 * - Tests page navigation
 * - Validates limit enforcement
 * 
 * Usage:
 *   node scripts/verify-pagination.js
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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

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

async function login() {
  console.log(colorize('🔐 Logging in as admin...', 'cyan'));
  
  // Get CSRF token
  const csrfResp = await makeRequest('/api/auth/csrf-token');
  const csrfData = JSON.parse(csrfResp.body);
  const csrfToken = csrfData.csrfToken;
  const setCookie = csrfResp.headers['set-cookie'] || [];
  const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
  
  // Login
  const loginResp = await makeRequest(
    '/api/auth/login',
    'POST',
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    {
      'x-csrf-token': csrfToken,
      'cookie': cookieHeader,
    }
  );

  if (loginResp.statusCode !== 200) {
    throw new Error(`Login failed: HTTP ${loginResp.statusCode} ${loginResp.body}`);
  }

  const loginData = JSON.parse(loginResp.body);
  console.log(colorize('   ✅ Login successful', 'green'));
  return loginData.accessToken;
}

async function testBasicPagination(token) {
  console.log(colorize('\n📄 TEST 1: Basic Pagination\n', 'bold'));

  const resp = await makeRequest(
    '/api/audit-logs?page=1&limit=10',
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );

  if (resp.statusCode !== 200) {
    throw new Error(`Failed to fetch logs: HTTP ${resp.statusCode}`);
  }

  const data = JSON.parse(resp.body);
  
  console.log(colorize('Response structure:', 'cyan'));
  console.log(colorize(`  ✅ logs: Array (${data.logs.length} items)`, 'green'));
  console.log(colorize(`  ✅ pagination: Object`, 'green'));
  
  console.log(colorize('\nPagination metadata:', 'cyan'));
  console.log(colorize(`  page: ${data.pagination.page}`, 'gray'));
  console.log(colorize(`  limit: ${data.pagination.limit}`, 'gray'));
  console.log(colorize(`  total: ${data.pagination.total}`, 'gray'));
  console.log(colorize(`  totalPages: ${data.pagination.totalPages}`, 'gray'));
  console.log(colorize(`  hasNextPage: ${data.pagination.hasNextPage}`, 'gray'));
  console.log(colorize(`  hasPreviousPage: ${data.pagination.hasPreviousPage}`, 'gray'));

  // Validate structure
  const checks = [
    { name: 'logs is array', pass: Array.isArray(data.logs) },
    { name: 'pagination.page = 1', pass: data.pagination.page === 1 },
    { name: 'pagination.limit = 10', pass: data.pagination.limit === 10 },
    { name: 'logs.length <= limit', pass: data.logs.length <= data.pagination.limit },
    { name: 'hasPreviousPage = false', pass: data.pagination.hasPreviousPage === false },
  ];

  console.log(colorize('\nValidation:', 'cyan'));
  checks.forEach(check => {
    console.log(colorize(`  ${check.pass ? '✅' : '❌'} ${check.name}`, check.pass ? 'green' : 'red'));
  });

  return checks.every(c => c.pass);
}

async function testPageNavigation(token) {
  console.log(colorize('\n🔄 TEST 2: Page Navigation\n', 'bold'));

  // Fetch page 1
  const page1Resp = await makeRequest(
    '/api/audit-logs?page=1&limit=5',
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );
  const page1Data = JSON.parse(page1Resp.body);

  console.log(colorize('Page 1:', 'cyan'));
  console.log(colorize(`  Total logs: ${page1Data.pagination.total}`, 'gray'));
  console.log(colorize(`  Total pages: ${page1Data.pagination.totalPages}`, 'gray'));
  console.log(colorize(`  Logs returned: ${page1Data.logs.length}`, 'gray'));

  if (page1Data.pagination.totalPages < 2) {
    console.log(colorize('\n⚠️  Not enough logs to test pagination (< 6 logs)', 'yellow'));
    console.log(colorize('   Creating some audit events...', 'gray'));
    
    // Trigger some events by making API calls
    for (let i = 0; i < 10; i++) {
      await makeRequest('/api/auth/csrf-token');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(colorize('   ✅ Events created, retrying...', 'green'));
    return await testPageNavigation(token);
  }

  // Fetch page 2
  const page2Resp = await makeRequest(
    '/api/audit-logs?page=2&limit=5',
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );
  const page2Data = JSON.parse(page2Resp.body);

  console.log(colorize('\nPage 2:', 'cyan'));
  console.log(colorize(`  Logs returned: ${page2Data.logs.length}`, 'gray'));
  console.log(colorize(`  hasPreviousPage: ${page2Data.pagination.hasPreviousPage}`, 'gray'));
  console.log(colorize(`  hasNextPage: ${page2Data.pagination.hasNextPage}`, 'gray'));

  // Validate pages are different
  const page1Ids = page1Data.logs.map(log => log._id);
  const page2Ids = page2Data.logs.map(log => log._id);
  const overlap = page1Ids.filter(id => page2Ids.includes(id));

  const checks = [
    { name: 'Page 2 has previous page', pass: page2Data.pagination.hasPreviousPage === true },
    { name: 'Page 2 number = 2', pass: page2Data.pagination.page === 2 },
    { name: 'No duplicate logs across pages', pass: overlap.length === 0 },
  ];

  console.log(colorize('\nValidation:', 'cyan'));
  checks.forEach(check => {
    console.log(colorize(`  ${check.pass ? '✅' : '❌'} ${check.name}`, check.pass ? 'green' : 'red'));
  });

  return checks.every(c => c.pass);
}

async function testLimitEnforcement(token) {
  console.log(colorize('\n🛡️  TEST 3: Limit Enforcement\n', 'bold'));

  // Test max limit (should cap at 100)
  const resp = await makeRequest(
    '/api/audit-logs?page=1&limit=200',
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );

  const data = JSON.parse(resp.body);

  console.log(colorize('Requested limit: 200', 'cyan'));
  console.log(colorize(`Actual limit: ${data.pagination.limit}`, 'gray'));
  console.log(colorize(`Logs returned: ${data.logs.length}`, 'gray'));

  const checks = [
    { name: 'Limit capped at 100', pass: data.pagination.limit === 100 },
    { name: 'Logs <= 100', pass: data.logs.length <= 100 },
  ];

  console.log(colorize('\nValidation:', 'cyan'));
  checks.forEach(check => {
    console.log(colorize(`  ${check.pass ? '✅' : '❌'} ${check.name}`, check.pass ? 'green' : 'red'));
  });

  return checks.every(c => c.pass);
}

async function testEdgeCases(token) {
  console.log(colorize('\n🔍 TEST 4: Edge Cases\n', 'bold'));

  // Test page 0 (should default to 1)
  const resp1 = await makeRequest(
    '/api/audit-logs?page=0&limit=10',
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );
  const data1 = JSON.parse(resp1.body);

  // Test negative page (should default to 1)
  const resp2 = await makeRequest(
    '/api/audit-logs?page=-5&limit=10',
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );
  const data2 = JSON.parse(resp2.body);

  // Test no parameters (should use defaults)
  const resp3 = await makeRequest(
    '/api/audit-logs',
    'GET',
    null,
    { 'Authorization': `Bearer ${token}` }
  );
  const data3 = JSON.parse(resp3.body);

  const checks = [
    { name: 'page=0 defaults to 1', pass: data1.pagination.page === 1 },
    { name: 'page=-5 defaults to 1', pass: data2.pagination.page === 1 },
    { name: 'No params: page=1', pass: data3.pagination.page === 1 },
    { name: 'No params: limit=20', pass: data3.pagination.limit === 20 },
  ];

  console.log(colorize('Testing invalid inputs:', 'cyan'));
  checks.forEach(check => {
    console.log(colorize(`  ${check.pass ? '✅' : '❌'} ${check.name}`, check.pass ? 'green' : 'red'));
  });

  return checks.every(c => c.pass);
}

async function main() {
  console.log(colorize('═══════════════════════════════════════════════', 'bold'));
  console.log(colorize('    AUDIT LOG PAGINATION VERIFICATION', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════', 'bold'));
  console.log(colorize(`Target API: ${API_URL}`, 'gray'));
  console.log();

  try {
    const token = await login();

    const test1 = await testBasicPagination(token);
    const test2 = await testPageNavigation(token);
    const test3 = await testLimitEnforcement(token);
    const test4 = await testEdgeCases(token);

    // Summary
    console.log(colorize('\n═══════════════════════════════════════════════', 'bold'));
    console.log(colorize('SUMMARY', 'bold'));
    console.log(colorize('═══════════════════════════════════════════════', 'bold'));
    console.log(colorize(`Basic Pagination:      ${test1 ? '✅ PASS' : '❌ FAIL'}`, test1 ? 'green' : 'red'));
    console.log(colorize(`Page Navigation:       ${test2 ? '✅ PASS' : '❌ FAIL'}`, test2 ? 'green' : 'red'));
    console.log(colorize(`Limit Enforcement:     ${test3 ? '✅ PASS' : '❌ FAIL'}`, test3 ? 'green' : 'red'));
    console.log(colorize(`Edge Cases:            ${test4 ? '✅ PASS' : '❌ FAIL'}`, test4 ? 'green' : 'red'));
    
    const allPass = test1 && test2 && test3 && test4;
    console.log();
    console.log(colorize(`Overall: ${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`, allPass ? 'green' : 'red'));
    console.log(colorize('═══════════════════════════════════════════════\n', 'bold'));

    process.exit(allPass ? 0 : 1);

  } catch (err) {
    console.error(colorize(`\n❌ Error: ${err.message}`, 'red'));
    console.error(colorize('═══════════════════════════════════════════════\n', 'bold'));
    process.exit(1);
  }
}

main();
