#!/usr/bin/env node

/**
 * Load Testing Setup & Verification Script
 * Verifies all dependencies and configurations are ready
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class LoadTestSetupVerifier {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  async run() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 LOAD TESTING SETUP VERIFICATION');
    console.log('='.repeat(80) + '\n');

    // Check dependencies
    await this.checkK6();
    await this.checkNodeModules();
    await this.checkRedis();
    await this.checkAPI();
    await this.checkConfigFiles();
    await this.checkResultsDirectory();

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✓ Passed: ${this.passed}`);
    console.log(`✗ Failed: ${this.failed}\n`);

    if (this.failed === 0) {
      console.log('🎉 All checks passed! Ready for load testing.\n');
      console.log('Quick start commands:');
      console.log('  npm run load-test:light      # 100 users, 2 min');
      console.log('  npm run load-test:medium     # 250 users, 3 min');
      console.log('  npm run load-test:heavy      # 500 users, 3 min');
      console.log('  npm run load-test:extreme    # 1000 users, 5 min');
      console.log('  npm run load-test:all        # Full suite\n');
    } else {
      console.log('⚠️  Some checks failed. Please fix before running load tests.\n');
      process.exit(1);
    }
  }

  async checkK6() {
    try {
      const result = execSync('k6 version', { encoding: 'utf8' });
      this.addCheck('k6 installed', true, result.trim());
    } catch {
      this.addCheck(
        'k6 installed',
        false,
        'k6 not found. Install from: https://k6.io/docs/getting-started/installation/'
      );
    }
  }

  async checkNodeModules() {
    const requiredModules = [
      'bullmq',
      'ioredis',
      'express',
      'axios',
      'winston',
    ];

    const packageJsonPath = path.join(__dirname, '../package.json');
    let installed = true;

    for (const mod of requiredModules) {
      try {
        require.resolve(mod);
      } catch {
        installed = false;
        this.addCheck(`npm module: ${mod}`, false, 'Not installed');
        return;
      }
    }

    if (installed) {
      this.addCheck('npm modules', true, 'All required modules installed');
    }
  }

  async checkRedis() {
    try {
      const Redis = require('ioredis');
      const redisUrl = process.env.REDIS_URL || 'redis://:redis-secure-password-dev@localhost:6379';
      const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

      const info = await redis.info('server');
      await redis.quit();

      const version = info.split('redis_version:')[1]?.split('\r')[0];
      this.addCheck('Redis connection', true, `Redis ${version} running`);
    } catch (err) {
      this.addCheck(
        'Redis connection',
        false,
        `Cannot connect to Redis: ${err.message}`
      );
    }
  }

  async checkAPI() {
    try {
      const response = await axios.get(`${BASE_URL}/queue/status`, {
        timeout: 15000,
      });

      if (response.status === 200 && response.data.data) {
        const queues = Object.keys(response.data.data).join(', ');
        this.addCheck('API /queue/status', true, `Queues: ${queues}`);
      }
    } catch (err) {
      this.addCheck(
        'API /queue/status',
        false,
        `Cannot reach API: ${err.message}. Is backend running on ${BASE_URL}?`
      );
    }
  }

  async checkConfigFiles() {
    const files = [
      'loadtest/load-test-bullmq.js',
      'loadtest/run-load-tests.js',
      'loadtest/quick-test.js',
      'loadtest/metrics-collector.js',
      'redis-load-test.conf',
      'queue-monitor-dashboard.html',
    ];

    const workspaceRoot = path.join(__dirname, '..');
    let allExist = true;

    for (const file of files) {
      const fullPath = path.join(workspaceRoot, file);
      if (!fs.existsSync(fullPath)) {
        this.addCheck(`Config file: ${file}`, false, 'File not found');
        allExist = false;
      }
    }

    if (allExist) {
      this.addCheck('Config files', true, 'All load test config files present');
    }
  }

  async checkResultsDirectory() {
    const resultsDir = path.join(__dirname, '../loadtest-results');

    try {
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(resultsDir, '.test'),
        'test',
        { flag: 'w' }
      );
      fs.unlinkSync(path.join(resultsDir, '.test'));

      this.addCheck('Results directory', true, resultsDir);
    } catch (err) {
      this.addCheck(
        'Results directory',
        false,
        `Cannot write to results directory: ${err.message}`
      );
    }
  }

  addCheck(name, passed, message) {
    if (passed) {
      this.passed++;
      console.log(`✓ ${name.padEnd(30)} ${message}`);
    } else {
      this.failed++;
      console.log(`✗ ${name.padEnd(30)} ${message}`);
    }
    this.checks.push({ name, passed, message });
  }
}

const verifier = new LoadTestSetupVerifier();
verifier.run().catch((err) => {
  console.error('❌ Setup verification failed:', err);
  process.exit(1);
});
