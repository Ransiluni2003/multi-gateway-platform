import { test, strictEqual, ok } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';

// Import the route
const routeModuleUrl = pathToFileURL(
  fileURLToPath(new URL('../app/api/files/download/route.js', import.meta.url))
).href;
const { GET } = await import(routeModuleUrl);

// Minimal polyfills
if (!global.ReadableStream) {
  // Create a web ReadableStream from a Node stream
  global.ReadableStream = await import('node:stream/web').then((m) => m.ReadableStream);
}

const encoder = new TextEncoder();

function jsonResponse(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function streamResponse(text, status = 200, headers = {}) {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain', ...headers } });
}

// Environment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
process.env.SUPABASE_BUCKET = 'platform-assets';

// Helper: craft Request with URL
function makeRequest(url) {
  return new Request(url, { method: 'GET' });
}

// Mock fetch sequence helper
function mockFetchSequence(handlers) {
  let call = 0;
  global.fetch = async (url, opts = {}) => {
    const i = Math.min(call, handlers.length - 1);
    const handler = handlers[i];
    call += 1;
    return handler(url, opts);
  };
}

// Test: first signed GET fails with InvalidJWT, route retries once then succeeds
await test('download proxy retries once on InvalidJWT then streams success', async () => {
  mockFetchSequence([
    // 1: sign
    async (url, opts) => {
      assert.match(String(url), /\/storage\/v1\/object\/sign\/platform-assets/);
      return jsonResponse([{ signedURL: '/object/sign/platform-assets/demo.txt?token=abc' }]);
    },
    // 2: first GET to signed URL fails with InvalidJWT
    async () => jsonResponse({ error: 'InvalidJWT', message: '"exp" claim timestamp check failed' }, 400),
    // 3: re-sign
    async () => jsonResponse([{ signedURL: '/object/sign/platform-assets/demo.txt?token=def' }]),
    // 4: second GET succeeds and streams file
    async () => streamResponse('ok', 200, { 'Content-Disposition': 'inline; filename="demo.txt"' }),
  ]);

  const req = makeRequest('http://localhost/api/files/download?key=demo.txt&expires=10');
  const res = await GET(req);
  strictEqual(res.status, 200);
  ok(res.headers.get('content-disposition')?.includes('demo.txt'));
});
