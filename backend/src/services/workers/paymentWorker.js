import { setupQueues } from './queueService.js';
import logger from '../../utils/logger';
import { writeToPaymentsDLQ } from '../../utils/dlq';

async function startWorker() {
  const channel = await setupQueues();

  await channel.assertQueue("payments", { durable: true });
  channel.consume("payments", async (msg) => {
    const order = JSON.parse(msg.content.toString());
    try {
      logger.info("Processing payment order", { orderId: order.id });
      await callPaymentService(order); // Your payment API call
      channel.ack(msg);                // Success → acknowledge message
      logger.info("Payment processed", { orderId: order.id });
    } catch (err) {
      const retryCount = (msg.properties.headers && msg.properties.headers['x-retry']) || 0;
      const errMsg = (err && err.message) ? err.message : String(err);
      logger.warn("Payment processing failed", { orderId: order.id, retryCount, error: errMsg });
      if (retryCount < 3) {  // max 3 retries
        channel.publish(
          "payments_retry",
          "",
          Buffer.from(JSON.stringify(order)),
          { headers: { 'x-retry': retryCount + 1 } }
        );
        logger.info("Requeued payment for retry", { orderId: order.id, nextRetry: retryCount + 1 });
      } else {
        // send to DLQ exchange + also write to file for offline inspection
        channel.publish(
          "payments_dlq",
          "",
          Buffer.from(JSON.stringify(order))
        );
        await writeToPaymentsDLQ({ order, error: errMsg });
        logger.error("Moved payment to DLQ", { orderId: order.id, error: errMsg });
      }
      channel.ack(msg); // remove the original message from main queue
    }
  });
}

startWorker();
