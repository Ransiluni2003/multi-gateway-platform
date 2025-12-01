import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

// Import event handler to subscribe to events (side-effect)
import './eventHandler';

const app = express();
const PORT = process.env.PORT || 4002;

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'analytics', time: Date.now() }));

app.listen(PORT, () => {
  console.log(`✅ Analytics service listening on port ${PORT}`);
});
