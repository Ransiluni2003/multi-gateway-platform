// API route for fraud trend and refund ratio (real backend integration)
export async function GET(req) {
  // Call backend API endpoint (backend runs on port 5000)
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000/api/fraud/trend';
  try {
    const res = await fetch(backendUrl);
    if (!res.ok) throw new Error('Failed to fetch backend fraud trend');
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
