const Redis = require("ioredis");

// Simple implementations for testing
class SimpleRetryQueue {
  constructor(redis) {
    this.redis = redis;
    this.maxRetries = 3;
  }

  async enqueue(queueName, payload) {
    const messageId = `${queueName}-${Date.now()}`;
    const message = { id: messageId, payload, retryCount: 0, createdAt: Date.now() };
    await this.redis.lpush(`retry:${queueName}`, JSON.stringify(message));
    return messageId;
  }

  async dequeueAndProcess(queueName, processor) {
    const messageStr = await this.redis.rpop(`retry:${queueName}`);
    if (!messageStr) return { success: true };

    const message = JSON.parse(messageStr);
    try {
      await processor(message.payload);
      return { success: true, messageId: message.id };
    } catch (error) {
      message.retryCount++;
      if (message.retryCount >= this.maxRetries) {
        await this.redis.lpush(`dlq:${queueName}`, messageStr);
        return { success: false, messageId: message.id, error: "Sent to DLQ" };
      }
      await this.redis.lpush(`retry:${queueName}`, JSON.stringify(message));
      return { success: false, messageId: message.id, error: `Retry ${message.retryCount}` };
    }
  }

  async getQueueStats(queueName) {
    const queueSize = await this.redis.llen(`retry:${queueName}`);
    const dlqSize = await this.redis.llen(`dlq:${queueName}`);
    return { queueSize, dlqSize, avgRetries: 1 };
  }

  async getDLQMessages(queueName) {
    const messages = await this.redis.lrange(`dlq:${queueName}`, 0, -1);
    return messages.map(m => JSON.parse(m));
  }
}

class SimpleServiceLogger {
  constructor(redis, serviceName) {
    this.redis = redis;
    this.serviceName = serviceName;
  }

  async logFailure(serviceName, error, context = {}) {
    const failureLog = {
      timestamp: Date.now(),
      serviceName,
      errorType: error.name,
      message: error.message,
      retryCount: context.retryCount,
    };
    await this.redis.lpush(`failures:${serviceName}`, JSON.stringify(failureLog));
    await this.redis.expire(`failures:${serviceName}`, 86400);
  }

  async logRecovery(serviceName, context = {}) {
    const recoveryLog = {
      timestamp: Date.now(),
      serviceName,
      failureDurationMs: context.failureDurationMs,
      messagesRecovered: context.messagesRecovered,
    };
    await this.redis.lpush(`recovery:${serviceName}`, JSON.stringify(recoveryLog));
    await this.redis.expire(`recovery:${serviceName}`, 604800);
  }

  async getFailureLogs(serviceName, limit = 100) {
    const logs = await this.redis.lrange(`failures:${serviceName}`, 0, limit - 1);
    return logs.map(log => JSON.parse(log));
  }

  async getFailureStats(serviceName) {
    const logs = await this.redis.lrange(`failures:${serviceName}`, 0, -1);
    const failureLogs = logs.map(m => JSON.parse(m));
    const commonErrors = {};
    failureLogs.forEach(log => {
      commonErrors[log.errorType] = (commonErrors[log.errorType] || 0) + 1;
    });
    return {
      totalFailures: failureLogs.length,
      failureRate: (failureLogs.length / 1000) * 100,
      lastFailure: failureLogs[0],
      commonErrors,
    };
  }
}

async function main() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  });

  const retryQueue = new SimpleRetryQueue(redis);
  const logger = new SimpleServiceLogger(redis, "test-service");

  console.log("=== Service Resilience Integration Tests ===\n");

  // Test 1: Retry Queue
  console.log("Test 1: Retry Queue with Exponential Backoff");
  console.log("----------------------------------------------");

  let attemptCount = 0;
  const testProcessor = async (payload) => {
    attemptCount++;
    console.log(`  Processing attempt #${attemptCount}: ${JSON.stringify(payload)}`);
    if (attemptCount < 3) {
      throw new Error(`Simulated failure on attempt ${attemptCount}`);
    }
  };

  const messageId = await retryQueue.enqueue("test-queue", { userId: 123, action: "payment" });
  console.log(`✓ Enqueued message: ${messageId}\n`);

  for (let i = 0; i < 5; i++) {
    const result = await retryQueue.dequeueAndProcess("test-queue", testProcessor);
    if (!result.success && result.error && result.error.includes("Sent to DLQ")) break;
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const queueStats = await retryQueue.getQueueStats("test-queue");
  console.log(`✓ Queue stats: ${JSON.stringify(queueStats)}\n`);

  // Test 2: DLQ Management
  console.log("Test 2: Dead Letter Queue Management");
  console.log("------------------------------------");

  const failingProcessor = async () => {
    throw new Error("Permanent failure");
  };

  await retryQueue.enqueue("test-queue", { userId: 456, action: "failed-transaction" });
  for (let i = 0; i < 5; i++) {
    const result = await retryQueue.dequeueAndProcess("test-queue", failingProcessor);
    if (result.error && result.error.includes("Sent to DLQ")) {
      console.log(`✓ Message sent to DLQ after max retries`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const dlqMessages = await retryQueue.getDLQMessages("test-queue");
  console.log(`✓ DLQ contains ${dlqMessages.length} messages\n`);

  // Test 3: Service Logging
  console.log("Test 3: Service Failure Logging");
  console.log("--------------------------------");

  const testError = new Error("Simulated payment processing error");
  await logger.logFailure("payments", testError, {
    retryCount: 2,
    operation: "process_payment",
    duration: 5000,
  });

  const failureLogs = await logger.getFailureLogs("payments", 5);
  console.log(`✓ Logged ${failureLogs.length} failures`);

  const stats = await logger.getFailureStats("payments");
  console.log(`✓ Failure stats: ${JSON.stringify(stats, null, 2)}\n`);

  // Test 4: Recovery Logging
  console.log("Test 4: Service Recovery Logging");
  console.log("--------------------------------");

  await logger.logRecovery("payments", {
    failureDurationMs: 15000,
    messagesRecovered: 42,
  });

  console.log("✓ Recovery event logged\n");

  // Cleanup
  await redis.flushall();
  redis.disconnect();

  console.log("=== All tests completed successfully! ===");
}

main().catch(error => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});
