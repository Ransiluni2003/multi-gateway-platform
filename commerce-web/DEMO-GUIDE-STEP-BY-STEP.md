# 🎬 Complete Demo Guide - Step by Step

## 🎯 Goal
Show all 3 security features working in your Loom video.

---

# ✅ DEMO 1: Security Headers (45 seconds)

## **Step 1: Start Your Server**

Open **PowerShell Terminal 1**:
```powershell
cd d:\multi-gateway-platform\commerce-web
npm run dev
```

Wait for it to say: `✓ Ready in XXXms`

Keep this terminal OPEN.

---

## **Step 2: Run Automated Test (15 seconds)**

Open **NEW PowerShell Terminal 2** (don't close Terminal 1):
```powershell
cd d:\multi-gateway-platform\commerce-web
.\validate-with-server.ps1 -StopAfter
```

**What you'll see:**
```
[*] Starting Rate Limiting Test...

[*] Checking if server is already running on port 3000...
[OK] Server already running on port 3000

[*] Running security headers validation...

🔍 Fetching security headers...

═══════════════════════════════════════════════════════════════
  SECURITY HEADERS VALIDATION REPORT
═══════════════════════════════════════════════════════════════

📍 URL: http://localhost:3000

REQUIRED HEADERS:
─────────────────────────────────────────────────────────────────
✅ Content-Security-Policy (CSP)
   Description: Prevents XSS attacks by controlling resource loading
   Value: default-src 'self'; script-src 'self' 'unsafe-inline'...

✅ X-Frame-Options
   Description: Prevents clickjacking by blocking iframe embedding
   Value: DENY

✅ X-Content-Type-Options
   Description: Prevents MIME type sniffing attacks
   Value: nosniff

✅ Referrer-Policy
   Description: Controls referrer information sharing for privacy
   Value: strict-origin-when-cross-origin

✅ Permissions-Policy
   Description: Locks down camera, microphone, geolocation, etc.
   Value: camera=(), microphone=(), geolocation=()...

═════════════════════════════════════════════════════════════════

📊 SUMMARY:
   Required Headers: 5/5
   Recommended Headers: 1

✅ EXCELLENT! All required security headers are properly configured.
```

**For Loom: Record your screen showing this output!** ✅

---

## **Step 3: Show in Browser (30 seconds - Optional but Impressive)**

In your browser:
1. Go to: `http://localhost:3000/test/security-headers`
2. Open DevTools: Press `F12`
3. Go to: **Network tab**
4. Reload the page: Press `Ctrl+R`
5. Click on the first request (the page itself)
6. Go to: **Response Headers** section
7. Scroll down and show:
   - `content-security-policy`
   - `x-frame-options`
   - `x-content-type-options`
   - `referrer-policy`
   - `permissions-policy`

**For Loom: Slowly scroll through the headers so they're all visible!** ✅

---

**Total time: 45 seconds** ✅

---

# ⚡ DEMO 2: Rate Limiting (60 seconds)

## **Step 1: Keep Server Running**

Terminal 1 should still be running from Demo 1.

---

## **Step 2: Run Automated Test (30 seconds)**

In **Terminal 2**:
```powershell
cd d:\multi-gateway-platform\commerce-web
.\test-rate-limit-with-server.ps1 -StopAfter
```

**What you'll see:**
```
[*] Starting Rate Limiting Test...

[*] Checking if server is already running on port 3000...
[OK] Server already running on port 3000

[*] Running rate limit test...

========================================
   RATE LIMITING VERIFICATION TEST
========================================

Target URL: http://localhost:3000/api/test/rate-limit
Rate Limit: 10 requests per minute
Test Plan: Send 15 rapid requests
Expected: First 10 succeed, next 5 get 429

Starting test in 2 seconds...

Request  1: ✓ 200  [9 remaining]
Request  2: ✓ 200  [8 remaining]
Request  3: ✓ 200  [7 remaining]
Request  4: ✓ 200  [6 remaining]
Request  5: ✓ 200  [5 remaining]
Request  6: ✓ 200  [4 remaining]
Request  7: ✓ 200  [3 remaining]
Request  8: ✓ 200  [2 remaining]
Request  9: ✓ 200  [1 remaining]
Request 10: ✓ 200  [0 remaining]
Request 11: ✗ 429 TOO MANY REQUESTS

  📊 Rate Limit Headers:
     X-RateLimit-Limit:     10
     X-RateLimit-Remaining: 0
     X-RateLimit-Reset:     2026-02-03T15:30:00.000Z
     Retry-After:           54 seconds

Request 12: ✗ 429 TOO MANY REQUESTS
Request 13: ✗ 429 TOO MANY REQUESTS
Request 14: ✗ 429 TOO MANY REQUESTS
Request 15: ✗ 429 TOO MANY REQUESTS

========================================
   TEST RESULTS
========================================

✓ Allowed:      10
✗ Rate Limited: 5
? Errors:       0

✅ SUCCESS! Rate limiting is working correctly.
   Requests beyond the limit were blocked with 429 status.
```

**For Loom: Record your screen showing this!** ✅

**Key things to point out:**
- First 10 requests: Green ✓ 200
- Last 5 requests: Red ✗ 429 
- Rate limit headers showing

---

## **Step 3: Show in Browser (30 seconds - Optional)**

In your browser:
1. Go to: `http://localhost:3000/test/rate-limit`
2. Click: **"Send 15 Rapid Requests"** button
3. Watch the results appear
4. Show:
   - "✅ Allowed: 10"
   - "❌ Rate Limited: 5"

**For Loom: Show the visual UI with the results table!** ✅

---

**Total time: 60 seconds** ✅

---

# 🗄️ DEMO 3: Signed URLs (2-3 minutes)

## ⚠️ IMPORTANT: Configure Supabase First

### **Step 1: Create `.env.local` File**

1. Open **File Explorer**
2. Navigate to: `d:\multi-gateway-platform\commerce-web`
3. Right-click → **New → Text Document**
4. Name it: `.env.local`
5. Right-click → **Open with Notepad**
6. Paste this:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_BUCKET=uploads
```

---

### **Step 2: Get Your Supabase Credentials**

#### **Option A: Use Existing Supabase Project**

1. Go to: https://supabase.com/dashboard
2. Select your project (should already have one)
3. Click: **Settings** (bottom left)
4. Click: **API**
5. Copy:
   - **URL** → Paste into `SUPABASE_URL`
   - **Service Role Key** → Paste into `SUPABASE_SERVICE_ROLE_KEY`

Example:
```
SUPABASE_URL=https://xyzabc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=uploads
```

#### **Option B: Create New Supabase Project** (if you don't have one)

1. Go to: https://supabase.com
2. Click: **Start your project**
3. Sign in or create account
4. Click: **New project**
5. Fill in:
   - **Project name**: `multi-gateway-platform`
   - **Database password**: Generate or set one
   - **Region**: Pick closest to you
6. Click: **Create new project**
7. Wait 2-3 minutes
8. Then follow "Option A" above to get credentials

---

### **Step 3: Create Storage Bucket**

1. In Supabase dashboard (https://supabase.com/dashboard)
2. Click: **Storage** (left sidebar)
3. Click: **Create new bucket**
4. Name: `uploads`
5. Make it: **PRIVATE** (not public)
6. Click: **Create**

---

### **Step 4: Test It Works**

In PowerShell:
```powershell
cd d:\multi-gateway-platform\commerce-web
npm run dev
```

Then open browser: `http://localhost:3000/test/storage-demo`

If you see the demo page with "Upload File" button, you're good! ✅

---

## **Step 5: Run the Demo (2-3 minutes)**

### **Part 1: Upload (1 minute)**

1. Open: `http://localhost:3000/test/storage-demo`
2. Click: **"Choose File"** button
3. Select any file (PDF, image, text file)
4. Click: **"Upload File"** button
5. Wait for success message

**What you'll see:**
```
⏳ Generating signed upload URL...
⏳ Uploading file...
✅ File uploaded successfully! Key: uploads/demo-user/1707000000000-filename.pdf
```

**For Loom: Show this success message!** ✅

---

### **Part 2: Download (1 minute)**

1. The file key should already be filled in from upload
2. Click: **"Download File"** button
3. Your browser will download the file
4. You'll see:

```
✅ File downloaded! URL expires at Feb 3, 2026, 3:30:00 PM
```

**For Loom: Show the file downloading and the expiry time!** ✅

---

### **Part 3: Expiry Handling (1 minute)**

1. Note the expiry time shown
2. Wait 60 seconds (or modify code for faster demo)
3. Click: **"Download File"** again
4. You'll see:

```
❌ URL expired! Click 'Refresh & Download' to get a new URL.
```

5. Click: **"Refresh & Download"** button
6. The file downloads again with new expiry time:

```
✅ File downloaded! URL expires at Feb 3, 2026, 3:31:30 PM
```

**For Loom: Show the expiry detection and the refresh working!** ✅

---

**Total time: 2-3 minutes** ✅

---

# 🎬 Complete Loom Script (5-6 minutes total)

**[0:00-0:15] Introduction**
> "Hello! I'm demonstrating three security features we've implemented: Security Headers, Rate Limiting, and Signed URL Storage."

**[0:15-1:00] Security Headers**
> "First, security headers. I'm running an automated test that verifies 5 critical headers are present: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy."
> [Run: `.\validate-with-server.ps1 -StopAfter`]
> "As you can see, all 5 headers passed. Now let me show you this in the browser DevTools as well."
> [Show: http://localhost:3000/test/security-headers in DevTools Network tab]

**[1:00-2:00] Rate Limiting**
> "Next, rate limiting. This prevents abuse by limiting how many requests can be made. The limit is 10 requests per minute."
> [Run: `.\test-rate-limit-with-server.ps1 -StopAfter`]
> "Notice the first 10 requests succeeded with status 200, and requests 11-15 were blocked with 429 Too Many Requests. The headers show the remaining count and reset time. Perfect rate limiting working."

**[2:00-5:00] Signed URL Storage**
> "Finally, signed URL storage. This is for secure file uploads and downloads with time-limited URLs."
> [Open: http://localhost:3000/test/storage-demo]
> "I'll upload a file. [Select file → Click Upload] Great! It generated a signed upload URL, uploaded the file, and it succeeded."
> "Now I'll download it. [Click Download] The file is downloading with a signed download URL that expires in 60 seconds. See the expiry time here."
> "Let me show what happens when the URL expires. I'll wait a moment... [wait or explain you modified the timeout] Now when I try to download, it detects the URL is expired and shows a message. [Click 'Refresh & Download'] Perfect! It automatically generated a new signed URL and the download succeeded again with a new expiry time."

**[5:00-5:30] Conclusion**
> "So we've demonstrated all three security features: Security Headers protecting against XSS and clickjacking, Rate Limiting preventing abuse, and Signed URLs providing secure time-limited access to files. Everything is working end-to-end!"

---

## 📋 Checklist Before Recording

- [ ] PowerShell Terminal running: `npm run dev`
- [ ] Supabase configured in `.env.local`
- [ ] All three test pages accessible
- [ ] Screen recorder ready (OBS, Loom, etc.)
- [ ] Microphone working for narration
- [ ] Plan to record 5-6 minutes

---

## 🚀 Ready to Record?

1. ✅ Open Terminal 1, run `npm run dev`
2. ✅ Wait for "Ready in XXXms"
3. ✅ Open Loom or screen recorder
4. ✅ Follow the script above
5. ✅ Record 5-6 minutes
6. ✅ Upload to Loom
7. ✅ Submit link

**You're all set! Everything is implemented and ready to demo.** 🎉
