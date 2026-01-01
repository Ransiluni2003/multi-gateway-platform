// scripts/importTracesFromJson.js
// Usage: node scripts/importTracesFromJson.js path/to/traces.json

const mongoose = require('mongoose');
const fs = require('fs');
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

async function importTraces(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }
  const data = fs.readFileSync(jsonPath, 'utf-8');
  let traces;
  try {
    traces = JSON.parse(data);
  } catch (e) {
    console.error('Invalid JSON:', e);
    process.exit(1);
  }
  if (!Array.isArray(traces)) {
    console.error('JSON file must contain an array of trace objects.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  await Trace.insertMany(traces);
  console.log(`Imported ${traces.length} traces from ${jsonPath}`);
  await mongoose.disconnect();
}

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node scripts/importTracesFromJson.js path/to/traces.json');
  process.exit(1);
}

importTraces(jsonPath).catch(e => { console.error(e); process.exit(1); });
