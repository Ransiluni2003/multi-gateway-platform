const axios = require('axios');

// Simple test: call the API to get a signed URL then attempt to HEAD/GET it
(async () => {
  const apiBase = process.env.API_BASE || 'http://localhost:5000';
  const fileKey = process.env.TEST_FILE_KEY || 'uploads/example.txt';
  try {
    console.log('Requesting signed download URL...');
    const resp = await axios.get(`${apiBase}/api/files/download-url`, { params: { key: fileKey, expires: 120 } });
    console.log('API response:', resp.data);

    const { downloadUrl, expiresAt } = resp.data;
    if (!downloadUrl) {
      console.error('No downloadUrl returned by API');
      process.exit(2);
    }

    console.log('Checking signed URL with HEAD...');
    try {
      const head = await axios.head(downloadUrl, { timeout: 5000 });
      console.log('HEAD status:', head.status);
    } catch (e) {
      console.error('HEAD to signed URL failed:', e.message || e);
      // Try GET to provide more info
      try {
        const get = await axios.get(downloadUrl, { responseType: 'stream', timeout: 5000 });
        console.log('GET status:', get.status);
      } catch (e2) {
        console.error('GET to signed URL failed:', e2.message || e2);
        process.exit(3);
      }
    }

    console.log('Signed URL appears valid and reachable. Expires at:', new Date(expiresAt).toISOString());
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.response ? err.response.data : err.message || err);
    process.exit(1);
  }
})();
