// backend/src/controllers/storage.ts
import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_KEY as string
);

// Return a signed GET URL to the frontend (expiresIn seconds)
export async function getSignedDownloadUrl(req: Request, res: Response): Promise<Response> {
  const { path } = req.query as { path?: string }; // Type-safe query params

  if (!path) {
    return res.status(400).json({ error: "path required" });
  }

  try {
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 60); // 60s expiry - adjust as needed

    if (error) throw error;

    return res.json({
      url: data.signedUrl,
      expiresAt: Date.now() + 60 * 1000,
    });
  } catch (err) {
    console.error("signed-url error", err);
    return res.status(500).json({ error: "Could not create signed URL" });
  }
}
