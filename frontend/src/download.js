// client/src/download.js
async function downloadFile(filePath) {
  const resp = await fetch(`/api/file/${encodeURIComponent(filePath)}`);
  if (!resp.ok) throw new Error('Failed to get signed URL');

  const { signedUrl, expiresAt } = await resp.json();
  // optional: check expiresAt
  if (Date.now() > expiresAt) throw new Error('URL already expired');

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
}
