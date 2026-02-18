import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';

/**
 * POST /api/test/audit-log
 * 
 * Test endpoint to manually create audit log entries for verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, actorEmail, resource, resourceId, status, errorMessage } = body;

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create audit log entry
    await createAuditLog({
      actorId: 'test-user-id',
      actorEmail: actorEmail || 'test@example.com',
      actorRole: 'user',
      action,
      resource,
      resourceId,
      ipAddress: ip,
      userAgent,
      status: status || 'success',
      errorMessage,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Audit log created for action: ${action}` 
    });
  } catch (error) {
    console.error('Error creating test audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log', details: (error as Error).message },
      { status: 500 }
    );
  }
}
