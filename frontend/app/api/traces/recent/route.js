// /app/api/traces/recent/route.js
// This API route returns recent traces (or mock traces) for the Trace Viewer.

export async function GET(req) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const service = searchParams.get("service");
  const method = searchParams.get("method");
  const status = searchParams.get("status");

  // Adjust the Tempo API URL as needed
  const tempoUrl = "http://localhost:3100/api/traces?limit=50";

  const nowNs = Date.now() * 1_000_000;
  const mockTraces = [
    {
      traceID: "demo-trace-1",
      serviceName: "payments",
      path: "/api/payments/charge",
      method: "POST",
      status: 200,
      duration: 1850,
      ts: Date.now() - 5 * 60 * 1000,
      spans: [
        {
          spanID: "s1",
          operation: "HTTP POST /charge",
          service: "gateway",
          status: 200,
          startTimeNs: nowNs,
          durationNs: 900_000,
          startOffsetMs: 0,
          durationMs: 0.9,
        },
        {
          spanID: "s2",
          operation: "DB insert",
          service: "payments-db",
          status: 200,
          startTimeNs: nowNs + 200_000,
          durationNs: 400_000,
          startOffsetMs: 0.2,
          durationMs: 0.4,
        },
        {
          spanID: "s3",
          operation: "Call fraud service",
          service: "fraud",
          status: 200,
          startTimeNs: nowNs + 450_000,
          durationNs: 550_000,
          startOffsetMs: 0.45,
          durationMs: 0.55,
        },
      ],
    },
  ];

  const buildResponse = (traces) =>
    new Response(JSON.stringify({ traces }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const parseNumber = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber)) return asNumber;
      const parsedDate = Date.parse(value);
      if (!Number.isNaN(parsedDate)) return parsedDate * 1_000_000; // convert ms to ns
    }
    return 0;
  };

  const getTagValue = (tags = [], keys = []) =>
    tags.find((t) => keys.includes(t.key))?.value || "";

  try {
    const response = await fetch(tempoUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch traces from Tempo");
    }

    const data = await response.json();

    let traces = (data.data || []).map((trace) => {
      const spansRaw = trace.spans || [];

      const normalizedSpans = spansRaw.map((span) => {
        const startTimeNs = parseNumber(span.startTimeUnixNano ?? span.startTime);
        const durationNs = parseNumber(span.durationNano ?? span.duration);
        return {
          spanID: span.spanID || span.spanId || `${trace.traceID}-${Math.random().toString(16).slice(2)}`,
          operation: span.operationName || span.name || "span",
          service: span.process?.serviceName || "",
          status: span.status?.code || getTagValue(span.tags, ["http.status_code", "status.code", "otel.status_code"]),
          startTimeNs,
          durationNs,
          tags: span.tags || [],
        };
      });

      const startTimes = normalizedSpans
        .map((s) => s.startTimeNs)
        .filter((v) => typeof v === "number" && v > 0);
      const traceStartNs = startTimes.length ? Math.min(...startTimes) : 0;

      const spans = normalizedSpans.map((span) => {
        const startOffsetMs = traceStartNs ? (span.startTimeNs - traceStartNs) / 1_000_000 : 0;
        const durationMs = span.durationNs ? span.durationNs / 1_000_000 : 0;
        return {
          ...span,
          startOffsetMs,
          durationMs,
        };
      });

      const firstSpan = spansRaw[0] || {};
      const tags = firstSpan.tags || [];
      const serviceName = firstSpan.process?.serviceName || spans[0]?.service || "";

      return {
        traceID: trace.traceID,
        serviceName,
        path: getTagValue(tags, ["http.target", "http.route", "rpc.method"]) || "",
        method: getTagValue(tags, ["http.method"]) || "",
        status: getTagValue(tags, ["http.status_code", "status.code", "otel.status_code"]) || "",
        duration: trace.duration || "",
        ts: spans[0]?.startTimeNs ? spans[0].startTimeNs / 1_000_000 : Date.now(),
        spans,
      };
    });

    if (service) traces = traces.filter((t) => t.serviceName === service);
    if (method) traces = traces.filter((t) => t.method === method);
    if (status) traces = traces.filter((t) => String(t.status) === String(status));

    traces = traces.slice(0, 10);

    if (!traces.length) traces = mockTraces;

    console.log("[Traces API] Returning traces:", traces.length);
    return buildResponse(traces);
  } catch (err) {
    console.log("[Traces API] Error, returning mock:", err.message);
    // Fallback to mock data if Tempo is unreachable
    return buildResponse(mockTraces);
  }
}
