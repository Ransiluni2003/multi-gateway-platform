// /app/api/traces/recent/route.js
// This API route returns recent traces (or mock traces) for the Trace Viewer.

export async function GET(req) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const service = searchParams.get("service");
  const method = searchParams.get("method");
  const status = searchParams.get("status");

  // Adjust the backend API URL as needed
  let backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  let url = `${backendUrl}/api/traces/recent?limit=50`;
  if (service) url += `&service=${encodeURIComponent(service)}`;
  if (method) url += `&method=${encodeURIComponent(method)}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch traces from backend.' }), { status: 500 });
    }
    const data = await res.json();
    // If backend returns {traces: [...]}, pass through; else wrap in {traces: data}
    const traces = data.traces || data;
    return new Response(JSON.stringify({ traces }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error connecting to backend.', details: err.message }), { status: 500 });
  }
}
