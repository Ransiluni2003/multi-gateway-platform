# Loom Recording Guide: Part B & C Verification

**How to Record & Show All 4 Evidence Items**

---

## 📹 What to Record (4 Segments, ~12 minutes total)

### Segment 1: Security Headers + DevTools (3 min)
**Shows:** Helmet.js security headers (5 types) + rate limiting trigger

**Record this:**
```bash
npm run demo:security
```

**What your Loom should show:**
1. Open terminal, run command
2. Watch output show ✅ headers being checked:
   - X-Content-Type-Options
   - X-Frame-Options
   - Content-Security-Policy
   - Strict-Transport-Security
   - X-XSS-Protection
3. Watch rate limiting progression: ✓ 200 → ✗ 429
4. **BONUS:** Open DevTools → Network tab → Show raw headers in response

**Terminal Output Preview:**
```
✅ Security Demo Running...

Testing endpoint: /api/auth/login

Request 1: ✅ 200 OK
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy: default-src 'self'

...

Request 11-15: ✗ 429 Too Many Requests
  X-RateLimit-Limit: 10000
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1707062400
```

---

### Segment 2: Rate Limiting on 3 Endpoints (2 min)
**Shows:** Protected endpoints + 429 responses

**Record this:**
```bash
npm run verify:rate-limiting
```

**What your Loom should show:**
1. Run script
2. Show which endpoints are being tested:
   - `/api/auth/login`
   - `/api/auth/register`
   - `/api/files/download-url`
3. Show progression: First 10 requests ✓ 200
4. Show overflow: Requests 11+ get ✗ 429
5. **BONUS:** Show X-RateLimit-* headers in one response

**Terminal Output Preview:**
```
Testing /api/auth/login (10 requests):
  Req 1-10: ✅ 200 OK
  Req 11-12: ✗ 429 Too Many Requests

Testing /api/auth/register (10 requests):
  Req 1-10: ✅ 200 OK
  Req 11-12: ✗ 429 Too Many Requests

Testing /api/files/download-url (15 requests):
  Req 1-10: ✅ 200 OK
  Req 11-15: ✗ 429 Too Many Requests

Rate Limit Headers:
  X-RateLimit-Limit: 10000
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1707062400
```

---

### Segment 3: Audit Logs (Last 20) (2 min)
**Shows:** Real actions triggering audit logs

**Record this:**
```bash
npm run verify:audit-logs
```

**What your Loom should show:**
1. Run script
2. Watch it trigger 4 actions:
   - Admin login (success)
   - Admin login (failed attempt)
   - Create product
   - Request signed URL
3. Watch output display **last 5-20 audit log entries** with:
   - Timestamp
   - User email
   - Action type
   - IP address / details
4. **BONUS:** Screenshot or show the admin panel audit log page matching these entries

**Terminal Output Preview:**
```
✅ Triggered 4 actions:
  1. Admin login (success)
  2. Admin login (failed password)
  3. Create product
  4. Request signed URL

Last 5 Audit Logs:
  2026-02-04 14:32:15 | admin@example.com | PRODUCT_CREATED | Laptop XYZ
  2026-02-04 14:32:10 | admin@example.com | SIGNED_URL_REQUESTED | file upload
  2026-02-04 14:32:05 | admin@example.com | LOGIN_FAILED | Wrong password
  2026-02-04 14:32:00 | admin@example.com | LOGIN_SUCCESS | 192.168.1.1
  2026-02-04 14:31:50 | system | SEED_COMPLETED | Initial setup
```

---

### Segment 4: Signed URL Upload + Download + Expiry (3 min)
**Shows:** End-to-end signed URL flow with expiry behavior

**Record this:**
```bash
npm run demo:storage
```

**What your Loom should show:**
1. Run script
2. Watch output show 3 steps:
   - ✅ Upload signed URL obtained (shows URL + expiry: 60 seconds)
   - ✅ File uploaded successfully to Supabase bucket
   - ✅ Download signed URL obtained (shows URL + expiry: 300 seconds)
3. **BONUS:** 
   - Wait 60 seconds and try upload URL again (shows "expired")
   - Try download URL before expiry (shows working)
   - Show Supabase dashboard → Storage → files uploaded

**Terminal Output Preview:**
```
✅ Storage (Signed URL) Demo

Step 1: Request Upload URL
  ✅ Signed URL obtained
  URL expires in: 60 seconds
  URL: https://abcdefghijkl.supabase.co/storage/v1/object/sign/uploads/...

Step 2: Upload File
  ✅ File uploaded successfully
  File: demo-file-1707062000.txt (1.2 KB)
  Bucket: uploads

Step 3: Request Download URL
  ✅ Signed URL obtained
  URL expires in: 300 seconds
  URL: https://abcdefghijkl.supabase.co/storage/v1/object/sign/uploads/...

Step 4: Download & Verify
  ✅ File downloaded successfully
  Size: 1.2 KB
  Expiry: Still valid (expires in 280 seconds)

--- Expiry Test (after 60 seconds) ---
Upload URL Status: ⚠️ EXPIRED (60 seconds passed)
Download URL Status: ✅ STILL VALID (expires in ~240 seconds)
```

---

## 🎥 Recording Setup (Loom)

### 1. Open Loom
- Go to [loom.com](https://loom.com)
- Sign in / Create account
- Click **"Start Recording"**

### 2. Choose Recording Area
- Select **"Tab"** (record VS Code terminal)
- Or **"Window"** (record entire screen)
- Enable **"Webcam"** (show yourself briefly at start)

### 3. Script & Segments

| Segment | Command | Duration | Key Points |
|---------|---------|----------|-----------|
| 1 | `npm run demo:security` | 3 min | Headers + 429 progression |
| 2 | `npm run verify:rate-limiting` | 2 min | 3 endpoints, rate limits |
| 3 | `npm run verify:audit-logs` | 2 min | 4 actions → audit logs |
| 4 | `npm run demo:storage` | 3 min | Upload → Download → Expiry |

### 4. Record Each Segment
1. **Before recording:** Run the command once to ensure it works
2. **Start Loom recording**
3. **Narrate:** "Running verification script..." (optional)
4. **Show terminal:** Let the output run completely
5. **Stop recording**

### 5. Post-Record
- Edit each video (add titles/descriptions)
- Upload all 4 to a playlist called "Part B & C Verification"

---

## 📋 Pre-Recording Checklist

- [ ] Terminal is open and ready
- [ ] Services running: `npm run dev` (if needed)
- [ ] `.env` file has all credentials (or Supabase configured)
- [ ] `npm install` completed
- [ ] Test each script once: `npm run demo:security`, etc.
- [ ] Loom account created
- [ ] Screen/tab selected in Loom
- [ ] Microphone works (test recording 10 sec)

---

## ✅ Post-Recording Checklist

- [ ] Segment 1 uploaded (Headers + Rate Limit)
- [ ] Segment 2 uploaded (3 Endpoints 429s)
- [ ] Segment 3 uploaded (Audit Logs)
- [ ] Segment 4 uploaded (Signed URL E2E)
- [ ] All 4 videos in Loom playlist
- [ ] Playlist link copied
- [ ] Links added to README / PART_B_SUMMARY.md / FINAL_DELIVERY_SUMMARY.md

---

## 🔗 Where to Add Loom Links

After recording, add links to these files:

1. **README.md** → "Loom Videos Guide" section
2. **PART_B_SUMMARY.md** → Add video links
3. **FINAL_DELIVERY_SUMMARY.md** → Evidence section
4. **PR Description** → "Video Evidence" section

**Example format:**
```markdown
### Part B & C Verification Videos

1. **Security Headers + Rate Limiting**  
   📹 [Loom Video](https://loom.com/share/abc123)

2. **Rate Limiting on 3 Endpoints**  
   📹 [Loom Video](https://loom.com/share/def456)

3. **Audit Logs (Last 20 Entries)**  
   📹 [Loom Video](https://loom.com/share/ghi789)

4. **Signed URL Upload/Download/Expiry**  
   📹 [Loom Video](https://loom.com/share/jkl012)
```

---

## 🚀 Quick Start (Copy-Paste)

```bash
# Terminal 1: Start the server (if not already running)
npm run dev

# Terminal 2: Run verifications
echo "Segment 1..."
npm run demo:security

echo "Segment 2..."
npm run verify:rate-limiting

echo "Segment 3..."
npm run verify:audit-logs

echo "Segment 4..."
npm run demo:storage
```

---

## 📌 What Your Supervisor Will See

| Evidence | Shows | Why It Matters |
|----------|-------|----------------|
| Headers | 5 security types active | ✅ Helmet.js working |
| 429 Response | Rate limit triggered | ✅ Express-rate-limit working |
| Audit Logs | Real actions logged | ✅ Compliance/fraud detection |
| Signed URLs | File upload → download → expiry | ✅ Secure file handling |

---

## 🎯 Next Steps

1. ✅ Prepare terminal with all scripts tested
2. ✅ Open Loom.com
3. ✅ Record 4 segments (total ~12 minutes)
4. ✅ Upload to Loom playlist
5. ✅ Add links to documentation
6. ✅ Share playlist link in PR/email

**Estimated time to complete:** 20 minutes (5 min setup + 12 min recording + 3 min upload)

