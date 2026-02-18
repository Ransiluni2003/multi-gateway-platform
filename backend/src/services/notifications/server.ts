import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { connectMongo } from "../../core/db/mongo";

import { initEventBus } from '../../core/eventbus/redisEventBus';

const app = express();
// Use a service-specific port env to avoid collision with global PORT
const PORT = parseInt(process.env.NOTIFICATIONS_PORT || '4003', 10);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifications', time: Date.now() }));

// Initialize Redis and subscriptions before starting server
(async () => {
  try {
      await connectMongo();
    await initEventBus();
    // Import event handler AFTER Redis is connected
    await import('./eventHandler.js');
    console.log('✅ Notifications event subscriptions initialized');
    
    app.listen(PORT, () => {
      console.log(`✅ Notifications service listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize notifications service:', err);
    process.exit(1);
  }
})();
