import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { key, expires } = req.query;
  if (!key) return res.status(400).json({ error: 'Missing file key' });

  // Use 300 seconds as default expiration if not provided
  const expiresSec = expires ? Number(expires) : 300;

  // Generate a signed download URL
  const { data, error } = await supabase
    .storage
    .from('platform-assets')
    .createSignedUrl(key, expiresSec);

  if (error || !data?.signedUrl) {
    return res.status(400).json({ error: error?.message || 'Failed to generate signed URL or file not found.' });
  }

  res.status(200).json({ downloadUrl: data.signedUrl, expiresAt: data.expiresAt });
}