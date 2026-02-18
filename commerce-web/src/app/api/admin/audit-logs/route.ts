Z/**
 * Audit Logs API
 * 
 * GET /api/admin/audit-logs
 * 
 * WHY: Allows admins to view audit trail
 * - See who did what and when
 * - Investigate security incidents
 * - Compliance reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditStats } from '@/lib/auditLog';
import { withRateLimit } from '@/lib/withRateLimit';
import { RATE_LIMITS } from '@/lib/rateLimit';

async function handleGET(request: NextRequest) {
  try {
    // TODO: Check if user is admin (from auth token)
    const isAdmin = true; // Hardcoded for demo

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get('actorId') || undefined;
    const action = searchParams.get('action') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get logs and stats
    const [{ logs, total }, stats] = await Promise.all([
      getAuditLogs({ actorId, action: action as any, resource, limit, offset }),
      getAuditStats(),
    ]);

    // Parse metadata JSON strings
    const logsWithParsedMetadata = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return NextResponse.json({
      logs: logsWithParsedMetadata,
      total,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGET, RATE_LIMITS.GENERAL);
