const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://it23143654_db_user:Company123@cluster1.td4rih9.mongodb.net/test?retryWrites=true&w=majority';

async function seedData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('test');
    const eventLogs = db.collection('eventlogs');
    
    // Clear existing data
    await eventLogs.deleteMany({});
    console.log('Cleared existing data');
    
    const now = new Date();
    const fraudEvents = [];
    const refundEvents = [];
    
    // Create 30 days of data
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (29 - i));
      
      // Random fraud events per day (1-8)
      const fraudCount = Math.floor(Math.random() * 8) + 1;
      for (let j = 0; j < fraudCount; j++) {
        fraudEvents.push({
          event: 'fraud_detected',
          status: 'success',
          source: 'system',
          createdAt: new Date(date.getTime() + Math.random() * 86400000),
          metadata: {
            amount: Math.floor(Math.random() * 1000) + 100,
            reason: 'Suspicious activity detected'
          }
        });
      }
      
      // Random refund events per day (0-4)
      const refundCount = Math.floor(Math.random() * 5);
      for (let j = 0; j < refundCount; j++) {
        refundEvents.push({
          event: 'refund_processed',
          status: 'success',
          source: 'system',
          createdAt: new Date(date.getTime() + Math.random() * 86400000),
          metadata: {
            amount: Math.floor(Math.random() * 500) + 50,
            reason: 'Customer request'
          }
        });
      }
    }
    
    const allEvents = [...fraudEvents, ...refundEvents];
    await eventLogs.insertMany(allEvents);
    
    console.log(`✅ Inserted ${fraudEvents.length} fraud events and ${refundEvents.length} refund events`);
    console.log('✅ Dashboard data seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seedData();
