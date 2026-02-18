import mongoose from "mongoose";
import connectMongo from "../backend/src/config/db";
import { AuditLog } from "../backend/src/models/AuditLog";
import File from "../backend/src/models/File";
import { FileService } from "../backend/src/services/fileService";

interface JobResult {
  job: string;
  dryRun: boolean;
  deleted: number;
  archived: number;
  skipped: number;
}

function logJob(level: "info" | "warn" | "error", message: string, meta: Record<string, any> = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  console.log(JSON.stringify(entry));
}

function getArgValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

async function auditRetentionJob(dryRun: boolean): Promise<JobResult> {
  const retentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS || 90);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const toDelete = await AuditLog.countDocuments({ createdAt: { $lt: cutoff } });

  if (dryRun) {
    logJob("info", "Audit retention dry-run", { retentionDays, cutoff, candidateCount: toDelete });
    return { job: "audit-retention", dryRun, deleted: 0, archived: 0, skipped: toDelete };
  }

  const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
  const deleted = result.deletedCount || 0;

  logJob("info", "Audit retention completed", { retentionDays, cutoff, deleted });

  return { job: "audit-retention", dryRun, deleted, archived: 0, skipped: Math.max(0, toDelete - deleted) };
}

async function fileRetentionJob(dryRun: boolean): Promise<JobResult> {
  const now = new Date();
  const toDelete = await File.countDocuments({
    deleteScheduledAt: { $lte: now },
    deletedAt: null,
  });

  if (dryRun) {
    logJob("info", "File retention dry-run", { candidateCount: toDelete });
    return { job: "file-retention", dryRun, deleted: 0, archived: 0, skipped: toDelete };
  }

  const deleted = await FileService.processRetention();
  logJob("info", "File retention completed", { deleted });

  return { job: "file-retention", dryRun, deleted, archived: 0, skipped: Math.max(0, toDelete - deleted) };
}

async function main() {
  const jobArg = getArgValue("--job");
  const dryRun = process.argv.includes("--dry-run");
  const destructive = process.env.JOB_RUN_CONFIRM === "true";

  if (!dryRun && !destructive) {
    logJob("error", "Destructive mode blocked. Set JOB_RUN_CONFIRM=true to proceed.");
    process.exit(1);
  }

  await connectMongo();

  const results: JobResult[] = [];

  if (!jobArg || jobArg === "audit-retention") {
    results.push(await auditRetentionJob(dryRun));
  }

  if (!jobArg || jobArg === "file-retention") {
    results.push(await fileRetentionJob(dryRun));
  }

  logJob("info", "Retention jobs completed", { results });

  await mongoose.connection.close();
}

main().catch((error) => {
  logJob("error", "Job runner failed", { error: error.message, stack: error.stack });
  process.exit(1);
});
