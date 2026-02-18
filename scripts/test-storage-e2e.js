#!/usr/bin/env node

/**
 * Storage Signed URLs E2E Test
 * 
 * Tests the complete signed URL flow:
 * 1. Generate upload signed URL
 * 2. Upload file
 * 3. Generate download signed URL
 * 4. Download file
 * 5. Wait for URL expiry
 * 6. Verify expired URL is rejected
 * 7. Generate fresh URL and download again
 * 
 * Usage:
 *   node scripts/test-storage-e2e.js [BASE_URL]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TEST_FILE_CONTENT = 'This is a test file for signed URL verification';
const TEST_FILE_NAME = 'test-signed-url.txt';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'string') {
        req.write(body);
      } else if (Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }

    req.end();
  });
}

async function sleep(ms) {
  console.log(colorize(`⏳ Waiting ${ms / 1000} seconds...`, 'yellow'));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(step, message) {
  console.log(colorize(`\n[Step ${step}] ${message}`, 'cyan'));
}

function logSuccess(message) {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function logError(message) {
  console.log(colorize(`❌ ${message}`, 'red'));
}

function logInfo(message) {
  console.log(colorize(`   ${message}`, 'gray'));
}

async function testSignedURLFlow() {
  console.log();
  console.log(colorize('╔═══════════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║       🔒 Signed URL Storage E2E Test                          ║', 'cyan'));
  console.log(colorize('╚═══════════════════════════════════════════════════════════════╝', 'cyan'));
  console.log();
  console.log(colorize(`Base URL: ${BASE_URL}`, 'gray'));
  console.log(colorize(`Test File: ${TEST_FILE_NAME}`, 'gray'));
  console.log();

  let uploadUrl = null;
  let downloadUrl = null;
  let fileKey = null;

  try {
    // Step 1: Generate upload signed URL
    logStep(1, 'Generate upload signed URL');
    
    const uploadUrlResponse = await makeRequest(
      `${BASE_URL}/api/storage/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { fileName: TEST_FILE_NAME, contentType: 'text/plain' }
    );

    if (uploadUrlResponse.statusCode !== 200) {
      logError(`Failed to generate upload URL: ${uploadUrlResponse.statusCode}`);
      logInfo(`Response: ${uploadUrlResponse.body}`);
      return false;
    }

    const uploadData = JSON.parse(uploadUrlResponse.body);
    uploadUrl = uploadData.signedUrl;
    fileKey = uploadData.fileKey || uploadData.path;

    if (!uploadUrl) {
      logError('No signed upload URL returned');
      return false;
    }

    logSuccess(`Upload URL generated (expires in ${uploadData.expiresIn || 300}s)`);
    logInfo(`File key: ${fileKey}`);

    // Step 2: Upload file using signed URL
    logStep(2, 'Upload file using signed URL');

    const uploadResponse = await makeRequest(
      uploadUrl,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': TEST_FILE_CONTENT.length.toString(),
        },
      },
      TEST_FILE_CONTENT
    );

    if (uploadResponse.statusCode < 200 || uploadResponse.statusCode >= 300) {
      logError(`Upload failed: ${uploadResponse.statusCode}`);
      logInfo(`Response: ${uploadResponse.body}`);
      return false;
    }

    logSuccess('File uploaded successfully');

    // Small delay to ensure upload is processed
    await sleep(2000);

    // Step 3: Generate download signed URL
    logStep(3, 'Generate download signed URL (60s expiry)');

    const downloadUrlResponse = await makeRequest(
      `${BASE_URL}/api/storage/download?fileKey=${encodeURIComponent(fileKey)}&expiresIn=60`,
      { method: 'GET' }
    );

    if (downloadUrlResponse.statusCode !== 200) {
      logError(`Failed to generate download URL: ${downloadUrlResponse.statusCode}`);
      logInfo(`Response: ${downloadUrlResponse.body}`);
      return false;
    }

    const downloadData = JSON.parse(downloadUrlResponse.body);
    downloadUrl = downloadData.signedUrl;

    if (!downloadUrl) {
      logError('No signed download URL returned');
      return false;
    }

    logSuccess('Download URL generated (expires in 60s)');
    logInfo(`Expires at: ${new Date(downloadData.expiresAt).toISOString()}`);

    // Step 4: Download file using signed URL
    logStep(4, 'Download file using signed URL');

    const downloadResponse = await makeRequest(downloadUrl, { method: 'GET' });

    if (downloadResponse.statusCode !== 200) {
      logError(`Download failed: ${downloadResponse.statusCode}`);
      logInfo(`Response: ${downloadResponse.body}`);
      return false;
    }

    if (downloadResponse.body !== TEST_FILE_CONTENT) {
      logError('Downloaded content does not match uploaded content');
      logInfo(`Expected: ${TEST_FILE_CONTENT}`);
      logInfo(`Got: ${downloadResponse.body}`);
      return false;
    }

    logSuccess('File downloaded successfully with correct content');

    // Step 5: Wait for URL to expire (65 seconds to be safe)
    logStep(5, 'Testing URL expiry behavior');
    await sleep(65000);

    // Step 6: Try to download with expired URL
    logStep(6, 'Attempt download with expired URL');

    const expiredDownloadResponse = await makeRequest(downloadUrl, { method: 'GET' });

    if (expiredDownloadResponse.statusCode !== 403 && expiredDownloadResponse.statusCode !== 401) {
      logError(`Expected 403/401 for expired URL, got ${expiredDownloadResponse.statusCode}`);
      logInfo('Expired URLs should be rejected!');
      return false;
    }

    logSuccess('Expired URL correctly rejected (403 Forbidden)');

    // Step 7: Generate fresh URL and download again
    logStep(7, 'Generate fresh download URL after expiry');

    const freshDownloadUrlResponse = await makeRequest(
      `${BASE_URL}/api/storage/download?fileKey=${encodeURIComponent(fileKey)}&expiresIn=60`,
      { method: 'GET' }
    );

    if (freshDownloadUrlResponse.statusCode !== 200) {
      logError(`Failed to generate fresh URL: ${freshDownloadUrlResponse.statusCode}`);
      return false;
    }

    const freshDownloadData = JSON.parse(freshDownloadUrlResponse.body);
    const freshDownloadUrl = freshDownloadData.signedUrl;

    logSuccess('Fresh download URL generated');

    // Step 8: Download with fresh URL
    logStep(8, 'Download file with fresh URL');

    const freshDownloadResponse = await makeRequest(freshDownloadUrl, { method: 'GET' });

    if (freshDownloadResponse.statusCode !== 200) {
      logError(`Fresh download failed: ${freshDownloadResponse.statusCode}`);
      return false;
    }

    if (freshDownloadResponse.body !== TEST_FILE_CONTENT) {
      logError('Downloaded content does not match with fresh URL');
      return false;
    }

    logSuccess('File downloaded successfully with fresh URL');

    // All tests passed
    console.log();
    console.log(colorize('='.repeat(80), 'cyan'));
    console.log(colorize('✅ ALL SIGNED URL TESTS PASSED', 'green'));
    console.log(colorize('='.repeat(80), 'cyan'));
    console.log();
    console.log(colorize('Summary:', 'bold'));
    console.log(colorize('  ✅ Upload signed URL generation', 'green'));
    console.log(colorize('  ✅ File upload via signed URL', 'green'));
    console.log(colorize('  ✅ Download signed URL generation', 'green'));
    console.log(colorize('  ✅ File download via signed URL', 'green'));
    console.log(colorize('  ✅ Expired URL rejection (security)', 'green'));
    console.log(colorize('  ✅ Fresh URL generation after expiry', 'green'));
    console.log();

    return true;
  } catch (error) {
    logError(`Test failed with error: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Run test
testSignedURLFlow()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(colorize(`\nFATAL ERROR: ${error.message}`, 'red'));
    console.error(error);
    process.exit(1);
  });
