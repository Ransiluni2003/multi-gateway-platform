import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const paymentRequests = new Counter('payment_requests');
const notificationRequests = new Counter('notification_requests');
const webhookRequests = new Counter('webhook_requests');
const queueMetricsRequests = new Counter('queue_metrics_requests');

const paymentLatency = new Trend('payment_latency');
const notificationLatency = new Trend('notification_latency');
const webhookLatency = new Trend('webhook_latency');
const metricsLatency = new Trend('metrics_latency');

const paymentFailureRate = new Rate('payment_failure_rate');
const notificationFailureRate = new Rate('notification_failure_rate');
const webhookFailureRate = new Rate('webhook_failure_rate');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const DURATION = __ENV.DURATION || '5m';
const VUS = parseInt(__ENV.VUS || '100');
const RAMP_UP = parseInt(__ENV.RAMP_UP || '30');

export const options = {
  stages: [
    { duration: `${RAMP_UP}s`, target: Math.floor(VUS * 0.25) },
    { duration: `${RAMP_UP}s`, target: Math.floor(VUS * 0.5) },
    { duration: `${RAMP_UP}s`, target: Math.floor(VUS * 0.75) },
    { duration: `${RAMP_UP}s`, target: VUS },
    { duration: DURATION, target: VUS },
    { duration: `${RAMP_UP}s`, target: 0 },
  ],
  thresholds: {
    payment_latency: ['p(95)<500', 'p(99)<1000'],
    notification_latency: ['p(95)<300', 'p(99)<500'],
    webhook_latency: ['p(95)<1000', 'p(99)<2000'],
    metrics_latency: ['p(95)<200'],
    payment_failure_rate: ['rate<0.05'],
    notification_failure_rate: ['rate<0.1'],
    webhook_failure_rate: ['rate<0.05'],
  },
};

export default function loadTest() {
  // Test payment queue
  group('Payment Queue', () => {
    const orderId = `order-${Date.now()}-${Math.random()}`;
    const payload = JSON.stringify({
      queueName: 'payments',
      jobName: 'process-payment',
      data: {
        orderId,
        amount: Math.floor(Math.random() * 1000) + 100,
        gateway: ['stripe', 'paypal', 'square'][Math.floor(Math.random() * 3)],
      },
    });

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/queue/job`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const latency = Date.now() - startTime;

    check(res, {
      'payment enqueue status is 201': (r) => r.status === 201,
      'payment response has jobId': (r) => r.json('data.jobId') !== null,
    }) || paymentFailureRate.add(1);

    paymentRequests.add(1);
    paymentLatency.add(latency);

    sleep(1);
  });

  // Test notification queue
  group('Notification Queue', () => {
    const recipient = `user${Math.floor(Math.random() * 10000)}@example.com`;
    const payload = JSON.stringify({
      queueName: 'notifications',
      jobName: 'send-notification',
      data: {
        type: ['email', 'sms', 'push'][Math.floor(Math.random() * 3)],
        recipient,
        message: `This is a test notification at ${new Date().toISOString()}`,
      },
    });

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/queue/job`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const latency = Date.now() - startTime;

    check(res, {
      'notification enqueue status is 201': (r) => r.status === 201,
      'notification response has jobId': (r) => r.json('data.jobId') !== null,
    }) || notificationFailureRate.add(1);

    notificationRequests.add(1);
    notificationLatency.add(latency);

    sleep(0.5);
  });

  // Test webhook queue
  group('Webhook Queue', () => {
    const payload = JSON.stringify({
      queueName: 'webhooks',
      jobName: 'deliver-webhook',
      data: {
        url: 'https://webhook.example.com/events',
        payload: {
          event: 'test.load',
          timestamp: new Date().toISOString(),
          data: {
            testId: Math.random(),
          },
        },
      },
    });

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/queue/job`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const latency = Date.now() - startTime;

    check(res, {
      'webhook enqueue status is 201': (r) => r.status === 201,
      'webhook response has jobId': (r) => r.json('data.jobId') !== null,
    }) || webhookFailureRate.add(1);

    webhookRequests.add(1);
    webhookLatency.add(latency);

    sleep(1);
  });

  // Periodically check metrics
  if (Math.random() < 0.2) {
    group('Queue Metrics', () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/queue/metrics`);
      const latency = Date.now() - startTime;

      check(res, {
        'metrics status is 200': (r) => r.status === 200,
        'metrics has data': (r) => r.json('data') !== null,
      });

      metricsLatency.add(latency);
      queueMetricsRequests.add(1);
    });
  }
}
