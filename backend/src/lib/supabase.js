import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;

// Helper to generate signed URL
export async function getSignedUrl(filePath) {
  const { data, error } = await supabase
    .storage
    .from('platform-assets')
    .createSignedUrl(filePath, 60 * 60); // URL valid for 1 hour
  if (error) throw error;
  return data.signedUrl;
}
