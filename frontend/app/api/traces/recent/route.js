// /app/api/traces/recent/route.js
// This is a mock API route for Next.js frontend to return example traces.

export async function GET(req) {
  return new Response(
    JSON.stringify({
      traces: [
        {
          traceID: "example-trace-id",
          serviceName: "frontend-mock",
          path: "/api/test",
          method: "GET",
          status: 200,
          duration: 1234,
          ts: Date.now(),
        },
      ],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
