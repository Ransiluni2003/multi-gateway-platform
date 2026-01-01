import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    // You can extend this to log to a database, file, or external service
    console.error('[DOWNLOAD ERROR]', body);
    // For now, just acknowledge receipt
    return NextResponse.json({ status: 'logged' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
