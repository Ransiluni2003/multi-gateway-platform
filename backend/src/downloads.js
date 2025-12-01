// server/src/downloads.js
import { createClient } from '@supabase/supabase-js';
import express from 'express';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const router = express.Router();

// generate signed url
router.get('/file/:filePath', async (req, res) => {
  try {
    const { filePath } = req.params;
    // expiry in seconds (e.g., 60 seconds)
    const expiresIn = 60;

    const { data, error } = await supabase
      .storage
      .from('uploads')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Signed URL error', error);
      return res.status(500).json({ error: 'Unable to create signed URL' });
    }

    // return the signed URL to the client; DO NOT store service key client-side
    res.json({ signedUrl: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
