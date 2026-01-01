// scripts/generateDemoTraces.js
// Run with: node scripts/generateDemoTraces.js

const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb+srv://it23143654_db_user:Company123@cluster1.td4rih9.mongodb.net/mydb?appName=Cluster1';

const traceSchema = new mongoose.Schema({
  traceId: String,
  service: String,
  requestId: String,
  path: String,
  method: String,
  status: Number,
  duration: Number,
  startTime: Number,
  spans: [
    {
      name: String,
      start: Number,
      duration: Number
    }
  ]
}, { collection: 'traces' });

const Trace = mongoose.model('Trace', traceSchema);

async function generateTraces() {
  await mongoose.connect(uri);

  const now = Date.now();
  const services = ['payments', 'orders', 'api', 'auth'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const paths = ['/api/some/path', '/api/another/path', '/api/pay', '/api/order'];
  const statuses = [200, 201, 400, 404, 500];

  const traces = Array.from({ length: 20 }).map((_, i) => {
    const service = services[i % services.length];
    const method = methods[i % methods.length];
    const path = paths[i % paths.length];
    const status = statuses[i % statuses.length];
    const duration = Math.floor(Math.random() * 500000) + 10000;
    const startTime = now - i * 1000000;
    return {
      traceId: `auto-trace-${i + 1}`,
      service,
      requestId: `req-${i + 1}`,
      path,
      method,
      status,
      duration,
      startTime,
      spans: [
        { name: 'db.query', start: 0, duration: Math.floor(Math.random() * 100000) + 10000 },
        { name: 'http.call', start: 10000, duration: Math.floor(Math.random() * 200000) + 20000 }
      ]
    };
  });

  await Trace.insertMany(traces);
  console.log('Inserted 20 demo traces!');
  await mongoose.disconnect();
}

generateTraces().catch(e => { console.error(e); process.exit(1); });
