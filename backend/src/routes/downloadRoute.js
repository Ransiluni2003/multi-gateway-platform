const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const { path } = req.params;

    const { data, error } = await supabase
      .storage
      .from('public-bucket')
      .createSignedUrl(path, 60); // 60 seconds validity

    if (error) return res.status(500).json({ error: error.message });

    res.json({ url: data.signedURL });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
router.get('/:path', async (req, res) => {
  try {
    const { path } = req.params;
    const expiresIn = 60;
    const { data, error } = await supabase
      .storage
      .from('public-bucket')
      .createSignedUrl(path, expiresIn); // 60 seconds validity

    if (error || !data || !data.signedUrl) {
      return res.status(500).json({ error: error?.message || 'Unable to create signed URL' });
    }

    // Return unified response
    res.json({ signedUrl: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
