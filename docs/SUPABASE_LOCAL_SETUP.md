# Supabase Configuration Guide

Quick setup for testing signed URLs locally.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / login
3. Create a new project
4. Copy your **Project URL** and **Service Role Key**

## 2. Update `.env.local`

Create or update `.env.local` in the root and `frontend/` directories:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=uploads
```

## 3. Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name: `uploads`
4. Make it **Private** (we'll use signed URLs)

## 4. Set CORS Policy

For signed URL downloads to work in the browser:

1. Go to **Storage** → Select `uploads` bucket
2. Click **Settings** → **CORS**
3. Add or update to allow your local origin:

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

## 5. Test the Setup

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run storage demo
npm run demo:storage
```

You should see:
- ✅ Upload signed URL obtained
- ✅ File uploaded successfully (or ⚠️ if bucket needs permissions)
- ✅ Download signed URL obtained
- ✅ URL validity status

## Troubleshooting

### "Supabase configuration missing"
- Check `.env.local` exists in the root directory
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### "CORS error" on download
- Update CORS policy in Supabase dashboard
- Restart your server

### "File not found (404)"
- Upload may have failed due to bucket permissions
- Check bucket settings → **Policies** in Supabase
- Make sure `uploads` bucket exists

### Upload returns 403
- Ensure bucket is set to **Private**
- Service role key must have `storage.objects:create` permission

## Verify E2E Flow

The signed URL flow is working when:
1. ✅ Upload URL is obtained
2. ✅ File uploaded successfully
3. ✅ Download URL is obtained  
4. ✅ Expiry time shown correctly (60 seconds)
5. ✅ Frontend auto-refreshes expired URLs

See [frontend/components/SupabaseDownloadButton.jsx](../frontend/components/SupabaseDownloadButton.jsx) for expiry logic.
