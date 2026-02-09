#!/usr/bin/env node

/**
 * Loom Recording Preview Script
 * 
 * Shows what each Loom recording will display (simulated output for reference)
 * This is a "mock" version to show supervisor what to expect when recording
 * 
 * Usage: npm run demo:preview
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  log('\n🎬 LOOM RECORDING PREVIEW', 'bold');
  log('This shows what you will record for each video\n', 'cyan');

  // VIDEO 1
  log('═'.repeat(60), 'cyan');
  log('VIDEO 1: Security Headers + Rate Limiting (3 min)', 'bold');
  log('Command: npm run demo:security', 'yellow');
  log('═'.repeat(60), 'cyan');
  log('\n🔒 SECURITY DEMO START\n', 'cyan');
  
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('  🔐 SECURITY HEADERS VALIDATION', 'cyan');
  log('═══════════════════════════════════════════════════════\n', 'cyan');

  const headers = [
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
    'Content-Security-Policy: default-src \'self\'',
    'Strict-Transport-Security: max-age=31536000',
    'X-XSS-Protection: 1; mode=block'
  ];

  for (const header of headers) {
    await pause(300);
    log(`  ✅ ${header}`, 'green');
  }

  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  ⏱️  RATE LIMITING TEST', 'cyan');
  log('═══════════════════════════════════════════════════════\n', 'cyan');

  log('Sending 15 requests to /api/auth/login:', 'yellow');
  for (let i = 1; i <= 10; i++) {
    await pause(200);
    log(`  Request ${i}: ✅ 200 OK`, 'green');
  }
  
  for (let i = 11; i <= 15; i++) {
    await pause(200);
    log(`  Request ${i}: ✗ 429 Too Many Requests`, 'red');
  }

  log('\n  Summary:', 'bold');
  log(`  Successful (200):     10`, 'green');
  log(`  Rate Limited (429):   5`, 'red');
  log(`  Rate Limit Headers:`, 'yellow');
  log(`    X-RateLimit-Limit: 10000`, 'gray');
  log(`    X-RateLimit-Remaining: 0`, 'gray');
  log(`    X-RateLimit-Reset: 1707062400`, 'gray');

  await pause(1000);

  // VIDEO 2
  log('\n' + '═'.repeat(60), 'cyan');
  log('VIDEO 2: Rate Limiting on 3 Endpoints (2 min)', 'bold');
  log('Command: npm run verify:rate-limiting', 'yellow');
  log('═'.repeat(60) + '\n', 'cyan');

  const endpoints = ['/api/auth/login', '/api/auth/register', '/api/files/download-url'];
  
  for (const endpoint of endpoints) {
    log(`Testing ${endpoint}:`, 'bold');
    for (let i = 1; i <= 10; i++) {
      await pause(100);
      log(`  Req ${i}: ✅ 200 OK`, 'green');
    }
    for (let i = 11; i <= 12; i++) {
      await pause(100);
      log(`  Req ${i}: ✗ 429 Too Many Requests`, 'red');
    }
    log('');
  }

  await pause(1000);

  // VIDEO 3
  log('═'.repeat(60), 'cyan');
  log('VIDEO 3: Audit Logs (Last 20) (2 min)', 'bold');
  log('Command: npm run verify:audit-logs', 'yellow');
  log('═'.repeat(60) + '\n', 'cyan');

  log('Triggering 4 real actions...', 'yellow');
  await pause(500);
  log('  ✅ Admin login (success)', 'green');
  await pause(300);
  log('  ✅ Admin login (failed attempt)', 'green');
  await pause(300);
  log('  ✅ Create product', 'green');
  await pause(300);
  log('  ✅ Request signed URL', 'green');

  log('\nLast 5 Audit Log Entries:', 'bold');
  const logs = [
    '2026-02-04 14:32:15 | admin@example.com | PRODUCT_CREATED | Laptop XYZ',
    '2026-02-04 14:32:10 | admin@example.com | SIGNED_URL_REQUESTED | file upload',
    '2026-02-04 14:32:05 | admin@example.com | LOGIN_FAILED | Wrong password',
    '2026-02-04 14:32:00 | admin@example.com | LOGIN_SUCCESS | 192.168.1.1',
    '2026-02-04 14:31:50 | system | SEED_COMPLETED | Initial setup'
  ];

  for (const logEntry of logs) {
    await pause(300);
    log(`  ${logEntry}`, 'cyan');
  }

  await pause(1000);

  // VIDEO 4
  log('\n' + '═'.repeat(60), 'cyan');
  log('VIDEO 4: Signed URL Upload/Download/Expiry (3 min)', 'bold');
  log('Command: npm run demo:storage', 'yellow');
  log('═'.repeat(60) + '\n', 'cyan');

  log('🗄️  STORAGE (Signed URL) DEMO\n', 'cyan');

  log('Step 1: Request Upload Signed URL', 'bold');
  await pause(500);
  log('  ✅ Signed URL obtained', 'green');
  log('  URL: https://abcdefghijkl.supabase.co/storage/v1/object/sign/uploads/...', 'gray');
  log('  Expires in: 60 seconds', 'yellow');

  log('\nStep 2: Upload File', 'bold');
  await pause(500);
  log('  ✅ File uploaded successfully', 'green');
  log('  File: demo-file-1707062000.txt (1.2 KB)', 'gray');
  log('  Bucket: uploads', 'gray');

  log('\nStep 3: Request Download Signed URL', 'bold');
  await pause(500);
  log('  ✅ Signed URL obtained', 'green');
  log('  URL: https://abcdefghijkl.supabase.co/storage/v1/object/sign/uploads/...', 'gray');
  log('  Expires in: 300 seconds', 'yellow');

  log('\nStep 4: Download & Verify', 'bold');
  await pause(500);
  log('  ✅ File downloaded successfully', 'green');
  log('  Size: 1.2 KB', 'gray');
  log('  Expiry: Still valid (expires in 280 seconds)', 'yellow');

  log('\n--- Expiry Test (after 60 seconds) ---', 'gray');
  log('Upload URL Status: ⚠️ EXPIRED (60 seconds passed)', 'yellow');
  log('Download URL Status: ✅ STILL VALID (expires in ~240 seconds)', 'green');

  log('\n' + '═'.repeat(60), 'cyan');
  log('✅ PREVIEW COMPLETE', 'green');
  log('═'.repeat(60), 'cyan');

  log('\n📌 Ready to Record:', 'bold');
  log('1. Open loom.com', 'cyan');
  log('2. Start recording terminal', 'cyan');
  log('3. Run: npm run demo:security', 'yellow');
  log('4. Wait for output → Stop recording', 'cyan');
  log('5. Repeat for verify:rate-limiting, verify:audit-logs, demo:storage', 'cyan');
  log('6. Upload all 4 videos to Loom playlist\n', 'cyan');
}

main().catch(console.error);
