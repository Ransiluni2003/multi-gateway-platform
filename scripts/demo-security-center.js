/**
 * Security Center Demo Script
 * Seeds demo audit log data for testing and demonstration
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/multi-gateway';

// Audit Log Schema (simplified version for seeding)
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  status: { type: String, default: 'success' },
  userId: String,
  ip: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

// Sample data generators
const actions = [
  'user_login',
  'user_logout',
  'user_register',
  'password_change',
  'password_reset_request',
  'file_upload',
  'file_download',
  'file_delete',
  'rate_limit_exceeded',
  'account_locked',
  'token_refreshed',
  'admin_action',
  'security_event'
];

const statuses = ['success', 'failure', 'error'];

const sampleIPs = [
  '192.168.1.100',
  '10.0.0.50',
  '172.16.0.25',
  '203.0.113.45',
  '198.51.100.22'
];

const sampleUserAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'PostmanRuntime/7.32.1',
  'curl/7.84.0'
];

const sampleUserIds = [
  '507f1f77bcf86cd799439011',
  '507f191e810c19729de860ea',
  '507f191e810c19729de860eb',
  '507f191e810c19729de860ec',
  null // Some actions without userId
];

const sampleEndpoints = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/files/upload',
  '/api/files/download',
  '/api/admin/security/stats'
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomDate(daysBack) {
  const now = new Date();
  const randomDays = Math.random() * daysBack;
  return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
}

function generateAuditLog() {
  const action = randomItem(actions);
  const status = action === 'rate_limit_exceeded' ? 'failure' : randomItem(statuses);
  
  return {
    action,
    status,
    userId: randomItem(sampleUserIds),
    ip: randomItem(sampleIPs),
    userAgent: randomItem(sampleUserAgents),
    details: {
      endpoint: action === 'rate_limit_exceeded' ? randomItem(sampleEndpoints) : undefined,
      target: action.includes('file') ? `file_${Math.floor(Math.random() * 1000)}` : undefined,
      reason: status === 'failure' ? 'Invalid credentials' : undefined
    },
    createdAt: generateRandomDate(30) // Random date within last 30 days
  };
}

async function seedAuditLogs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing audit logs (optional - comment out if you want to preserve existing data)
    // console.log('🗑️  Clearing existing audit logs...');
    // await AuditLog.deleteMany({});

    console.log('🌱 Seeding demo audit logs...');
    
    // Generate 500 random audit logs
    const logs = [];
    for (let i = 0; i < 500; i++) {
      logs.push(generateAuditLog());
    }

    // Insert in batches
    await AuditLog.insertMany(logs);
    
    console.log(`✅ Successfully seeded ${logs.length} audit logs`);
    
    // Add some specific rate limit exceeded events for testing
    const rateLimitLogs = [];
    for (let i = 0; i < 50; i++) {
      rateLimitLogs.push({
        action: 'rate_limit_exceeded',
        status: 'failure',
        userId: randomItem(sampleUserIds),
        ip: randomItem(sampleIPs),
        userAgent: randomItem(sampleUserAgents),
        details: {
          endpoint: randomItem(sampleEndpoints)
        },
        createdAt: generateRandomDate(1) // Within last 24 hours
      });
    }
    
    await AuditLog.insertMany(rateLimitLogs);
    console.log(`✅ Successfully seeded ${rateLimitLogs.length} rate limit events`);

    // Display summary
    const summary = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📊 Audit Log Summary:');
    console.log('═══════════════════════════════════════');
    summary.forEach(item => {
      console.log(`  ${item._id.padEnd(30)} ${item.count} events`);
    });
    console.log('═══════════════════════════════════════');

    const total = await AuditLog.countDocuments();
    console.log(`\n📈 Total audit logs in database: ${total}`);

    console.log('\n✨ Demo data seeded successfully!');
    console.log('\n🚀 You can now:');
    console.log('   1. Navigate to http://localhost:3001/admin/security-center');
    console.log('   2. Explore the Audit Explorer with pre-populated data');
    console.log('   3. View Rate Limit Monitor with sample violations');
    console.log('   4. Test CSV export functionality');

  } catch (error) {
    console.error('❌ Error seeding audit logs:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the seeding script
seedAuditLogs();
