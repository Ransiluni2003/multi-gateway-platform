import React, { useEffect, useState } from 'react';
import SupabaseDownloadButton from './SupabaseDownloadButton';

export default function FilesList() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/files/list');
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch files');
        }
        
        const data = await res.json();
        setFiles(data.files || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError(err.message);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>My Files</h2>
        <p>Loading files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>My Files</h2>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>
          ⚠️ Error loading files: {error}
        </div>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>
          Make sure you have files in your Supabase 'platform-assets' bucket.
        </p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h2>My Files</h2>
        <p style={{ color: '#9ca3af' }}>
          No files found in your Supabase bucket. Upload files to 'platform-assets' bucket to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>My Files</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {files.map((file) => (
          <li key={file.key} style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 'bold' }}>{file.name}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
              {file.size > 0 && `${(file.size / 1024).toFixed(1)} KB`}
            </div>
            <SupabaseDownloadButton fileKey={file.key} expires={120}>
              Download
            </SupabaseDownloadButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
