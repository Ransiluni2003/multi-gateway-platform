# ⚡ QUICK REFERENCE - Commands & Steps

## 🎯 TL;DR - Show All 3 Features in 5 Minutes

### **Terminal 1 - KEEP RUNNING**
```powershell
cd d:\multi-gateway-platform\commerce-web
npm run dev
```
Keep this open for entire demo.

---

### **Terminal 2 - Run These Commands**

#### **Demo 1: Security Headers (15 sec)**
```powershell
cd d:\multi-gateway-platform\commerce-web
.\validate-with-server.ps1 -StopAfter
```
✅ Show output with 5 green checkmarks

---

#### **Demo 2: Rate Limiting (30 sec)**
```powershell
cd d:\multi-gateway-platform\commerce-web
.\test-rate-limit-with-server.ps1 -StopAfter
```
✅ Show output with first 10 ✓ and last 5 ✗ 429

---

### **Browser - Show These Pages**

#### **Demo 3: Signed URLs (2 min)**

**First, configure Supabase:**

1. Create file: `d:\multi-gateway-platform\commerce-web\.env.local`
2. Add:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-key-here
   SUPABASE_BUCKET=uploads
   ```
3. Get credentials from https://supabase.com/dashboard

**Then:**
```
http://localhost:3000/test/storage-demo
```
- Upload file
- Download file
- Wait for expiry
- Show "URL expired" message
- Click "Refresh & Download"

---

## 📋 Quick Steps

| Step | Action | Time |
|------|--------|------|
| 1 | Start server `npm run dev` | - |
| 2 | Run security headers test | 15 sec |
| 3 | Show browser headers | 15 sec |
| 4 | Run rate limit test | 30 sec |
| 5 | Show browser UI | 15 sec |
| 6 | Upload file | 30 sec |
| 7 | Download file | 30 sec |
| 8 | Show expiry & refresh | 60 sec |
| **TOTAL** | **All 3 features** | **~5 min** |

---

## 🎬 What to Show in Loom

### Security Headers
```
✅ Content-Security-Policy
✅ X-Frame-Options: DENY
✅ X-Content-Type-Options: nosniff
✅ Referrer-Policy
✅ Permissions-Policy
```

### Rate Limiting
```
Request  1-10:  ✓ 200 (allowed)
Request 11-15:  ✗ 429 (blocked)
```

### Signed URLs
```
✅ File uploaded successfully! Key: uploads/...
✅ File downloaded! URL expires at [TIME]
❌ URL expired! Click 'Refresh & Download'
✅ File downloaded! URL expires at [NEW TIME]
```

---

## 🐛 If Something Doesn't Work

### **Port 3000 already in use**
```powershell
Get-Process -Name node | Stop-Process -Force
npm run dev
```

### **Script not found error**
```powershell
# Make sure you're in correct directory
cd d:\multi-gateway-platform\commerce-web
ls  # Should see validate-with-server.ps1
```

### **Supabase error**
- Double-check `.env.local` is in correct folder
- Check credentials are correct
- Make sure bucket "uploads" exists in Supabase

### **Port already in use (Supabase demo)**
- Restart server: Stop `npm run dev`, run again

---

## ✅ Pre-Demo Checklist

- [ ] Terminal 1: Running `npm run dev`
- [ ] Terminal 2: Can run PowerShell scripts
- [ ] Browser: Can access `http://localhost:3000`
- [ ] Supabase: Credentials in `.env.local`
- [ ] Loom or screen recorder: Ready
- [ ] Microphone: Working

---

## 🚀 NOW RECORD YOUR LOOM!

1. Open Loom.com (or OBS)
2. Click "Start Recording"
3. Follow steps 1-8 above
4. Narrate as you go
5. Stop recording
6. Upload to Loom
7. Copy link
8. ✅ DONE!

---

## 📞 Need Help?

**Error in Terminal?** → Check you're in correct directory: `d:\multi-gateway-platform\commerce-web`

**Supabase error?** → Check `.env.local` exists with correct credentials

**Port 3000 error?** → Kill Node processes: `Get-Process -Name node | Stop-Process -Force`

**Script won't run?** → Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Still stuck?** → Read [DEMO-GUIDE-STEP-BY-STEP.md](./DEMO-GUIDE-STEP-BY-STEP.md) for detailed instructions
