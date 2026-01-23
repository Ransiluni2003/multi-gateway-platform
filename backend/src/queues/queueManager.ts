import { Queue, Worker, Job, QueueEvents, MetricsTime } from "bullmq";
import IORedis from "ioredis";
import { Logger } from "winston";

export interface QueueConfig {
  name: string;
  concurrency: number;
  maxAttempts: number;
  backoffDelay: number;
}

export interface QueueMetrics {
  queueName: string;
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  failedCount: number;
  delayedCount: number;
  stalledCount: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  timestamp: Date;
}

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private connection: IORedis;
  private metricsStorage: Map<string, QueueMetrics[]> = new Map();
  private logger: Logger;

  constructor(redisUrl: string, logger: Logger) {
    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
    this.logger = logger;
  }

  /**
   * Register a new queue with worker
   */
  public registerQueue(
    config: QueueConfig,
    processor: (job: Job) => Promise<void>
  ): void {
    // Create queue
    const queue = new Queue(config.name, { connection: this.connection });
    this.queues.set(config.name, queue);

    // Create worker with concurrency control
    const worker = new Worker(config.name, processor, {
      connection: this.connection,
      concurrency: config.concurrency,
      useWorkerThreads: true,
      lockDuration: 30000,
      lockRenewTime: 15000,
      maxStalledCount: 2,
      stalledInterval: 5000,
    });

    this.workers.set(config.name, worker);

    // Setup event listeners for metrics
    const queueEvents = new QueueEvents(config.name, {
      connection: this.connection,
    });
    this.queueEvents.set(config.name, queueEvents);

    // Initialize metrics storage
    this.metricsStorage.set(config.name, []);

    // Bind event handlers
    this.setupEventHandlers(config.name, queueEvents, worker);

    this.logger.info(`✅ Queue registered: ${config.name} (concurrency: ${config.concurrency})`);
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(
    queueName: string,
    queueEvents: QueueEvents,
    worker: Worker
  ): void {
    // Job completed
    queueEvents.on("completed", ({ jobId, returnvalue }) => {
      this.logger.debug(`✅ Job completed: ${queueName}/${jobId}`);
    });

    // Job failed
    queueEvents.on("failed", ({ jobId, failedReason }) => {
      this.logger.warn(`❌ Job failed: ${queueName}/${jobId} - ${failedReason}`);
    });

    // Job stalled
    queueEvents.on("stalled", ({ jobId }) => {
      this.logger.warn(`⚠️ Job stalled: ${queueName}/${jobId}`);
    });

    // Worker events
    worker.on("completed", (job) => {
      this.recordMetric(queueName, job);
    });

    worker.on("failed", (job) => {
      this.logger.error(`Worker error: ${queueName}/${job?.id}`, job?.failedReason);
    });
  }

  /**
   * Record job metrics
   */
  private recordMetric(queueName: string, job: Job): void {
    const processingTime = Date.now() - job.timestamp;
    const metrics = this.metricsStorage.get(queueName) || [];
    
    // Keep only last 1000 metrics per queue
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    metrics.push({
      queueName,
      activeCount: 0,
      waitingCount: 0,
      completedCount: 0,
      failedCount: 0,
      delayedCount: 0,
      stalledCount: 0,
      averageLatency: processingTime,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      timestamp: new Date(),
    });
    
    this.metricsStorage.set(queueName, metrics);
  }

  /**
   * Get real-time metrics for a queue
   */
  public async getMetrics(queueName: string): Promise<QueueMetrics | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const [
      activeCount,
      waitingCount,
      completedCount,
      failedCount,
      delayedCount,
    ] = await Promise.all([
      queue.getActiveCount(),
      queue.getWaitingCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    // Stalled count is not directly available in BullMQ, calculate from worker
    const stalledCount = 0; // Stalled jobs are tracked internally by workers

    const latencies = this.metricsStorage.get(queueName) || [];
    const sortedLatencies = latencies
      .map((m) => m.averageLatency)
      .sort((a, b) => a - b);

    const percentile = (p: number) => {
      const idx = Math.ceil((p / 100) * sortedLatencies.length) - 1;
      return sortedLatencies[Math.max(0, idx)] || 0;
    };

    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((sum, m) => sum + m.averageLatency, 0) /
          latencies.length
        : 0;

    return {
      queueName,
      activeCount,
      waitingCount,
      completedCount,
      failedCount,
      delayedCount,
      stalledCount,
      averageLatency: avgLatency,
      p95Latency: percentile(95),
      p99Latency: percentile(99),
      throughput: latencies.length,
      timestamp: new Date(),
    };
  }

  /**
   * Get metrics for all queues
   */
  public async getAllMetrics(): Promise<QueueMetrics[]> {
    const metrics: QueueMetrics[] = [];
    for (const queueName of this.queues.keys()) {
      const metric = await this.getMetrics(queueName);
      if (metric) metrics.push(metric);
    }
    return metrics;
  }

  /**
   * Enqueue a job with retry and backoff config
   */
  public async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    }
  ): Promise<Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.error(`Queue not found: ${queueName}`);
      return null;
    }

    try {
      const job = await queue.add(jobName, data, {
        attempts: options?.attempts || 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        delay: options?.delay,
        priority: options?.priority || 0,
      });

      this.logger.debug(`📨 Job enqueued: ${queueName}/${job.id}`);
      return job;
    } catch (err) {
      this.logger.error(`Failed to enqueue job in ${queueName}:`, err);
      return null;
    }
  }

  /**
   * Get queue status overview
   */
  public async getQueueStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const queueName of this.queues.keys()) {
      const metrics = await this.getMetrics(queueName);
      if (metrics) {
        status[queueName] = metrics;
      }
    }

    return status;
  }

  /**
   * Drain and close all queues
   */
  public async shutdown(): Promise<void> {
    this.logger.info("Shutting down QueueManager...");

    // Close all queue event listeners
    for (const queueEvents of this.queueEvents.values()) {
      await queueEvents.close();
    }

    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    // Close Redis connection
    await this.connection.quit();

    this.logger.info("✅ QueueManager shut down successfully");
  }
}

export default QueueManager;
