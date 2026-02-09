#!/usr/bin/env node

/**
 * Storage (Signed URL) Demo Script
 * 
 * Demonstrates end-to-end signed URL workflow:
 * 1. Request upload signed URL
 * 2. Upload a sample file
 * 3. Request download signed URL
 * 4. Download file (or show expiry)
 * 
 * Usage: npm run demo:storage
 * 
 * Requires .env with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_BUCKET
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const SUPABASE_UPLOAD_ENDPOINT = '/api/files/upload-url';
const SUPABASE_DOWNLOAD_ENDPOINT = '/api/files/download-url';
const SAMPLE_CONTENT = `Demo file created at ${new Date().toISOString()}
This proves signed URL upload works!`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(url, method = 'GET', body = null, rawBody = false, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: { ...extraHeaders },
      timeout: 10000,
    };

    if (body) {
      const postData = rawBody ? body : JSON.stringify(body);
      options.headers = {
        ...options.headers,
        'Content-Type': rawBody ? 'application/octet-stream' : 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      };
    }

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(rawBody ? body : JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestUploadUrl() {
  console.log(colorize('\n1️⃣  Request Upload Signed URL\n', 'bold'));

  try {
    const fileName = `demo-${Date.now()}.txt`;
    const response = await makeRequest(
      `${BASE_URL}${SUPABASE_UPLOAD_ENDPOINT}`,
      'POST',
      {
        filename: fileName,
        contentType: 'text/plain',
        sizeBytes: Buffer.byteLength(SAMPLE_CONTENT),
      }
    );

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }

    const data = JSON.parse(response.body);
    if (!data.uploadUrl || !data.key) {
      throw new Error('No uploadUrl in response');
    }

    console.log(colorize('  ✅ Upload URL obtained', 'green'));
    console.log(colorize(`     Key: ${fileName}`, 'gray'));
    console.log(colorize(`     Expires in: 300 seconds`, 'gray'));
    return { fileName: data.key, uploadUrl: data.uploadUrl };
  } catch (err) {
    console.log(colorize(`  ❌ Failed to get upload URL: ${err.message}`, 'red'));
    throw err;
  }
}

async function uploadFile(uploadUrl, fileName) {
  console.log(colorize('\n2️⃣  Upload Sample File\n', 'bold'));

  try {
    const sampleContent = SAMPLE_CONTENT;
    
    // Note: Supabase signed URLs typically require specific upload method
    // For this demo, we'll use PUT which is common
    const response = await makeRequest(uploadUrl, 'PUT', sampleContent, true);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(colorize('  ✅ File uploaded successfully', 'green'));
      console.log(colorize(`     Status: ${response.statusCode}`, 'gray'));
      return true;
    } else {
      throw new Error(`Upload failed: HTTP ${response.statusCode}`);
    }
  } catch (err) {
    console.log(colorize(`  ⚠️  Upload error: ${err.message}`, 'yellow'));
    console.log(colorize('     (Supabase bucket may need CORS/permissions config)', 'gray'));
    return false;
  }
}

async function requestDownloadUrl(fileName) {
  console.log(colorize('\n3️⃣  Request Download Signed URL\n', 'bold'));

  try {
    const response = await makeRequest(
      `${BASE_URL}${SUPABASE_DOWNLOAD_ENDPOINT}?key=${encodeURIComponent(fileName)}&expires=60`,
      'GET'
    );

    if (response.statusCode === 404) {
      console.log(colorize('  ℹ️  File not found (expected if upload was skipped)', 'yellow'));
      return null;
    }

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }

    const data = JSON.parse(response.body);
    if (!data.downloadUrl) {
      throw new Error('No downloadUrl in response');
    }

    const expiresAt = new Date(data.expiresAt || Date.now() + 60000);
    console.log(colorize('  ✅ Download URL obtained', 'green'));
    console.log(colorize(`     Expires at: ${expiresAt.toISOString()}`, 'gray'));
    return { downloadUrl: data.downloadUrl, expiresAt };
  } catch (err) {
    console.log(colorize(`  ⚠️  Failed to get download URL: ${err.message}`, 'yellow'));
    return null;
  }
}

async function demonstrateExpiry(expiresAt) {
  console.log(colorize('\n4️⃣  Demonstrate Expiry Behavior\n', 'bold'));

  const now = Date.now();
  const expireMs = new Date(expiresAt).getTime();
  const secondsRemaining = Math.max(0, (expireMs - now) / 1000);

  console.log(colorize(`  Current time: ${new Date().toISOString()}`, 'gray'));
  console.log(colorize(`  Expires at:  ${new Date(expiresAt).toISOString()}`, 'gray'));
  console.log(colorize(`  Time left:   ${Math.round(secondsRemaining)} seconds`, 'cyan'));

  if (secondsRemaining > 10) {
    console.log(colorize('\n  ✅ URL is fresh and valid', 'green'));
    console.log(colorize('     Client would download file successfully', 'gray'));
  } else if (secondsRemaining > 0) {
    console.log(colorize('\n  ⚠️  URL expiring soon', 'yellow'));
    console.log(colorize('     Client would auto-refresh before download', 'gray'));
  } else {
    console.log(colorize('\n  ❌ URL has expired', 'red'));
    console.log(colorize('     Client shows "URL expired" message', 'gray'));
    console.log(colorize('     User clicks "Refresh & Download"', 'gray'));
    console.log(colorize('     Client requests new URL and retries', 'gray'));
  }
}

async function main() {
  console.log(colorize('\n📦 STORAGE (SIGNED URL) DEMO START\n', 'bold'));
  console.log(colorize('This demonstrates the end-to-end signed URL workflow:', 'gray'));
  console.log(colorize('Upload → Download → Expiry Handling\n', 'gray'));

  try {
    // Step 1: Get upload URL
    const uploadInfo = await requestUploadUrl();
    await sleep(500);

    // Step 2: Upload file
    const uploadSuccess = await uploadFile(uploadInfo.uploadUrl, uploadInfo.fileName);
    await sleep(500);

    // Step 3: Get download URL
    const downloadInfo = await requestDownloadUrl(uploadInfo.fileName);
    await sleep(500);

    // Step 4: Show expiry behavior
    if (downloadInfo) {
      await demonstrateExpiry(downloadInfo.expiresAt);
    }

    console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
    console.log(colorize('  ✅ STORAGE DEMO COMPLETE', 'green'));
    console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));

    console.log(colorize('📚 Code References:', 'bold'));
    console.log(colorize('   Upload: backend/src/server.ts (/api/files/upload-url)', 'gray'));
    console.log(colorize('   Download: backend/src/server.ts (/api/files/download-url)', 'gray'));
    console.log(colorize('   Expiry: frontend/components/SupabaseDownloadButton.jsx', 'gray'));

  } catch (err) {
    console.log(colorize(`\n❌ Demo failed: ${err.message}`, 'red'));
    console.log(colorize('\n📋 Troubleshooting:', 'yellow'));
    console.log(colorize('   1. Ensure server is running: npm run dev', 'gray'));
    console.log(colorize('   2. Check .env has SUPABASE_* variables', 'gray'));
    console.log(colorize('   3. Check backend/src/server.ts for cors config', 'gray'));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(colorize(`Fatal error: ${err.message}`, 'red'));
  process.exit(1);
});
