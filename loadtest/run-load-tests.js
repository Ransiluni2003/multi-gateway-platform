#!/usr/bin/env node

/**
 * Load Test Runner for BullMQ Queue System
 * Runs progressive load tests from 100 to 1000+ concurrent users
 * Monitors queue metrics, Redis performance, and worker efficiency
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RESULTS_DIR = path.join(__dirname, '../loadtest-results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const LOAD_TESTS = [
  {
    name: '100 VUs (Light Load)',
    vus: 100,
    duration: '2m',
    description: 'Baseline performance with 100 virtual users',
  },
  {
    name: '250 VUs (Medium Load)',
    vus: 250,
    duration: '3m',
    description: 'Test scalability with 250 concurrent users',
  },
  {
    name: '500 VUs (Heavy Load)',
    vus: 500,
    duration: '3m',
    description: 'Push system with 500 concurrent users',
  },
  {
    name: '1000 VUs (Extreme Load)',
    vus: 1000,
    duration: '4m',
    description: 'Maximum stress test with 1000 concurrent users',
  },
];

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.metricsInterval = null;
  }

  async runLoadTest(config) {
    console.log('\n' + '='.repeat(80));
    console.log(`🚀 Running: ${config.name}`);
    console.log(`📊 ${config.description}`);
    console.log('='.repeat(80));

    return new Promise((resolve) => {
      const k6Process = spawn('k6', [
        'run',
        path.join(__dirname, 'load-test-bullmq.js'),
        '--vus', config.vus.toString(),
        '--duration', config.duration,
        '--out', `json=${path.join(RESULTS_DIR, `result-${config.vus}vus.json`)}`,
      ], {
        env: {
          ...process.env,
          BASE_URL,
          VUS: config.vus.toString(),
          DURATION: config.duration,
        },
      });

      let output = '';

      k6Process.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      k6Process.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      k6Process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Test completed: ${config.name}`);
        } else {
          console.error(`❌ Test failed: ${config.name} (exit code: ${code})`);
        }

        // Extract key metrics from output
        const metricsSnapshot = this.extractMetrics(output);
        this.results.push({
          config,
          metrics: metricsSnapshot,
          timestamp: new Date().toISOString(),
        });

        resolve(metricsSnapshot);
      });
    });
  }

  extractMetrics(output) {
    // Extract key metrics from k6 output
    const metrics = {
      checks: this.extractValue(output, /checks\s+\.+\s+([\d.]+)%/),
      httpReqs: this.extractValue(output, /http_reqs\s+\.+\s+([\d]+)/),
      httpReqDuration: this.extractValue(output, /http_req_duration\s+\.+\s+avg=([\d.]+)ms/),
      httpReqP95: this.extractValue(output, /http_req_duration\s+\.+\s+p\(95\)=([\d.]+)ms/),
      httpReqP99: this.extractValue(output, /http_req_duration\s+\.+\s+p\(99\)=([\d.]+)ms/),
    };
    return metrics;
  }

  extractValue(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : 'N/A';
  }

  async collectQueueMetrics() {
    try {
      const response = await axios.get(`${BASE_URL}/queue/status`);
      return response.data.data || {};
    } catch (err) {
      console.error('Failed to collect queue metrics:', err.message);
      return {};
    }
  }

  async runAllTests() {
    console.log('\n📋 BullMQ Load Testing Suite');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);

    for (const config of LOAD_TESTS) {
      // Start metrics collection
      this.startMetricsCollection(config);

      // Run load test
      const metrics = await this.runLoadTest(config);

      // Stop metrics collection
      this.stopMetricsCollection();

      // Pause between tests
      console.log('⏳ Cooling down for 30 seconds...\n');
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }

    // Generate report
    this.generateReport();
  }

  startMetricsCollection(config) {
    const metricsFile = path.join(RESULTS_DIR, `metrics-${config.vus}vus.json`);
    const metrics = [];

    this.metricsInterval = setInterval(async () => {
      const snapshot = await this.collectQueueMetrics();
      snapshot.timestamp = new Date().toISOString();
      metrics.push(snapshot);

      if (metrics.length % 10 === 0) {
        console.log(`📊 Collected ${metrics.length} metric snapshots`);
      }
    }, 2000); // Collect every 2 seconds

    // Store reference for cleanup
    this.currentMetrics = { file: metricsFile, data: metrics };
  }

  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.currentMetrics) {
      fs.writeFileSync(
        this.currentMetrics.file,
        JSON.stringify(this.currentMetrics.data, null, 2)
      );
      console.log(`💾 Metrics saved: ${this.currentMetrics.file}`);
    }
  }

  generateReport() {
    const report = {
      title: 'BullMQ Load Testing Report',
      date: new Date().toISOString(),
      baseUrl: BASE_URL,
      testResults: this.results,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations(),
    };

    const reportPath = path.join(RESULTS_DIR, 'load-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('📊 LOAD TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('\n✅ Full report saved to:', reportPath);
  }

  generateSummary() {
    return {
      totalTests: this.results.length,
      testsRun: this.results.map((r) => r.config.name),
      maxConcurrentUsers: Math.max(...this.results.map((r) => r.config.vus)),
      timestamp: new Date().toISOString(),
    };
  }

  generateRecommendations() {
    return [
      '✓ Monitor p95 and p99 latencies - should be <1000ms for payments',
      '✓ Check error rates - should be <5% even at extreme load',
      '✓ Verify queue depths - should not exceed 10,000 jobs',
      '✓ Monitor Redis memory usage - should not exceed 80% of maxmemory',
      '✓ Check worker CPU and memory - should scale linearly',
      '✓ Consider Redis clustering if p99 latency > 2000ms',
      '✓ Increase worker concurrency if CPU < 70%',
      '✓ Reduce worker concurrency if memory usage > 85%',
    ];
  }
}

// Run tests
const runner = new LoadTestRunner();
runner.runAllTests().catch((err) => {
  console.error('❌ Load test suite failed:', err);
  process.exit(1);
});
