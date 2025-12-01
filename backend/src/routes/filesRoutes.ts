import { Router, Request, Response } from "express";
import { supabase } from "../config/supabaseClient";

const router = Router();

// Download file with signed URL
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
