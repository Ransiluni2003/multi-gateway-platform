import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const expires = searchParams.get('expires');

  if (!key) {
    return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
  }

  // Use 300 seconds as default expiration if not provided
  const expiresSec = expires ? Number(expires) : 300;
  console.log('[DEBUG] Requested signed URL for', key, 'with expiry (seconds):', expiresSec);

  // Demo/public URL logic removed. Only signed URLs for private bucket are used.

  try {
  // Print all relevant environment variables for debugging
  console.log('[DEBUG] ENV NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('[DEBUG] ENV SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[DEBUG] ENV SUPABASE_BUCKET:', process.env.SUPABASE_BUCKET);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'platform-assets';
    const expiresNumeric = Number.isFinite(expiresSec) ? expiresSec : 300;
    // Supabase has a practical minimum - testing with 60 seconds
    const MIN_EXPIRY = 60; // seconds (Supabase minimum for reliable expiry)
    const MAX_EXPIRY = 604800; // 7 days in seconds (Supabase upper bound)
    const expiresEffective = Math.min(Math.max(expiresNumeric, MIN_EXPIRY), MAX_EXPIRY);

    // Debug logs for troubleshooting
    console.log('[DEBUG] Supabase URL:', supabaseUrl);
    console.log('[DEBUG] Service Key exists:', !!serviceKey);
    console.log('[DEBUG] Bucket:', bucket);
    console.log('[DEBUG] File key:', key);

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Helper: create signed URL once
    console.log('[DEBUG] Using expiresIn (seconds):', expiresEffective);
    console.log('[DEBUG] Current server time:', new Date().toISOString());
    const createSignedFullUrl = async () => {
      const normalizedKey = (key || '').replace(/^\/+/, '');
      
      // Add timestamp to force fresh URL generation
      const timestamp = Date.now();
      console.log('[DEBUG] Request timestamp:', timestamp);
      
      const resp = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/${bucket}/${encodeURIComponent(normalizedKey)}?t=${timestamp}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ 
            expiresIn: expiresEffective
          })
        }
      );
      const txt = await resp.text();
      console.log('[DEBUG] Supabase raw response:', txt);
      if (!resp.ok) {
        let err = {};
        try { err = JSON.parse(txt); } catch {}
        throw new Error(err.message || 'Failed to generate signed URL');
      }
      const d = JSON.parse(txt);
      const payload = Array.isArray(d) ? d[0] : d;
      const signedURLLocal = payload?.signedURL || payload?.signedUrl || d?.signedURL || d?.signedUrl;
      if (!signedURLLocal) throw new Error('Failed to generate signed URL');
      let url;
      if (signedURLLocal.startsWith('http')) {
        url = signedURLLocal;
      } else if (signedURLLocal.startsWith('/storage/v1')) {
        url = `${supabaseUrl}${signedURLLocal}`;
      } else if (signedURLLocal.startsWith('/object/sign')) {
        url = `${supabaseUrl}/storage/v1${signedURLLocal}`;
      } else {
        url = `${supabaseUrl}/storage/v1${signedURLLocal.startsWith('/') ? '' : '/'}${signedURLLocal}`;
      }
      console.log('[DEBUG] Original signed URL:', signedURLLocal);
      console.log('[DEBUG] Built full URL:', url);
      return url;
    };

    // Generate signed URL directly - skip preflight validation to avoid token expiry
    // The browser will validate the token when it opens the URL
    const fullUrl = await createSignedFullUrl();
    const expiresAtTime = Date.now() + expiresEffective * 1000;
    console.log('[DEBUG] Returning full URL (no preflight):', fullUrl);
    console.log('[DEBUG] ExpiresEffective (seconds):', expiresEffective);
    console.log('[DEBUG] ExpiresAt timestamp:', expiresAtTime);
    console.log('[DEBUG] ExpiresAt in seconds from now:', (expiresAtTime - Date.now()) / 1000);

    return NextResponse.json({
      downloadUrl: fullUrl,
      expiresAt: expiresAtTime
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate signed URL: ' + err.message },
      { status: 500 }
    );
  }
}
