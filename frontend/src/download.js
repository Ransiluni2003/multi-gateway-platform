// client/src/download.js
async function downloadFile(filePath) {
  try {
    const resp = await fetch(`/api/file/${encodeURIComponent(filePath)}`);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get signed URL');
    }

    const { signedUrl, expiresAt } = await resp.json();
    if (!signedUrl) throw new Error('No signed URL returned');
    if (!expiresAt) throw new Error('No expiry info returned');
    if (Date.now() > expiresAt) throw new Error('Download link has expired. Please refresh and try again.');

    // perform secure GET
    const fileResp = await fetch(signedUrl);
    if (!fileResp.ok) throw new Error('Download failed');

    const blob = await fileResp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message || 'An error occurred during download.');
  }
}
