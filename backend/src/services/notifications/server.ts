import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

// Import event handler to start listening for events
import './eventHandler';

const app = express();
const PORT = process.env.PORT || 4003;

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifications', time: Date.now() }));

app.listen(PORT, () => {
  console.log(`✅ Notifications service listening on port ${PORT}`);
});
