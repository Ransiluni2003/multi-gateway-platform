#!/usr/bin/env node

/**
 * DOCKER STARTUP VERIFICATION SCRIPT
 * Verifies all services are running and healthy
 * Run after: npm run docker:up
 */

const http = require('http');
const https = require('https');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 300,
      });
    });

    req.on('error', () => {
      resolve({ status: 0, ok: false });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 0, ok: false });
    });
  });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyServices() {
  log('\n🔍 Verifying Docker Services...\n', 'blue');

  const services = [
    {
      name: 'Commerce Web (Next.js)',
      url: 'http://localhost:3001/api/health',
      critical: true,
    },
    {
      name: 'API Gateway',
      url: 'http://localhost:5002/health',
      critical: true,
    },
    {
      name: 'Payments Service',
      url: 'http://localhost:5003/api/payments/health',
      critical: true,
    },
    {
      name: 'Mock Payment Gateway',
      url: 'http://localhost:5000/health',
      critical: false,
    },
    {
      name: 'Prometheus',
      url: 'http://localhost:9090/-/healthy',
      critical: false,
    },
  ];

  const results = [];
  let allHealthy = true;

  for (const service of services) {
    const result = await checkUrl(service.url);
    results.push({ ...service, ...result });

    if (result.ok) {
      log(`✅ ${service.name.padEnd(30)} [HTTP ${result.status}]`, 'green');
    } else {
      const severity = service.critical ? 'red' : 'yellow';
      const icon = service.critical ? '❌' : '⚠️ ';
      log(`${icon} ${service.name.padEnd(30)} [Failed]`, severity);
      if (service.critical) allHealthy = false;
    }

    await delay(500);
  }

  log('\n' + '='.repeat(60), 'cyan');
  
  if (allHealthy) {
    log('\n✅ All critical services are healthy!', 'green');
    log('\n🚀 You can now access:', 'cyan');
    log('   • Commerce Web: http://localhost:3001', 'blue');
    log('   • API Gateway:  http://localhost:5002', 'blue');
    log('   • Payments:     http://localhost:5003', 'blue');
    log('   • Prometheus:   http://localhost:9090', 'blue');
    log('\n📦 Demo products should be available at http://localhost:3001', 'green');
    log('\n💡 Tip: Run "npm run docker:logs" to view logs\n', 'yellow');
    return true;
  } else {
    log('\n❌ Some critical services are not healthy', 'red');
    log('\n🔧 Troubleshooting steps:', 'yellow');
    log('   1. Check logs:    npm run docker:logs', 'yellow');
    log('   2. Check status:  docker-compose ps', 'yellow');
    log('   3. Restart:       npm run docker:restart', 'yellow');
    log('   4. Clean start:   npm run docker:clean && npm run docker:up\n', 'yellow');
    return false;
  }
}

async function checkDatabase() {
  log('\n📊 Checking Database...', 'cyan');
  
  try {
    const result = await checkUrl('http://localhost:3001/api/health');
    
    if (result.ok) {
      log('✅ Database connection verified', 'green');
      return true;
    } else {
      log('⚠️  Database health check failed', 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Could not verify database', 'red');
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  Docker Startup Verification', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  log('⏳ Waiting 5 seconds for services to initialize...\n', 'yellow');
  await delay(5000);

  const servicesOk = await verifyServices();
  const dbOk = await checkDatabase();

  log('\n' + '='.repeat(60), 'cyan');
  log('  Verification Summary', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  if (servicesOk && dbOk) {
    log('🎉 System is ready for use!\n', 'green');
    process.exit(0);
  } else {
    log('⚠️  System has issues - check logs for details\n', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Verification failed: ${error.message}\n`, 'red');
  process.exit(1);
});
