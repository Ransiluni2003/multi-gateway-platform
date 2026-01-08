// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://it23143654_db_user:Company123@localhost:27017/multi_gateway_db?authSource=admin';
mongoose.connect(mongoUri);

const traceSchema = new mongoose.Schema({
  traceId: String,
  service: String,
  requestId: String,
  path: String,
  method: String,
  status: Number,
  duration: Number,
  startTime: Number,
  spans: Array
}, { collection: 'traces' });

const Trace = mongoose.model('Trace', traceSchema);

// Create a new trace
app.post('/api/traces', async (req, res) => {
  const trace = new Trace(req.body);
  await trace.save();
  res.json(trace);
});

// Get all traces (with optional filters)
app.get('/api/traces', async (req, res) => {
  const filter = {};
  if (req.query.service) filter.service = req.query.service;
  if (req.query.method) filter.method = req.query.method;
  const traces = await Trace.find(filter).sort({ startTime: -1 }).limit(20);
  res.json(traces);
});

app.listen(4000, () => console.log('Trace API running on port 4000'));
