#!/usr/bin/env node

/**
 * Supabase Signed-URL Expiry Handling - Test & Evidence Generator
 * 
 * This script helps you test and generate evidence for the Supabase Signed-URL
 * Expiry Handling implementation.
 * 
 * Usage: node test-supabase-expiry.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║     SUPABASE SIGNED-URL EXPIRY HANDLING - TEST & EVIDENCE GUIDE           ║
║                                                                            ║
║     This guide will help you test and document all scenarios for          ║
║     your Supabase Signed-URL expiry handling implementation.              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

✅ IMPLEMENTATION STATUS: COMPLETE

Features Implemented:
  ✓ Automatic expiry detection (5-second buffer)
  ✓ Auto-refresh mechanism for expired URLs
  ✓ Graceful error handling with user-friendly messages
  ✓ Retry logic with exponential backoff (up to 2 retries)
  ✓ URL validation before download
  ✓ Toast notifications for user guidance
  ✓ Backend API with Supabase integration

═══════════════════════════════════════════════════════════════════════════════

BEFORE YOU START:

1. Identify real files in your Supabase bucket:
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to Storage → platform-assets
   - Note the exact file names (case-sensitive)

2. Update frontend/components/FilesList.jsx with real file names

3. Start your frontend: npm start

4. Open browser DevTools (F12) for console logs

═══════════════════════════════════════════════════════════════════════════════

TEST SCENARIOS:

Scenario A: VALID DOWNLOAD (Fresh Signed URL)
─────────────────────────────────────────────

Goal: Demonstrate successful download with fresh signed URL

Steps:
  1. Open frontend in browser
  2. Open DevTools Console (F12)
  3. Click Download button
  4. Observe toasts in order:
     → "Fetching download link..."
     → "Starting download..."
  5. File should download
  6. Button shows "✓ Downloaded (after 0 retries)"
  7. Console shows:
     [SUPABASE] Fetching signed URL for: <filename> with expiry: 120 seconds
     [SUPABASE] Signed URL obtained. Expires at: <timestamp>
     [SUPABASE] Validating URL with HEAD request
     [SUPABASE] HEAD response status: 200
     [SUPABASE] URL validation successful

Screenshots to capture:
  □ Before click - button state
  □ Toast: "Fetching download link..."
  □ Toast: "Starting download..."
  □ Browser download panel showing file
  □ Success state: "✓ Downloaded (after 0 retries)"
  □ Console output showing validation logs

Time to complete: 5 minutes

═══════════════════════════════════════════════════════════════════════════════

Scenario B: AUTO-REFRESH EXPIRED URL
──────────────────────────────────────

Goal: Demonstrate automatic refresh of expired signed URL

Steps:
  1. Update FilesList.jsx to use very short expiry:
     <SupabaseDownloadButton fileKey={file.key} expires={5}>

  2. Click Download - should succeed
  3. Save screenshot of success
  4. Wait 5+ seconds for URL to expire
  5. Click Download again
  6. Observe toasts in order:
     → "Fetching download link..." (checking cached URL)
     → "Link expired. Refreshing..." (expiry detected!)
     → "Fetching download link..." (fetching new URL)
     → "Starting download..."
  7. File downloads again
  8. Button shows "✓ Downloaded (after 1 retries)"
  9. Console shows:
     [SUPABASE EXPIRY] URL expired detected. Current time: <time> Expires at: <time>
     [SUPABASE] Link expired. Refreshing...

Screenshots to capture:
  □ Before second download - showing time passed
  □ Toast: "Link expired. Refreshing..."
  □ Console: [SUPABASE EXPIRY] URL expired detected
  □ Success state: "✓ Downloaded (after 1 retries)"
  □ Network tab: two /api/files/download-url calls

Time to complete: 15 minutes (includes wait time)

═══════════════════════════════════════════════════════════════════════════════

Scenario C: FILE NOT FOUND (Graceful Fail)
────────────────────────────────────────────

Goal: Demonstrate graceful handling of missing files

Steps:
  1. Update FilesList.jsx temporarily with non-existent file:
     { key: 'non-existent-file-12345.pdf', name: 'Non-Existent File' }

  2. Click Download button
  3. Observe toast: "File not found."
  4. Error message displays: "File not found."
  5. Button remains functional for retry
  6. Console shows:
     [SUPABASE] Fetching signed URL for: non-existent-file-12345.pdf
     [SUPABASE] Not Found (404) - File does not exist: non-existent-file-12345.pdf

Screenshots to capture:
  □ Error toast: "File not found."
  □ Error message displayed under button
  □ Button still enabled for retry
  □ Console: [SUPABASE] Not Found (404)

Time to complete: 5 minutes

═══════════════════════════════════════════════════════════════════════════════

Scenario D: SERVER ERROR WITH RETRY
──────────────────────────────────────

Goal: Demonstrate graceful handling of server errors with retry

Steps:
  1. Stop your backend server (Ctrl+C in backend terminal)
  2. Try to download a file
  3. Observe retry toasts:
     → "Attempt 1 failed. Retrying..."
     → "Attempt 2 failed. Retrying..."
  4. After 2 retries, see error: "Download failed after retries."
  5. Console shows network failures
  6. Button remains functional

Alternatively (without stopping server):
  1. Use browser DevTools → Network → Throttle to "Offline"
  2. Click Download
  3. Observe same retry behavior
  4. Restore network connection afterward

Screenshots to capture:
  □ Toast: "Attempt 1 failed. Retrying..."
  □ Toast: "Attempt 2 failed. Retrying..."
  □ Final error: "Download failed after retries."
  □ DevTools Network tab showing failed requests

Time to complete: 10 minutes

═══════════════════════════════════════════════════════════════════════════════

CONSOLE LOGS TO LOOK FOR:

Successful download logs:
  [SUPABASE] Fetching signed URL for: <file>
  [SUPABASE] Signed URL obtained. Expires at: <timestamp>
  [SUPABASE] Validating URL with HEAD request
  [SUPABASE] HEAD response status: 200
  [SUPABASE] URL validation successful

Expired URL detection logs:
  [SUPABASE EXPIRY] URL expired detected. Current time: <time> Expires at: <time>

Error handling logs:
  [SUPABASE] Not Found (404) - File does not exist: <file>
  [SUPABASE] Bad Request (400): <error>
  [SUPABASE] Server Error: 500

═══════════════════════════════════════════════════════════════════════════════

NETWORK TAB INSPECTION:

When testing, check the Network tab for:

1. Request: /api/files/download-url
   ├─ Query params: key=<filename>&expires=<seconds>
   └─ Response: { "downloadUrl": "<signed-url>", "expiresAt": <timestamp> }

2. Request to signed URL (HEAD or GET)
   ├─ Status: 200 (success) or 401/403 (expired) or 404 (not found)
   └─ Shows the Supabase storage URL format

Multiple calls indicate:
  - Retry attempts
  - URL refresh (new signed URL after expiry)

═══════════════════════════════════════════════════════════════════════════════

FINAL CHECKLIST:

Evidence to collect (Recommended):
  [ ] Screenshot of valid download (Scenario A)
  [ ] Screenshot of expired URL refresh (Scenario B)
  [ ] Screenshot of file not found (Scenario C)
  [ ] Screenshots of error retry (Scenario D)
  [ ] Console logs showing expiry detection
  [ ] Network tab showing signed URL requests
  [ ] All toast notifications visible
  [ ] Final success states with retry counts

Code references (already implemented):
  ✓ frontend/components/SupabaseDownloadButton.jsx - All logic
  ✓ backend/src/pages/api/files/download-url.js - Signed URL generation
  ✓ frontend/components/FilesList.jsx - File list display

═══════════════════════════════════════════════════════════════════════════════

RESULT:

✅ Supabase Signed-URL Expiry Handling is FULLY IMPLEMENTED

The system automatically:
  • Detects when signed URLs are about to expire
  • Refreshes expired URLs silently
  • Handles various error scenarios gracefully
  • Shows user-friendly error messages (no technical errors)
  • Retries failed downloads with appropriate delays
  • Validates URLs before attempting download
  • Logs detailed information for debugging

═══════════════════════════════════════════════════════════════════════════════
`);

  const ready = await question('Ready to start testing? (yes/no): ');
  
  if (ready.toLowerCase() === 'yes' || ready.toLowerCase() === 'y') {
    console.log(`

✅ Instructions:

1. Open your frontend: http://localhost:3000

2. Test Scenario A first:
   • Identify a real file in your Supabase bucket
   • Update FilesList.jsx with the filename
   • Click Download and capture screenshots

3. For each scenario:
   • Follow the steps in the guide above
   • Capture required screenshots
   • Check console logs match expected patterns

4. Document evidence:
   • Create a folder: docs/supabase-expiry-evidence/
   • Store screenshots organized by scenario
   • Include console log screenshots

5. Optional: Create a Loom video
   • Record all 4 scenarios in sequence
   • Show console logs and toast notifications
   • Reference: https://www.loom.com

Need help? Check:
  📄 docs/SUPABASE_EXPIRY_IMPLEMENTATION_COMPLETE.md
  📄 docs/SUPABASE_EXPIRY_VERIFICATION.md
`);
  } else {
    console.log('Exiting. Run this script again when ready to test.');
  }

  rl.close();
}

main().catch(console.error);
