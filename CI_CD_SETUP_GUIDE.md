# CI/CD Pipeline Setup Guide

## 📋 Overview

This document provides a complete guide to the CI/CD pipeline setup for the Multi-Gateway Platform, including automated deployment to Railway (backend) and Vercel (frontend) with robust rollback strategies.

## 🏗️ Architecture

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Push/PR to main                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Job 1: Build and Test                                           │
│  ├─ Checkout code                                                │
│  ├─ Install dependencies (backend + frontend)                    │
│  ├─ Run linting                                                  │
│  ├─ Build TypeScript/Next.js                                     │
│  ├─ Run tests                                                    │
│  └─ Cache build artifacts                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Job 2: Deploy Backend (Railway) │  │ Job 3: Deploy Frontend (Vercel) │
│ ├─ Install Railway CLI          │  │ ├─ Install Vercel CLI            │
│ ├─ Get current deployment ID    │  │ ├─ Pull Vercel environment       │
│ ├─ Deploy to Railway             │  │ ├─ Deploy to Vercel              │
│ ├─ Wait for health check (30s)  │  │ ├─ Wait for health check (20s)   │
│ └─ Upload deployment logs        │  │ └─ Upload deployment logs        │
└────────────────────┬────────────┘  └────────────────────┬────────────┘
                     │                                     │
                     └──────────────┬──────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │ Job 4: Integration Tests      │
                    │ ├─ Smoke test backend health  │
                    │ ├─ Smoke test frontend        │
                    │ └─ Run E2E tests (optional)   │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────┴──────────────┐
                    │                           │
                    ▼ (on failure)              ▼ (always)
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │ Job 5: Rollback           │   │ Job 6: Notify             │
    │ ├─ Rollback Railway       │   │ ├─ Generate summary       │
    │ ├─ Rollback Vercel        │   │ ├─ Send notifications     │
    │ └─ Create GitHub issue    │   │ └─ Upload artifacts       │
    └───────────────────────────┘   └───────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **GitHub Repository**: Code pushed to GitHub
2. **Railway Account**: [railway.app](https://railway.app)
3. **Vercel Account**: [vercel.com](https://vercel.com)
4. **GitHub Secrets**: Configured (see [GitHub Secrets Setup](#github-secrets-setup))

### Setup Steps

#### 1. Configure GitHub Secrets

Navigate to your repository: **Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `RAILWAY_TOKEN` | Railway CLI token | `ry_...` |
| `VERCEL_TOKEN` | Vercel CLI token | `vercel_...` |
| `VERCEL_ORG_ID` | Vercel organization ID | `team_...` |
| `VERCEL_PROJECT_ID` | Vercel project ID | `prj_...` |
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `SUPABASE_URL` | Supabase project URL | `https://...supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJ...` |

#### 2. Set Up Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project (or create new)
railway link

# Get your Railway token for GitHub Actions
railway whoami --token
```

Add the token to GitHub Secrets as `RAILWAY_TOKEN`.

#### 3. Set Up Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project
cd frontend
vercel link

# Get your Vercel credentials
vercel project ls
vercel teams ls
```

Add credentials to GitHub Secrets:
- `VERCEL_TOKEN`: From Vercel dashboard → Settings → Tokens
- `VERCEL_ORG_ID`: From `.vercel/project.json`
- `VERCEL_PROJECT_ID`: From `.vercel/project.json`

#### 4. Configure Railway Environment

In Railway dashboard:

1. Go to your project
2. Click on "Variables"
3. Add the following:
   - `NODE_ENV=production`
   - `MONGO_URL` (from your MongoDB Atlas)
   - `REDIS_URL` (from your Redis provider)
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `PORT=5000`

#### 5. Configure Vercel Environment

In Vercel dashboard:

1. Go to your project → Settings → Environment Variables
2. Add the following:
   - `NEXT_PUBLIC_API_URL` (your Railway backend URL)
   - `NODE_ENV=production`

#### 6. Test the Pipeline

Push to main branch or create a PR:

```bash
git checkout -b feature/test-cicd
git add .
git commit -m "Test CI/CD pipeline"
git push origin feature/test-cicd

# Create PR on GitHub
```

The pipeline will automatically:
1. ✅ Build and test both services
2. 🚀 Deploy backend to Railway
3. 🚀 Deploy frontend to Vercel
4. 🧪 Run integration tests
5. 📊 Generate deployment report

## 🔄 Rollback Strategies

### Automatic Rollback

The pipeline automatically rolls back on deployment failure:

**Railway Rollback:**
- Triggers if deployment fails or health checks timeout
- Reverts to previous stable deployment
- Uses `railway rollback <deployment-id>`

**Vercel Rollback:**
- Triggers if deployment fails or is unreachable
- Promotes previous production deployment
- Uses `vercel promote <previous-deployment>`

### Manual Rollback

Use the rollback script for manual intervention:

```bash
# Set environment variables
export RAILWAY_TOKEN="ry_..."
export VERCEL_TOKEN="vercel_..."

# Run rollback script
node scripts/rollback-deployment.js
```

The script will:
1. Fetch deployment history
2. Identify previous stable deployments
3. Roll back both Railway and Vercel
4. Validate rollback success

### Rollback Verification

After rollback, verify services:

```bash
# Check backend health
curl https://backend.railway.app/health

# Check frontend
curl https://frontend.vercel.app
```

## 🔍 Health Checks

### Pre-Deployment Health Check

Run before triggering deployment:

```bash
# Set environment variables
export BACKEND_URL="http://localhost:5000"
export FRONTEND_URL="http://localhost:3001"
export MONGO_URL="mongodb+srv://..."
export REDIS_URL="redis://..."

# Run health check
node scripts/pre-deploy-health-check.js
```

Validates:
- ✅ Backend API health endpoint
- ✅ Frontend accessibility
- ✅ MongoDB connection
- ✅ Redis connection

### Post-Deployment Validation

Automatically runs after deployment:

```bash
# Set deployment URLs
export RAILWAY_BACKEND_URL="https://backend.railway.app"
export VERCEL_FRONTEND_URL="https://frontend.vercel.app"

# Run validation
node scripts/post-deploy-validation.js
```

Validates:
- ✅ Backend health endpoints
- ✅ Backend API endpoints
- ✅ Frontend homepage
- ✅ Frontend dashboard

## 📊 Monitoring & Logging

### Deployment Logs

Access logs in GitHub Actions:
1. Go to repository → Actions tab
2. Click on workflow run
3. View job logs

Artifacts available:
- `railway-deployment-logs`: Railway CLI output
- `vercel-deployment-logs`: Vercel CLI output

### Error Handling

The pipeline handles errors at multiple levels:

**Build Failures:**
- TypeScript compilation errors
- Missing dependencies
- Test failures

**Deployment Failures:**
- Service unavailable
- Authentication errors
- Timeout errors

**Health Check Failures:**
- HTTP 500/502/503 errors
- Connection timeouts
- Service not responding

### Notifications

The pipeline generates a deployment summary in GitHub Actions:

```
🚀 Deployment Summary

Status: ✅ SUCCESS
Commit: abc123
Branch: main
Author: @username

Backend (Railway)
- Deployment ID: dep_xyz
- URL: https://backend.railway.app
- Status: success

Frontend (Vercel)
- Deployment ID: dpl_abc
- URL: https://frontend.vercel.app
- Status: success

Integration Tests
- Status: success
```

### Optional Slack Notifications

To enable Slack notifications:

1. Create Slack webhook URL
2. Add to GitHub Secrets as `SLACK_WEBHOOK_URL`
3. Uncomment Slack notification step in `.github/workflows/ci-cd.yml`

## 🧪 Testing the Pipeline

### Local Testing

Test deployment scripts locally:

```bash
# Test health checks
npm run test:health-check

# Test deployment validation
npm run test:post-deploy

# Test rollback
npm run test:rollback
```

### CI/CD Testing Checklist

- [ ] Push triggers build job
- [ ] Build completes successfully
- [ ] Tests run and pass
- [ ] Backend deploys to Railway
- [ ] Frontend deploys to Vercel
- [ ] Health checks pass
- [ ] Integration tests pass
- [ ] Deployment summary generated
- [ ] Logs uploaded as artifacts

### Failure Scenario Testing

Test rollback functionality:

1. **Introduce a breaking change:**
   ```bash
   # Break backend health endpoint
   echo "throw new Error('test');" >> backend/src/server.ts
   git commit -am "Test rollback"
   git push
   ```

2. **Observe pipeline:**
   - Build should succeed
   - Deployment should succeed
   - Health check should fail
   - Rollback should trigger

3. **Verify rollback:**
   - Check Railway dashboard for reverted deployment
   - Check Vercel dashboard for promoted previous deployment
   - Verify services are healthy

## 🔒 Security Best Practices

### Secret Management

- ✅ **Never commit secrets** to repository
- ✅ Use GitHub Secrets for all sensitive data
- ✅ Rotate tokens regularly (every 90 days)
- ✅ Use least-privilege access for service tokens

### Access Control

- ✅ Limit Railway/Vercel team access
- ✅ Use branch protection rules on `main`
- ✅ Require PR reviews before merge
- ✅ Enable required status checks

### Audit Logging

- ✅ Enable Railway audit logs
- ✅ Enable Vercel audit logs
- ✅ Monitor GitHub Actions logs
- ✅ Set up alerts for failed deployments

## 🐛 Troubleshooting

### Common Issues

#### Railway Deployment Fails

**Symptom:** `railway up` command fails

**Solutions:**
1. Check Railway token is valid: `railway whoami --token $RAILWAY_TOKEN`
2. Verify project is linked: `railway status`
3. Check Railway service logs in dashboard
4. Ensure environment variables are set

#### Vercel Deployment Fails

**Symptom:** `vercel deploy` command fails

**Solutions:**
1. Check Vercel token is valid: `vercel whoami --token $VERCEL_TOKEN`
2. Verify project is linked: `vercel ls`
3. Check build logs in Vercel dashboard
4. Ensure `vercel.json` is properly configured

#### Health Checks Timeout

**Symptom:** Health checks fail after deployment

**Solutions:**
1. Increase health check timeout in `.github/workflows/ci-cd.yml`
2. Check service startup time in Railway/Vercel logs
3. Verify health endpoint returns 200 status
4. Test health endpoint manually:
   ```bash
   curl -v https://backend.railway.app/health
   ```

#### Rollback Fails

**Symptom:** Rollback script exits with error

**Solutions:**
1. Check tokens are valid and have rollback permissions
2. Verify previous deployment exists: `railway deployment list`
3. Manually rollback via dashboards if script fails
4. Check rollback logs for specific error messages

### Getting Help

If issues persist:

1. Check GitHub Actions logs for detailed errors
2. Review Railway/Vercel dashboard logs
3. Run scripts locally with verbose logging
4. Contact Railway/Vercel support for platform issues

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

## 🎯 Next Steps

1. ✅ Set up monitoring alerts (Sentry, DataDog, etc.)
2. ✅ Configure performance tracking
3. ✅ Set up automated E2E tests with Playwright
4. ✅ Enable canary deployments for gradual rollouts
5. ✅ Set up staging environment for pre-production testing

---

**Last Updated:** January 9, 2026  
**Pipeline Version:** 1.0.0  
**Maintainer:** DevOps Team
