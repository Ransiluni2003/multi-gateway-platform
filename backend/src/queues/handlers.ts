import { Logger } from "winston";
import QueueManager from "./queueManager";
import axios from "axios";

export class PaymentQueueHandler {
  private queueManager: QueueManager;
  private logger: Logger;

  constructor(queueManager: QueueManager, logger: Logger) {
    this.queueManager = queueManager;
    this.logger = logger;

    // Register payment queue
    this.queueManager.registerQueue(
      {
        name: "payments",
        concurrency: 5,
        maxAttempts: 3,
        backoffDelay: 5000,
      },
      this.handlePaymentJob.bind(this)
    );
  }

  /**
   * Processor for payment jobs
   */
  private async handlePaymentJob(job: any): Promise<void> {
    this.logger.info(`Processing payment job: ${job.id}`, job.data);

    const { orderId, amount, gateway } = job.data;

    try {
      // Simulate payment processing
      const response = await axios.post(
        `${process.env.PAYMENT_GATEWAY_URL}/process`,
        {
          orderId,
          amount,
          gateway,
        },
        { timeout: parseInt(process.env.PAYMENT_TIMEOUT || "10000") }
      );

      if (response.status === 200) {
        this.logger.info(`✅ Payment processed: ${orderId}`);
        return;
      }

      throw new Error(`Payment failed with status ${response.status}`);
    } catch (err: any) {
      this.logger.error(`❌ Payment job failed: ${job.id}`, err.message);
      throw err;
    }
  }

  /**
   * Enqueue a payment job
   */
  public async queuePayment(
    orderId: string,
    amount: number,
    gateway: string
  ): Promise<any> {
    return this.queueManager.addJob("payments", "process-payment", {
      orderId,
      amount,
      gateway,
      timestamp: Date.now(),
    });
  }
}

export class NotificationQueueHandler {
  private queueManager: QueueManager;
  private logger: Logger;

  constructor(queueManager: QueueManager, logger: Logger) {
    this.queueManager = queueManager;
    this.logger = logger;

    // Register notification queue
    this.queueManager.registerQueue(
      {
        name: "notifications",
        concurrency: 10,
        maxAttempts: 2,
        backoffDelay: 3000,
      },
      this.handleNotificationJob.bind(this)
    );
  }

  /**
   * Processor for notification jobs
   */
  private async handleNotificationJob(job: any): Promise<void> {
    this.logger.debug(`Processing notification job: ${job.id}`, job.data);

    const { type, recipient, message } = job.data;

    try {
      // Simulate sending notification
      switch (type) {
        case "email":
          await this.sendEmail(recipient, message);
          break;
        case "sms":
          await this.sendSMS(recipient, message);
          break;
        case "push":
          await this.sendPushNotification(recipient, message);
          break;
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      this.logger.info(`✅ Notification sent: ${type} to ${recipient}`);
    } catch (err: any) {
      this.logger.error(`❌ Notification job failed: ${job.id}`, err.message);
      throw err;
    }
  }

  private async sendEmail(recipient: string, message: string): Promise<void> {
    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async sendSMS(recipient: string, message: string): Promise<void> {
    // Simulate SMS sending
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  private async sendPushNotification(
    recipient: string,
    message: string
  ): Promise<void> {
    // Simulate push notification
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  /**
   * Enqueue a notification job
   */
  public async queueNotification(
    type: string,
    recipient: string,
    message: string,
    priority?: number
  ): Promise<any> {
    return this.queueManager.addJob(
      "notifications",
      "send-notification",
      {
        type,
        recipient,
        message,
        timestamp: Date.now(),
      },
      { priority }
    );
  }
}

export class WebhookQueueHandler {
  private queueManager: QueueManager;
  private logger: Logger;

  constructor(queueManager: QueueManager, logger: Logger) {
    this.queueManager = queueManager;
    this.logger = logger;

    // Register webhook queue
    this.queueManager.registerQueue(
      {
        name: "webhooks",
        concurrency: 8,
        maxAttempts: 5,
        backoffDelay: 10000,
      },
      this.handleWebhookJob.bind(this)
    );
  }

  /**
   * Processor for webhook jobs
   */
  private async handleWebhookJob(job: any): Promise<void> {
    this.logger.debug(`Processing webhook job: ${job.id}`, job.data);

    const { url, payload, headers } = job.data;

    try {
      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        timeout: 30000,
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.info(`✅ Webhook delivered: ${url}`);
        return;
      }

      throw new Error(`Webhook failed with status ${response.status}`);
    } catch (err: any) {
      this.logger.error(`❌ Webhook job failed: ${job.id}`, err.message);
      throw err;
    }
  }

  /**
   * Enqueue a webhook job
   */
  public async queueWebhook(
    url: string,
    payload: any,
    headers?: Record<string, string>
  ): Promise<any> {
    return this.queueManager.addJob("webhooks", "deliver-webhook", {
      url,
      payload,
      headers: headers || {},
      timestamp: Date.now(),
    });
  }
}
