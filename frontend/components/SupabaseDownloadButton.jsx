import React, { useState } from 'react';

export default function SupabaseDownloadButton({ fileKey, expires = 120, children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDownloadUrl = async () => {
    const res = await fetch(`/api/files/download-url?key=${encodeURIComponent(fileKey)}&expires=${expires}`);
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      return { error: 'Download failed or link expired.' };
    }
    if (!res.ok || !data.downloadUrl) {
      return { error: data?.error || 'Download failed or link expired.' };
    }
    return { url: data.downloadUrl };
  };

  const checkUrlValid = async (url) => {
    const fileRes = await fetch(url, { method: 'HEAD' });
    const contentType = fileRes.headers.get('content-type');
    if (fileRes.status !== 200 || (contentType && contentType.includes('text/html'))) {
      return false;
    }
    return true;
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    let attempt = 0;
    let maxAttempts = 2;
    while (attempt < maxAttempts) {
      const { url, error } = await fetchDownloadUrl();
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      const valid = await checkUrlValid(url);
      if (valid) {
        window.open(url, '_blank');
        setLoading(false);
        return;
      }
      attempt++;
    }
    setError('Download failed or link expired.');
    setLoading(false);
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
