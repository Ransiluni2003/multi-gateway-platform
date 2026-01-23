#!/usr/bin/env node

/**
 * Redis Observability & Latency Monitoring Script
 * 
 * Captures Redis metrics before and after load tests:
 * - Latency monitoring thresholds
 * - Connection stats
 * - Memory usage
 * - Command stats
 * - Slowlog analysis
 * 
 * Usage:
 *   node redis-observability.js capture-before
 *   node redis-observability.js capture-after
 *   node redis-observability.js generate-report
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const OUTPUT_DIR = process.env.OUTPUT_DIR || './loadtest';

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// ============================================================================
// METRICS CAPTURE
// ============================================================================

async function captureMetrics(label) {
  console.log(`\n📊 Capturing Redis metrics: ${label}`);
  
  const metrics = {
    timestamp: new Date().toISOString(),
    label,
    info: {},
    latency: {},
    slowlog: [],
    config: {},
    memory: {},
    clients: {},
    commandStats: {},
  };

  try {
    // 1. Redis INFO
    console.log('  → Getting Redis INFO...');
    const info = await redis.info();
    metrics.info = parseRedisInfo(info);

    // 2. Latency Monitoring
    console.log('  → Checking latency monitoring...');
    const latencyThreshold = await redis.config('GET', 'latency-monitor-threshold');
    metrics.config.latencyThreshold = latencyThreshold[1];

    // Get latency events
    const latencyLatest = await redis.call('LATENCY', 'LATEST');
    metrics.latency.latest = latencyLatest;

    const latencyHistory = await redis.call('LATENCY', 'HISTORY', 'command');
    metrics.latency.commandHistory = latencyHistory;

    const latencyDoctor = await redis.call('LATENCY', 'DOCTOR');
    metrics.latency.doctor = latencyDoctor;

    // 3. Slowlog
    console.log('  → Getting slowlog...');
    const slowlogLen = await redis.slowlog('LEN');
    const slowlog = await redis.slowlog('GET', 10); // Last 10 slow commands
    metrics.slowlog = {
      length: slowlogLen,
      entries: slowlog,
    };

    // 4. Memory Stats
    console.log('  → Analyzing memory...');
    const memoryStats = await redis.memory('STATS');
    metrics.memory = memoryStats;

    // 5. Client List
    console.log('  → Checking connected clients...');
    const clientList = await redis.client('LIST');
    metrics.clients.list = parseClientList(clientList);
    metrics.clients.count = metrics.clients.list.length;

    // 6. Command Stats
    console.log('  → Gathering command stats...');
    const commandStats = await redis.info('commandstats');
    metrics.commandStats = parseCommandStats(commandStats);

    // 7. Additional Config
    console.log('  → Reading configuration...');
    const maxClients = await redis.config('GET', 'maxclients');
    const timeout = await redis.config('GET', 'timeout');
    const tcpBacklog = await redis.config('GET', 'tcp-backlog');
    
    metrics.config.maxClients = maxClients[1];
    metrics.config.timeout = timeout[1];
    metrics.config.tcpBacklog = tcpBacklog[1];

    // Save to file
    const filename = path.join(OUTPUT_DIR, `redis-metrics-${label}.json`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(metrics, null, 2));
    
    console.log(`✅ Metrics saved to: ${filename}`);
    
    return metrics;

  } catch (error) {
    console.error(`❌ Error capturing metrics: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// LATENCY MONITORING SETUP
// ============================================================================

async function enableLatencyMonitoring(threshold = 100) {
  console.log(`\n🔧 Enabling Redis latency monitoring (threshold: ${threshold}ms)`);
  
  try {
    // Set latency-monitor-threshold (in milliseconds)
    await redis.config('SET', 'latency-monitor-threshold', threshold);
    
    // Reset latency data
    await redis.call('LATENCY', 'RESET');
    
    console.log(`✅ Latency monitoring enabled`);
    console.log(`   Threshold: ${threshold}ms`);
    console.log(`   Events will be logged when commands exceed ${threshold}ms`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to enable latency monitoring: ${error.message}`);
    return false;
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

async function generateReport() {
  console.log('\n📄 Generating Redis observability report...');

  const beforeFile = path.join(OUTPUT_DIR, 'redis-metrics-before.json');
  const afterFile = path.join(OUTPUT_DIR, 'redis-metrics-after.json');

  if (!fs.existsSync(beforeFile) || !fs.existsSync(afterFile)) {
    console.error('❌ Before/after metrics files not found');
    console.log(`   Looking for:`);
    console.log(`   - ${beforeFile}`);
    console.log(`   - ${afterFile}`);
    return;
  }

  const before = JSON.parse(fs.readFileSync(beforeFile, 'utf8'));
  const after = JSON.parse(fs.readFileSync(afterFile, 'utf8'));

  // Generate markdown report
  const report = generateMarkdownReport(before, after);
  
  const reportFile = path.join(OUTPUT_DIR, 'redis-observability-report.md');
  fs.writeFileSync(reportFile, report);
  
  console.log(`✅ Report generated: ${reportFile}`);

  // Generate JSON comparison
  const comparison = {
    testPeriod: {
      start: before.timestamp,
      end: after.timestamp,
    },
    metrics: {
      connections: {
        before: before.info.connected_clients,
        after: after.info.connected_clients,
        delta: after.info.connected_clients - before.info.connected_clients,
      },
      commandsProcessed: {
        before: before.info.total_commands_processed,
        after: after.info.total_commands_processed,
        delta: after.info.total_commands_processed - before.info.total_commands_processed,
      },
      memoryUsed: {
        before: before.info.used_memory_human,
        after: after.info.used_memory_human,
        beforeBytes: before.info.used_memory,
        afterBytes: after.info.used_memory,
        delta: after.info.used_memory - before.info.used_memory,
      },
      opsPerSecond: {
        before: before.info.instantaneous_ops_per_sec,
        after: after.info.instantaneous_ops_per_sec,
        delta: after.info.instantaneous_ops_per_sec - before.info.instantaneous_ops_per_sec,
      },
      latencyEvents: {
        before: before.latency.latest,
        after: after.latency.latest,
      },
      slowlog: {
        before: before.slowlog.length,
        after: after.slowlog.length,
        delta: after.slowlog.length - before.slowlog.length,
      },
    },
  };

  const comparisonFile = path.join(OUTPUT_DIR, 'redis-comparison.json');
  fs.writeFileSync(comparisonFile, JSON.stringify(comparison, null, 2));
  
  console.log(`✅ Comparison saved: ${comparisonFile}`);
  
  // Print summary to console
  printSummary(comparison);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseRedisInfo(infoString) {
  const lines = infoString.split('\r\n');
  const info = {};
  
  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        // Try to parse as number
        const numValue = parseFloat(value);
        info[key] = isNaN(numValue) ? value : numValue;
      }
    }
  }
  
  return info;
}

function parseClientList(clientListString) {
  const lines = clientListString.trim().split('\n');
  return lines.map(line => {
    const client = {};
    const parts = line.split(' ');
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        client[key] = value;
      }
    }
    
    return client;
  });
}

function parseCommandStats(commandStatsString) {
  const lines = commandStatsString.split('\r\n');
  const stats = {};
  
  for (const line of lines) {
    if (line.startsWith('cmdstat_')) {
      const [key, value] = line.split(':');
      const command = key.replace('cmdstat_', '');
      
      // Parse: calls=123,usec=456,usec_per_call=3.70
      const metrics = {};
      const parts = value.split(',');
      
      for (const part of parts) {
        const [metricKey, metricValue] = part.split('=');
        metrics[metricKey] = parseFloat(metricValue);
      }
      
      stats[command] = metrics;
    }
  }
  
  return stats;
}

function generateMarkdownReport(before, after) {
  const report = `# Redis Observability Report

## Test Execution Details

- **Start Time:** ${before.timestamp}
- **End Time:** ${after.timestamp}
- **Latency Threshold:** ${before.config.latencyThreshold}ms

---

## 📊 Key Metrics Comparison

### Connections
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Connected Clients | ${before.info.connected_clients} | ${after.info.connected_clients} | ${formatDelta(after.info.connected_clients - before.info.connected_clients)} |
| Max Clients | ${before.config.maxClients} | ${after.config.maxClients} | - |

### Commands Processed
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total Commands | ${before.info.total_commands_processed} | ${after.info.total_commands_processed} | ${formatNumber(after.info.total_commands_processed - before.info.total_commands_processed)} |
| Ops/sec (instantaneous) | ${before.info.instantaneous_ops_per_sec} | ${after.info.instantaneous_ops_per_sec} | ${formatDelta(after.info.instantaneous_ops_per_sec - before.info.instantaneous_ops_per_sec)} |

### Memory Usage
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Used Memory | ${before.info.used_memory_human} | ${after.info.used_memory_human} | ${formatBytes(after.info.used_memory - before.info.used_memory)} |
| Peak Memory | ${before.info.used_memory_peak_human} | ${after.info.used_memory_peak_human} | - |

### Slowlog
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Slowlog Entries | ${before.slowlog.length} | ${after.slowlog.length} | ${formatDelta(after.slowlog.length - before.slowlog.length)} |

---

## ⏱️ Latency Monitoring

### Configuration
- **Threshold:** ${before.config.latencyThreshold}ms
- **Status:** ${after.latency.latest && after.latency.latest.length > 0 ? '⚠️ Events detected' : '✅ No events'}

### Latency Events (After Load Test)
${formatLatencyEvents(after.latency.latest)}

### Latency Doctor Analysis
\`\`\`
${after.latency.doctor || 'No latency events recorded'}
\`\`\`

---

## 🐌 Slowlog Analysis (Top 5 Slow Commands After Load Test)

${formatSlowlog(after.slowlog.entries)}

---

## 📈 Command Statistics (Top 10 by Calls)

${formatCommandStats(after.commandStats)}

---

## ✅ Summary

### Performance Indicators

${generatePerformanceSummary(before, after)}

### Recommendations

${generateRecommendations(before, after)}

---

**Report Generated:** ${new Date().toISOString()}
`;

  return report;
}

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return value.toString();
}

function formatNumber(num) {
  return num.toLocaleString();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value > 0 ? '+' : ''}${value.toFixed(2)} ${sizes[i]}`;
}

function formatLatencyEvents(events) {
  if (!events || events.length === 0) {
    return '✅ No latency events recorded (all commands completed within threshold)';
  }

  let output = '| Event | Timestamp | Latency (ms) |\n|-------|-----------|-------------|\n';
  
  for (const event of events) {
    if (Array.isArray(event) && event.length >= 3) {
      output += `| ${event[0]} | ${new Date(event[1]).toISOString()} | ${event[2]}ms |\n`;
    }
  }

  return output;
}

function formatSlowlog(entries) {
  if (!entries || entries.length === 0) {
    return '✅ No slow commands recorded';
  }

  let output = '| ID | Duration (μs) | Command | Timestamp |\n|----|--------------|---------|-----------|\n';
  
  for (const entry of entries.slice(0, 5)) {
    if (Array.isArray(entry) && entry.length >= 4) {
      const id = entry[0];
      const timestamp = new Date(entry[1] * 1000).toISOString();
      const duration = entry[2];
      const command = Array.isArray(entry[3]) ? entry[3].join(' ') : entry[3];
      
      output += `| ${id} | ${duration} | \`${command}\` | ${timestamp} |\n`;
    }
  }

  return output;
}

function formatCommandStats(stats) {
  const sorted = Object.entries(stats)
    .sort((a, b) => b[1].calls - a[1].calls)
    .slice(0, 10);

  if (sorted.length === 0) {
    return 'No command statistics available';
  }

  let output = '| Command | Calls | Total Time (μs) | Avg Time (μs) |\n|---------|-------|----------------|---------------|\n';
  
  for (const [command, metrics] of sorted) {
    output += `| ${command} | ${formatNumber(metrics.calls)} | ${formatNumber(metrics.usec)} | ${metrics.usec_per_call.toFixed(2)} |\n`;
  }

  return output;
}

function generatePerformanceSummary(before, after) {
  const commandsDelta = after.info.total_commands_processed - before.info.total_commands_processed;
  const memoryDelta = after.info.used_memory - before.info.used_memory;
  const hasLatencyEvents = after.latency.latest && after.latency.latest.length > 0;
  const hasSlowlog = after.slowlog.length > 0;

  let summary = '';

  // Commands processed
  if (commandsDelta > 0) {
    summary += `✅ **Commands Processed:** ${formatNumber(commandsDelta)} during load test\n`;
  }

  // Memory growth
  if (memoryDelta > 0) {
    summary += `📈 **Memory Growth:** ${formatBytes(memoryDelta)}\n`;
  } else if (memoryDelta < 0) {
    summary += `📉 **Memory Decreased:** ${formatBytes(memoryDelta)}\n`;
  }

  // Latency
  if (hasLatencyEvents) {
    summary += `⚠️ **Latency Events:** ${after.latency.latest.length} commands exceeded ${before.config.latencyThreshold}ms\n`;
  } else {
    summary += `✅ **Latency:** All commands completed within ${before.config.latencyThreshold}ms threshold\n`;
  }

  // Slowlog
  if (hasSlowlog) {
    summary += `⚠️ **Slow Commands:** ${after.slowlog.length} entries in slowlog\n`;
  } else {
    summary += `✅ **Slow Commands:** None detected\n`;
  }

  return summary;
}

function generateRecommendations(before, after) {
  const recommendations = [];

  // Check connections
  const connectionUsage = after.info.connected_clients / parseInt(after.config.maxClients);
  if (connectionUsage > 0.8) {
    recommendations.push(`⚠️ **High connection usage** (${(connectionUsage * 100).toFixed(1)}% of max) - Consider increasing \`maxclients\``);
  }

  // Check memory
  const memoryUsage = after.info.used_memory / after.info.total_system_memory;
  if (memoryUsage > 0.8) {
    recommendations.push(`⚠️ **High memory usage** (${(memoryUsage * 100).toFixed(1)}%) - Consider adding more RAM or implementing eviction policy`);
  }

  // Check latency events
  if (after.latency.latest && after.latency.latest.length > 0) {
    recommendations.push(`⚠️ **Latency events detected** - Review slow commands and optimize queries`);
  }

  // Check slowlog
  if (after.slowlog.length > 10) {
    recommendations.push(`⚠️ **Multiple slow commands** - Review slowlog and add indexes or optimize commands`);
  }

  // All good
  if (recommendations.length === 0) {
    recommendations.push(`✅ **No issues detected** - Redis is performing well under load`);
  }

  return recommendations.join('\n');
}

function printSummary(comparison) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 REDIS OBSERVABILITY SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n🔗 Connections:');
  console.log(`   Before: ${comparison.metrics.connections.before}`);
  console.log(`   After:  ${comparison.metrics.connections.after}`);
  console.log(`   Delta:  ${formatDelta(comparison.metrics.connections.delta)}`);
  
  console.log('\n⚡ Commands Processed:');
  console.log(`   Total:  ${formatNumber(comparison.metrics.commandsProcessed.delta)}`);
  console.log(`   Ops/s:  ${comparison.metrics.opsPerSecond.after}`);
  
  console.log('\n💾 Memory Usage:');
  console.log(`   Before: ${comparison.metrics.memoryUsed.before}`);
  console.log(`   After:  ${comparison.metrics.memoryUsed.after}`);
  console.log(`   Delta:  ${formatBytes(comparison.metrics.memoryUsed.delta)}`);
  
  console.log('\n🐌 Slowlog:');
  console.log(`   Entries: ${comparison.metrics.slowlog.after}`);
  console.log(`   New:     ${formatDelta(comparison.metrics.slowlog.delta)}`);
  
  console.log('\n' + '='.repeat(60));
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'enable-monitoring':
        const threshold = parseInt(process.argv[3]) || 100;
        await enableLatencyMonitoring(threshold);
        break;

      case 'capture-before':
        await captureMetrics('before');
        break;

      case 'capture-after':
        await captureMetrics('after');
        break;

      case 'generate-report':
        await generateReport();
        break;

      default:
        console.log(`
Redis Observability Tool

Usage:
  node redis-observability.js enable-monitoring [threshold_ms]
  node redis-observability.js capture-before
  node redis-observability.js capture-after
  node redis-observability.js generate-report

Example:
  # Enable latency monitoring with 100ms threshold
  node redis-observability.js enable-monitoring 100

  # Capture metrics before load test
  node redis-observability.js capture-before

  # Run your load test...

  # Capture metrics after load test
  node redis-observability.js capture-after

  # Generate comparison report
  node redis-observability.js generate-report
        `);
    }

    await redis.quit();
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    await redis.quit();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  captureMetrics,
  enableLatencyMonitoring,
  generateReport,
};
