import React, { useState } from 'react';

export default function SupabaseDownloadButton({ fileKey, expires = 120, children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files/download-url?key=${encodeURIComponent(fileKey)}&expires=${expires}`);
      const data = await res.json();
      if (!res.ok || !data.downloadUrl) throw new Error(data.error || 'Failed to get signed URL');
      // Open the signed URL in a new tab or trigger download
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleDownload} disabled={loading} style={{ padding: '8px 16px', borderRadius: 6, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
        {loading ? 'Preparing…' : children || 'Download'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 6 }}>{error.includes('expired') ? 'Link expired. Please refresh.' : error}</div>}
    </div>
  );
}
