'use client';

import { useState } from 'react';

/**
 * Storage Demo Page - Manual E2E Test for Signed URLs
 * 
 * Tests upload/download with signed URLs and expiry handling
 */
export default function StorageDemoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [fileKey, setFileKey] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('❌ Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('⏳ Generating signed upload URL...');

    try {
      // Step 1: Get signed upload URL
      const urlResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${urlResponse.status}`);
      }

      const { signedUrl, fileKey: key } = await urlResponse.json();
      setFileKey(key);

      setUploadStatus('⏳ Uploading file...');

      // Step 2: Upload file using signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      setUploadStatus(`✅ File uploaded successfully! Key: ${key}`);
    } catch (error) {
      setUploadStatus(`❌ Error: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (refresh = false) => {
    if (!fileKey) {
      setDownloadStatus('❌ No file to download. Upload a file first.');
      return;
    }

    setIsDownloading(true);
    setDownloadStatus(refresh ? '⏳ Refreshing URL and downloading...' : '⏳ Downloading...');

    try {
      // Get signed download URL (60 second expiry)
      const urlResponse = await fetch(
        `/api/storage/download?fileKey=${encodeURIComponent(fileKey)}&expiresIn=60`
      );

      if (!urlResponse.ok) {
        throw new Error(`Failed to get download URL: ${urlResponse.status}`);
      }

      const { signedUrl, expiresAt: expires } = await urlResponse.json();
      setExpiresAt(expires);

      // Download file
      const downloadResponse = await fetch(signedUrl);

      if (!downloadResponse.ok) {
        if (downloadResponse.status === 403 || downloadResponse.status === 401) {
          setDownloadStatus('❌ URL expired! Click "Refresh & Download" to get a new URL.');
          return;
        }
        throw new Error(`Download failed: ${downloadResponse.status}`);
      }

      // Trigger browser download
      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileKey.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadStatus(`✅ File downloaded! URL expires at ${new Date(expires).toLocaleString()}`);
    } catch (error) {
      setDownloadStatus(`❌ Error: ${(error as Error).message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        🗄️ Signed URL Storage Demo
      </h1>

      <div style={{
        padding: '1rem',
        backgroundColor: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
      }}>
        <p style={{ fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem' }}>
          <strong>What this tests:</strong>
        </p>
        <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#0369a1' }}>
          <li>Upload files using signed URLs (5 min expiry)</li>
          <li>Download files using signed URLs (60 sec expiry)</li>
          <li>Graceful handling when URLs expire</li>
          <li>Refresh mechanism to generate new URLs</li>
        </ul>
      </div>

      {/* Upload Section */}
      <div style={{
        padding: '1.5rem',
        border: '2px solid #e5e7eb',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          1️⃣ Upload File
        </h2>

        <input
          type="file"
          onChange={handleFileChange}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            width: '100%',
          }}
        />

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: (!file || isUploading) ? '#d1d5db' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: (!file || isUploading) ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>

        {uploadStatus && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: uploadStatus.startsWith('✅') ? '#d1fae5' : uploadStatus.startsWith('❌') ? '#fee2e2' : '#fef3c7',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}>
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Download Section */}
      <div style={{
        padding: '1.5rem',
        border: '2px solid #e5e7eb',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          2️⃣ Download File
        </h2>

        {fileKey && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            <strong>File Key:</strong> {fileKey}
          </div>
        )}

        {expiresAt && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: isExpired ? '#fee2e2' : '#fef3c7',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            <strong>URL Expires:</strong> {new Date(expiresAt).toLocaleString()}
            {isExpired && <span style={{ marginLeft: '0.5rem', color: '#991b1b', fontWeight: '600' }}>⚠️ EXPIRED</span>}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => handleDownload(false)}
            disabled={!fileKey || isDownloading}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              backgroundColor: (!fileKey || isDownloading) ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (!fileKey || isDownloading) ? 'not-allowed' : 'pointer',
            }}
          >
            {isDownloading ? 'Downloading...' : 'Download File'}
          </button>

          <button
            onClick={() => handleDownload(true)}
            disabled={!fileKey || isDownloading}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              backgroundColor: (!fileKey || isDownloading) ? '#d1d5db' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (!fileKey || isDownloading) ? 'not-allowed' : 'pointer',
            }}
          >
            Refresh & Download
          </button>
        </div>

        {downloadStatus && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: downloadStatus.startsWith('✅') ? '#d1fae5' : downloadStatus.startsWith('❌') ? '#fee2e2' : '#fef3c7',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}>
            {downloadStatus}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          💡 For Loom Recording
        </h3>
        <ol style={{ paddingLeft: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
          <li>Upload a file → show success message</li>
          <li>Click "Download File" → file downloads successfully</li>
          <li>Wait 60 seconds (or fast-forward video)</li>
          <li>Click "Download File" again → see "URL expired" error</li>
          <li>Click "Refresh & Download" → new URL generated, file downloads</li>
        </ol>
      </div>
    </div>
  );
}
