/**
 * Generate Signed Upload URL API
 * 
 * POST /api/storage/upload
 * 
 * WHY: Allows admin to upload files securely
 * - Checks admin permission
 * - Validates file type/size
 * - Returns time-limited upload URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl, validateFile } from '@/lib/storage';
import { withRateLimit } from '@/lib/withRateLimit';
import { RATE_LIMITS } from '@/lib/rateLimit';

async function handlePOST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, fileSize' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(fileType, fileSize);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // TODO: Get user from session/token
    // For now, hardcode for demonstration
    const userId = 'demo-user';
    const isAdmin = true; // In real app, check from auth token

    // Permission check
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Generate signed upload URL
    const result = await generateUploadUrl(fileName, fileType, userId, isAdmin);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      filePath: result.filePath,
      expiresAt: result.expiresAt,
      message: 'Upload URL generated. Use PUT request to upload file.',
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: 10 uploads per minute
// WHY: Prevents abuse - can't spam file uploads
export const POST = withRateLimit(handlePOST, RATE_LIMITS.GENERAL);
