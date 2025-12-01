import dbConnect from '@/lib/dbConnect';
import File from '@/models/File';

export default async function handler(req, res) {
  await dbConnect();
  const files = await File.find({}).sort({ createdAt: -1 });
  res.status(200).json(files);
}
