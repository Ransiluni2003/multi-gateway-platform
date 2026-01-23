import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { connectMongo } from '../../core/db/mongo';

import { initEventBus } from '../../core/eventbus/redisEventBus';

const app = express();
// Use a service-specific port env to avoid collision with global PORT
const PORT = parseInt(process.env.ANALYTICS_PORT || '4002', 10);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'analytics', time: Date.now() }));

// Initialize Redis and subscriptions before starting server
(async () => {
  try {
      await connectMongo();
    await initEventBus();
    // Import event handler AFTER Redis is connected
    await import('./eventHandler.js');
    console.log('✅ Analytics event subscriptions initialized');
    
    app.listen(PORT, () => {
      console.log(`✅ Analytics service listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize analytics service:', err);
    process.exit(1);
  }
})();
