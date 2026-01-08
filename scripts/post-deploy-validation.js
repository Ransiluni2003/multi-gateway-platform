#!/usr/bin/env node

/**
 * Post-Deployment Validation Script
 * Validates deployment success and service health after deployment
 */

const https = require('https');
const http = require('http');

const config = {
  backend: {
    url: process.env.RAILWAY_BACKEND_URL || 'https://backend.railway.app',
    endpoints: [
      { path: '/health', expectedStatus: 200 },
      { path: '/api/health', expectedStatus: 200 },
      { path: '/metrics', expectedStatus: 200, optional: true }
    ]
  },
  frontend: {
    url: process.env.VERCEL_FRONTEND_URL || 'https://frontend.vercel.app',
    endpoints: [
      { path: '/', expectedStatus: 200 },
      { path: '/dashboard', expectedStatus: 200, requiresAuth: true }
    ]
  },
  maxAttempts: 30,
  retryDelay: 10000, // 10 seconds
  timeout: 15000
};

function checkEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: config.timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = res.statusCode === expectedStatus;
        resolve({
          success,
          statusCode: res.statusCode,
          expectedStatus,
          body: data.substring(0, 500)
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });
  });
}

async function validateService(serviceName, serviceConfig) {
  console.log(`\n🔍 Validating ${serviceName}...`);
  console.log(`   Base URL: ${serviceConfig.url}`);
  
  const results = [];
  
  for (const endpoint of serviceConfig.endpoints) {
    const url = `${serviceConfig.url}${endpoint.path}`;
    console.log(`\n   Testing: ${endpoint.path}`);
    
    let attempt = 1;
    let result = null;
    
    while (attempt <= config.maxAttempts) {
      process.stdout.write(`   Attempt ${attempt}/${config.maxAttempts}... `);
      
      result = await checkEndpoint(url, endpoint.expectedStatus);
      
      if (result.success) {
        console.log(`✅ OK (HTTP ${result.statusCode})`);
        break;
      } else if (endpoint.optional) {
        console.log(`⚠️  Optional endpoint failed: ${result.error || `HTTP ${result.statusCode}`}`);
        result.success = true; // Don't fail on optional endpoints
        break;
      } else if (attempt < config.maxAttempts) {
        console.log(`❌ Failed (${result.error || `HTTP ${result.statusCode}`}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      } else {
        console.log(`❌ Failed after ${config.maxAttempts} attempts`);
      }
      
      attempt++;
    }
    
    results.push({
      endpoint: endpoint.path,
      ...result,
      attempts: attempt
    });
  }
  
  return results;
}

async function runValidation() {
  console.log('🚀 Post-Deployment Validation Starting...');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  // Validate Backend
  const backendResults = await validateService('Backend (Railway)', config.backend);
  
  // Validate Frontend
  const frontendResults = await validateService('Frontend (Vercel)', config.frontend);
  
  // Summary
  const allResults = [...backendResults, ...frontendResults];
  const passedCount = allResults.filter(r => r.success).length;
  const failedCount = allResults.filter(r => !r.success).length;
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('Validation Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedCount}/${allResults.length}`);
  console.log(`❌ Failed: ${failedCount}/${allResults.length}`);
  console.log(`⏱️  Duration: ${duration}s`);
  
  if (failedCount > 0) {
    console.log('\n❌ Deployment validation FAILED!');
    console.log('\nFailed Endpoints:');
    allResults
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.endpoint}: ${r.error || `HTTP ${r.statusCode}`}`));
    
    console.log('\n🔄 Rollback recommended!');
    process.exit(1);
  } else {
    console.log('\n✅ Deployment validation PASSED!');
    console.log('🎉 All services are healthy and responding correctly.');
    process.exit(0);
  }
}

// Run validation
runValidation().catch((error) => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
