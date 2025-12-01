const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

router.get('/:path', async (req, res) => {
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
