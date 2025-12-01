const start = Date.now();

try {
  // Send email, push, or SMS
  await sendEmailNotification(userId, message);
} finally {
  const duration = Date.now() - start;
  await eventsCollection.insertOne({
    eventName: 'notification_sent',
    source: process.env.SERVICE_NAME || 'notifications',
    durationMs: duration,
    createdAt: new Date(),
  });
}
