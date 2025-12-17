import React, { useState, useRef } from 'react';
import Toast from './Toast';

export default function SupabaseDownloadButton({ fileKey, expires = 120, children, onDownloadStart, onDownloadSuccess, onDownloadError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const urlCacheRef = useRef({ url: null, expiresAt: null });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDownloadUrl = async () => {
    console.log('[SUPABASE] Fetching signed URL for:', fileKey, 'with expiry:', expires, 'seconds');
    const res = await fetch(`/api/files/download-url?key=${encodeURIComponent(fileKey)}&expires=${expires}`);
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.error('[SUPABASE] JSON parse error:', jsonErr);
      return { error: 'Download failed or link expired.' };
    }
    
    if (!res.ok) {
      // Map technical errors to user-friendly messages
      if (res.status === 401) {
        console.warn('[SUPABASE] Unauthorized (401) - URL likely expired');
        return { error: 'Download link expired. Please try again.', code: 401 };
      }
      if (res.status === 403) {
        console.warn('[SUPABASE] Forbidden (403) - Access denied');
        return { error: 'Download link expired. Please try again.', code: 403 };
      }
      if (res.status === 404) {
        console.error('[SUPABASE] Not Found (404) - File does not exist:', fileKey);
        return { error: 'File not found.', code: 404 };
      }
      if (res.status === 400) {
        // Replace technical validation errors with friendly message
        console.error('[SUPABASE] Bad Request (400):', data?.error);
        const friendly = data?.error?.toLowerCase()?.includes('not found')
          ? 'File not found.'
          : 'Request error. Please contact support.';
        return { error: friendly, code: 400 };
      }
      if (res.status >= 500) {
        console.error('[SUPABASE] Server Error:', res.status);
        return { error: 'Server error. Please try again later.', code: res.status };
      }
      // Generic fallback for other errors
      console.error('[SUPABASE] Unexpected error:', res.status);
      return { error: 'Download failed. Please try again.', code: res.status };
    }
    
    if (!data.downloadUrl) {
      console.error('[SUPABASE] No download URL in response');
      return { error: 'No download link available.' };
    }

    const expiresAt = data.expiresAt || (Date.now() + expires * 1000);
    console.log('[SUPABASE] Signed URL obtained. Expires at:', new Date(expiresAt).toISOString());
    
    return { 
      url: data.downloadUrl, 
      expiresAt: expiresAt
    };
  };

  const isUrlExpired = (expiresAt) => {
    if (!expiresAt) return true;
    // Add 5-second buffer for network latency
    const expired = Date.now() >= (expiresAt - 5000);
    if (expired) {
      console.log('[SUPABASE EXPIRY] URL expired detected. Current time:', new Date(Date.now()).toISOString(), 'Expires at:', new Date(expiresAt).toISOString());
    }
    return expired;
  };

  const checkUrlValid = async (url) => {
    try {
      // If URL is cross-origin, skip HEAD validation to avoid CORS/405 issues; assume valid.
      if (typeof window !== 'undefined') {
        const target = new URL(url, window.location.href);
        if (target.origin !== window.location.origin) {
          console.log('[SUPABASE] Cross-origin URL, skipping validation');
          return { valid: true };
        }
      }

      console.log('[SUPABASE] Validating URL with HEAD request');
      const fileRes = await fetch(url, { method: 'HEAD', redirect: 'manual' });
      console.log('[SUPABASE] HEAD response status:', fileRes.status);
      
      // Check for expired/invalid signatures (401, 403, 404)
      if (fileRes.status === 401 || fileRes.status === 403) {
        console.warn('[SUPABASE] URL signature expired (status:', fileRes.status + ')');
        return { valid: false, expired: true };
      }
      if (fileRes.status === 404) {
        console.error('[SUPABASE] File not found (404)');
        return { valid: false, expired: false, notFound: true };
      }
      if (fileRes.status >= 200 && fileRes.status < 300) {
        console.log('[SUPABASE] URL validation successful');
        return { valid: true };
      }
      
      console.warn('[SUPABASE] URL validation failed with status:', fileRes.status);
      return { valid: false };
    } catch (err) {
      console.error('[SUPABASE] URL validation error:', err.message);
      return { valid: false, error: err.message };
    }
  };

  const downloadWithRetry = async (maxRetries = 2) => {
    setLoading(true);
    setError(null);
    let currentRetry = 0;

    onDownloadStart?.();

    while (currentRetry <= maxRetries) {
      try {
        // Check if cached URL is still valid
        let downloadUrl = urlCacheRef.current.url;
        let expiresAt = urlCacheRef.current.expiresAt;

        if (!downloadUrl || isUrlExpired(expiresAt)) {
          showToast('Fetching download link...', 'info');
          
          const result = await fetchDownloadUrl();
          if (result.error) {
            if (result.code === 404) {
              showToast('File not found.', 'error');
              setError(result.error);
              onDownloadError?.(result.error);
              setLoading(false);
              return;
            }
            
            if (currentRetry < maxRetries) {
              showToast(`Attempt ${currentRetry + 1} failed. Retrying...`, 'warning');
              currentRetry++;
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
              continue;
            } else {
              showToast(result.error, 'error');
              setError(result.error);
              onDownloadError?.(result.error);
              setLoading(false);
              return;
            }
          }

          downloadUrl = result.url;
          expiresAt = result.expiresAt;
          urlCacheRef.current = { url: downloadUrl, expiresAt };
        }

        // Validate URL before using
        const validation = await checkUrlValid(downloadUrl);
        
        if (validation.expired) {
          showToast('Link expired. Refreshing...', 'warning');
          urlCacheRef.current = { url: null, expiresAt: null }; // Clear cache
          currentRetry++;
          continue;
        }

        if (validation.notFound) {
          showToast('File not found.', 'error');
          setError('File not found.');
          onDownloadError?.('File not found.');
          setLoading(false);
          return;
        }

        if (!validation.valid) {
          if (currentRetry < maxRetries) {
            showToast('Link validation failed. Retrying...', 'warning');
            urlCacheRef.current = { url: null, expiresAt: null };
            currentRetry++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } else {
            showToast('Download link invalid.', 'error');
            setError('Download link is invalid.');
            onDownloadError?.('Invalid download link.');
            setLoading(false);
            return;
          }
        }

        // Success - open download
        showToast('Starting download...', 'success');
        window.open(downloadUrl, '_blank');
        onDownloadSuccess?.();
        setLoading(false);
        setRetryCount(currentRetry);
        return;

      } catch (err) {
        console.error('Download error:', err);
        if (currentRetry < maxRetries) {
          showToast('Download failed. Retrying...', 'warning');
          currentRetry++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          showToast('Download failed after retries.', 'error');
          setError('Download failed. Please try again.');
          onDownloadError?.(err.message);
          setLoading(false);
          return;
        }
      }
    }
  };

  // Handles download with signed URL expiry detection and refresh logic
  const handleDownload = async () => {
    await downloadWithRetry(2);
  };

  return (
    <div>
      <button 
        onClick={handleDownload} 
        disabled={loading} 
        style={{ 
          padding: '8px 16px', 
          borderRadius: 6, 
          background: loading ? '#9ca3af' : '#7c3aed', 
          color: '#fff', 
          border: 'none', 
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? 'Preparing…' : children || 'Download'}
      </button>
      {error && <div style={{ color: '#ef4444', marginTop: 6, fontSize: 12 }}>{error}</div>}
      {retryCount > 0 && !error && !loading && (
        <div style={{ color: '#10b981', marginTop: 4, fontSize: 11 }}>
          ✓ Downloaded (after {retryCount} {retryCount === 1 ? 'retry' : 'retries'})
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
