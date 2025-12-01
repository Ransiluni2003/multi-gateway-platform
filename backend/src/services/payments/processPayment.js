teimport { eventsCollection } from "../../db"; // your MongoDB connection

export async function processPayment(paymentData) {
  const start = Date.now();

  try {
    // --- Main logic ---
    // e.g., charge card, update user balance, etc.
    const result = await chargeCard(paymentData);

    return result;
  } finally {
    const duration = Date.now() - start;

    await eventsCollection.insertOne({
      eventName: 'payment_processed',
      source: process.env.SERVICE_NAME || 'payments',
      durationMs: duration,
      createdAt: new Date(),
    });
  }
}
