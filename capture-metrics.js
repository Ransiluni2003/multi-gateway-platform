#!/usr/bin/env node
/**
 * Capture system and Redis metrics for load testing comparison
 * Collects CPU, RAM, Redis stats before/after load tests
 */

const os = require('os');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function getRedisInfo() {
  return new Promise((resolve) => {
    const redis = spawn('redis-cli', ['INFO']);
    let output = '';
    redis.stdout.on('data', (data) => {
      output += data.toString();
    });
    redis.on('close', () => {
      resolve(output);
    });
  });
}

function getCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  
  cpus.forEach((cpu) => {
    for (type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);
  return usage;
}

function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return {
    total: Math.round(usedMem / 1024 / 1024), // MB
    percent: Math.round((usedMem / totalMem) * 100)
  };
}

async function captureMetrics(label) {
  console.log(`\n📊 Capturing metrics: ${label}`);
  console.log('─'.repeat(60));
  
  const timestamp = new Date().toISOString();
  const cpuUsage = getCPUUsage();
  const memUsage = getMemoryUsage();
  const redisInfo = await getRedisInfo();

  // Parse Redis stats
  const redisStats = {};
  redisInfo.split('\n').forEach(line => {
    const [key, val] = line.split(':');
    if (key && val) {
      redisStats[key.trim()] = val.trim();
    }
  });

  const metrics = {
    timestamp,
    label,
    system: {
      cpuUsage: `${cpuUsage}%`,
      memoryUsageGB: (memUsage.total / 1024).toFixed(2),
      memoryPercent: `${memUsage.percent}%`
    },
    redis: {
      connectedClients: redisStats.connected_clients || 'N/A',
      usedMemoryMB: redisStats.used_memory_human || 'N/A',
      evictedKeys: redisStats.evicted_keys || '0',
      commandsProcessed: redisStats.total_commands_processed || 'N/A',
      connectionsClosed: redisStats.rejected_connections || '0'
    }
  };

  console.log(`\n⏰ Timestamp: ${timestamp}`);
  console.log(`\n🖥️  System Metrics:`);
  console.log(`   CPU Usage:       ${metrics.system.cpuUsage}`);
  console.log(`   Memory (GB):     ${metrics.system.memoryUsageGB}`);
  console.log(`   Memory (%):      ${metrics.system.memoryPercent}`);
  
  console.log(`\n🔴 Redis Metrics:`);
  console.log(`   Connected Clients: ${metrics.redis.connectedClients}`);
  console.log(`   Used Memory:       ${metrics.redis.usedMemoryMB}`);
  console.log(`   Evicted Keys:      ${metrics.redis.evictedKeys}`);
  console.log(`   Commands Processed: ${metrics.redis.commandsProcessed}`);
  console.log(`   Rejected Connections: ${metrics.redis.connectionsClosed}`);

  // Save to file
  const filename = `metrics-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
  const filepath = path.join(__dirname, 'loadtest', filename);
  fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2));
  console.log(`\n✅ Metrics saved: loadtest/${filename}`);

  return metrics;
}

// Export for use in other scripts
module.exports = { captureMetrics, getRedisInfo, getCPUUsage, getMemoryUsage };

// Run if called directly
if (require.main === module) {
  const label = process.argv[2] || 'manual-capture';
  captureMetrics(label).then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
