/**
 * Security Center Verification Script
 * 
 * Purpose: Verify all Security Center endpoints work correctly
 * - Seeds demo data
 * - Tests audit logs, export, rate limits, sessions
 * - Prints PASS/FAIL for each endpoint
 * 
 * Usage: npm run verify:security-center
 */

const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5003';
const MONGO_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/multi_gateway_db';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function pass(message) {
  log(`✅ PASS: ${message}`, colors.green);
}

function fail(message) {
  log(`❌ FAIL: ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, colors.bold);
  log(`  ${title}`, colors.bold);
  log(`${'='.repeat(60)}`, colors.bold);
}

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function recordResult(passed, message) {
  totalTests++;
  if (passed) {
    passedTests++;
    pass(message);
  } else {
    failedTests++;
    fail(message);
  }
}

// Audit Log Schema for seeding
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  status: { type: String, default: 'success' },
  userId: String,
  ip: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

// User Schema for session tests
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  refreshTokens: [{
    token: String,
    createdAt: Date,
    expiresAt: Date,
    ipAddress: String,
    userAgent: String,
    revokedAt: Date
  }]
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

/**
 * Step 1: Seed Demo Data
 */
async function seedDemoData() {
  section('STEP 1: SEEDING DEMO DATA');
  
  try {
    log('Connecting to MongoDB...', colors.yellow);
    await mongoose.connect(MONGO_URI);
    pass('Connected to MongoDB');

    // Seed audit logs
    log('Seeding audit logs...', colors.yellow);
    const demoLogs = [];
    const actions = ['user_login', 'user_logout', 'password_change', 'file_upload', 'rate_limit_exceeded'];
    const statuses = ['success', 'failure'];
    
    // Create logs for last 14 days
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      const daysBack = Math.floor(Math.random() * 14);
      const createdAt = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      demoLogs.push({
        action: actions[Math.floor(Math.random() * actions.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        userId: i % 3 === 0 ? '507f1f77bcf86cd799439011' : null,
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Test)',
        details: { test: true },
        createdAt
      });
    }
    
    await AuditLog.insertMany(demoLogs);
    pass(`Seeded ${demoLogs.length} audit logs`);

    const totalLogs = await AuditLog.countDocuments();
    info(`Total audit logs in database: ${totalLogs}`);
    
  } catch (error) {
    fail(`Seeding failed: ${error.message}`);
    throw error;
  }
}

/**
 * Step 2: Get Admin Token
 */
async function getAdminToken() {
  section('STEP 2: AUTHENTICATING AS ADMIN');
  
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'pransiluni@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'pinithi123';
    
    info(`Attempting login with: ${adminEmail}`);
    
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    if (response.data.accessToken) {
      pass('Admin authentication successful');
      return response.data.accessToken;
    } else {
      fail('No access token in response');
      return null;
    }
  } catch (error) {
    fail(`Authentication failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

/**
 * Step 3: Test Audit Logs Endpoint
 */
async function testAuditLogsEndpoint(token) {
  section('STEP 3: TESTING AUDIT LOGS ENDPOINT');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, limit: 20 }
    });
    
    recordResult(
      response.status === 200 && Array.isArray(response.data.logs),
      'Audit logs endpoint returns 200 with logs array'
    );
    
    recordResult(
      response.data.pagination && response.data.pagination.total > 0,
      `Pagination metadata present (total: ${response.data.pagination?.total})`
    );
    
    recordResult(
      response.data.logs.length > 0,
      `Retrieved ${response.data.logs.length} audit logs`
    );
    
  } catch (error) {
    recordResult(false, `Audit logs endpoint failed: ${error.message}`);
  }
}

/**
 * Step 4: Test Export Endpoint
 */
async function testExportEndpoint(token) {
  section('STEP 4: TESTING EXPORT ENDPOINT');
  
  // Test 1: Valid export (within 14-day window)
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const response = await axios.get(`${BACKEND_URL}/api/audit-logs/export`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
    
    recordResult(
      response.status === 200 && response.headers['content-type'].includes('text/csv'),
      'Export endpoint returns CSV (7-day window)'
    );
    
    recordResult(
      response.data.includes('timestamp') && response.data.includes('action'),
      'CSV contains expected headers'
    );
    
  } catch (error) {
    recordResult(false, `Valid export failed: ${error.message}`);
  }
  
  // Test 2: Reject export exceeding 14-day window
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days - should fail
    
    const response = await axios.get(`${BACKEND_URL}/api/audit-logs/export`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
    
    // Should not reach here - should have thrown error
    recordResult(false, 'Export with 20-day window should have been rejected');
    
  } catch (error) {
    recordResult(
      error.response?.status === 400 && error.response?.data?.error?.includes('Date range too large'),
      'Export correctly rejected for exceeding 14-day limit'
    );
  }
}

/**
 * Step 5: Test Rate Limit Stats
 */
async function testRateLimitStats(token) {
  section('STEP 5: TESTING RATE LIMIT STATS');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/admin/security/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordResult(
      response.status === 200 && response.data.bruteForce,
      'Rate limit stats endpoint returns 200'
    );
    
    recordResult(
      typeof response.data.bruteForce.blockedIPs === 'number',
      `Blocked IPs count: ${response.data.bruteForce?.blockedIPs || 0}`
    );
    
    recordResult(
      response.data.accounts && typeof response.data.accounts.locked === 'number',
      `Locked accounts count: ${response.data.accounts?.locked || 0}`
    );
    
  } catch (error) {
    recordResult(false, `Rate limit stats failed: ${error.message}`);
  }
}

/**
 * Step 6: Test Session Tools
 */
async function testSessionTools(token) {
  section('STEP 6: TESTING SESSION TOOLS');
  
  try {
    // Get locked accounts endpoint
    const response = await axios.get(`${BACKEND_URL}/api/admin/security/locked-accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordResult(
      response.status === 200 && Array.isArray(response.data.accounts),
      'Locked accounts endpoint returns 200'
    );
    
    recordResult(
      typeof response.data.count === 'number',
      `Retrieved locked accounts count: ${response.data.count}`
    );
    
  } catch (error) {
    recordResult(false, `Session tools failed: ${error.message}`);
  }
}

/**
 * Step 7: Test Non-Admin Access (Should Fail)
 */
async function testNonAdminAccess() {
  section('STEP 7: TESTING NON-ADMIN PROTECTION');
  
  try {
    // Try accessing without token
    await axios.get(`${BACKEND_URL}/api/audit-logs`);
    recordResult(false, 'Endpoint should reject requests without token');
  } catch (error) {
    recordResult(
      error.response?.status === 401,
      'Correctly rejects unauthenticated requests (401)'
    );
  }
  
  try {
    // Try with invalid token
    await axios.get(`${BACKEND_URL}/api/audit-logs`, {
      headers: { Authorization: 'Bearer invalid_token_xyz' }
    });
    recordResult(false, 'Endpoint should reject invalid tokens');
  } catch (error) {
    recordResult(
      error.response?.status === 401,
      'Correctly rejects invalid tokens (401)'
    );
  }
}

/**
 * Step 8: Verify Audit Export Logging
 */
async function verifyExportAuditLog() {
  section('STEP 8: VERIFYING EXPORT AUDIT LOGGING');
  
  try {
    const exportAuditLog = await AuditLog.findOne({ action: 'AUDIT_EXPORT' })
      .sort({ createdAt: -1 })
      .lean();
    
    recordResult(
      exportAuditLog !== null,
      'Export action was logged to audit trail'
    );
    
    if (exportAuditLog) {
      recordResult(
        exportAuditLog.details?.recordCount !== undefined,
        `Audit log contains record count: ${exportAuditLog.details?.recordCount}`
      );
      
      recordResult(
        exportAuditLog.userId !== undefined,
        `Audit log contains admin ID: ${exportAuditLog.userId}`
      );
    }
    
  } catch (error) {
    recordResult(false, `Audit log verification failed: ${error.message}`);
  }
}

/**
 * Main Execution
 */
async function main() {
  log('\n🛡️  SECURITY CENTER VERIFICATION SCRIPT\n', colors.bold + colors.cyan);
  
  try {
    await seedDemoData();
    
    const adminToken = await getAdminToken();
    if (!adminToken) {
      fail('Cannot proceed without admin token');
      process.exit(1);
    }
    
    await testAuditLogsEndpoint(adminToken);
    await testExportEndpoint(adminToken);
    await testRateLimitStats(adminToken);
    await testSessionTools(adminToken);
    await testNonAdminAccess();
    await verifyExportAuditLog();
    
    // Summary
    section('VERIFICATION SUMMARY');
    log(`Total Tests: ${totalTests}`, colors.bold);
    log(`Passed: ${passedTests}`, colors.green);
    log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.reset);
    
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    log(`\nSuccess Rate: ${successRate}%`, successRate === '100.0' ? colors.green : colors.yellow);
    
    if (failedTests === 0) {
      log('\n🎉 ALL TESTS PASSED! Security Center is working correctly.\n', colors.green + colors.bold);
    } else {
      log(`\n⚠️  ${failedTests} test(s) failed. Please review the output above.\n`, colors.yellow);
    }
    
  } catch (error) {
    fail(`Fatal error: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log('\n✅ MongoDB connection closed', colors.green);
  }
}

// Run the script
main().catch(console.error);
