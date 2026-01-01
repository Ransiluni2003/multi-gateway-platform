const fs = require('fs');
const path = require('path');

// Helper to extract a value from Redis INFO file
function getRedisValue(info, key) {
  const match = info.match(new RegExp(key + ':(.+)'));
  return match ? match[1].trim() : null;
}

// Helper to calculate average Redis ops/sec
function getAverageRedisOpsSec(beforeInfo, afterInfo) {
  const beforeOps = parseInt(getRedisValue(beforeInfo, 'total_commands_processed'));
  const afterOps = parseInt(getRedisValue(afterInfo, 'total_commands_processed'));
  const beforeUptime = parseInt(getRedisValue(beforeInfo, 'uptime_in_seconds'));
  const afterUptime = parseInt(getRedisValue(afterInfo, 'uptime_in_seconds'));
  if (isNaN(beforeOps) || isNaN(afterOps) || isNaN(beforeUptime) || isNaN(afterUptime) || afterUptime <= beforeUptime) {
    return 'N/A';
  }
  const avg = (afterOps - beforeOps) / (afterUptime - beforeUptime);
  return avg.toFixed(2);
}

// Helper to extract latency percentiles from Artillery JSON (summaries or histograms)
function getLatency(json, percentile) {
  try {
    // Try summaries first
    if (json.aggregate && json.aggregate.summaries && json.aggregate.summaries["http.response_time"]) {
      return json.aggregate.summaries["http.response_time"][`p${percentile}`] + ' ms';
    }
    // Fallback to histograms
    if (json.aggregate && json.aggregate.histograms && json.aggregate.histograms["http.response_time"]) {
      return json.aggregate.histograms["http.response_time"][`p${percentile}`] + ' ms';
    }
    return 'N/A';
  } catch {
    return 'N/A';
  }
}

// Helper to extract error percentage from Artillery JSON (using counters)
function getErrorPct(json) {
  try {
    if (json.aggregate && json.aggregate.counters) {
      const errors = (json.aggregate.counters['http.codes.404'] || 0) + (json.aggregate.counters['vusers.failed'] || 0);
      const total = json.aggregate.counters['http.requests'] || 1;
      return ((errors / total) * 100).toFixed(2) + '%';
    }
    return 'N/A';
  } catch {
    return 'N/A';
  }
}

// Read files
const beforeArtillery = JSON.parse(fs.readFileSync(path.join('loadtest', 'report-before.json')));
const afterArtillery = JSON.parse(fs.readFileSync(path.join('loadtest', 'report-after.json')));
const beforeRedis = fs.readFileSync(path.join('loadtest', 'redis-info-before.txt'), 'utf8');
const afterRedis = fs.readFileSync(path.join('loadtest', 'redis-info-after.txt'), 'utf8');

// Build table
console.log(`| Metric         | Before           | After            |`);
console.log(`|---------------|------------------|------------------|`);
console.log(`| p50 latency   | ${getLatency(beforeArtillery, 50)} | ${getLatency(afterArtillery, 50)} |`);
console.log(`| p95 latency   | ${getLatency(beforeArtillery, 95)} | ${getLatency(afterArtillery, 95)} |`);
console.log(`| p99 latency   | ${getLatency(beforeArtillery, 99)} | ${getLatency(afterArtillery, 99)} |`);
console.log(`| Error %       | ${getErrorPct(beforeArtillery)}    | ${getErrorPct(afterArtillery)}    |`);
console.log(`| Redis avg ops/sec | - | ${getAverageRedisOpsSec(beforeRedis, afterRedis)} |`);
