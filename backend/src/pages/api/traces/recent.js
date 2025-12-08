// /api/traces/recent.js
// This is a stub. In a real system, you would query Jaeger/trace collector here.

export default async function handler(req, res) {
  // TODO: Query Jaeger or your trace backend for recent traces
  // For now, return a static example
  res.status(200).json({
    traces: [
      {
        traceID: "example-trace-id",
        serviceName: "backend",
        path: "/api/test",
        method: "GET",
        status: 200,
        duration: 1234,
        ts: Date.now(),
      },
    ],
  });
}
