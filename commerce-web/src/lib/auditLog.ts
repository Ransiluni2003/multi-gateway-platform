/**
 * Audit Logging Utility
 * 
 * WHY: Track all sensitive actions for security & compliance
 * 
 * Use Cases:
 * - Security: Track login attempts, permission changes
 * - Compliance: Required for SOC 2, GDPR, HIPAA
 * - Debugging: See what happened before error occurred
 * - Forensics: Investigate security incidents
 * 
 * What to Log:
 * - WHO: User ID, email, role
 * - WHAT: Action type (LOGIN, CREATE, UPDATE, DELETE)
 * - WHEN: Timestamp
 * - WHERE: IP address, user agent
 * - RESULT: Success or failure
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET: 'PASSWORD_RESET',
  
  // Product Management
  CREATE_PRODUCT: 'CREATE_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  // Order Management
  CREATE_ORDER: 'CREATE_ORDER',
  REFUND_ORDER: 'REFUND_ORDER',
  CANCEL_ORDER: 'CANCEL_ORDER',
  
  // Coupon Management
  CREATE_COUPON: 'CREATE_COUPON',
  UPDATE_COUPON: 'UPDATE_COUPON',
  DELETE_COUPON: 'DELETE_COUPON',
  VALIDATE_COUPON: 'VALIDATE_COUPON',
  
  // File Management
  ISSUE_SIGNED_URL: 'ISSUE_SIGNED_URL',
  UPLOAD_FILE: 'UPLOAD_FILE',
  DELETE_FILE: 'DELETE_FILE',
  
  // Security
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

/**
 * Audit log entry data
 */
export interface AuditLogData {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
}

/**
 * Create audit log entry
 * 
 * @param data - Audit log data
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: data.actorId || null,
        actorEmail: data.actorEmail || null,
        actorRole: data.actorRole || null,
        action: data.action,
        resource: data.resource || null,
        resourceId: data.resourceId || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        status: data.status || 'success',
        errorMessage: data.errorMessage || null,
      },
    });
  } catch (error) {
    // Don't throw - logging failure shouldn't break app
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters?: {
  actorId?: string;
  action?: AuditAction;
  resource?: string;
  limit?: number;
  offset?: number;
}) {
  const { actorId, action, resource, limit = 20, offset = 0 } = filters || {};

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(actorId && { actorId }),
        ...(action && { action }),
        ...(resource && { resource }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.auditLog.count({
      where: {
        ...(actorId && { actorId }),
        ...(action && { action }),
        ...(resource && { resource }),
      },
    });

    return { logs, total };
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats() {
  try {
    const [totalLogs, failedActions, uniqueActors] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { status: 'failure' } }),
      prisma.auditLog.findMany({
        select: { actorId: true },
        distinct: ['actorId'],
        where: { actorId: { not: null } },
      }),
    ]);

    return {
      totalLogs,
      failedActions,
      uniqueActors: uniqueActors.length,
    };
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    return { totalLogs: 0, failedActions: 0, uniqueActors: 0 };
  }
}

/**
 * Helper: Get IP from request
 */
export function getIpFromRequest(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Helper: Get user agent from request
 */
export function getUserAgentFromRequest(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
