#!/usr/bin/env node

/**
 * Pre-Deployment Health Check Script
 * Validates system health before triggering deployment
 */

const https = require('https');
const http = require('http');

const config = {
  services: [
    {
      name: 'Backend API',
      url: process.env.BACKEND_URL || 'http://localhost:5000/health',
      critical: true
    },
    {
      name: 'Frontend',
      url: process.env.FRONTEND_URL || 'http://localhost:3001',
      critical: true
    },
    {
      name: 'MongoDB',
      check: async () => {
        const mongoose = require('mongoose');
        try {
          await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });
          await mongoose.connection.close();
          return true;
        } catch (error) {
          console.error('MongoDB connection failed:', error.message);
          return false;
        }
      },
      critical: true
    },
    {
      name: 'Redis',
      check: async () => {
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 5000 });
        try {
          await redis.ping();
          await redis.quit();
          return true;
        } catch (error) {
          console.error('Redis connection failed:', error.message);
          return false;
        }
      },
      critical: true
    }
  ],
  timeout: 10000,
  retries: 3
};

async function checkUrl(url, retries = config.retries) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const attemptCheck = (attempt) => {
      const req = protocol.get(url, { timeout: config.timeout }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ success: true, statusCode: res.statusCode });
        } else if (attempt < retries) {
          console.log(`  ⏳ Retry ${attempt}/${retries} for ${url}`);
          setTimeout(() => attemptCheck(attempt + 1), 2000);
        } else {
          resolve({ success: false, statusCode: res.statusCode, error: `HTTP ${res.statusCode}` });
        }
      });
      
      req.on('error', (error) => {
        if (attempt < retries) {
          console.log(`  ⏳ Retry ${attempt}/${retries} for ${url}`);
          setTimeout(() => attemptCheck(attempt + 1), 2000);
        } else {
          resolve({ success: false, error: error.message });
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (attempt < retries) {
          console.log(`  ⏳ Retry ${attempt}/${retries} for ${url}`);
          setTimeout(() => attemptCheck(attempt + 1), 2000);
        } else {
          resolve({ success: false, error: 'Timeout' });
        }
      });
    };
    
    attemptCheck(1);
  });
}

async function runHealthChecks() {
  console.log('🏥 Starting Pre-Deployment Health Checks...\n');
  
  const results = [];
  let hasFailures = false;
  
  for (const service of config.services) {
    process.stdout.write(`Checking ${service.name}... `);
    
    let result;
    if (service.url) {
      result = await checkUrl(service.url);
    } else if (service.check) {
      try {
        const success = await service.check();
        result = { success };
      } catch (error) {
        result = { success: false, error: error.message };
      }
    }
    
    results.push({
      service: service.name,
      ...result,
      critical: service.critical
    });
    
    if (result.success) {
      console.log(`✅ OK ${result.statusCode ? `(HTTP ${result.statusCode})` : ''}`);
    } else {
      console.log(`❌ FAILED ${result.error ? `- ${result.error}` : ''}`);
      if (service.critical) {
        hasFailures = true;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Health Check Summary:');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const criticalFailed = results.filter(r => !r.success && r.critical).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  if (criticalFailed > 0) {
    console.log(`🚨 Critical failures: ${criticalFailed}`);
  }
  
  if (hasFailures) {
    console.log('\n❌ Deployment blocked due to critical health check failures!');
    process.exit(1);
  } else {
    console.log('\n✅ All health checks passed! Ready for deployment.');
    process.exit(0);
  }
}

// Run health checks
runHealthChecks().catch((error) => {
  console.error('❌ Health check script failed:', error);
  process.exit(1);
});
