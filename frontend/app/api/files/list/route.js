import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'platform-assets';

    const useDemo = (process.env.USE_DEMO_URLS || 'false').toLowerCase() === 'true';
    if (useDemo) {
      return NextResponse.json({
        files: [
          { key: 'Form I-3A - week 13.pdf', name: 'Form I-3A - week 13.pdf', size: 125000 },
          { key: 'undefined.jpeg', name: 'undefined.jpeg', size: 45000 }
        ]
      });
    }

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const listUrl = `${supabaseUrl}/storage/v1/object/list/${bucket}`;
    const response = await fetch(listUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prefix: '',
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || 'Failed to list files';
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    const data = await response.json();
    const files = (data || [])
      .filter(item => item.name)
      .map(item => ({
        key: item.name,
        name: item.name,
        size: item.metadata?.size || 0,
        createdAt: item.created_at
      }));

    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to list files: ' + err.message },
      { status: 500 }
    );
  }
}
