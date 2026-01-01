import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;

// Helper to generate signed URL with custom expiry
export async function getSignedUrl(filePath, expirySec = 3600) {
  const { data, error } = await supabase
    .storage
    .from('platform-assets')
    .createSignedUrl(filePath, expirySec); // expirySec seconds
  if (error) throw error;
  return data.signedUrl;
}
