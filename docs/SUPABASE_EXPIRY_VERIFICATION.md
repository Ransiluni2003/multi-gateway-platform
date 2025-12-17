# Supabase Signed-URL Expiry Handling - Verification Guide

## Current Implementation Status

### ✅ Completed Features

#### 1. **Expiry Detection** (`SupabaseDownloadButton.jsx`)
```javascript
const isUrlExpired = (expiresAt) => {
  if (!expiresAt) return true;
  // Add 5-second buffer for network latency
  return Date.now() >= (expiresAt - 5000);
};
```
- Detects expired URLs with 5-second grace period
- Checks timestamp before attempting download

#### 2. **Auto-Refresh Mechanism**
```javascript
if (validation.expired) {
  showToast('Link expired. Refreshing...', 'warning');
  urlCacheRef.current = { url: null, expiresAt: null }; // Clear cache
  currentRetry++;
  continue;
}
```
- Automatically refreshes expired URLs
- Clears cache and retries
- Shows user notification during refresh

#### 3. **Error Handling & User Messages**
- 401/403: "Download link expired. Please try again."
- 404: "File not found."
- 400: "Request error. Please contact support."
- 500+: "Server error. Please try again later."
- Maps technical errors to friendly messages

#### 4. **Retry Logic**
- Up to 2 retries for failed downloads
- 1-second delay between retries
- Handles transient failures gracefully

#### 5. **URL Validation**
```javascript
const checkUrlValid = async (url) => {
  // HEAD request to validate URL before download
  // Detects 401, 403, 404 status codes
  // Handles CORS gracefully for cross-origin URLs
};
```

### ⚠️ Current Issue
**Files not found in Supabase bucket** - `FilesList.jsx` references files that may not exist:
- `Form I-3A - week 13.pdf`
- `undefined.jpeg`

## Verification Steps

### Step 1: Prepare Test Files
You need to upload test files to your Supabase bucket `platform-assets`:

1. Log into your Supabase dashboard
2. Navigate to Storage → platform-assets
3. Upload test files:
   - `test-document.pdf` (valid file for testing)
   - Or use existing files from your bucket

### Step 2: Update FilesList.jsx with Real Files
Update `frontend/components/FilesList.jsx` with actual files in your bucket:
```jsx
const files = [
  { key: 'your-actual-file-1.pdf', name: 'Your File 1' },
  { key: 'your-actual-file-2.pdf', name: 'Your File 2' },
];
```

### Step 3: Test Scenarios

#### Scenario A: Valid Download (Fresh Signed URL)
**Expected Behavior:**
1. Click Download button
2. Toast shows "Fetching download link..."
3. Toast shows "Starting download..."
4. File downloads successfully
5. Shows "✓ Downloaded (after 0 retries)"

**Evidence to Capture:**
- Screenshot of successful download toast
- Browser download showing file received
- Success indicator on button

#### Scenario B: Expired URL Auto-Refresh
**Expected Behavior:**
1. First download works
2. Wait for URL to expire (depends on `expires` param, default 120s)
3. Try download again within expiry window
4. System detects near-expiry
5. Toast shows "Link expired. Refreshing..."
6. Auto-fetches new signed URL
7. Download succeeds with retry count > 0

**Evidence to Capture:**
- Console logs showing expiry detection
- Toast notification for refresh
- Download success after refresh
- Retry counter displayed

#### Scenario C: File Not Found (Graceful Fail)
**Expected Behavior:**
1. Try downloading non-existent file
2. Toast shows "File not found."
3. Error message displays clearly
4. Button remains functional for retry

**To Test:**
- Update FilesList.jsx temporarily with non-existent file key
- Click Download

**Evidence to Capture:**
- Error toast notification
- Error message display
- Button state after error

#### Scenario D: Server Error (Graceful Fail)
**Expected Behavior:**
1. Stop backend server
2. Click Download button
3. Toast shows "Attempt 1 failed. Retrying..."
4. After 2 retries, shows "Download failed after retries."
5. User-friendly error message

**Evidence to Capture:**
- Retry toast notifications
- Final error message
- No technical error leaking to user

### Step 4: Create Test Document
Create a simple test PDF or reuse an existing file:
```bash
# Option 1: Upload from Supabase dashboard
# Option 2: Use any existing file from your bucket
```

### Step 5: Browser Developer Tools Verification
Open DevTools (F12) and check:

**Network Tab:**
- Watch `/api/files/download-url` requests
- See signed URL in response
- Verify `expiresAt` timestamp

**Console Tab:**
- Watch for expiry detection logs
- Confirm no JavaScript errors
- See retry attempts logged

## Code Locations

| Feature | File | Lines |
|---------|------|-------|
| Expiry Detection | `frontend/components/SupabaseDownloadButton.jsx` | 55-60 |
| Auto-Refresh | `frontend/components/SupabaseDownloadButton.jsx` | 139-144 |
| Error Handling | `frontend/components/SupabaseDownloadButton.jsx` | 19-46 |
| Retry Logic | `frontend/components/SupabaseDownloadButton.jsx` | 87-195 |
| URL Validation | `frontend/components/SupabaseDownloadButton.jsx` | 62-81 |
| Backend API | `backend/src/pages/api/files/download-url.js` | 1-20 |

## Success Criteria

✅ **All tests pass:**
- [ ] Valid download works with fresh signed URL
- [ ] Expired URL is detected and auto-refreshed
- [ ] File not found fails gracefully
- [ ] Server errors retry and fail gracefully
- [ ] User sees friendly error messages (no technical errors)
- [ ] Toast notifications guide user through process
- [ ] Retry counter displays after success

✅ **Evidence collected:**
- [ ] Screenshots of all 4 scenarios
- [ ] Console logs showing expiry detection
- [ ] Network tab showing signed URL with expiresAt
- [ ] Toast notifications visible in screenshots
- [ ] Error handling working correctly

## Screenshots to Capture

1. **test-document.pdf** - Successful download flow
2. **Error message** - "Request error. Please contact support." (for invalid files)
3. **Retry notification** - "Link expired. Refreshing..."
4. **Success indicator** - "✓ Downloaded (after X retries)"

---

**Result:** Signed-URL Expiry Handling is **FULLY IMPLEMENTED** and ready for demonstration once test files are in place.
