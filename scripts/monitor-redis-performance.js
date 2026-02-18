/**
 * Redis Performance Monitoring Script
 * 
 * Monitors Redis under heavy load and tracks:
 * - Queue latency
 * - Retry count
 * - Message delay
 * - Memory usage
 * - Operations per second
 * - Connection statistics
 * 
 * Run during load tests to identify bottlenecks
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const MONITOR_INTERVAL = 5000; // 5 seconds
const LOG_FILE = path.join(__dirname, 'logs', 'redis-performance.log');

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Queue names to monitor
const QUEUE_NAMES = [
  'bull:payment-processing:',
  'bull:notifications:',
  'bull:analytics:',
  'payment-processing',
  'notifications'
];

let previousStats = null;

/**
 * Get Redis INFO stats
 */
async function getRedisInfo() {
  const info = await redis.info();
  const stats = {};
  
  info.split('\r\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key.trim()] = value.trim();
      }
    }
  });
  
  return stats;
}

/**
 * Get queue metrics from BullMQ
 */
async function getQueueMetrics() {
  const metrics = {};
  
  for (const queueName of QUEUE_NAMES) {
    try {
      // Check for BullMQ queue keys
      const waitingKey = `${queueName}wait`;
      const activeKey = `${queueName}active`;
      const completedKey = `${queueName}completed`;
      const failedKey = `${queueName}failed`;
      const delayedKey = `${queueName}delayed`;
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        redis.llen(waitingKey).catch(() => 0),
        redis.llen(activeKey).catch(() => 0),
        redis.zcard(completedKey).catch(() => 0),
        redis.zcard(failedKey).catch(() => 0),
        redis.zcard(delayedKey).catch(() => 0)
      ]);
      
      metrics[queueName] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
    } catch (err) {
      metrics[queueName] = { error: err.message };
    }
  }
  
  return metrics;
}

/**
 * Get latency metrics
 */
async function getLatencyMetrics() {
  try {
    const latencyResult = await redis.call('LATENCY', 'LATEST');
    const latency = {};
    
    if (Array.isArray(latencyResult)) {
      for (let i = 0; i < latencyResult.length; i++) {
        const [eventName, timestamp, latencyMs] = latencyResult[i];
        latency[eventName] = { timestamp, latencyMs };
      }
    }
    
    return latency;
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get slow log entries
 */
async function getSlowLog(count = 10) {
  try {
    const slowLog = await redis.slowlog('GET', count);
    return slowLog.map(entry => ({
      id: entry[0],
      timestamp: entry[1],
      duration: entry[2],
      command: entry[3].join(' ')
    }));
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Calculate derived metrics
 */
function calculateDerivedMetrics(current, previous) {
  if (!previous) return {};
  
  const timeDiff = (Date.now() - previous.timestamp) / 1000; // seconds
  
  return {
    opsPerSec: Math.round(
      (parseInt(current.total_commands_processed) - parseInt(previous.total_commands_processed)) / timeDiff
    ),
    netInputMBps: (
      (parseInt(current.total_net_input_bytes) - parseInt(previous.total_net_input_bytes)) / timeDiff / 1024 / 1024
    ).toFixed(2),
    netOutputMBps: (
      (parseInt(current.total_net_output_bytes) - parseInt(previous.total_net_output_bytes)) / timeDiff / 1024 / 1024
    ).toFixed(2),
    evictedKeysPerSec: Math.round(
      (parseInt(current.evicted_keys) - parseInt(previous.evicted_keys)) / timeDiff
    )
  };
}

/**
 * Format and display metrics
 */
function displayMetrics(data) {
  const timestamp = new Date().toISOString();
  const divider = '='.repeat(80);
  
  let output = `\n${divider}\n`;
  output += `Redis Performance Metrics - ${timestamp}\n`;
  output += `${divider}\n\n`;
  
  // Memory stats
  output += `📊 Memory:\n`;
  output += `  Used: ${data.info.used_memory_human}\n`;
  output += `  Peak: ${data.info.used_memory_peak_human}\n`;
  output += `  RSS: ${data.info.used_memory_rss_human}\n`;
  output += `  Fragmentation Ratio: ${data.info.mem_fragmentation_ratio}\n\n`;
  
  // Connection stats
  output += `🔌 Connections:\n`;
  output += `  Connected Clients: ${data.info.connected_clients}\n`;
  output += `  Blocked Clients: ${data.info.blocked_clients}\n`;
  output += `  Rejected Connections: ${data.info.rejected_connections}\n\n`;
  
  // Performance stats
  output += `⚡ Performance:\n`;
  output += `  Total Commands Processed: ${data.info.total_commands_processed}\n`;
  output += `  Instantaneous Ops/Sec: ${data.info.instantaneous_ops_per_sec}\n`;
  
  if (data.derived.opsPerSec) {
    output += `  Avg Ops/Sec (interval): ${data.derived.opsPerSec}\n`;
    output += `  Network Input: ${data.derived.netInputMBps} MB/s\n`;
    output += `  Network Output: ${data.derived.netOutputMBps} MB/s\n`;
    output += `  Evicted Keys/Sec: ${data.derived.evictedKeysPerSec}\n`;
  }
  output += `\n`;
  
  // Key stats
  output += `🔑 Keys:\n`;
  output += `  Total Keys: ${data.info.db0 || 'N/A'}\n`;
  output += `  Expired Keys: ${data.info.expired_keys}\n`;
  output += `  Evicted Keys: ${data.info.evicted_keys}\n`;
  output += `  Keyspace Hits: ${data.info.keyspace_hits}\n`;
  output += `  Keyspace Misses: ${data.info.keyspace_misses}\n`;
  
  if (data.info.keyspace_hits && data.info.keyspace_misses) {
    const hitRate = (
      parseInt(data.info.keyspace_hits) / 
      (parseInt(data.info.keyspace_hits) + parseInt(data.info.keyspace_misses)) * 100
    ).toFixed(2);
    output += `  Hit Rate: ${hitRate}%\n`;
  }
  output += `\n`;
  
  // Queue metrics
  output += `📦 Queue Metrics:\n`;
  for (const [queueName, metrics] of Object.entries(data.queues)) {
    if (metrics.error) {
      output += `  ${queueName}: Error - ${metrics.error}\n`;
    } else {
      output += `  ${queueName}:\n`;
      output += `    Waiting: ${metrics.waiting}, Active: ${metrics.active}, `;
      output += `Completed: ${metrics.completed}, Failed: ${metrics.failed}, Delayed: ${metrics.delayed}\n`;
    }
  }
  output += `\n`;
  
  // Latency
  if (Object.keys(data.latency).length > 0) {
    output += `⏱️  Latency Events:\n`;
    for (const [event, info] of Object.entries(data.latency)) {
      if (info.latencyMs) {
        output += `  ${event}: ${info.latencyMs}ms\n`;
      }
    }
    output += `\n`;
  }
  
  // Slow log
  if (data.slowLog.length > 0) {
    output += `🐌 Recent Slow Commands:\n`;
    data.slowLog.slice(0, 5).forEach(entry => {
      output += `  [${entry.duration}μs] ${entry.command}\n`;
    });
    output += `\n`;
  }
  
  // CPU
  output += `💻 CPU:\n`;
  output += `  Used (sys): ${data.info.used_cpu_sys}\n`;
  output += `  Used (user): ${data.info.used_cpu_user}\n\n`;
  
  output += `${divider}\n`;
  
  // Console output (summary)
  console.log(`[${timestamp}] Ops/sec: ${data.info.instantaneous_ops_per_sec} | ` +
              `Clients: ${data.info.connected_clients} | ` +
              `Memory: ${data.info.used_memory_human} | ` +
              `Blocked: ${data.info.blocked_clients}`);
  
  // File output (detailed)
  fs.appendFileSync(LOG_FILE, output);
}

/**
 * Main monitoring loop
 */
async function monitor() {
  try {
    const info = await getRedisInfo();
    const queues = await getQueueMetrics();
    const latency = await getLatencyMetrics();
    const slowLog = await getSlowLog();
    
    const current = {
      timestamp: Date.now(),
      ...info
    };
    
    const derived = calculateDerivedMetrics(current, previousStats);
    
    const data = {
      info,
      queues,
      latency,
      slowLog,
      derived
    };
    
    displayMetrics(data);
    previousStats = current;
    
  } catch (err) {
    console.error('Monitoring error:', err.message);
  }
}

// Start monitoring
console.log(`Starting Redis performance monitoring...`);
console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
console.log(`Interval: ${MONITOR_INTERVAL}ms`);
console.log(`Log file: ${LOG_FILE}\n`);

// Clear log file
fs.writeFileSync(LOG_FILE, `Redis Performance Log - Started ${new Date().toISOString()}\n\n`);

// Initial snapshot
monitor();

// Schedule periodic monitoring
const interval = setInterval(monitor, MONITOR_INTERVAL);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nStopping monitoring...');
  clearInterval(interval);
  await redis.quit();
  console.log('Monitoring stopped. Check log file:', LOG_FILE);
  process.exit(0);
});

// Handle errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
