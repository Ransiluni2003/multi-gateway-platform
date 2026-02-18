import { EventEmitter } from "events";
import Redis from "ioredis";

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

interface QueuedMessage {
  id: string;
  payload: any;
  retryCount: number;
  createdAt: number;
  nextRetryAt: number;
  error?: string;
}

/**
 * RetryQueue: Handles exponential backoff retries for failed operations
 * Integrates with Redis for persistence
 */
export class RetryQueue extends EventEmitter {
  private redis: Redis;
  private config: RetryConfig;
  private dlqPrefix = "dlq:";
  private retryPrefix = "retry:";

  constructor(redis: Redis, config: Partial<RetryConfig> = {}) {
    super();
    this.redis = redis;
    this.config = {
      maxRetries: config.maxRetries || 3,
      initialDelayMs: config.initialDelayMs || 1000,
      backoffMultiplier: config.backoffMultiplier || 2,
      maxDelayMs: config.maxDelayMs || 60000,
    };
  }

  /**
   * Enqueue a message for processing with retry support
   */
  async enqueue(
    queueName: string,
    payload: any,
    messageId: string = `${queueName}-${Date.now()}-${Math.random()}`
  ): Promise<string> {
    const message: QueuedMessage = {
      id: messageId,
      payload,
      retryCount: 0,
      createdAt: Date.now(),
      nextRetryAt: Date.now(),
    };

    const key = `${this.retryPrefix}${queueName}`;
    await this.redis.lpush(key, JSON.stringify(message));
    await this.redis.expire(key, 86400); // 24 hours TTL

    this.emit("enqueued", { queueName, messageId, payload });
    return messageId;
  }

  /**
   * Dequeue and process a message with automatic retry on failure
   */
  async dequeueAndProcess(
    queueName: string,
    processor: (payload: any) => Promise<void>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const key = `${this.retryPrefix}${queueName}`;
    const messageStr = await this.redis.rpop(key);

    if (!messageStr) {
      return { success: true };
    }

    const message: QueuedMessage = JSON.parse(messageStr);
    const now = Date.now();

    // Check if it's ready for processing
    if (now < message.nextRetryAt) {
      // Put it back for later
      await this.redis.lpush(key, messageStr);
      return { success: true };
    }

    try {
      await processor(message.payload);
      this.emit("processed", { queueName, messageId: message.id });
      return { success: true, messageId: message.id };
    } catch (error) {
      message.retryCount++;
      message.error = (error as Error).message;

      if (message.retryCount >= this.config.maxRetries) {
        // Send to DLQ
        await this.sendToDLQ(queueName, message);
        this.emit("dlq", { queueName, messageId: message.id, error });
        return { success: false, messageId: message.id, error: "Sent to DLQ" };
      }

      // Calculate next retry time with exponential backoff
      const delay = Math.min(
        this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, message.retryCount - 1),
        this.config.maxDelayMs
      );
      message.nextRetryAt = now + delay;

      // Re-enqueue
      await this.redis.lpush(key, JSON.stringify(message));
      this.emit("retry", {
        queueName,
        messageId: message.id,
        retryCount: message.retryCount,
        nextRetryDelayMs: delay,
        error,
      });

      return {
        success: false,
        messageId: message.id,
        error: `Retrying in ${delay}ms (attempt ${message.retryCount}/${this.config.maxRetries})`,
      };
    }
  }

  /**
   * Send message to Dead Letter Queue after max retries
   */
  private async sendToDLQ(queueName: string, message: QueuedMessage): Promise<void> {
    const dlqKey = `${this.dlqPrefix}${queueName}`;
    const dlqMessage = {
      ...message,
      sentToDLQAt: Date.now(),
    };
    await this.redis.lpush(dlqKey, JSON.stringify(dlqMessage));
    await this.redis.expire(dlqKey, 604800); // 7 days retention
  }

  /**
   * Get DLQ messages for a queue
   */
  async getDLQMessages(queueName: string): Promise<QueuedMessage[]> {
    const dlqKey = `${this.dlqPrefix}${queueName}`;
    const messages = await this.redis.lrange(dlqKey, 0, -1);
    return messages.map((m) => JSON.parse(m));
  }

  /**
   * Retry a message from DLQ
   */
  async retryDLQMessage(queueName: string, messageId: string): Promise<boolean> {
    const dlqKey = `${this.dlqPrefix}${queueName}`;
    const messages = await this.getDLQMessages(queueName);
    const messageIndex = messages.findIndex((m) => m.id === messageId);

    if (messageIndex === -1) return false;

    const message = messages[messageIndex];
    message.retryCount = 0;
    message.nextRetryAt = Date.now();

    // Remove from DLQ
    await this.redis.lrem(dlqKey, 1, JSON.stringify(messages[messageIndex]));

    // Re-enqueue
    const key = `${this.retryPrefix}${queueName}`;
    await this.redis.lpush(key, JSON.stringify(message));

    this.emit("dlq-retry", { queueName, messageId });
    return true;
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName: string): Promise<{
    queueSize: number;
    dlqSize: number;
    avgRetries: number;
  }> {
    const key = `${this.retryPrefix}${queueName}`;
    const dlqKey = `${this.dlqPrefix}${queueName}`;

    const queueSize = await this.redis.llen(key);
    const dlqSize = await this.redis.llen(dlqKey);

    const messages = await this.redis.lrange(key, 0, -1);
    const avgRetries = messages.length > 0 ? messages.reduce((sum, m) => sum + JSON.parse(m).retryCount, 0) / messages.length : 0;

    return { queueSize, dlqSize, avgRetries };
  }
}
