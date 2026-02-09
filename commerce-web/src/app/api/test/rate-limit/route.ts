/**
 * Rate Limiting Test API Endpoint
 * 
 * Simple endpoint specifically for demonstrating rate limiting
 * No database required - perfect for testing and demos
 * 
 * Rate Limit: 10 requests per minute
 */

import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/withRateLimit';
import { RATE_LIMITS } from '@/lib/rateLimit';

async function handlePOST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return NextResponse.json({
      success: true,
      message: 'Request successful',
      timestamp: new Date().toISOString(),
      data: body,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: 10 requests per minute
// This is the same limit used for validation endpoints
export const POST = withRateLimit(handlePOST, RATE_LIMITS.VALIDATION);
