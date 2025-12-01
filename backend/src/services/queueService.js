import amqp from 'amqplib';

export async function setupQueues() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Retry exchange and queue
  await channel.assertExchange("payments_retry", "direct", { durable: true });
  await channel.assertQueue("payments_retry_queue", {
    arguments: {
      "x-message-ttl": 5000,                 // wait 5 sec before retry
      "x-dead-letter-exchange": "payments",  // send back to main exchange
    }
  });
  await channel.bindQueue("payments_retry_queue", "payments_retry", "");

  // DLQ exchange and queue
  await channel.assertExchange("payments_dlq", "fanout", { durable: true });
  await channel.assertQueue("payments_dlq_queue");
  await channel.bindQueue("payments_dlq_queue", "payments_dlq", "");

  return channel;
}
