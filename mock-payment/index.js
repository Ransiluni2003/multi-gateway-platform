const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Simulate success/failure with probability or a header
app.post('/charge', (req, res) => {
  const fail = req.headers['x-force-fail'] === '1' || Math.random() < 0.2; // 20% random failure
  console.log(`[mock-payment] Received charge request:`, { body: req.body, fail });

  if (fail) {
    // Simulate gateway error
    res.status(502).json({ success: false, message: 'Mock gateway failure' });
    return;
  }

  // Simulate processing delay
  setTimeout(() => {
    res.json({ success: true, id: `mock_${Date.now()}` });
  }, 300);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Mock payment gateway listening on ${PORT}`));
