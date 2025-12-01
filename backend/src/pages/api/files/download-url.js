import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { key, expires = 120 } = req.query;
  if (!key) return res.status(400).json({ error: 'Missing file key' });

  // Generate a signed download URL
  const { data, error } = await supabase
    .storage
    .from('platform-assets')
    .createSignedUrl(key, Number(expires));

  if (error) return res.status(400).json({ error: error.message });

  res.status(200).json({ downloadUrl: data.signedUrl, expiresAt: data.expiresAt });
}
