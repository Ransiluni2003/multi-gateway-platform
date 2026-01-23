# Docker & Service Resilience Testing Guide

## Overview

This guide walks through testing service interactions, simulating failures, and validating retry logic and recovery mechanisms in your multi-gateway platform.

## Architecture Components

### 1. **RetryQueue** (`src/core/resilience/RetryQueue.ts`)
- **Purpose**: Handles exponential backoff retries for failed operations
- **Features**:
  - Automatic retry with exponential backoff (1s → 2s → 4s → max 60s)
  - Dead Letter Queue (DLQ) for permanently failed messages
  - Redis persistence for queue durability
  - Configurable retry limits and delays

**Usage**:
```typescript
const retryQueue = new RetryQueue(redis, {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 60000
});

// Enqueue a message
const messageId = await retryQueue.enqueue('payments', payload);

// Process with automatic retries
const result = await retryQueue.dequeueAndProcess('payments', async (payload) => {
  // Your processing logic
  await processPayment(payload);
});
```

### 2. **ServiceLogger** (`src/core/resilience/ServiceLogger.ts`)
- **Purpose**: Captures all failures, retries, and recovery events
- **Features**:
  - Logs to both file system (Winston) and Redis
  - Tracks failure statistics and common error patterns
  - Health check event logging
  - 24-hour failure log retention, 7-day recovery log retention

**Usage**:
```typescript
const logger = new ServiceLogger(redis, 'payments');

// Log failures with retry info
await logger.logFailure('payments', error, {
  retryCount: 2,
  operation: 'process_payment',
  duration: 5000
});

// Query failure statistics
const stats = await logger.getFailureStats('payments');
console.log(stats);
// Output: { totalFailures: 45, failureRate: 4.5%, commonErrors: {...} }

// Log recovery
await logger.logRecovery('payments', {
  failureDurationMs: 15000,
  messagesRecovered: 42
});
```

### 3. **ServiceHealthMonitor** (`src/core/resilience/ServiceHealthMonitor.ts`)
- **Purpose**: Real-time monitoring of service health
- **Features**:
  - Periodic health checks (configurable intervals)
  - Response time tracking
  - Service status change logging
  - System-wide health assessment

**Usage**:
```typescript
const healthMonitor = new ServiceHealthMonitor(redis);

// Register services for monitoring
healthMonitor.registerService('api', 'http://api:3000/health', 10000);
healthMonitor.registerService('payments', 'http://payments:3000/health', 10000);

// Check individual service status
const status = await healthMonitor.getServiceStatus('payments');

// Get all service statuses
const allStatuses = await healthMonitor.getAllServiceStatus();

// Check system-wide health
const isHealthy = await healthMonitor.isSystemHealthy();
```

## Testing Procedures

### Test 1: Manual Service Failure Simulation

**Objective**: Test how services handle unexpected downtime

```bash
# Terminal 1: Start Docker services
docker-compose up

# Terminal 2: Monitor logs
docker-compose logs -f

# Terminal 3: Simulate failures
# Stop payments service
docker-compose stop payments

# Observe: Check logs for retry attempts and error handling
# Expected: API should gracefully degrade or queue messages

# Restart service
docker-compose start payments

# Observe: Messages should be retried and processed
```

### Test 2: Automated Resilience Test Suite

**Run the full test suite**:
```bash
# Make the script executable
chmod +x scripts/docker-resilience-tests.sh

# Run tests
./scripts/docker-resilience-tests.sh
```

**Test coverage**:
1. ✓ Payments service failure and recovery
2. ✓ Redis (cache) failure and recovery
3. ✓ MongoDB (database) failure and recovery
4. ✓ Slow network simulation
5. ✓ Complete system failure and recovery

**Output**: Results saved to `test-logs/service-resilience-test-results.md`

### Test 3: Integration Test with Resilience Features

**Run integration tests**:
```bash
# From backend directory
npm test -- test-e2e-resilience.js

# Or standalone
node test-e2e-resilience.js
```

**Tests**:
1. ✓ Retry queue with exponential backoff
2. ✓ Dead Letter Queue management
3. ✓ Service failure logging
4. ✓ Recovery event logging
5. ✓ Real-time health monitoring

## Monitoring & Observability

### Real-time Dashboard

Create a monitoring dashboard using Redis data:

```bash
# View current queue status
redis-cli LLEN "retry:payments"
redis-cli LLEN "dlq:payments"

# View recent failures
redis-cli LRANGE "failures:payments" 0 10

# View service health
redis-cli GET "health:api"
redis-cli GET "health:payments"
redis-cli GET "health:redis"
```

### Log Files

Logs are stored in `backend/logs/`:
- `<service>-error.log` - Error-level logs
- `<service>-combined.log` - All logs
- `test-logs/service-resilience-test-results.md` - Test results

### Prometheus Metrics

Add these custom metrics to track resilience:

```typescript
// In your metrics collection
const retryCount = await redis.get('metric:retries:total');
const dlqSize = await redis.llen('dlq:payments');
const failureRate = await logger.getFailureStats('payments');

// Expose to Prometheus
gauge.set(dlqSize, { service: 'payments', queue: 'dlq' });
histogram.observe(failureRate.failureRate, { service: 'payments' });
```

## Configuration & Tuning

### Retry Strategy

**Conservative (for critical operations)**:
```typescript
maxRetries: 5
initialDelayMs: 500
backoffMultiplier: 2
maxDelayMs: 30000 // 30 seconds
```

**Aggressive (for less critical operations)**:
```typescript
maxRetries: 2
initialDelayMs: 100
backoffMultiplier: 3
maxDelayMs: 10000 // 10 seconds
```

### Health Check Intervals

```typescript
// Production
registerService('api', url, 30000); // 30 seconds

// Development
registerService('api', url, 10000); // 10 seconds
```

## Troubleshooting

### Issue: Messages stuck in queue

```bash
# Check queue size
redis-cli LLEN "retry:payments"

# Check DLQ size
redis-cli LLEN "dlq:payments"

# View stuck messages
redis-cli LRANGE "retry:payments" 0 5

# Clear queue (use with caution)
redis-cli DEL "retry:payments"
```

### Issue: Service not recovering

```bash
# Check health status
redis-cli GET "health:api"

# Check failure logs
redis-cli LRANGE "failures:api" 0 10

# Manually restart
docker-compose restart api
```

### Issue: High DLQ accumulation

Indicates systemic issues:
1. Check service logs: `docker-compose logs payments`
2. Review error patterns: `logger.getFailureStats('payments')`
3. Check resource constraints: `docker stats`
4. Review retry configuration - may be too aggressive

## Performance Benchmarks

**Expected performance after service recovery**:

| Scenario | Time to Recovery | Messages Lost | Data Consistency |
|----------|-----------------|--------------|------------------|
| Payments service down (5min) | < 30s | 0 (queued) | ✓ Maintained |
| Redis down (2min) | < 5s | 0 (fallback) | ✓ Maintained |
| MongoDB down (10min) | 45s | 0 (queued) | ✓ ACID |
| Network slow (100ms latency) | N/A | 0 | ✓ Maintained |

## Next Steps

1. **Deploy to production**: Copy resilience modules to production setup
2. **Alert configuration**: Set up alerts for:
   - DLQ size > 100 messages
   - Service health = "down"
   - Failure rate > 5%
3. **Incident response**: Create runbook for:
   - Escalating manual retries from DLQ
   - Circuit breaker implementation
   - Failover procedures

## References

- Winston Logger: https://github.com/winstonjs/winston
- Redis Documentation: https://redis.io/
- Docker Compose: https://docs.docker.com/compose/
- Exponential Backoff: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
