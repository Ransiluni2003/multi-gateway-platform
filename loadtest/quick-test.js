#!/usr/bin/env node

/**
 * Quick Start Script for BullMQ Load Testing
 * Provides easy commands to run different load test scenarios
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const commands = {
  'light': {
    vus: 100,
    duration: '2m',
    description: 'Light load (100 users, 2 minutes)',
  },
  'medium': {
    vus: 250,
    duration: '3m',
    description: 'Medium load (250 users, 3 minutes)',
  },
  'heavy': {
    vus: 500,
    duration: '3m',
    description: 'Heavy load (500 users, 3 minutes)',
  },
  'extreme': {
    vus: 1000,
    duration: '5m',
    description: 'Extreme load (1000 users, 5 minutes)',
  },
  'endurance': {
    vus: 100,
    duration: '30m',
    description: 'Endurance test (100 users, 30 minutes)',
  },
  'spike': {
    vus: 2000,
    duration: '1m',
    description: 'Spike test (2000 users, 1 minute)',
  },
};

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help') {
  console.log('\n📊 BullMQ Load Test Quick Start\n');
  console.log('Usage: npm run load-test:quick -- <scenario>\n');
  console.log('Available scenarios:');
  Object.entries(commands).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(12)} - ${config.description}`);
  });
  console.log('\nExamples:');
  console.log('  npm run load-test:quick -- light');
  console.log('  npm run load-test:quick -- extreme');
  console.log('  npm run load-test:quick -- endurance\n');
  process.exit(0);
}

const scenario = args[0];
const config = commands[scenario];

if (!config) {
  console.error(`❌ Unknown scenario: ${scenario}`);
  console.error('Run with "help" for available options');
  process.exit(1);
}

console.log(`\n🚀 Running ${scenario.toUpperCase()} scenario`);
console.log(`📊 ${config.description}`);
console.log(`🎯 Target: http://localhost:3000\n`);

const k6Process = spawn('k6', [
  'run',
  path.join(__dirname, 'load-test-bullmq.js'),
  '--vus', config.vus.toString(),
  '--duration', config.duration,
  '--summary-export=' + path.join(__dirname, `../loadtest-results/summary-${scenario}.json`),
], {
  env: {
    ...process.env,
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    VUS: config.vus.toString(),
    DURATION: config.duration,
  },
  stdio: 'inherit',
});

k6Process.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ ${scenario} load test completed successfully!`);
  } else {
    console.error(`\n❌ Load test failed with exit code ${code}`);
  }
  process.exit(code);
});
