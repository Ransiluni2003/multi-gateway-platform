# 🎓 Learning Guide: Audit Log Retention & Automated Cleanup

**Building Compliance-Ready Audit Systems**  
**Date:** February 13, 2026

---

## 📚 What This Teaches

Learn production-grade audit log management:
1. **Why** audit retention matters (compliance + cost)
2. **Legal requirements**: GDPR, SOC2, PCI-DSS, HIPAA
3. **Automated cleanup strategies**: Cron, scheduled jobs, TTL indexes
4. **Archival patterns**: Cold storage, data lakes

---

## Part 1: The Audit Log Growth Problem

### Real-World Scenario

**Month 1:**
```
Users: 100
Actions/day: 1,000
Audit logs: 30,000 records (3 MB)
MongoDB size: 10 MB
Cost:$ 0/month (free tier)
```

**Month 12:**
```
Users: 10,000
Actions/day: 500,000
Audit logs: 180,000,000 records (18 GB)
MongoDB size: 50 GB
Cost: $200/month
Query performance: 5,000ms (used to be 50ms!)
```

**Month 24:**
```
Audit logs: 360,000,000 records (360 GB)
Cost: $1,500/month MongoDB + $300/month backups
Performance: Database running out of RAM
Indexes consuming 50 GB
Queries timing out
```

**The problem:** Audit logs grow FOREVER but are rarely accessed after 90 days!

---

## Part 2: Legal & Compliance Requirements

### Retention Periods by Regulation

| Regulation | Minimum Retention | Maximum Retention | What to Log |
|------------|-------------------|-------------------|-------------|
| **GDPR** (EU) | 30 days | As needed for business purpose | User data access, modification, deletion |
| **SOC 2** | 90 days | 1 year+ | Authentication, authorization, system changes |
| **PCI-DSS** | 90 days | 1 year | Payment transactions, card data access |
| **HIPAA** | 6 years | 6 years | PHI access, modifications, disclosures |
| **SOX** (Finance) | 7 years | Indefinite | Financial data changes, access logs |
| **CCPA** (California) | 12 months | 12 months | User data sales, deletion requests |

### Common Compliance Scenarios

#### Scenario 1: SaaS Product (No Regulated Data)
```
Retention: 90 days hot storage + 1 year cold storage
Reason: SOC 2 compliance for enterprise customers
```

#### Scenario 2: Healthcare Platform
```
Retention: 6 years (HIPAA requirement)
Storage: 90 days MongoDB + 5+ years S3 Glacier
```

#### Scenario 3: Payment Platform
```
Retention: 1 year hot (PCI-DSS) + 7 years cold (SOX for finance)
```

#### Scenario 4: EU B2C App
```
Retention: 90 days unless user requests deletion (GDPR)
Note: Must delete user's audit logs on account deletion
```

---

## Part 3: Retention Strategies

### Strategy 1: Automated Deletion (Simple)

**Pattern:** Delete logs older than X days

```typescript
// backend/src/jobs/cleanupAuditLogs.ts

import { AuditLog } from '../models/AuditLog';

export async function cleanupOldAuditLogs(retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  console.log(`Deleting audit logs older than ${cutoffDate.toISOString()}`);
  
  const result = await AuditLog.deleteMany({
    createdAt: { $lt: cutoffDate },
  });
  
  console.log(`Deleted ${result.deletedCount} audit logs`);
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate,
  };
}
```

**Pros ✅:**
- Simple implementation
- Database stays small
- Fast queries

**Cons ❌:**
- Permanent data loss (no recovery)
- May violate compliance (need longer retention)
- No historical analysis (can't detect long-term patterns)

---

### Strategy 2: Archive to Cold Storage (Recommended)

**Pattern:** Move old logs to cheap storage (S3, Azure Blob)

```typescript
// backend/src/jobs/archiveAuditLogs.ts

import { AuditLog } from '../models/AuditLog';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function archiveOldAuditLogs(hotStorageDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - hotStorageDays);
  
  console.log(`Archiving audit logs older than ${cutoffDate.toISOString()}`);
  
  // Get logs to archive (batch by month for efficient S3 storage)
  const monthToArchive = new Date(cutoffDate);
  monthToArchive.setDate(1); // First day of month
  
  const logsToArchive = await AuditLog.find({
    createdAt: {
      $gte: monthToArchive,
      $lt: new Date(monthToArchive.getFullYear(), monthToArchive.getMonth() + 1, 1),
    },
  }).lean();
  
  if (logsToArchive.length === 0) {
    console.log('No logs to archive');
    return { archivedCount: 0 };
  }
  
  // Compress logs as JSONL (JSON Lines - one JSON per line)
  const jsonlData = logsToArchive
    .map(log => JSON.stringify(log))
    .join('\n');
  
  // Upload to S3 with compression
  const key = `audit-logs/${monthToArchive.getFullYear()}/${monthToArchive.getMonth() + 1}/logs.jsonl.gz`;
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AUDIT_ARCHIVE_BUCKET,
    Key: key,
    Body: await compressData(jsonlData),
    StorageClass: 'GLACIER_IR', // Instant Retrieval Glacier ($0.004/GB/month)
    ContentType: 'application/jsonl+gzip',
    Metadata: {
      recordCount: logsToArchive.length.toString(),
      startDate: logsToArchive[0].createdAt.toISOString(),
      endDate: logsToArchive[logsToArchive.length - 1].createdAt.toISOString(),
    },
  }));
  
  console.log(`Archived ${logsToArchive.length} logs to s3://${process.env.AUDIT_ARCHIVE_BUCKET}/${key}`);
  
  // Delete from MongoDB (hot storage)
  await AuditLog.deleteMany({
    _id: { $in: logsToArchive.map(log => log._id) },
  });
  
  console.log(`Deleted ${logsToArchive.length} logs from MongoDB`);
  
  return {
    archivedCount: logsToArchive.length,
    archiveKey: key,
    cutoffDate,
  };
}

async function compressData(data: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const gzip = createGzip();
  
  gzip.on('data', chunk => chunks.push(chunk));
  
  return new Promise((resolve, reject) => {
    gzip.on('end', () => resolve(Buffer.concat(chunks)));
    gzip.on('error', reject);
    gzip.write(data);
    gzip.end();
  });
}
```

**Cost comparison:**
```
MongoDB Atlas (M10): $0.08/GB/month
S3 Standard:         $0.023/GB/month
S3 Glacier IR:       $0.004/GB/month (1ms retrieval)
S3 Glacier Deep:     $0.001/GB/month (12 hour retrieval)

For 100 GB of logs:
MongoDB: $8/month
S3 Glacier IR: $0.40/month
= 20x cheaper! 💰
```

---

### Strategy 3: TTL Index (MongoDB Auto-Delete)

**Pattern:** Let MongoDB automatically delete old documents

```typescript
// backend/src/models/AuditLog.ts

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resource: String,
  ipAddress: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 90 * 24 * 60 * 60, // ← Auto-delete after 90 days!
  },
});

// Create TTL index
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
```

**How TTL works:**
```
MongoDB background thread runs every 60 seconds
→ Checks for documents where createdAt + TTL < now
→ Deletes matching documents
→ Happens automatically, no cron job needed!
```

**Pros ✅:**
- Zero code for deletion
- Distributed (works in clusters)
- Efficient (index-based)

**Cons ❌:**
- Permanent deletion (no archive)
- Not immediate (up to 60s delay)
- Can't change TTL per record easily

**When to use:** Temporary data (sessions, rate limits) or when archival isn't needed

---

## Part 4: Scheduled Job Implementation

### Using Node-Cron

```typescript
// backend/src/jobs/scheduler.ts

import cron from 'node-cron';
import { archiveOldAuditLogs } from './archiveAuditLogs';
import { cleanupOldAuditLogs } from './cleanupAuditLogs';

export function initializeScheduledJobs() {
  // Run archive job daily at 2 AM (low traffic time)
  cron.schedule('0 2 * * *', async () => {
    console.log('Running audit log archive job...');
    
    try {
      const result = await archiveOldAuditLogs(90); // Archive logs > 90 days
      console.log(`Archived ${result.archivedCount} logs`);
    } catch (error) {
      console.error('Archive job failed:', error);
      // Send alert to ops team
      await sendAlert('Audit archive job failed', error);
    }
  });
  
  // Run cleanup job weekly (Sunday at 3 AM)
  cron.schedule('0 3 * * 0', async () => {
    console.log('Running audit log cleanup job...');
    
    try {
      // Delete logs older than 1 year (after archival)
      const result = await cleanupOldAuditLogs(365);
      console.log(`Deleted ${result.deletedCount} archived logs`);
    } catch (error) {
      console.error('Cleanup job failed:', error);
      await sendAlert('Audit cleanup job failed', error);
    }
  });
  
  console.log('✅ Scheduled jobs initialized');
}

// Call in server.ts
// initializeScheduledJobs();
```

**Cron syntax reference:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, 0 or 7 = Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)

Examples:
0 2 * * *       → Daily at 2:00 AM
0 */6 * * *     → Every 6 hours
0 0 * * 0       → Weekly on Sunday at midnight
0 0 1 * *       → Monthly on 1st at midnight
*/15 * * * *    → Every 15 minutes
```

---

### Using BullMQ (Production-Grade)

```typescript
// backend/src/jobs/auditArchiveQueue.ts

import { Queue, Worker, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// Create queue
export const auditArchiveQueue = new Queue('audit-archive', { connection });

// Create scheduler (handles repeating jobs)
const queueScheduler = new QueueScheduler('audit-archive', { connection });

// Add repeating job
export async function setupAuditArchiveJob() {
  await auditArchiveQueue.add(
    'archive-old-logs',
    {}, // No data needed
    {
      repeat: {
        pattern: '0 2 * * *', // Daily at 2 AM
        tz: 'America/New_York', // Timezone-aware
      },
      attempts: 3, // Retry 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 60000, // Start with 1 min delay
      },
    }
  );
}

// Create worker to process jobs
const worker = new Worker(
  'audit-archive',
  async (job) => {
    console.log(`Processing archive job ${job.id}`);
    
    const result = await archiveOldAuditLogs(90);
    
    // Return result for monitoring
    return {
      archivedCount: result.archivedCount,
      timestamp: new Date().toISOString(),
    };
  },
  { connection }
);

// Monitor job completion
worker.on('completed', (job, result) => {
  console.log(`✅ Archive job completed: ${result.archivedCount} logs archived`);
});

worker.on('failed', (job, error) => {
  console.error(`❌ Archive job failed:`, error);
  sendAlert('Audit archive job failed', error);
});
```

**Pros of BullMQ over cron:**
- ✅ Retry logic built-in
- ✅ Job monitoring & dashboard
- ✅ Distributed (multiple workers)
- ✅ Handles failures gracefully
- ✅ Job history & metrics

---

## Part 5: Dry-Run Mode (Safe Testing)

```typescript
// backend/src/jobs/cleanupAuditLogs.ts

export async function cleanupOldAuditLogs(
  retentionDays: number = 90,
  options: { dryRun?: boolean } = {}
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  // Count logs to delete
  const count = await AuditLog.countDocuments({
    createdAt: { $lt: cutoffDate },
  });
  
  console.log(`Found ${count} audit logs older than ${cutoffDate.toISOString()}`);
  
  // Sample logs to show what will be deleted
  const sample = await AuditLog.find({ createdAt: { $lt: cutoffDate } })
    .limit(5)
    .lean();
  
  console.log('Sample logs to delete:', 
    sample.map(log => ({
      action: log.action,
      createdAt: log.createdAt,
      userId: log.userId,
    }))
  );
  
  // DRY RUN: Don't actually delete
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE: Would delete', count, 'logs (no changes made)');
    return { deletedCount: 0, wouldDelete: count, cutoffDate };
  }
  
  // REAL RUN: Actually delete
  console.log('🗑️  DELETING', count, 'logs...');
  const result = await AuditLog.deleteMany({
    createdAt: { $lt: cutoffDate },
  });
  
  console.log(`✅ Deleted ${result.deletedCount} audit logs`);
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate,
  };
}
```

**Usage:**

```bash
# Test mode (no deletion)
node -e "require('./dist/jobs/cleanupAuditLogs').cleanupOldAuditLogs(90, { dryRun: true })"

# Real mode (actual deletion)
node -e "require('./dist/jobs/cleanupAuditLogs').cleanupOldAuditLogs(90)"
```

---

## Part 6: CLI Script for Manual Execution

```typescript
// scripts/cleanup-audit-logs.ts

import { program } from 'commander';
import { cleanupOldAuditLogs } from '../backend/src/jobs/cleanupAuditLogs';
import { connectDatabase } from '../backend/src/config/database';

program
  .name('cleanup-audit-logs')
  .description('Delete old audit logs based on retention policy')
  .option('-d, --days <number>', 'Retention days (default: 90)', '90')
  .option('--dry-run', 'Preview changes without deleting', false)
  .option('-f, --force', 'Skip confirmation prompt', false)
  .action(async (options) => {
    await connectDatabase();
    
    const retentionDays = parseInt(options.days);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  AUDIT LOG CLEANUP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Retention: ${retentionDays} days`);
    console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!options.dryRun && !options.force) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise<string>(resolve => {
        readline.question('⚠️  This will PERMANENTLY DELETE logs. Continue? (yes/no): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Aborted');
        process.exit(0);
      }
    }
    
    const result = await cleanupOldAuditLogs(retentionDays, { 
      dryRun: options.dryRun 
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (options.dryRun) {
      console.log(`Would delete: ${result.wouldDelete} logs`);
    } else {
      console.log(`Deleted: ${result.deletedCount} logs`);
    }
    
    console.log(`Cutoff date: ${result.cutoffDate.toISOString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  });

program.parse();
```

**Add to package.json:**

```json
{
  "scripts": {
    "cleanup:audit": "tsx scripts/cleanup-audit-logs.ts",
    "cleanup:audit:dry": "npm run cleanup:audit -- --dry-run",
    "cleanup:audit:30d": "npm run cleanup:audit -- --days 30 --force"
  }
}
```

**Usage:**

```bash
# Dry run (safe, preview only)
npm run cleanup:audit:dry

# Interactive (asks for confirmation)
npm run cleanup:audit

# Force delete 30+ day logs
npm run cleanup:audit:30d
```

---

## Part 7: Monitoring & Alerting

### Track Cleanup Job Success

```typescript
// backend/src/jobs/cleanupAuditLogs.ts

import { prometheus } from '../lib/metrics';

const cleanupCounter = new prometheus.Counter({
  name: 'audit_cleanup_runs_total',
  help: 'Total audit cleanup job runs',
  labelNames: ['status'], // success, failure
});

const deletedCounter = new prometheus.Counter({
  name: 'audit_logs_deleted_total',
  help: 'Total audit logs deleted',
});

export async function cleanupOldAuditLogs(retentionDays: number = 90) {
  try {
    const result = await AuditLog.deleteMany({
      createdAt: { $lt: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000) },
    });
    
    cleanupCounter.labels('success').inc();
    deletedCounter.inc(result.deletedCount);
    
    return result;
  } catch (error) {
    cleanupCounter.labels('failure').inc();
    throw error;
  }
}
```

### Alert on Failures

```typescript
// backend/src/jobs/scheduler.ts

cron.schedule('0 2 * * *', async () => {
  try {
    await archiveOldAuditLogs(90);
  } catch (error) {
    // Send alert to ops team
    await pagerDuty.trigger({
      routing_key: process.env.PAGERDUTY_KEY,
      event_action: 'trigger',
      payload: {
        summary: 'Audit log archive job failed',
        severity: 'warning',
        source: 'audit-archive-job',
        custom_details: {
          error: error.message,
          stack: error.stack,
        },
      },
    });
    
    // Also log to Sentry
    Sentry.captureException(error, {
      tags: { job: 'audit-archive' },
    });
  }
});
```

---

## Part 8: Retrieval from Archive

```typescript
// backend/src/services/auditArchiveService.ts

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function retrieveArchivedLogs(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const logs: any[] = [];
  
  // Determine which archive files to read
  const months = getMonthsBetween(startDate, endDate);
  
  for (const month of months) {
    const key = `audit-logs/${month.year}/${month.month}/logs.jsonl.gz`;
    
    try {
      console.log(`Retrieving ${key}...`);
      
      const response = await s3.send(new GetObjectCommand({
        Bucket: process.env.AUDIT_ARCHIVE_BUCKET,
        Key: key,
      }));
      
      // Decompress and parse
      const body = response.Body as Readable;
      const gunzip = createGunzip();
      body.pipe(gunzip);
      
      const chunks: Buffer[] = [];
      for await (const chunk of gunzip) {
        chunks.push(chunk);
      }
      
      const jsonlData = Buffer.concat(chunks).toString('utf-8');
      const lines = jsonlData.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const log = JSON.parse(line);
        
        // Filter by date range
        const logDate = new Date(log.createdAt);
        if (logDate >= startDate && logDate <= endDate) {
          logs.push(log);
        }
      }
      
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        console.log(`No archive for ${month.year}/${month.month}`);
      } else {
        throw error;
      }
    }
  }
  
  return logs;
}

function getMonthsBetween(start: Date, end: Date): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}
```

---

## Summary: Retention Strategy Decision Tree

```
Do you have compliance requirements?
  │
  ├─ YES → What is the minimum retention?
  │         │
  │         ├─ < 1 year → MongoDB 90 days + S3 Glacier 1 year
  │         └─ > 1 year → MongoDB 90 days + S3 Glacier Deep Archive
  │
  └─ NO → Do you need historical analysis?
            │
            ├─ YES → Archive to data lake (S3 + Athena/BigQuery)
            └─ NO → Delete after 90 days (TTL index)
```

### Recommended Setup for THIS Repository

```yaml
# Audit Retention Policy

Hot Storage (MongoDB):
  Duration: 90 days
  Purpose: Fast queries for recent activity
  Cost: $0.08/GB/month
  
Cold Storage (S3 Glacier IR):
  Duration: 1 year
  Purpose: Compliance, incident investigation
  Cost: $0.004/GB/month
  
Deletion:
  After: 1 year (post-archival)
  Reason: No long-term compliance requirement
  
Jobs:
  Archive: Daily at 2 AM (move 90+ day logs to S3)
  Cleanup: Weekly (delete 1+ year logs from S3)
```

---

**Go build compliant systems! 📋✅**
