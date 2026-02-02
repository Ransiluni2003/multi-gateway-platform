/**
 * Generate Signed Download URL API
 * 
 * POST /api/storage/download
 * 
 * WHY: Allows users to download files securely
 * - Checks permission (admin or file owner)
 * - Returns time-limited download URL
 * - URL expires after 1 hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDownloadUrl } from '@/lib/storage';
import { withRateLimit } from '@/lib/withRateLimit';
import { RATE_LIMITS } from '@/lib/rateLimit';

async function handlePOST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing required field: filePath' },
        { status: 400 }
      );
    }

    // TODO: Get user from session/token
    // For now, hardcode for demonstration
    const userId = 'demo-user';
    const isAdmin = true; // In real app, check from auth token

    // Generate signed download URL
    const result = await generateDownloadUrl(filePath, userId, isAdmin);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt,
      message: 'Download URL generated. Valid for 1 hour.',
    });
  } catch (error) {
    console.error('Download URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
// WHY: Prevents abuse - can't spam download requests
export const POST = withRateLimit(handlePOST, RATE_LIMITS.GENERAL);
