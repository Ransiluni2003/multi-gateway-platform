// pages/dashboard/documents.js (or app route)
import useSWR from 'swr';

const fetcher = (url) => fetch(url, {
  headers: { 'X-Realtime-Secret': process.env.NEXT_PUBLIC_REALTIME_SECRET || '' }
}).then(r => r.json());

export default function DocumentsPage() {
  const { data, error } = useSWR(`${process.env.NEXT_PUBLIC_API_BASE}/api/files/list?limit=50`, fetcher);

  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1>Documents & Reports</h1>
      <ul>
        {data.map(f => (
          <li key={f._id}>
            <strong>{f.filename}</strong> — {Math.round(f.size/1024)} KB — uploaded by {f.uploadedBy} — {new Date(f.createdAt).toLocaleString()}
            {/* If you need a signed download link, create server route to sign GET (GetObjectCommand) */}
          </li>
        ))}
      </ul>
    </div>
  );
}
