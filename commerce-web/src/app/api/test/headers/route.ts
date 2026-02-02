/**
 * Test Headers API Endpoint
 * 
 * Purpose: Returns a simple response so client can inspect headers
 * This is needed because you can't read response headers from same-page fetch easily
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Headers test endpoint',
      timestamp: new Date().toISOString(),
      info: 'Check the Response Headers tab in DevTools Network panel',
    },
    { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store', // Don't cache this test endpoint
      },
    }
  );
}
