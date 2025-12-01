const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

const exporter = new PrometheusExporter({ startServer: true }, () => {
  console.log('Prometheus scrape endpoint: http://localhost:9464/metrics');
});

const sdk = new NodeSDK({
  traceExporter: exporter,
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
