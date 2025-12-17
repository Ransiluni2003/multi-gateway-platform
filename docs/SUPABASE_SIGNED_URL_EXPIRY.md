# Supabase Signed-URL Expiry Handling

## Overview
Fully implemented expiry handling for Supabase signed URLs with:
- ✅ Automatic expiry detection
- ✅ Auto-refresh on expiry
- ✅ Retry logic (up to 2 retries)
- ✅ Graceful error handling (404, 401, network errors)
- ✅ Toast notifications for user feedback
- ✅ URL validation before download

## Files Changed

### Frontend
1. **`frontend/components/SupabaseDownloadButton.jsx`** - Enhanced download button with:
   - URL caching with expiry timestamp
   - Automatic expiry detection (5s buffer)
   - Retry logic with exponential backoff
   - HEAD request validation before download
   - Error handling for 401/403/404
   - Toast notifications
   - Callbacks for lifecycle events

2. **`frontend/components/Toast.jsx`** - New toast notification component
   - Auto-dismiss after 4s
   - Color-coded by type (success/error/warning/info)
   - Slide-in animation

3. **`frontend/app/download-test/page.jsx`** - Demo test page with 4 scenarios:
   - ✅ Valid file (normal flow)
   - ⏰ Short expiry (5s) - auto-refresh demo
   - ❌ Non-existent file (404 error)
   - 🔄 Auto-retry test

### Backend
- **`backend/src/server.ts`** - Already returns `expiresAt` timestamp
  - Line 205: `const expiresAt = Date.now() + expiresSeconds * 1000;`
  - Line 228: `res.json({ downloadUrl: signedUrl, expiresAt });`

## How It Works

### 1. Expiry Detection
```javascript
const isUrlExpired = (expiresAt) => {
  if (!expiresAt) return true;
  // Add 5-second buffer for network latency
  return Date.now() >= (expiresAt - 5000);
};
```

### 2. Auto-Refresh Flow
1. User clicks download
2. Check cached URL expiry
3. If expired → fetch new URL from API
4. If fetch fails → retry up to 2 times
5. Validate URL with HEAD request
6. If validation fails (401/403) → treat as expired, refresh
7. Open download in new tab

### 3. Error Handling
- **404** → Show "File not found", no retry
- **401/403** → Treat as expired, auto-refresh
- **Network errors** → Retry with 1s delay
- **Validation failures** → Retry up to limit

### 4. User Feedback
- Toast notifications for all states
- Inline error messages
- Retry counter on success
- Loading states

## Testing Instructions

### 1. Start the Application
```bash
# Backend
cd backend
npm run dev

# Frontend  
cd frontend
npm run dev
```

### 2. Access Test Page
Navigate to: `http://localhost:3000/download-test`

### 3. Test Each Scenario

#### Scenario 1: Valid Download ✅
- Click "Test Download" on first scenario
- Should show toast: "Fetching download link..."
- Then: "Starting download..."
- File opens in new tab
- No errors displayed

#### Scenario 2: Expired URL ⏰
- Click "Test Download" on second scenario (5s expiry)
- Wait 10 seconds
- Click again
- Should show toast: "Link expired. Refreshing..."
- Auto-fetches new URL
- Download succeeds

#### Scenario 3: File Not Found ❌
- Click "Test Download" on third scenario
- Should show toast: "File not found."
- Error message: "File not found on server."
- No retries attempted

#### Scenario 4: Auto-Retry 🔄
- Click "Test Download" on fourth scenario
- Watch live logs for retry attempts
- Should show retry count if needed

### 4. Manual Expiry Test
1. Click download on any valid file
2. Note the expiry time in logs
3. Wait for expiry
4. Click download again
5. Verify it auto-refreshes

## Code Examples

### Basic Usage
```jsx
import SupabaseDownloadButton from '@/components/SupabaseDownloadButton';

<SupabaseDownloadButton 
  fileKey="uploads/example.pdf"
  expires={120}
>
  Download File
</SupabaseDownloadButton>
```

### With Callbacks
```jsx
<SupabaseDownloadButton
  fileKey="uploads/example.pdf"
  expires={300}
  onDownloadStart={() => console.log('Download started')}
  onDownloadSuccess={() => console.log('Download succeeded')}
  onDownloadError={(err) => console.error('Download failed:', err)}
>
  Download with Tracking
</SupabaseDownloadButton>
```

## Loom Recording Checklist

Record the following flow:

1. **Valid Download** (0:00-0:15)
   - Click button
   - Show toast notifications
   - File downloads successfully

2. **Expired URL** (0:15-0:40)
   - Click short-expiry scenario
   - Wait 10 seconds (show timer)
   - Click again
   - Show "Link expired. Refreshing..." toast
   - Show successful download after refresh

3. **404 Error** (0:40-0:55)
   - Click non-existent file
   - Show "File not found" error
   - Highlight no retry attempts

4. **Retry Logic** (0:55-1:10)
   - Show live logs panel
   - Trigger a download
   - Show retry attempts in logs
   - Show final success/failure

5. **Code Walkthrough** (1:10-2:00)
   - Show `SupabaseDownloadButton.jsx`
   - Highlight key functions:
     - `isUrlExpired()`
     - `checkUrlValid()`
     - `downloadWithRetry()`
   - Show error handling code
   - Show toast integration

## API Response Format

### Success
```json
{
  "downloadUrl": "https://supabase.co/storage/v1/object/sign/uploads/file.pdf?token=...",
  "expiresAt": 1702752300000
}
```

### Error Responses
```json
// 404
{ "error": "File not found" }

// 401
{ "error": "Unauthorized. Please log in again." }

// 500
{ "error": "Server error generating download URL" }
```

## Environment Variables

```bash
# Backend
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_BUCKET=uploads
VERIFY_SIGNED_URL=true  # Enable URL verification
```

## Next Steps

1. ✅ Code implementation complete
2. ⏳ Record Loom video
3. ⏳ Create PR with changes
4. ⏳ Submit PR link + Loom

## PR Checklist

- [x] Enhanced `SupabaseDownloadButton` with expiry handling
- [x] Added `Toast` notification component
- [x] Created demo test page at `/download-test`
- [x] Backend already returns `expiresAt`
- [ ] Record Loom demonstration
- [ ] Create PR
- [ ] Submit PR link + Loom URL
