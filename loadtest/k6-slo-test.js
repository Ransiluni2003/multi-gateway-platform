import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// CUSTOM METRICS
// ============================================================================

const errorRate = new Rate('errors');
const paymentDuration = new Trend('payment_duration');
const queueDuration = new Trend('queue_duration');
const successfulPayments = new Counter('successful_payments');
const failedPayments = new Counter('failed_payments');

// ============================================================================
// SLO THRESHOLDS - Pipeline fails if these are violated
// ============================================================================

export const options = {
  // Test scenarios
  scenarios: {
    // Ramp-up scenario: 0 → 100 users over 2 minutes
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 }, // Ramp to 100 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '1m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Spike test: sudden traffic increase
    spike_test: {
      executor: 'ramping-vus',
      startTime: '8m',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 }, // Sudden spike
        { duration: '1m', target: 200 },  // Hold spike
        { duration: '30s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '20s',
    },
  },

  // ============================================================================
  // SLO THRESHOLDS - THESE MUST PASS FOR CI/CD
  // ============================================================================
  thresholds: {
    // Overall HTTP request failure rate must be < 1%
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true }, // < 1% failures
    ],

    // 95th percentile response time must be < 800ms
    'http_req_duration': [
      { threshold: 'p(95)<800', abortOnFail: false }, // p95 < 800ms
      { threshold: 'p(99)<1500', abortOnFail: false }, // p99 < 1.5s
      { threshold: 'avg<400', abortOnFail: false }, // avg < 400ms
    ],

    // Payment endpoint specific SLOs
    'payment_duration': [
      { threshold: 'p(95)<1000', abortOnFail: false }, // Payment p95 < 1s
      { threshold: 'avg<500', abortOnFail: false }, // Payment avg < 500ms
    ],

    // Queue endpoint SLOs
    'queue_duration': [
      { threshold: 'p(95)<600', abortOnFail: false }, // Queue p95 < 600ms
      { threshold: 'avg<300', abortOnFail: false }, // Queue avg < 300ms
    ],

    // Error rate threshold
    'errors': [
      { threshold: 'rate<0.01', abortOnFail: true }, // < 1% error rate
    ],

    // Check success rate must be > 99%
    'checks': [
      { threshold: 'rate>0.99', abortOnFail: true }, // > 99% checks pass
    ],

    // HTTP request duration by percentile
    'http_req_duration{scenario:ramp_up}': ['p(95)<800'],
    'http_req_duration{scenario:spike_test}': ['p(95)<1200'], // More lenient for spikes
  },
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_KEY = __ENV.API_KEY || 'test-key-123';

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export default function () {
  const scenario = __VU % 3; // Distribute VUs across 3 scenarios

  switch (scenario) {
    case 0:
      testPaymentEndpoint();
      break;
    case 1:
      testQueueEndpoint();
      break;
    case 2:
      testHealthChecks();
      break;
  }

  sleep(1); // Think time between requests
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test payment endpoint with SLO tracking
 */
function testPaymentEndpoint() {
  const payload = JSON.stringify({
    amount: Math.floor(Math.random() * 10000) + 100,
    currency: 'USD',
    method: 'card',
    card: {
      number: '4242424242424242', // Test card
      exp_month: 12,
      exp_year: 2026,
      cvc: '123',
    },
    metadata: {
      test: 'k6-load-test',
      vu: __VU,
      iteration: __ITER,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { name: 'PaymentEndpoint' },
  };

  const startTime = new Date();
  const response = http.post(`${BASE_URL}/api/payments/pay`, payload, params);
  const duration = new Date() - startTime;

  // Track payment duration
  paymentDuration.add(duration);

  // Check response
  const success = check(response, {
    'payment: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'payment: has transaction_id': (r) => {
      try {
        return JSON.parse(r.body).transaction_id !== undefined;
      } catch (e) {
        return false;
      }
    },
    'payment: response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (success) {
    successfulPayments.add(1);
  } else {
    failedPayments.add(1);
    errorRate.add(1);
    console.error(`Payment failed: VU=${__VU}, Status=${response.status}`);
  }

  errorRate.add(!success);
}

/**
 * Test queue/job endpoint with SLO tracking
 */
function testQueueEndpoint() {
  const payload = JSON.stringify({
    jobType: 'process-payment',
    data: {
      amount: 1000,
      orderId: `order-${__VU}-${__ITER}`,
    },
    priority: Math.floor(Math.random() * 3) + 1,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { name: 'QueueEndpoint' },
  };

  const startTime = new Date();
  const response = http.post(`${BASE_URL}/api/jobs/enqueue`, payload, params);
  const duration = new Date() - startTime;

  // Track queue duration
  queueDuration.add(duration);

  // Check response
  const success = check(response, {
    'queue: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'queue: has job_id': (r) => {
      try {
        return JSON.parse(r.body).job_id !== undefined;
      } catch (e) {
        return false;
      }
    },
    'queue: response time < 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
}

/**
 * Test health check endpoints
 */
function testHealthChecks() {
  const params = {
    tags: { name: 'HealthCheck' },
  };

  // API Health
  const apiHealth = http.get(`${BASE_URL}/api/health`, params);
  check(apiHealth, {
    'health: api status is 200': (r) => r.status === 200,
    'health: api response < 200ms': (r) => r.timings.duration < 200,
  });

  // Jobs Health
  const jobsHealth = http.get(`${BASE_URL}/api/jobs/health`, params);
  check(jobsHealth, {
    'health: jobs status is 200': (r) => r.status === 200,
    'health: jobs response < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(apiHealth.status !== 200 || jobsHealth.status !== 200);
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

export function setup() {
  console.log('🚀 Starting k6 load test with SLO thresholds');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('📊 SLO Requirements:');
  console.log('   - HTTP failure rate < 1%');
  console.log('   - p95 response time < 800ms');
  console.log('   - p99 response time < 1.5s');
  console.log('   - Check success rate > 99%');
  console.log('');

  // Verify API is up before starting
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`❌ API health check failed: ${healthCheck.status}`);
  }

  console.log('✅ API is healthy, starting load test...\n');
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('\n📊 Load Test Complete');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('\n✅ Check k6 output above for SLO compliance');
}

// ============================================================================
// SUMMARY HANDLER
// ============================================================================

export function handleSummary(data) {
  const passed = data.metrics.http_req_failed.values.rate < 0.01 &&
                 data.metrics.http_req_duration.values['p(95)'] < 800;

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'loadtest/k6-summary.json': JSON.stringify(data, null, 2),
    'loadtest/k6-slo-result.txt': passed ? 'PASS' : 'FAIL',
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors;

  let summary = `\n${indent}📊 K6 Load Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  // Overall metrics
  const metrics = data.metrics;
  summary += `${indent}🎯 SLO Compliance:\n`;
  
  const httpFailRate = metrics.http_req_failed.values.rate;
  const p95Duration = metrics.http_req_duration.values['p(95)'];
  const checkRate = metrics.checks.values.rate;

  const failRatePass = httpFailRate < 0.01;
  const p95Pass = p95Duration < 800;
  const checkPass = checkRate > 0.99;

  summary += `${indent}  HTTP Failure Rate: ${(httpFailRate * 100).toFixed(2)}% ${failRatePass ? '✅' : '❌'} (SLO: <1%)\n`;
  summary += `${indent}  p95 Response Time: ${p95Duration.toFixed(0)}ms ${p95Pass ? '✅' : '❌'} (SLO: <800ms)\n`;
  summary += `${indent}  Check Success Rate: ${(checkRate * 100).toFixed(2)}% ${checkPass ? '✅' : '❌'} (SLO: >99%)\n`;

  summary += `\n${indent}📈 Performance Metrics:\n`;
  summary += `${indent}  Total Requests: ${metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Requests/sec: ${metrics.http_reqs.values.rate.toFixed(2)}\n`;
  summary += `${indent}  Avg Response: ${metrics.http_req_duration.values.avg.toFixed(0)}ms\n`;
  summary += `${indent}  p99 Response: ${metrics.http_req_duration.values['p(99)'].toFixed(0)}ms\n`;

  if (metrics.successful_payments) {
    summary += `\n${indent}💳 Payment Metrics:\n`;
    summary += `${indent}  Successful: ${metrics.successful_payments.values.count}\n`;
    summary += `${indent}  Failed: ${metrics.failed_payments.values.count}\n`;
  }

  const overallPass = failRatePass && p95Pass && checkPass;
  summary += `\n${indent}${'='.repeat(50)}\n`;
  summary += `${indent}${overallPass ? '✅ SLO PASS' : '❌ SLO FAIL'}\n`;
  summary += `${indent}${'='.repeat(50)}\n`;

  return summary;
}
