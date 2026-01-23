require('dotenv').config({path:'backend/.env'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const count = await mongoose.connection.db.collection('traces').countDocuments();
  console.log('\n📊 Total traces in database:', count);
  console.log('─'.repeat(60));
  
  const traces = await mongoose.connection.db.collection('traces')
    .find({})
    .sort({createdAt: -1})
    .limit(20)
    .toArray();
  
  console.log('\n📋 Last 20 traces:');
  traces.forEach((t, i) => {
    const time = new Date(t.ts || t.createdAt).toLocaleString();
    console.log(`${i+1}. ${t.traceID?.substring(0,16)}... | ${t.method} ${t.path} | ${time}`);
  });
  
  mongoose.disconnect();
  console.log('\n✅ Done');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
