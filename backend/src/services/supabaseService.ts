import axios from 'axios';

export interface SignedUrlResult {
  downloadUrl: string;
  expiresAt: number;
  expiresSeconds: number;
}

export async function generateSignedDownloadUrl(
  supabaseClient: any,
  bucket: string,
  key: string,
  expiresSeconds: number = 60 * 15,
  options?: { verify?: boolean }
): Promise<SignedUrlResult> {
  if (!supabaseClient || !bucket || !key) throw new Error('Missing parameters');

  const expires = Math.max(60, Math.min(expiresSeconds, 60 * 60));

  const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(key, expires);

  if (error || !data || !(data as any).signedUrl) {
    throw new Error(error?.message || 'Signed URL generation failed');
  }

  const signedUrl = (data as any).signedUrl as string;
  const expiresAt = Date.now() + expires * 1000;

  const verify = options?.verify !== false;
  if (verify) {
    try {
      const headResp = await axios.head(signedUrl, { timeout: 5000 });
      if (!(headResp.status >= 200 && headResp.status < 400)) {
        throw new Error(`Signed URL verification failed: ${headResp.status}`);
      }
    } catch (err: any) {
      throw new Error(`Signed URL verification error: ${err?.message || String(err)}`);
    }
  }

  return { downloadUrl: signedUrl, expiresAt, expiresSeconds: expires };
}
