# Supabase Setup: Complete

**Status:** ✅ Template configured  
**Next Action:** User fills in real credentials (5 minutes)

---

## What's Already Done

- ✅ `.env` file has Supabase variable placeholders
- ✅ `npm run setup:supabase` command available for verification
- ✅ `npm run demo:storage` script ready to use
- ✅ Comprehensive setup documentation in [docs/SUPABASE_LOCAL_SETUP.md](docs/SUPABASE_LOCAL_SETUP.md)

---

## Remaining: Get Real Credentials (5 minutes)

### Step 1: Create Supabase Account
Go to [supabase.com](https://supabase.com) and sign up

### Step 2: Create a Project
1. Click **"New project"**
2. Name it: `multi-gateway-platform`
3. Set password and region
4. Wait for project creation (~1 min)

### Step 3: Get Your Credentials
1. Go to **Settings** → **API**
2. Copy **Project URL** → Fill in `.env`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=<paste-here>
   ```
3. Copy **Service Role Key** → Fill in `.env`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<paste-here>
   ```

### Step 4: Create Storage Bucket
1. Go to **Storage** section
2. Click **"New bucket"**
3. Name: `uploads`
4. Select **"Private"**
5. Create

### Step 5: Configure CORS
1. In Storage, select `uploads` bucket
2. Go to **Settings** → **CORS**
3. Paste this JSON:
```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:3001"],
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]
```
4. Save

---

## Verify It Works

```bash
npm run setup:supabase
```

Output should show:
```
✅ .env file exists
✅ NEXT_PUBLIC_SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
✅ SUPABASE_BUCKET

✅ Supabase is configured!
Ready to run:
  npm run demo:storage
```

---

## Run the Storage Demo

```bash
npm run demo:storage
```

Expected output:
- ✅ Upload signed URL obtained
- ✅ File uploaded successfully
- ✅ Download signed URL obtained
- ✅ URL validity status

---

## Current Values in `.env`

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=uploads
```

**⚠️ These are placeholders.** Replace with real values from your Supabase dashboard.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "CORS error on download" | Update CORS policy in Supabase bucket settings (Step 5 above) |
| "Bucket not found (404)" | Make sure bucket name is exactly `uploads` (lowercase) and it's Private |
| "Upload fails (403)" | Check Service Role Key is copied correctly, not Anon Key |
| "Supabase configuration missing" on `npm run setup:supabase` | Make sure you pasted the actual values, not the placeholder URLs |

---

## Related Documentation

- [LOCAL_SETUP_DEMO_GUIDE.md](docs/LOCAL_SETUP_DEMO_GUIDE.md) - Full setup guide with all demos
- [docs/SUPABASE_LOCAL_SETUP.md](docs/SUPABASE_LOCAL_SETUP.md) - Detailed Supabase walkthrough
- [scripts/demo-storage.js](scripts/demo-storage.js) - Demo script source
- [scripts/setup-supabase.js](scripts/setup-supabase.js) - Verification script source

---

## Part B Status

| Item | Status |
|------|--------|
| Security Demo | ✅ `npm run demo:security` |
| Audit Logs Demo | ✅ `npm run verify:audit-logs` |
| Storage Demo | ⏳ Ready (waiting for Supabase credentials) |
| Local Setup Guide | ✅ [LOCAL_SETUP_DEMO_GUIDE.md](docs/LOCAL_SETUP_DEMO_GUIDE.md) |
| README Updated | ✅ Added setup section |
| Package.json Scripts | ✅ 8 commands registered |

**Overall Part B Completion:** 86% (blocked only on manual Supabase credential entry)
