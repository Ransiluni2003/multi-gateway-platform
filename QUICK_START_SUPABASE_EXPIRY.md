# Quick Start: Demonstrate Supabase Expiry Handling

## ⏱️ 5-Minute Setup

### 1. Get Your Files from Supabase (1 minute)
```
1. Open https://app.supabase.com
2. Go to Storage → platform-assets
3. Note any file names in your bucket
   Example: report.pdf, image.jpg, etc.
```

### 2. Update FilesList (1 minute)
Edit `frontend/components/FilesList.jsx`:
```jsx
const files = [
  { key: 'report.pdf', name: 'Monthly Report' },
  // Add your actual files above
];
```

### 3. Start Frontend (1 minute)
```bash
cd frontend
npm start
```
Wait for it to finish building... ✨

### 4. Open in Browser (1 minute)
```
http://localhost:3000/files
```

### 5. Test Download (1 minute)
```
1. Open DevTools (F12)
2. Click Download button
3. Watch console logs
4. File should download
5. Success! ✅
```

---

## 📊 See Evidence in Console

Open DevTools (F12) → Console tab:

```
✓ [SUPABASE] Fetching signed URL for: report.pdf
✓ [SUPABASE] Signed URL obtained. Expires at: 2025-12-17T16:00:00.000Z
✓ [SUPABASE] Validating URL with HEAD request
✓ [SUPABASE] HEAD response status: 200
✓ [SUPABASE] URL validation successful
```

---

## 🎯 Complete Test (15 minutes)

### Test 1: Valid Download
```
EXPECTED:
  ✓ Toast: "Fetching download link..."
  ✓ Toast: "Starting download..."
  ✓ File downloads
  ✓ Shows "✓ Downloaded (after 0 retries)"
  
CONSOLE: All validation logs shown above
```

### Test 2: Expired URL Refresh (after 5+ seconds)
```
SETUP:
  Change expires={5} in FilesList
  Download once (succeeds)
  Wait 5+ seconds

EXPECTED:
  ✓ Toast: "Link expired. Refreshing..."
  ✓ Toast: "Starting download..."
  ✓ File downloads
  ✓ Shows "✓ Downloaded (after 1 retries)"
  
CONSOLE: [SUPABASE EXPIRY] URL expired detected
```

### Test 3: File Not Found
```
SETUP:
  Change key to: 'non-existent-file-xyz.pdf'

EXPECTED:
  ✓ Error: "File not found."
  ✓ Button still works for retry
  
CONSOLE: [SUPABASE] Not Found (404)
```

### Test 4: Server Error Retry
```
SETUP:
  Stop backend server (Ctrl+C)
  Try to download

EXPECTED:
  ✓ Toast: "Attempt 1 failed. Retrying..."
  ✓ Toast: "Attempt 2 failed. Retrying..."
  ✓ Error: "Download failed after retries."
  
CONSOLE: Network request failures
```

---

## 📸 Screenshots to Save

For each test, capture:
1. Toast notification (before download)
2. Console logs (DevTools F12)
3. Success/error state

---

## ✅ Completion Checklist

- [ ] Files exist in Supabase bucket
- [ ] FilesList.jsx updated with real files
- [ ] Frontend starts successfully
- [ ] Download works (Test 1 passes)
- [ ] Console shows Supabase logs
- [ ] Expired URL refreshes (Test 2 works - OPTIONAL)
- [ ] Error handling works (Tests 3 & 4)
- [ ] Screenshots captured

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Request error. Please contact support." | Files don't exist in Supabase. Check bucket. |
| No console logs | Open DevTools (F12) before clicking Download |
| Frontend won't start | Run `npm install` in frontend folder first |
| Download doesn't start | Check browser console for errors |

---

## 📚 Full Documentation

- Full implementation details: `SUPABASE_EXPIRY_COMPLETE_STATUS.md`
- Verification guide: `docs/SUPABASE_EXPIRY_VERIFICATION.md`
- Implementation code: `docs/SUPABASE_EXPIRY_IMPLEMENTATION_COMPLETE.md`
- Interactive test guide: `node test-supabase-expiry.js`

---

## 🎬 Optional: Create Loom Video

Record a video showing:
1. Valid download flow
2. Expired URL detection and refresh
3. Console logs showing expiry detection
4. Success state

https://www.loom.com - Easy screen recording!

---

**Status: ✅ READY FOR DEMONSTRATION**

All functionality is implemented. Just need to:
1. Add real files to Supabase bucket
2. Update FilesList with real file names
3. Test and capture evidence
