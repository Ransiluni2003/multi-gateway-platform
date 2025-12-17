import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    // List all files in the platform-assets bucket
    const { data, error } = await supabase
      .storage
      .from('platform-assets')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Supabase list error:', error);
      return res.status(400).json({ error: error.message || 'Failed to list files' });
    }

    // Filter out folders and metadata files, return only actual files
    const files = (data || [])
      .filter(item => item.id && item.name) // Valid file entries
      .map(file => ({
        key: file.name,
        name: file.name,
        size: file.metadata?.size || 0,
        createdAt: file.created_at
      }));

    res.status(200).json({ files });
  } catch (err) {
    console.error('File list error:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
}
