// scripts/seedDashboardTestData.js
// Run with: node scripts/seedDashboardTestData.js

const mongoose = require('mongoose');
const { EventLog } = require('../backend/src/models/EventLog');
const TransactionLog = require('../backend/src/models/TransactionLog').default;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name';

async function seed() {
  await mongoose.connect(MONGO_URI);
  const now = new Date();

  // Insert 20 transactions in last 24h
  const transactions = Array.from({ length: 20 }, (_, i) => ({
    provider: 'stripe',
    eventType: 'payment',
    status: 'success',
    amount: 1000 + i * 100,
    currency: 'USD',
    createdAt: new Date(now.getTime() - Math.random() * 24 * 3600 * 1000),
  }));

  // Insert 3 refunds in last 7d
  const refunds = Array.from({ length: 3 }, (_, i) => ({
    provider: 'stripe',
    eventType: 'refund',
    status: 'success',
    amount: 500,
    currency: 'USD',
    createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 3600 * 1000),
  }));

  // Insert 5 fraud events in last 24h, 2 in previous 24h
  const fraudEvents = [
    ...Array.from({ length: 5 }, () => ({
      event: 'fraud_detected',
      status: 'success',
      source: 'system',
      createdAt: new Date(now.getTime() - Math.random() * 24 * 3600 * 1000),
    })),
    ...Array.from({ length: 2 }, () => ({
      event: 'fraud_detected',
      status: 'success',
      source: 'system',
      createdAt: new Date(now.getTime() - (24 + Math.random() * 24) * 3600 * 1000),
    })),
  ];

  await TransactionLog.insertMany([...transactions, ...refunds]);
  await EventLog.insertMany(fraudEvents);

  console.log('Seeded dashboard test data!');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
