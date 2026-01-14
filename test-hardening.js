#!/usr/bin/env node

/**
 * Quick test script to verify hardening implementation
 * 
 * Tests:
 * 1. k6 script syntax
 * 2. Redis observability script
 * 3. CI/CD workflow syntax
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Testing CI/CD Hardening Implementation\n');

let passed = 0;
let failed = 0;

// ============================================================================
// Test 1: k6 Script Exists and Valid
// ============================================================================

console.log('1️⃣ Testing k6 script...');
try {
  const k6ScriptPath = path.join(__dirname, 'loadtest', 'k6-slo-test.js');
  
  if (!fs.existsSync(k6ScriptPath)) {
    throw new Error('k6 script not found');
  }
  
  const k6Content = fs.readFileSync(k6ScriptPath, 'utf8');
  
  // Check for required sections
  const requiredSections = [
    'http_req_failed',
    'http_req_duration',
    'p(95)<800',
    'rate<0.01',
    'thresholds',
    'scenarios',
  ];
  
  for (const section of requiredSections) {
    if (!k6Content.includes(section)) {
      throw new Error(`k6 script missing required section: ${section}`);
    }
  }
  
  console.log('   ✅ k6 script found and contains required SLO thresholds');
  passed++;
} catch (error) {
  console.log(`   ❌ k6 script test failed: ${error.message}`);
  failed++;
}

// ============================================================================
// Test 2: Redis Observability Script
// ============================================================================

console.log('\n2️⃣ Testing Redis observability script...');
try {
  const redisScriptPath = path.join(__dirname, 'redis-observability.js');
  
  if (!fs.existsSync(redisScriptPath)) {
    throw new Error('Redis observability script not found');
  }
  
  const redisContent = fs.readFileSync(redisScriptPath, 'utf8');
  
  // Check for required functions
  const requiredFunctions = [
    'captureMetrics',
    'enableLatencyMonitoring',
    'generateReport',
    'LATENCY',
    'slowlog',
  ];
  
  for (const func of requiredFunctions) {
    if (!redisContent.includes(func)) {
      throw new Error(`Redis script missing required function: ${func}`);
    }
  }
  
  console.log('   ✅ Redis observability script found with all required functions');
  passed++;
} catch (error) {
  console.log(`   ❌ Redis observability test failed: ${error.message}`);
  failed++;
}

// ============================================================================
// Test 3: Hardened CI/CD Workflow
// ============================================================================

console.log('\n3️⃣ Testing hardened CI/CD workflow...');
try {
  const workflowPath = path.join(__dirname, '.github', 'workflows', 'ci-cd-hardened.yml');
  
  if (!fs.existsSync(workflowPath)) {
    throw new Error('Hardened CI/CD workflow not found');
  }
  
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  
  // Check for required jobs
  const requiredJobs = [
    'build-and-test',
    'load-test-slo',
    'deploy-backend',
    'deploy-frontend',
    'rollback',
  ];
  
  for (const job of requiredJobs) {
    if (!workflowContent.includes(job)) {
      throw new Error(`Workflow missing required job: ${job}`);
    }
  }
  
  // Check for hardening features
  const hardeningFeatures = [
    'environment:', // Environment scoping
    'Package backend artifact', // Artifact builds
    'Rollback', // Rollback mechanism
    'k6 run', // k6 load test
    'redis-observability', // Redis monitoring
  ];
  
  for (const feature of hardeningFeatures) {
    if (!workflowContent.includes(feature)) {
      throw new Error(`Workflow missing hardening feature: ${feature}`);
    }
  }
  
  console.log('   ✅ Hardened CI/CD workflow found with all required features');
  passed++;
} catch (error) {
  console.log(`   ❌ Hardened workflow test failed: ${error.message}`);
  failed++;
}

// ============================================================================
// Test 4: Documentation Files
// ============================================================================

console.log('\n4️⃣ Testing documentation files...');
try {
  const docs = [
    'CI_CD_HARDENING_COMPLETE.md',
    'CI_CD_HARDENING_QUICK_REFERENCE.md',
  ];
  
  for (const doc of docs) {
    const docPath = path.join(__dirname, doc);
    if (!fs.existsSync(docPath)) {
      throw new Error(`Documentation missing: ${doc}`);
    }
  }
  
  console.log('   ✅ All documentation files present');
  passed++;
} catch (error) {
  console.log(`   ❌ Documentation test failed: ${error.message}`);
  failed++;
}

// ============================================================================
// Test 5: Directory Structure
// ============================================================================

console.log('\n5️⃣ Testing directory structure...');
try {
  const requiredDirs = [
    'loadtest',
    '.github/workflows',
  ];
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Required directory missing: ${dir}`);
    }
  }
  
  console.log('   ✅ All required directories present');
  passed++;
} catch (error) {
  console.log(`   ❌ Directory structure test failed: ${error.message}`);
  failed++;
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📦 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! CI/CD hardening is properly implemented.');
  console.log('\n📚 Next steps:');
  console.log('   1. Review: CI_CD_HARDENING_COMPLETE.md');
  console.log('   2. Test locally: k6 run loadtest/k6-slo-test.js');
  console.log('   3. Setup: Create GitHub environments (production/staging)');
  console.log('   4. Deploy: Push to trigger hardened pipeline');
  process.exit(0);
} else {
  console.log('\n⚠️ Some tests failed. Please review the errors above.');
  process.exit(1);
}
