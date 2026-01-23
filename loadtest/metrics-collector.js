#!/usr/bin/env node

/**
 * Load Test Metrics Collector & Reporter
 * Collects queue metrics during load tests and generates reports
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RESULTS_DIR = path.join(__dirname, '../loadtest-results');
const COLLECTION_INTERVAL = parseInt(process.env.COLLECTION_INTERVAL || '2000');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '300000'); // 5 minutes default

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

class MetricsCollector {
  constructor() {
    this.metrics = [];
    this.startTime = Date.now();
    this.testName = process.env.TEST_NAME || `load-test-${Date.now()}`;
  }

  async collectMetrics() {
    try {
      const response = await axios.get(`${BASE_URL}/queue/status`, {
        timeout: 5000,
      });

      const data = {
        timestamp: new Date().toISOString(),
        elapsedSeconds: Math.round((Date.now() - this.startTime) / 1000),
        queues: response.data.data || {},
      };

      this.metrics.push(data);

      // Log every 30 seconds
      if (this.metrics.length % 15 === 0) {
        this.logStatus(data);
      }

      return data;
    } catch (err) {
      console.error(`❌ Failed to collect metrics: ${err.message}`);
      return null;
    }
  }

  logStatus(data) {
    console.clear();
    console.log('\n' + '='.repeat(80));
    console.log(`📊 METRICS COLLECTION: ${this.testName}`);
    console.log(`⏱️  Elapsed: ${data.elapsedSeconds}s`);
    console.log('='.repeat(80) + '\n');

    Object.entries(data.queues).forEach(([queueName, metrics]) => {
      console.log(`📦 Queue: ${queueName.toUpperCase()}`);
      console.log(`   Active:       ${metrics.activeCount}`);
      console.log(`   Waiting:      ${metrics.waitingCount}`);
      console.log(`   Completed:    ${metrics.completedCount}`);
      console.log(`   Failed:       ${metrics.failedCount}`);
      console.log(`   Delayed:      ${metrics.delayedCount}`);
      console.log(`   Avg Latency:  ${Math.round(metrics.averageLatency)}ms`);
      console.log(`   P95 Latency:  ${Math.round(metrics.p95Latency)}ms`);
      console.log(`   P99 Latency:  ${Math.round(metrics.p99Latency)}ms`);
      console.log();
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 GENERATING METRICS REPORT');
    console.log('='.repeat(80));

    const report = {
      testName: this.testName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      totalDuration: Math.round((Date.now() - this.startTime) / 1000),
      metricsCollected: this.metrics.length,
      summary: this.calculateSummary(),
      rawMetrics: this.metrics,
    };

    // Save raw metrics
    const metricsFile = path.join(RESULTS_DIR, `metrics-${this.testName}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2));
    console.log(`✅ Metrics saved: ${metricsFile}`);

    // Save report
    const reportFile = path.join(RESULTS_DIR, `report-${this.testName}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`✅ Report saved: ${reportFile}`);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 METRICS SUMMARY');
    console.log('='.repeat(80) + '\n');
    console.log(JSON.stringify(report.summary, null, 2));

    return report;
  }

  calculateSummary() {
    const summary = {
      queues: {},
    };

    const queueNames = new Set();
    this.metrics.forEach((m) => {
      Object.keys(m.queues).forEach((q) => queueNames.add(q));
    });

    // Calculate per-queue statistics
    queueNames.forEach((queueName) => {
      const queueMetrics = this.metrics.map((m) => m.queues[queueName]).filter(Boolean);

      if (queueMetrics.length === 0) return;

      const completedCounts = queueMetrics.map((m) => m.completedCount);
      const failedCounts = queueMetrics.map((m) => m.failedCount);
      const latencies = queueMetrics.map((m) => m.averageLatency);
      const p95s = queueMetrics.map((m) => m.p95Latency);
      const p99s = queueMetrics.map((m) => m.p99Latency);
      const activeCountsAtPeak = queueMetrics.map((m) => m.activeCount);
      const waitingCountsAtPeak = queueMetrics.map((m) => m.waitingCount);

      summary.queues[queueName] = {
        totalCompleted: Math.max(...completedCounts),
        totalFailed: Math.max(...failedCounts),
        failureRate: (Math.max(...failedCounts) / Math.max(...completedCounts) * 100).toFixed(2) + '%',
        averageLatency: Math.round(latencies.reduce((a, b) => a + b) / latencies.length),
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        p95Latency: this.percentile(p95s, 95),
        p99Latency: this.percentile(p99s, 99),
        peakActive: Math.max(...activeCountsAtPeak),
        peakWaiting: Math.max(...waitingCountsAtPeak),
        jobsPerSecond: (Math.max(...completedCounts) / report.totalDuration).toFixed(2),
      };
    });

    return summary;
  }

  percentile(arr, p) {
    const sorted = arr.sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, idx)]);
  }
}

async function main() {
  const collector = new MetricsCollector();

  console.log(`\n🎯 Starting metrics collection for ${TEST_DURATION / 1000}s...`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏱️  Collection interval: ${COLLECTION_INTERVAL}ms\n`);

  const collectionInterval = setInterval(async () => {
    await collector.collectMetrics();
  }, COLLECTION_INTERVAL);

  // Collect once immediately
  await collector.collectMetrics();

  // Stop collection and generate report after TEST_DURATION
  setTimeout(() => {
    clearInterval(collectionInterval);
    collector.generateReport();
    process.exit(0);
  }, TEST_DURATION);
}

main().catch((err) => {
  console.error('❌ Metrics collection failed:', err);
  process.exit(1);
});
