#!/usr/bin/env node

/**
 * Complete Security Verification Script
 * 
 * Runs all security tests in sequence:
 * 1. Security headers validation
 * 2. Rate limiting tests
 * 3. Signed URL storage tests
 * 4. Audit log verification
 * 
 * Usage:
 *   node scripts/run-security-verification.js [BASE_URL]
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:3000';

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

function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(colorize(`\n▶️  Running: ${path.basename(scriptPath)}`, 'blue'));
    console.log(colorize(`   ${scriptPath} ${args.join(' ')}`, 'gray'));
    console.log();

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    child.on('error', (error) => {
      console.error(colorize(`Error running script: ${error.message}`, 'red'));
      resolve(false);
    });
  });
}

async function makeHttpRequest(url) {
  const http = require('http');
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', reject);
  });
}

async function checkAuditLogs() {
  try {
    console.log(colorize('\n[Audit Logs] Checking audit log API...', 'cyan'));
    
    const response = await makeHttpRequest(`${BASE_URL}/api/admin/audit-logs?limit=20`);
    
    if (response.statusCode !== 200) {
      console.log(colorize(`❌ Audit log API returned ${response.statusCode}`, 'red'));
      return false;
    }

    const data = JSON.parse(response.body);
    
    if (!data.logs || !Array.isArray(data.logs)) {
      console.log(colorize('❌ Invalid audit log response format', 'red'));
      return false;
    }

    const logCount = data.logs.length;
    console.log(colorize(`✅ Audit log API working (${logCount} logs found)`, 'green'));

    if (logCount === 0) {
      console.log(colorize('⚠️  No audit logs found. Run some actions to create logs.', 'yellow'));
      console.log(colorize('   Visit: http://localhost:3000/test/audit-log', 'gray'));
    } else {
      console.log(colorize(`   Sample actions logged:`, 'gray'));
      data.logs.slice(0, 3).forEach((log) => {
        console.log(colorize(`     - ${log.action} by ${log.actorEmail || 'unknown'}`, 'gray'));
      });
    }

    return true;
  } catch (error) {
    console.log(colorize(`❌ Audit log check failed: ${error.message}`, 'red'));
    return false;
  }
}

async function runAllTests() {
  console.log();
  console.log(colorize('╔═══════════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║       🔒 Security Sprint Complete Verification               ║', 'cyan'));
  console.log(colorize('╚═══════════════════════════════════════════════════════════════╝', 'cyan'));
  console.log();
  console.log(colorize(`Base URL: ${BASE_URL}`, 'gray'));
  console.log(colorize(`Date: ${new Date().toISOString()}`, 'gray'));
  console.log();

  const results = [];

  // Test 1: Security Headers
  console.log(colorize('\n1️⃣  Security Headers Validation', 'bold'));
  console.log(colorize('─'.repeat(80), 'gray'));
  
  const headersScriptPath = path.join(
    __dirname,
    '..',
    'commerce-web',
    'validate-security-headers.js'
  );
  
  const headersPassed = await runScript(headersScriptPath, [BASE_URL]);
  results.push({ name: 'Security Headers', passed: headersPassed });

  // Test 2: Rate Limiting
  console.log(colorize('\n2️⃣  Rate Limiting Tests', 'bold'));
  console.log(colorize('─'.repeat(80), 'gray'));
  
  const rateLimitScriptPath = path.join(__dirname, 'test-rate-limiting.js');
  const rateLimitPassed = await runScript(rateLimitScriptPath, [BASE_URL]);
  results.push({ name: 'Rate Limiting', passed: rateLimitPassed });

  // Test 3: Signed URL Storage (OPTIONAL - takes 70 seconds)
  console.log(colorize('\n3️⃣  Signed URL Storage Tests', 'bold'));
  console.log(colorize('─'.repeat(80), 'gray'));
  console.log(colorize('⚠️  This test takes ~70 seconds (includes expiry wait)', 'yellow'));
  console.log(colorize('   Press Ctrl+C to skip, or wait...', 'gray'));
  console.log();

  const storageScriptPath = path.join(__dirname, 'test-storage-e2e.js');
  const storagePassed = await runScript(storageScriptPath, [BASE_URL]);
  results.push({ name: 'Signed URL Storage', passed: storagePassed });

  // Test 4: Audit Logs
  console.log(colorize('\n4️⃣  Audit Logs Verification', 'bold'));
  console.log(colorize('─'.repeat(80), 'gray'));
  
  const auditLogsPassed = await checkAuditLogs();
  results.push({ name: 'Audit Logs', passed: auditLogsPassed });

  // Summary
  console.log();
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log(colorize('VERIFICATION SUMMARY', 'bold'));
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log();

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    console.log(colorize(`${icon} ${index + 1}. ${result.name}`, color));
  });

  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log();
  console.log(colorize(`Results: ${passedCount}/${totalCount} tests passed`, allPassed ? 'green' : 'yellow'));
  console.log();

  if (allPassed) {
    console.log(colorize('✅ ALL SECURITY TESTS PASSED', 'green'));
    console.log();
    console.log(colorize('Your security implementation is production-ready:', 'green'));
    console.log(colorize('  ✅ Security headers are configured correctly', 'gray'));
    console.log(colorize('  ✅ Rate limiting prevents abuse', 'gray'));
    console.log(colorize('  ✅ Signed URLs work with expiry handling', 'gray'));
    console.log(colorize('  ✅ Audit logs track sensitive actions', 'gray'));
    console.log();
    console.log(colorize('Next steps:', 'cyan'));
    console.log(colorize('  1. Record Loom video showing these tests', 'gray'));
    console.log(colorize('  2. Take screenshots of DevTools (headers)', 'gray'));
    console.log(colorize('  3. Update PR with verification proof', 'gray'));
  } else {
    console.log(colorize('❌ SOME TESTS FAILED', 'red'));
    console.log();
    console.log(colorize('Please fix the failing tests before marking complete.', 'yellow'));
    console.log();
    console.log(colorize('Troubleshooting:', 'cyan'));
    console.log(colorize('  1. Ensure all services are running (npm run dev)', 'gray'));
    console.log(colorize('  2. Check .env file has all required variables', 'gray'));
    console.log(colorize('  3. Review error messages above for specific issues', 'gray'));
    console.log(colorize('  4. See SECURITY_SPRINT_VERIFICATION_GUIDE.md for help', 'gray'));
  }

  console.log();
  process.exit(allPassed ? 0 : 1);
}

// Run all tests
runAllTests().catch((error) => {
  console.error(colorize(`\nFATAL ERROR: ${error.message}`, 'red'));
  console.error(error);
  process.exit(1);
});
