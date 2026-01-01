import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function createSignedUrl(key, expiresEffective) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'platform-assets';
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase configuration missing');

  // Normalize key: remove any leading slash so path is bucket-relative
  const normalizedKey = key?.replace(/^\/+/, '') || '';

  // Prefer single-object sign endpoint to avoid response shape differences
  const signEndpoint = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${encodeURIComponent(normalizedKey)}`;
  const resp = await fetch(signEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: expiresEffective })
  });
  const txt = await resp.text();
  if (!resp.ok) {
    let err = {};
    try { err = JSON.parse(txt); } catch {}
    throw new Error(err.message || 'Failed to generate signed URL');
  }
  const d = JSON.parse(txt);
  const payload = Array.isArray(d) ? d[0] : d;
  const signedURLLocal = payload?.signedURL || payload?.signedUrl || d?.signedURL || d?.signedUrl;
  if (!signedURLLocal) throw new Error('Failed to generate signed URL');
  if (signedURLLocal.startsWith('http')) return signedURLLocal;
  if (signedURLLocal.startsWith('/storage/v1')) return `${supabaseUrl}${signedURLLocal}`;
  if (signedURLLocal.startsWith('/object/sign')) return `${supabaseUrl}/storage/v1${signedURLLocal}`;
  return `${supabaseUrl}/storage/v1${signedURLLocal.startsWith('/') ? '' : '/'}${signedURLLocal}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = (searchParams.get('key') || '').replace(/^\/+/, '');
    const expires = Number(searchParams.get('expires') || '60');
    if (!key) return NextResponse.json({ error: 'Missing file key' }, { status: 400 });

    const MIN_EXP = 60; // safer minimum to avoid borderline expiry
    const MAX_EXP = 604800;
    const expiresEffective = Math.min(Math.max(expires || 10, MIN_EXP), MAX_EXP);

    // First signed URL
    let signedUrl = await createSignedUrl(key, expiresEffective);

    // Attempt to fetch the file via server to avoid CORS and to detect expiry precisely
    const attempt = async (url) => {
      const resp = await fetch(url, { method: 'GET' });
      return resp;
    };

    let resp = await attempt(signedUrl);

    // If unauthorized/expired, regenerate once and retry
    if (!resp.ok && (resp.status === 400 || resp.status === 401 || resp.status === 403)) {
      const text = await resp.text().catch(() => '');
      if (text.includes('InvalidJWT') || text.includes('Signature') || text.includes('expired')) {
        signedUrl = await createSignedUrl(key, expiresEffective);
        resp = await attempt(signedUrl);
      }
    }

    if (!resp.ok && resp.status === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      try { console.warn('[DOWNLOAD PROXY] Upstream error', resp.status, body?.slice?.(0, 200)); } catch {}
      return NextResponse.json({ error: 'Download failed', detail: body, status: resp.status }, { status: 502 });
    }

    // Stream the file back to the client, preserve headers
    const headers = new Headers();
    for (const [k, v] of resp.headers.entries()) {
      if (['content-type', 'content-length', 'content-disposition', 'accept-ranges', 'etag', 'last-modified'].includes(k.toLowerCase())) {
        headers.set(k, v);
      }
    }
    // Force download filename if not set
    if (!headers.has('content-disposition')) {
      const fname = key.split('/').pop() || 'download';
      headers.set('Content-Disposition', `inline; filename="${fname}"`);
    }

    return new Response(resp.body, { status: resp.status, headers });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
