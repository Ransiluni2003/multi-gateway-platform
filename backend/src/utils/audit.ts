import { AuditLog } from "../models/AuditLog";

export interface AuditLogInput {
  action: string;
  status?: "success" | "failure";
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export async function logAuditEvent(entry: AuditLogInput): Promise<void> {
  try {
    await AuditLog.create(entry);
  } catch (err: any) {
    // Avoid breaking request flow on audit logging failures.
    // eslint-disable-next-line no-console
    console.error("Audit log write failed", err?.message || err);
  }
}
