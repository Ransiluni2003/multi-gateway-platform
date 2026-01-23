import { Router, Request, Response } from "express";
import { supabase } from "../config/supabaseClient";

const router = Router();

// Generate signed URL for download (used by frontend)
router.get("/download-url", async (req: Request, res: Response) => {
  const { key, expires } = req.query;
  
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: "File key is required" });
  }

  const expirySeconds = expires && typeof expires === 'string' ? parseInt(expires) : 10; // 10 seconds for testing
  
  const { data, error } = await supabase.storage
    .from("platform-assets")
    .createSignedUrl(key, expirySeconds);

  if (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: "File not found in Supabase Storage" });
    }
    return res.status(500).json({ error: error.message });
  }

  if (!data?.signedUrl) {
    return res.status(500).json({ error: "Failed to generate signed URL" });
  }

  const expiresAt = Date.now() + (expirySeconds * 1000);
  res.json({ 
    downloadUrl: data.signedUrl,
    expiresAt: expiresAt
  });
});

// Download file with signed URL (legacy endpoint)
router.get("/download/:filename", async (req: Request, res: Response) => {
  const { filename } = req.params;

  const { data, error } = await supabase.storage
    .from("platform-assets")       // Your bucket name
    .createSignedUrl(filename, 60); // Expires in 60 seconds

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ url: data.signedUrl });
});

export default router;
