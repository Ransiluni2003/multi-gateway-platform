# Redis Scaling & Performance Optimization Guide

## 🎯 Overview

This guide covers Redis optimization strategies for handling 1000+ concurrent requests, including configuration tuning, monitoring, and horizontal scaling with Redis Cluster.

---

## 📊 Performance Benchmarks & Thresholds

### When to Optimize

**Single Redis Instance Limits:**
- ✅ **0-5,000 ops/sec**: Standard configuration sufficient
- ⚠️ **5,000-15,000 ops/sec**: Optimization required
- 🚨 **15,000+ ops/sec**: Consider clustering or vertical scaling

**Warning Signs:**
- Memory usage > 80%
- Blocked clients > 0
- Queue length consistently growing
- Latency > 100ms
- CPU usage > 70%

---

## ⚙️ Configuration Optimization

### 1. Use Optimized Redis Config

Switch from `redis.conf` to `redis-optimized.conf`:

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  command: redis-server /usr/local/etc/redis/redis-optimized.conf
  volumes:
    - ./redis-optimized.conf:/usr/local/etc/redis/redis-optimized.conf:ro
```

**Key Optimizations in `redis-optimized.conf`:**
- `maxmemory-policy noeviction` - Prevents key eviction (critical for queues)
- `save ""` - Disables RDB snapshots (no I/O blocking)
- `appendonly no` - Disables AOF (use replication instead)
- `lazyfree-lazy-*` - Background memory freeing
- `activedefrag yes` - Reduces memory fragmentation
- `maxclients 10000` - Supports high connection count

### 2. BullMQ Connection Options

Update Redis connection in worker/queue code:

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  
  // Critical for BullMQ under load
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  
  // Increased timeouts
  connectTimeout: 30000,
  commandTimeout: 10000,
  
  // Connection pool
  lazyConnect: false,
  keepAlive: 30000,
  
  // Retry strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});
```

---

## 📈 Monitoring Redis Performance

### Real-Time Monitoring

Run the monitoring script during load tests:

```bash
node scripts/monitor-redis-performance.js
```

**Monitors:**
- ✅ Operations per second (actual vs instantaneous)
- ✅ Memory usage and fragmentation
- ✅ Queue lengths (waiting, active, delayed, failed)
- ✅ Connection count and blocked clients
- ✅ Network throughput (MB/s)
- ✅ Latency events
- ✅ Slow commands (> 10ms)
- ✅ Key evictions and expirations

**Output:** Console summary + detailed logs in `logs/redis-performance.log`

### Manual Monitoring Commands

```bash
# Connect to Redis CLI
docker exec -it redis redis-cli

# Real-time stats
> INFO stats
> INFO memory
> INFO clients
> INFO commandstats

# Monitor live commands (WARNING: impacts performance)
> MONITOR

# Check slow log
> SLOWLOG GET 10

# Latency monitoring
> LATENCY LATEST
> LATENCY HISTORY command

# Queue lengths
> LLEN bull:payment-processing:wait
> LLEN bull:payment-processing:active
> ZCARD bull:payment-processing:completed
```

---

## 🚀 Load Testing with Redis Monitoring

### Step-by-Step Execution

#### 1. Start Services with 5 Workers

```bash
docker-compose up -d
```

Verify 5 worker instances:
```bash
docker ps | grep worker
```

#### 2. Start Redis Monitoring

In terminal 1:
```bash
npm install ioredis  # if not installed
node scripts/monitor-redis-performance.js
```

#### 3. Run Artillery Load Test (1000 concurrent)

In terminal 2:
```bash
cd loadtest
artillery run artillery-1k-concurrent.yml --output report-1k-concurrent.json
```

**Test Profile:**
- 30s warm-up (10 RPS)
- 60s ramp-up (50 → 500 RPS)
- 180s sustained load (1000 RPS)
- 30s cool-down (100 RPS)

#### 4. Generate HTML Report

```bash
artillery report report-1k-concurrent.json
```

#### 5. Analyze Results

**Check Redis logs:**
```bash
cat logs/redis-performance.log
```

**Key metrics to review:**
- Max ops/sec reached
- Memory peak usage
- Queue latency (time from enqueue to processing)
- Blocked clients count
- Failed requests

---

## 🔍 Identifying Bottlenecks

### 1. Memory Bottleneck

**Symptoms:**
- Memory usage > 80% of maxmemory
- Evicted keys > 0 (if policy allows)
- Swapping to disk

**Solutions:**
- Increase `maxmemory` in `redis-optimized.conf`
- Scale vertically (more RAM)
- Implement Redis Cluster (horizontal scaling)

### 2. CPU Bottleneck

**Symptoms:**
- High CPU usage (> 70%)
- Slow commands in SLOWLOG
- Increasing latency under load

**Solutions:**
- Use Redis Cluster (distributes load)
- Optimize Lua scripts
- Reduce complex operations (e.g., SORT, SUNION)

### 3. Network Bottleneck

**Symptoms:**
- High network I/O (> 100 MB/s)
- Connection timeouts
- Rejected connections

**Solutions:**
- Use pipelining for batch operations
- Compress large payloads
- Co-locate Redis and workers (reduce network hops)

### 4. Queue Bottleneck

**Symptoms:**
- Queue length consistently growing
- High delayed job count
- Workers idle but queue full

**Solutions:**
- Increase worker replicas (already at 5)
- Increase `WORKER_CONCURRENCY` env var
- Optimize job processing logic
- Partition queues by priority

---

## 🌐 Redis Cluster (Horizontal Scaling)

### When to Use Redis Cluster

Use cluster mode when:
- Single instance exceeds 15,000 ops/sec
- Memory requirements > 64GB
- Need horizontal scalability
- High availability is critical

### Setup Redis Cluster

#### 1. Start Cluster (6 nodes: 3 masters + 3 replicas)

```bash
cd redis-cluster
docker-compose -f docker-compose-cluster.yml up -d
```

#### 2. Verify Cluster

```bash
docker exec -it redis-cluster-redis-node-1-1 redis-cli -c -p 7001 cluster info
docker exec -it redis-cluster-redis-node-1-1 redis-cli -c -p 7001 cluster nodes
```

#### 3. Update Application to Use Cluster

```javascript
const Redis = require('ioredis');

const redis = new Redis.Cluster([
  { host: 'localhost', port: 7001 },
  { host: 'localhost', port: 7002 },
  { host: 'localhost', port: 7003 }
], {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  redisOptions: {
    connectTimeout: 30000,
    commandTimeout: 10000
  }
});
```

#### 4. Update BullMQ Queue Config

```javascript
const { Queue } = require('bullmq');

const queue = new Queue('payment-processing', {
  connection: new Redis.Cluster([
    { host: 'localhost', port: 7001 },
    { host: 'localhost', port: 7002 },
    { host: 'localhost', port: 7003 }
  ], {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  })
});
```

### Cluster Monitoring

```bash
# Check cluster health
docker exec -it redis-cluster-redis-node-1-1 redis-cli -c -p 7001 cluster info

# Check node distribution
docker exec -it redis-cluster-redis-node-1-1 redis-cli -c -p 7001 cluster nodes

# Check slot distribution
docker exec -it redis-cluster-redis-node-1-1 redis-cli -c -p 7001 cluster slots
```

---

## 📋 Load Testing Checklist

### Pre-Test

- [ ] 5 worker replicas running (`docker ps | grep worker`)
- [ ] Redis optimized config loaded
- [ ] Monitoring script running (`node scripts/monitor-redis-performance.js`)
- [ ] Backend services healthy (`curl localhost:5000/health`)
- [ ] Clear Redis queues (`docker exec redis redis-cli FLUSHALL`)

### During Test

- [ ] Monitor ops/sec and memory in real-time
- [ ] Watch for blocked clients
- [ ] Check queue lengths (waiting vs active)
- [ ] Monitor worker logs for errors

### Post-Test

- [ ] Generate Artillery HTML report
- [ ] Review Redis performance log
- [ ] Check for slow commands in SLOWLOG
- [ ] Calculate job processing latency (avg time in queue)
- [ ] Document bottlenecks and optimization opportunities

---

## 🎯 Expected Results for 1000 RPS

### Single Optimized Redis Instance

**Expected Performance:**
- ✅ Ops/sec: 8,000-12,000
- ✅ Memory: < 500MB
- ✅ Latency: < 5ms (p95)
- ✅ Queue processing: < 2s per job
- ⚠️ CPU: 50-70% (may bottleneck)

### Redis Cluster (6 nodes)

**Expected Performance:**
- ✅ Ops/sec: 40,000-60,000 (distributed)
- ✅ Memory: < 200MB per node
- ✅ Latency: < 3ms (p95)
- ✅ Queue processing: < 1s per job
- ✅ CPU: 30-40% per node

---

## 🔧 Optimization Quick Wins

### 1. Disable Persistence During Load Test

```properties
# redis-optimized.conf
save ""
appendonly no
```

### 2. Increase Worker Concurrency

```yaml
# docker-compose.yml
worker:
  environment:
    - WORKER_CONCURRENCY=4  # Increase from 2
```

### 3. Use Connection Pooling

```javascript
// Reuse Redis connections
const redisPool = new Redis({
  host: 'localhost',
  maxRetriesPerRequest: null
});

// Share across queues
const paymentQueue = new Queue('payments', { connection: redisPool });
const notifQueue = new Queue('notifications', { connection: redisPool });
```

### 4. Batch Queue Operations

```javascript
// Instead of individual adds:
for (const job of jobs) {
  await queue.add('job', job);
}

// Use bulk add:
await queue.addBulk(jobs.map(job => ({ name: 'job', data: job })));
```

---

## 📊 Results Documentation Template

Create `LOAD_TEST_RESULTS.md`:

```markdown
# Load Test Results - [Date]

## Test Configuration
- Duration: 300s
- Peak RPS: 1000
- Workers: 5
- Redis: Single instance / Cluster

## Results

### Performance Metrics
- Avg Response Time: X ms
- P95 Latency: X ms
- P99 Latency: X ms
- Error Rate: X%
- Throughput: X req/s

### Redis Metrics
- Peak Ops/Sec: X
- Peak Memory: X MB
- Avg Queue Length: X
- Max Blocked Clients: X
- Failed Jobs: X

### Bottlenecks Identified
1. [Description]
2. [Description]

### Optimization Recommendations
1. [Action]
2. [Action]

## Next Steps
- [ ] Implement optimization X
- [ ] Retest with configuration Y
- [ ] Consider Redis Cluster if Z
```

---

## 🚨 Troubleshooting

### Issue: High Latency

**Check:**
```bash
redis-cli --latency -h localhost -p 6379
redis-cli --latency-history -h localhost -p 6379 -i 1
```

**Fix:** Disable persistence, increase memory, check network

### Issue: Queue Not Processing

**Check:**
```bash
docker logs worker_1
docker exec redis redis-cli LLEN bull:payment-processing:wait
```

**Fix:** Restart workers, check error logs, verify Redis connection

### Issue: Memory Errors

**Check:**
```bash
docker exec redis redis-cli INFO memory
```

**Fix:** Increase maxmemory, enable eviction, scale to cluster

---

## 📚 Additional Resources

- [Redis Optimization Official Docs](https://redis.io/docs/management/optimization/)
- [BullMQ Performance Guide](https://docs.bullmq.io/guide/performance)
- [Redis Cluster Tutorial](https://redis.io/docs/manual/scaling/)
- [Artillery Load Testing Docs](https://www.artillery.io/docs)

---

**Last Updated:** January 2026
