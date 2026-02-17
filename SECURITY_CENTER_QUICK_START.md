# Security Center - Quick Start Guide

**Date:** February 16, 2026  
**Estimated Time:** 15 minutes

---

## 🚀 Quick Start - Get Everything Running

### Prerequisites
- Node.js 18+
- MongoDB running (local or Docker)
- Redis running (optional, will use in-memory)

---

## Step 1: Start Required Services (5 min)

### Option A: Using Docker
```bash
# Start MongoDB and Redis
docker-compose up -d mongodb redis

# Verify services are running
docker-compose ps
```

### Option B: Local MongoDB
```bash
# Make sure MongoDB is running
# Default: mongodb://localhost:27017
```

---

## Step 2: Configure Environment (2 min)

Ensure your `.env` file in the backend folder has at minimum:

```bash
# Backend .env
MONGO_URI=mongodb://localhost:27017/multi-gateway
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key
```

---

## Step 3: Install Dependencies (2 min)

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..

# Frontend dependencies
cd frontend
npm install
cd ..
```

---

## Step 4: Seed Demo Data (1 min)

```bash
# From root directory
npm run demo:security-center
```

**Expected output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
🌱 Seeding demo audit logs...
✅ Successfully seeded 500 audit logs
✅ Successfully seeded 50 rate limit events

📊 Audit Log Summary:
═══════════════════════════════════════
  user_login                     85 events
  rate_limit_exceeded            72 events
  file_upload                    68 events
  ...
═══════════════════════════════════════

📈 Total audit logs in database: 550

✨ Demo data seeded successfully!

🚀 You can now:
   1. Navigate to http://localhost:3001/admin/security-center
   2. Explore the Audit Explorer with pre-populated data
   3. View Rate Limit Monitor with sample violations
   4. Test CSV export functionality
```

---

## Step 5: Start the Application (2 min)

### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```

**Wait for:**
```
✅ MongoDB connected
✅ Rate Limiter: Using [memory/redis/upstash] storage
Server running on port 5000
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

**Wait for:**
```
ready - started server on 0.0.0.0:3001
```

---

## Step 6: Access Security Center (3 min)

### 1. Login as Admin

Navigate to: http://localhost:3001/login

**Create or use an admin account**

If you need to create an admin user, use your existing registration/admin setup process.

### 2. Navigate to Security Center

Go to: http://localhost:3001/admin/security-center

You should see three cards:
- 📋 Audit Explorer
- 🚦 Rate Limit Monitor
- 🔑 Session & Token Tools

---

## 🧪 Test Each Feature

### Test 1: Audit Explorer
1. Click "Audit Explorer"
2. Select "rate_limit_exceeded" from Action Type
3. Click "Search"
4. You should see filtered logs
5. Click "Export CSV"
6. Verify file downloads (audit-logs-YYYY-MM-DD.csv)
7. Open CSV and verify data

**Expected CSV columns:**
- timestamp
- action
- status
- userId
- ip
- userAgent
- details

### Test 2: Rate Limit Monitor
1. Click "Rate Limit Monitor" from Security Center
2. Verify you see:
   - Current limiter mode (memory/redis/upstash)
   - Total blocked requests (24h)
   - Top endpoints table
   - Top IPs table
   - Recent violations
3. Wait 30 seconds and verify page auto-refreshes

### Test 3: Session & Token Tools
1. Click "Session & Token Tools" from Security Center
2. Get a User ID from your database:
   ```bash
   # In MongoDB shell or Compass
   db.users.findOne()._id
   # Copy the ID
   ```
3. Paste User ID in the search field
4. Click "View Sessions"
5. Verify you see:
   - User email
   - Active sessions count
   - Session details table
   - Recent login attempts
6. Test "Cleanup Expired Tokens" button
7. Verify success message appears

---

## ✅ Verification Checklist

After testing, verify:

- [ ] All three Security Center pages load without errors
- [ ] Audit Explorer shows filtered logs
- [ ] CSV export downloads successfully
- [ ] Rate Limit Monitor displays statistics
- [ ] Session Tools shows user data
- [ ] Navigation between pages works
- [ ] Backend logs show no errors
- [ ] Frontend console shows no errors

---

## 🎥 Recording a Loom Demo

### Suggested Script (5 minutes total)

**Introduction (30 seconds)**
"Hi! Today I'll demonstrate the new Security Center feature. This is a comprehensive admin dashboard for monitoring security events, rate limiting, and session management."

**Audit Explorer (2 minutes)**
1. "First, the Audit Explorer. Here we can filter audit logs..."
2. Show date range filter
3. Show action type filter
4. Click Search
5. Show pagination
6. Click Export CSV
7. Show downloaded file

**Rate Limit Monitor (1.5 minutes)**
1. "Next, the Rate Limit Monitor..."
2. Show current limiter mode
3. Point out 24-hour statistics
4. Show top endpoints table
5. Show top IPs
6. Mention auto-refresh feature

**Session Tools (1 minute)**
1. "Finally, Session & Token Tools..."
2. Enter a User ID
3. Show active sessions
4. Explain invalidate sessions feature
5. Show system cleanup button

**Conclusion (30 seconds)**
"That's the Security Center! A complete security monitoring solution ready for production use."

---

## 🐛 Troubleshooting

### Issue: MongoDB Connection Error
**Solution:**
```bash
# Check if MongoDB is running
docker-compose ps mongodb
# Or
mongo --eval "db.adminCommand('ping')"

# Restart MongoDB
docker-compose restart mongodb
```

### Issue: Cannot Access Security Center
**Solution:**
1. Verify you're logged in as admin
2. Check backend logs for authentication errors
3. Verify JWT_SECRET is set in .env
4. Try logging out and back in

### Issue: No Audit Logs Showing
**Solution:**
```bash
# Re-run seed script
npm run demo:security-center

# Or check database directly
mongo
use multi-gateway
db.auditlogs.count()
```

### Issue: CSV Export Not Working
**Check:**
1. Browser developer console for errors
2. Backend logs for error messages
3. Verify bearer token in request headers
4. Check if user has admin role

### Issue: Frontend Won't Start
**Solution:**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Issue: Backend Won't Start
**Solution:**
```bash
cd backend
rm -rf node_modules dist
npm install
npm run dev
```

---

## 📞 Need Help?

1. Check [SECURITY_CENTER_IMPLEMENTATION_COMPLETE.md](./SECURITY_CENTER_IMPLEMENTATION_COMPLETE.md) for detailed documentation
2. Review [docs/RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md) for deployment guide
3. Check backend logs: `cd backend && npm run dev` (should show any errors)
4. Check frontend console in browser DevTools (F12)

---

## 🎉 Success!

If you've completed all steps, you now have:
- ✅ Fully functional Security Center
- ✅ 550+ demo audit logs
- ✅ Working audit log filtering and CSV export
- ✅ Real-time rate limit monitoring
- ✅ Session management tools
- ✅ Admin-only access control
- ✅ Ready for Loom demo

---

## 📚 Next Steps

After verifying everything works locally:

1. **Review Release Checklist**: [docs/RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md)
2. **Run Security Tests**:
   ```bash
   npm run verify:security-headers
   npm run verify:admin-protection
   npm run verify:rate-limiting
   ```
3. **Prepare for Deployment**: Follow staging deployment steps in release checklist
4. **Record Loom Demo**: Use script above
5. **Update Documentation**: Add Security Center to main README

---

**Completed:** February 16, 2026  
**Ready for demo:** ✅ YES
