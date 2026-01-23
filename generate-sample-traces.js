const mongoose = require('mongoose');
require('dotenv').config();

const spanSchema = new mongoose.Schema({
  spanID: String,
  operation: String,
  service: String,
  status: Number,
  startOffsetMs: Number,
  durationMs: Number,
  attributes: mongoose.Schema.Types.Mixed,
}, { _id: false });

const traceSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  traceID: { type: String, required: true, index: true },
  path: { type: String, required: true },
  method: { type: String, required: true },
  status: { type: Number },
  durationMs: { type: Number },
  ts: { type: String, required: true, index: true },
  serviceName: { type: String, index: true },
  spans: [spanSchema],
  parentTraceID: String,
  attributes: mongoose.Schema.Types.Mixed,
}, { collection: 'traces', timestamps: true });

const TraceModel = mongoose.model('Trace', traceSchema);

async function generateSampleTraces() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const sampleTraces = [
      {
        id: 'trace-001',
        traceID: 'a7b3c9d24e5f6a7b8c9d0e1f2a3b4c5d',
        path: '/api/payments',
        method: 'POST',
        status: 200,
        durationMs: 145.32,
        ts: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        serviceName: 'api',
        spans: [
          {
            spanID: 'span-001-a',
            operation: 'HTTP POST /api/payments',
            service: 'api',
            status: 200,
            startOffsetMs: 0,
            durationMs: 145.32,
            attributes: {
              'http.method': 'POST',
              'http.url': '/api/payments',
              'http.status_code': 200
            }
          },
          {
            spanID: 'span-001-b',
            operation: 'Validate payment request',
            service: 'payments',
            status: 200,
            startOffsetMs: 5.21,
            durationMs: 12.43
          },
          {
            spanID: 'span-001-c',
            operation: 'Publish payment.received event',
            service: 'payments',
            status: 200,
            startOffsetMs: 25.67,
            durationMs: 45.89
          },
          {
            spanID: 'span-001-d',
            operation: 'Format and send response',
            service: 'payments',
            status: 200,
            startOffsetMs: 135.12,
            durationMs: 10.20
          }
        ],
        attributes: {
          'service.name': 'api',
          'service.version': '1.0.0'
        }
      },
      {
        id: 'trace-002',
        traceID: 'b8c4d0e35f6g7h8i9j0k1l2m3n4o5p6q',
        path: '/api/gateway/process',
        method: 'POST',
        status: 200,
        durationMs: 234.56,
        ts: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        serviceName: 'gateway',
        spans: [
          {
            spanID: 'span-002-a',
            operation: 'HTTP POST /api/gateway/process',
            service: 'gateway',
            status: 200,
            startOffsetMs: 0,
            durationMs: 234.56
          },
          {
            spanID: 'span-002-b',
            operation: 'Gateway routing decision',
            service: 'gateway',
            status: 200,
            startOffsetMs: 3.45,
            durationMs: 8.21
          },
          {
            spanID: 'span-002-c',
            operation: 'Call Stripe API',
            service: 'gateway',
            status: 200,
            startOffsetMs: 20.15,
            durationMs: 180.32
          },
          {
            spanID: 'span-002-d',
            operation: 'Process API response',
            service: 'gateway',
            status: 200,
            startOffsetMs: 210.67,
            durationMs: 23.89
          }
        ],
        attributes: {
          'service.name': 'gateway',
          'service.version': '1.0.0'
        }
      },
      {
        id: 'trace-003',
        traceID: 'c9d5e1f46g7h8i9j0k1l2m3n4o5p6q7r',
        path: '/api/transactions',
        method: 'GET',
        status: 200,
        durationMs: 89.23,
        ts: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        serviceName: 'transactions',
        spans: [
          {
            spanID: 'span-003-a',
            operation: 'HTTP GET /api/transactions',
            service: 'transactions',
            status: 200,
            startOffsetMs: 0,
            durationMs: 89.23
          },
          {
            spanID: 'span-003-b',
            operation: 'Query database',
            service: 'transactions',
            status: 200,
            startOffsetMs: 5.12,
            durationMs: 65.45
          },
          {
            spanID: 'span-003-c',
            operation: 'Format response',
            service: 'transactions',
            status: 200,
            startOffsetMs: 75.23,
            durationMs: 14.00
          }
        ],
        attributes: {
          'service.name': 'transactions',
          'service.version': '1.0.0'
        }
      },
      {
        id: 'trace-004',
        traceID: 'd0e6f2g57h8i9j0k1l2m3n4o5p6q7r8s',
        path: '/api/webhooks/stripe',
        method: 'POST',
        status: 500,
        durationMs: 456.78,
        ts: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        serviceName: 'webhooks',
        spans: [
          {
            spanID: 'span-004-a',
            operation: 'HTTP POST /api/webhooks/stripe',
            service: 'webhooks',
            status: 500,
            startOffsetMs: 0,
            durationMs: 456.78
          },
          {
            spanID: 'span-004-b',
            operation: 'Verify webhook signature',
            service: 'webhooks',
            status: 200,
            startOffsetMs: 2.34,
            durationMs: 15.67
          },
          {
            spanID: 'span-004-c',
            operation: 'Process webhook payload',
            service: 'webhooks',
            status: 500,
            startOffsetMs: 25.45,
            durationMs: 425.12
          }
        ],
        attributes: {
          'service.name': 'webhooks',
          'service.version': '1.0.0',
          'error': true,
          'error.message': 'Database connection timeout'
        }
      },
      {
        id: 'trace-005',
        traceID: 'e1f7g3h68i9j0k1l2m3n4o5p6q7r8s9t',
        path: '/api/merchants/verify',
        method: 'POST',
        status: 200,
        durationMs: 123.45,
        ts: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        serviceName: 'merchants',
        spans: [
          {
            spanID: 'span-005-a',
            operation: 'HTTP POST /api/merchants/verify',
            service: 'merchants',
            status: 200,
            startOffsetMs: 0,
            durationMs: 123.45
          },
          {
            spanID: 'span-005-b',
            operation: 'Check merchant credentials',
            service: 'merchants',
            status: 200,
            startOffsetMs: 8.23,
            durationMs: 45.67
          },
          {
            spanID: 'span-005-c',
            operation: 'Update verification status',
            service: 'merchants',
            status: 200,
            startOffsetMs: 65.34,
            durationMs: 55.11
          }
        ],
        attributes: {
          'service.name': 'merchants',
          'service.version': '1.0.0'
        }
      }
    ];

    // Insert or update traces
    for (const trace of sampleTraces) {
      await TraceModel.findOneAndUpdate(
        { traceID: trace.traceID },
        trace,
        { upsert: true, new: true }
      );
      console.log(`✓ Created/Updated trace: ${trace.traceID}`);
    }

    console.log(`\n✅ Successfully generated ${sampleTraces.length} sample traces!`);
    console.log('\nYou can now view them at: http://localhost:3001/dashboard/traces');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateSampleTraces();
