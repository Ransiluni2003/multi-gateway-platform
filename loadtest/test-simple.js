import http from 'k6/http';
import { check } from 'k6';

export default function() {
  const payload = JSON.stringify({
    queueName: 'payments',
    jobName: 'process-payment',
    data: {
      orderId: 'test-' + Date.now(),
      amount: 500,
      gateway: 'stripe',
    },
  });

  console.log('Sending request to http://localhost:5000/queue/job');
  const res = http.post('http://localhost:5000/queue/job', payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('Response status:', res.status);
  console.log('Response body:', res.body);

  check(res, {
    'status is 201': (r) => r.status === 201,
  });
}
