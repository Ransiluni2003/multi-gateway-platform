
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

// Prometheus metrics exporter
const prometheusExporter = new PrometheusExporter({ startServer: true }, () => {
  console.log('Prometheus scrape endpoint: http://localhost:9464/metrics');
});

// Jaeger trace exporter
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  // You can add username/password if needed for auth
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  metricExporter: prometheusExporter,
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
