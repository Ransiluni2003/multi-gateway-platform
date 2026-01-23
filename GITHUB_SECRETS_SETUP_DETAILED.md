# GitHub Secrets Setup Guide

## 📋 Overview

This guide walks you through setting up all required GitHub Secrets for the CI/CD pipeline to deploy to Railway (backend) and Vercel (frontend).

## 🔐 Required Secrets

### Essential Secrets (Required)

| Secret Name | Provider | Required For | Format |
|-------------|----------|--------------|--------|
| `RAILWAY_TOKEN` | Railway | Backend deployment | `ry_...` |
| `VERCEL_TOKEN` | Vercel | Frontend deployment | `vercel_...` |
| `VERCEL_ORG_ID` | Vercel | Frontend deployment | `team_...` |
| `VERCEL_PROJECT_ID` | Vercel | Frontend deployment | `prj_...` |
| `MONGO_URL` | MongoDB Atlas | Database connection | `mongodb+srv://...` |
| `REDIS_URL` | Redis Provider | Cache/Queue | `redis://...` |

### Optional Secrets (Recommended)

| Secret Name | Provider | Required For | Format |
|-------------|----------|--------------|--------|
| `SUPABASE_URL` | Supabase | File storage | `https://<project>.supabase.co` |
| `SUPABASE_KEY` | Supabase | File storage | `eyJ...` |
| `SLACK_WEBHOOK_URL` | Slack | Notifications | `https://hooks.slack.com/...` |
| `DOCKER_USERNAME` | Docker Hub | Container registry | `username` |
| `DOCKER_PASSWORD` | Docker Hub | Container registry | `password` |

## 🚀 Step-by-Step Setup

### Step 1: Navigate to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. In left sidebar, click **Secrets and variables → Actions**
4. Click **New repository secret** button

### Step 2: Obtain Railway Token

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Get your authentication token
railway whoami --token
```

**Copy the token** (starts with `ry_`)

**Add to GitHub:**
- Name: `RAILWAY_TOKEN`
- Value: `ry_abc123...`

### Step 3: Obtain Vercel Credentials

#### 3.1 Get Vercel Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your profile icon → **Settings**
3. Click **Tokens** in left sidebar
4. Click **Create**
5. Enter token name: `GitHub Actions CI/CD`
6. Select scope: **Full Account**
7. Click **Create Token**
8. **Copy the token** (starts with `vercel_`)

**Add to GitHub:**
- Name: `VERCEL_TOKEN`
- Value: `vercel_abc123...`

#### 3.2 Get Vercel Org ID and Project ID

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project
cd frontend
vercel link

# View project info
cat .vercel/project.json
```

Output example:
```json
{
  "orgId": "team_abc123...",
  "projectId": "prj_xyz789..."
}
```

**Add to GitHub:**
- Name: `VERCEL_ORG_ID`
- Value: `team_abc123...`

- Name: `VERCEL_PROJECT_ID`
- Value: `prj_xyz789...`

### Step 4: MongoDB Connection String

#### 4.1 From MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **Database** → Your cluster
3. Click **Connect** button
4. Select **Connect your application**
5. Copy connection string
6. Replace `<password>` with your database password

Example:
```
mongodb+srv://username:password@cluster0.mongodb.net/multi-gateway-platform?retryWrites=true&w=majority
```

**Add to GitHub:**
- Name: `MONGO_URL`
- Value: `mongodb+srv://username:password@cluster0...`

#### 4.2 Alternative: MongoDB Connection String Components

If you prefer to build the connection string:

**Add individual secrets:**
- Name: `MONGO_USER`
- Value: `your-username`

- Name: `MONGO_PASS`
- Value: `your-password`

- Name: `MONGO_HOST`
- Value: `cluster0.mongodb.net`

### Step 5: Redis Connection String

#### 5.1 From Railway Redis

If using Railway Redis:

1. Go to Railway dashboard
2. Select your Redis service
3. Click **Variables** tab
4. Copy the `REDIS_URL` value

**Add to GitHub:**
- Name: `REDIS_URL`
- Value: `redis://default:password@redis.railway.internal:6379`

#### 5.2 From External Redis Provider

**Upstash Redis:**
1. Go to [Upstash Console](https://console.upstash.com)
2. Select your database
3. Copy **Redis URL**

**Redis Labs:**
1. Go to [Redis Labs Dashboard](https://app.redislabs.com)
2. Select your database
3. Copy connection string from **Configuration** tab

**Add to GitHub:**
- Name: `REDIS_URL`
- Value: `redis://...`

### Step 6: Supabase Credentials (Optional)

#### 6.1 Get Supabase URL and Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API**
4. Copy **Project URL** and **anon public** key

**Add to GitHub:**
- Name: `SUPABASE_URL`
- Value: `https://abcdefgh.supabase.co`

- Name: `SUPABASE_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 7: Slack Webhook (Optional)

#### 7.1 Create Slack Webhook

1. Go to [Slack API](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. Enter app name: `GitHub Actions`
5. Select workspace
6. Click **Incoming Webhooks**
7. Toggle **Activate Incoming Webhooks** to On
8. Click **Add New Webhook to Workspace**
9. Select channel for notifications
10. Copy webhook URL

**Add to GitHub:**
- Name: `SLACK_WEBHOOK_URL`
- Value: `https://hooks.slack.com/services/...`

### Step 8: Docker Hub (Optional)

Only needed if using private Docker registry.

**Add to GitHub:**
- Name: `DOCKER_USERNAME`
- Value: `your-dockerhub-username`

- Name: `DOCKER_PASSWORD`
- Value: `your-dockerhub-password`

## ✅ Verification Checklist

After adding all secrets, verify:

- [ ] `RAILWAY_TOKEN` added and starts with `ry_`
- [ ] `VERCEL_TOKEN` added and starts with `vercel_`
- [ ] `VERCEL_ORG_ID` added and starts with `team_`
- [ ] `VERCEL_PROJECT_ID` added and starts with `prj_`
- [ ] `MONGO_URL` added and starts with `mongodb+srv://`
- [ ] `REDIS_URL` added and starts with `redis://`
- [ ] `SUPABASE_URL` added (optional)
- [ ] `SUPABASE_KEY` added (optional)
- [ ] `SLACK_WEBHOOK_URL` added (optional)

## 🧪 Test Your Secrets

### Test Railway Token

```bash
# Test Railway authentication
railway whoami --token ry_your_token_here
```

Expected output:
```
✓ Authenticated as: your-email@example.com
```

### Test Vercel Token

```bash
# Test Vercel authentication
vercel whoami --token vercel_your_token_here
```

Expected output:
```
> your-username
```

### Test MongoDB Connection

```bash
# Test MongoDB connection (requires mongosh)
mongosh "mongodb+srv://username:password@cluster0.mongodb.net/test"
```

Expected output:
```
Current Mongosh Log ID: ...
Connecting to: mongodb+srv://...
Using MongoDB: 7.0.0
```

### Test Redis Connection

```bash
# Test Redis connection (requires redis-cli)
redis-cli -u "redis://default:password@host:6379" PING
```

Expected output:
```
PONG
```

## 🔄 Rotating Secrets

Secrets should be rotated every 90 days for security.

### Rotation Checklist

1. **Generate new tokens** from provider dashboards
2. **Update GitHub Secrets** with new values
3. **Update Railway environment variables**
4. **Update Vercel environment variables**
5. **Test deployment** to verify new secrets work
6. **Revoke old tokens** in provider dashboards

### Automated Rotation Reminder

Set calendar reminder for:
- **Every 3 months:** Rotate all tokens
- **Every 6 months:** Audit secret usage
- **Every 12 months:** Review access permissions

## 🔒 Security Best Practices

### DO's ✅

- ✅ Use strong, unique passwords for all services
- ✅ Enable 2FA on GitHub, Railway, Vercel accounts
- ✅ Limit token permissions to minimum required
- ✅ Regularly audit secret usage in workflows
- ✅ Use GitHub's encrypted secrets (not environment variables)
- ✅ Document which secrets are required for each workflow

### DON'Ts ❌

- ❌ Never commit secrets to repository (even in `.env` files)
- ❌ Never share secrets via email or chat
- ❌ Never use production secrets for local development
- ❌ Never print secrets in workflow logs
- ❌ Never reuse the same token across multiple projects
- ❌ Never disable secret masking in GitHub Actions

## 🐛 Troubleshooting

### Secret Not Found Error

**Error:** `Error: Secret RAILWAY_TOKEN not found`

**Solution:**
1. Verify secret name matches exactly (case-sensitive)
2. Check secret is in repository secrets (not organization/environment)
3. Ensure workflow has access to secrets (not disabled in settings)

### Invalid Token Error

**Error:** `railway: Invalid authentication token`

**Solution:**
1. Verify token hasn't expired
2. Check token has correct permissions
3. Generate new token from Railway dashboard
4. Update GitHub secret with new token

### Connection Refused Error

**Error:** `MongoServerError: connection refused`

**Solution:**
1. Check MongoDB Atlas IP whitelist (allow GitHub Actions IPs: `0.0.0.0/0`)
2. Verify connection string format is correct
3. Test connection string locally first
4. Check MongoDB Atlas cluster status

### CORS/Network Error

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:**
1. Add Railway/Vercel URLs to CORS whitelist
2. Update backend CORS configuration
3. Deploy backend first, then frontend
4. Verify environment variables are set correctly

## 📞 Support

If you encounter issues:

1. **GitHub Actions:** [GitHub Support](https://support.github.com)
2. **Railway:** [Railway Discord](https://discord.gg/railway)
3. **Vercel:** [Vercel Support](https://vercel.com/support)
4. **MongoDB Atlas:** [MongoDB Support](https://support.mongodb.com)

## 📚 Additional Resources

- [GitHub Actions Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [MongoDB Atlas Connection Strings](https://www.mongodb.com/docs/manual/reference/connection-string/)

---

**Last Updated:** January 9, 2026  
**Version:** 1.0.0
