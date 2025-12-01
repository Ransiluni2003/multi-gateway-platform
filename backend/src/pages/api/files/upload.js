import supabase from '@/lib/supabase';
import dbConnect from '@/lib/dbConnect';
import File from '@/models/File';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();

  const { filename, uploadedBy } = req.body;
  const filePath = `${uploadedBy}/${Date.now()}-${filename}`;

  const { data, error } = await supabase
    .storage
    .from('platform-assets')
    .createSignedUploadUrl(filePath);

  if (error) return res.status(400).json({ error: error.message });

  // Save file metadata in MongoDB
  await File.create({
    filename,
    uploadedBy,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-assets/${filePath}`,
  });

  res.status(200).json({ signedUrl: data.signedUrl, filePath });
}
