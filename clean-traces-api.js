require('dotenv').config({path:'backend/.env'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('\n🗑️  Deleting traces for /api/traces endpoints...');
  
  const result = await mongoose.connection.db.collection('traces').deleteMany({
    path: { $regex: /^\/api\/traces/ }
  });
  
  console.log(`✅ Deleted ${result.deletedCount} trace records`);
  
  const remaining = await mongoose.connection.db.collection('traces').countDocuments();
  console.log(`📊 Remaining traces: ${remaining}\n`);
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
