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

  const useDemo = (process.env.USE_DEMO_URLS || 'false').toLowerCase() === 'true';
  if (useDemo) {
    const demoKeys = {
    //   'Form I-3A - week 13.pdf': 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    //   'undefined.jpeg': 'https://picsum.photos/600/400?random=1',
    //   'nonexistent-file-12345.pdf': 'http://localhost:3000/__missing__/nonexistent-file-12345.pdf'
    'Form I-3A - week 13.pdf': 'https://hswssbxsvwevddkiwwek.supabase.co/storage/v1/object/public/platform-assets/Form%20I-3A%20-%20week%2013.pdf',
    'undefined.jpeg' :'https://hswssbxsvwevddkiwwek.supabase.co/storage/v1/object/public/platform-assets/undefined.jpeg'
    };
    if (demoKeys[key]) {
      return NextResponse.json({
        downloadUrl: demoKeys[key],
        expiresAt: Date.now() + expiresSec * 1000
      });
    }
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'platform-assets';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Log the file key for debugging
    console.log('Supabase file key:', key);

    // Call Supabase Storage API directly to create signed URL
    // Use the object/sign API endpoint with the file path in the request body instead
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/${bucket}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expiresIn: expiresSec,
          paths: [key]  // Fixed: Supabase expects 'paths' array, not 'path' string
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to generate signed URL or file not found.' },
        { status: 400 }
      );
    }

    const data = await response.json();
    const signedURL = data.signedURL || data.signedUrls?.[0];

    if (!signedURL) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 400 }
      );
    }

    // Construct full URL
    const fullUrl = signedURL.startsWith('http') ? signedURL : `${supabaseUrl}${signedURL}`;

    return NextResponse.json({
      downloadUrl: fullUrl,
      expiresAt: Date.now() + expiresSec * 1000
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate signed URL: ' + err.message },
      { status: 500 }
    );
  }
}
