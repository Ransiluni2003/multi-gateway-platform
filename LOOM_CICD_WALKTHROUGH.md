# Loom Walkthrough Script: CI/CD Pipeline Setup

## 📹 Video Metadata

**Title:** CI/CD Pipeline Setup - Railway & Vercel Deployment with Auto-Rollback  
**Duration:** 10-12 minutes  
**Audience:** DevOps Engineers, Backend Developers, Supervisors  
**Prerequisites:** GitHub repository, Railway & Vercel accounts

## 🎬 Segment Breakdown

### Segment 1: Introduction & Overview (1 minute)

**[Screen: GitHub Repository Main Page]**

**Script:**
> "Hello! In this video, I'll walk you through the complete CI/CD pipeline I've implemented for the Multi-Gateway Platform. This pipeline automates deployment to Railway for our backend and Vercel for our frontend, with robust rollback strategies and health checks.
>
> By the end of this demo, you'll see how a single push to the main branch triggers automated builds, tests, deployments, and validation - all with automatic rollback if anything fails.
>
> Let's get started!"

**Actions:**
- Show repository homepage
- Highlight `.github/workflows` directory
- Point to relevant configuration files

---

### Segment 2: Pipeline Architecture (1.5 minutes)

**[Screen: CI_CD_SETUP_GUIDE.md - Architecture diagram]**

**Script:**
> "Here's our CI/CD architecture. The pipeline consists of six main jobs:
>
> **Job 1: Build and Test** - This runs first, installing dependencies, linting code, building TypeScript and Next.js, and running tests for both backend and frontend.
>
> **Job 2 & 3: Deploy** - Once tests pass, we deploy in parallel - backend to Railway and frontend to Vercel. Each deployment captures the current deployment ID for potential rollback.
>
> **Job 4: Integration Tests** - After deployment, we run smoke tests against the live services to ensure they're responding correctly.
>
> **Job 5: Rollback** - This only runs if any previous job fails. It automatically reverts both Railway and Vercel to their previous stable deployments.
>
> **Job 6: Notifications** - Finally, we generate a deployment summary and send notifications to Slack or create GitHub issues for failures.
>
> This entire flow happens automatically on every push to main."

**Actions:**
- Highlight each job in the architecture diagram
- Show flow arrows
- Point out parallel execution
- Emphasize rollback trigger conditions

---

### Segment 3: GitHub Actions Workflow Demo (2 minutes)

**[Screen: GitHub Actions tab]**

**Script:**
> "Let me show you a real deployment in action. I'll navigate to the Actions tab to see our recent workflow runs.
>
> Here's a successful deployment from yesterday. Let's expand it to see the jobs.
>
> **Build and Test job** - You can see it completed in 3 minutes. It installed dependencies for both frontend and backend, ran linting, built the TypeScript code, and executed our test suites.
>
> **Deploy Backend** - This took 2 minutes. It deployed to Railway, waited for the health check to pass, and uploaded deployment logs as artifacts.
>
> **Deploy Frontend** - Running in parallel, this deployed to Vercel in about 1.5 minutes, again with health checks.
>
> **Integration Tests** - Here we see smoke tests hitting the deployed services to verify they're actually working.
>
> And finally, the deployment summary showing all services are healthy with their URLs."

**Actions:**
- Open Actions tab
- Click recent successful workflow run
- Expand each job to show logs
- Highlight key log lines (build success, health checks, deployment URLs)
- Show deployment artifacts

---

### Segment 4: GitHub Secrets Configuration (1.5 minutes)

**[Screen: Repository Settings → Secrets and Variables]**

**Script:**
> "For the pipeline to work, we need several GitHub Secrets configured. Let me show you what's required.
>
> In Settings → Secrets and variables → Actions, we have all our deployment credentials:
>
> - **RAILWAY_TOKEN** for Railway CLI authentication
> - **VERCEL_TOKEN**, **VERCEL_ORG_ID**, and **VERCEL_PROJECT_ID** for Vercel deployment
> - **MONGO_URL** and **REDIS_URL** for our database connections
> - **SUPABASE_URL** and **SUPABASE_KEY** for file storage
>
> I've created a comprehensive guide for obtaining each of these secrets, which I'll show you next. The key point is these secrets are encrypted by GitHub and never exposed in logs."

**Actions:**
- Navigate to Settings → Secrets
- List secret names (without showing values)
- Open `GITHUB_SECRETS_SETUP_DETAILED.md` in browser
- Quickly scroll through the guide

---

### Segment 5: Configuration Files (1.5 minutes)

**[Screen: VS Code - Project Root]**

**Script:**
> "Let's look at the configuration files that make this work.
>
> **railway.json and railway.toml** - These configure how Railway builds and runs our backend. We specify the build command, start command, health check endpoint, and restart policy.
>
> **vercel.json** - This configures Vercel deployment for our Next.js frontend. It includes build settings, routes, environment variables, and security headers.
>
> **.github/workflows/ci-cd.yml** - This is our main workflow file. It's about 400 lines defining all the jobs, steps, health checks, and rollback logic.
>
> These files work together to provide a fully automated, production-ready deployment process."

**Actions:**
- Open `railway.json` and highlight key sections
- Open `vercel.json` and highlight configuration
- Open `.github/workflows/ci-cd.yml` and scroll through sections
- Highlight important steps (health checks, rollback logic)

---

### Segment 6: Deployment Scripts (1.5 minutes)

**[Screen: VS Code - scripts/ directory]**

**Script:**
> "I've also created three utility scripts for deployment management:
>
> **pre-deploy-health-check.js** - This validates system health before deployment. It checks backend API, frontend, MongoDB, and Redis connections. If any critical service is down, it blocks deployment.
>
> **post-deploy-validation.js** - After deployment, this script validates all endpoints are responding correctly. It retries up to 30 times with exponential backoff.
>
> **rollback-deployment.js** - This handles manual rollback if needed. It fetches deployment history, identifies previous stable deployments, and rolls back both Railway and Vercel.
>
> These scripts can also be run manually from the command line for debugging or emergency rollbacks."

**Actions:**
- Open each script file
- Show key functions (health check logic, retry logic, rollback logic)
- Demonstrate running `node scripts/pre-deploy-health-check.js` in terminal
- Show successful output

---

### Segment 7: Rollback Demonstration (2 minutes)

**[Screen: GitHub Actions - Failed deployment run]**

**Script:**
> "Now let's see the rollback feature in action. Here's a deployment that failed due to a health check timeout.
>
> In the Deploy Backend job, you can see the deployment succeeded, but the health check step failed after 30 attempts. The service wasn't responding on the /health endpoint.
>
> This triggered the Rollback job. Watch what happens:
>
> First, it fetches the current Railway deployment ID and identifies the previous stable deployment. Then it runs `railway rollback` to revert to that version.
>
> Simultaneously, it does the same for Vercel - promoting the previous production deployment.
>
> Finally, it creates a GitHub issue to alert the team about the rollback. This ensures someone investigates why the deployment failed.
>
> This automatic rollback means we never have downtime due to bad deployments. The system automatically protects itself."

**Actions:**
- Open failed workflow run
- Show health check timeout logs
- Show rollback job execution
- Highlight rollback success messages
- Open the created GitHub issue
- Show services are back online with old deployment IDs

---

### Segment 8: Railway & Vercel Dashboards (1 minute)

**[Screen: Railway Dashboard]**

**Script:**
> "Let's verify the deployment on the actual platforms.
>
> In the Railway dashboard, you can see our backend service with the latest deployment. Railway shows the deployment status, health check results, and resource usage.
>
> The deployment ID matches what we saw in GitHub Actions, confirming our automation is working correctly."

**[Screen: Vercel Dashboard]**

> "And in Vercel, here's our frontend deployment. You can see the production deployment status, build logs, and deployment URL. Vercel automatically handles SSL, CDN distribution, and edge caching for us.
>
> Both platforms are now serving our latest code, deployed entirely through GitHub Actions."

**Actions:**
- Show Railway project page
- Highlight deployment ID, status, health
- Show Railway service logs
- Switch to Vercel dashboard
- Show deployment list and production deployment
- Open deployment URL in browser

---

### Segment 9: Live Service Verification (1 minute)

**[Screen: Browser - Backend health endpoint]**

**Script:**
> "Finally, let's verify the services are actually working.
>
> Here's our backend health endpoint returning status 'ok' with service metadata. This is the endpoint our health checks monitor.
>
> And here's our frontend application fully loaded. The deployment process preserved all functionality, environment variables, and database connections.
>
> The entire pipeline - from code push to live production - took about 8 minutes with zero manual intervention and zero downtime."

**Actions:**
- Open backend URL: `https://backend.railway.app/health`
- Show JSON response
- Open frontend URL in browser
- Navigate to dashboard page
- Show data loading correctly

---

### Segment 10: Conclusion & Documentation (1 minute)

**[Screen: CI_CD_SETUP_GUIDE.md]**

**Script:**
> "To summarize, we've implemented a complete CI/CD pipeline with:
>
> - Automated builds and tests
> - Parallel deployment to Railway and Vercel
> - Comprehensive health checks and validation
> - Automatic rollback on failure
> - Deployment notifications and logging
> - Manual rollback scripts for emergencies
>
> All of this is fully documented in our CI/CD Setup Guide, which includes setup instructions, troubleshooting steps, and security best practices.
>
> I've also created a detailed GitHub Secrets Setup Guide to help you configure your own environment.
>
> This pipeline ensures every deployment is safe, tested, and automatically rolled back if anything goes wrong. Thank you for watching!"

**Actions:**
- Show `CI_CD_SETUP_GUIDE.md` table of contents
- Scroll through key sections
- Show `GITHUB_SECRETS_SETUP_DETAILED.md`
- End on GitHub Actions summary page showing successful deployment

---

## 📝 Post-Production Checklist

- [ ] Video recorded with clear audio
- [ ] Screen resolution set to 1920x1080
- [ ] All terminal text is readable
- [ ] No sensitive data visible (tokens, passwords, emails)
- [ ] Transitions are smooth between screens
- [ ] Duration is 10-12 minutes
- [ ] Video uploaded to Loom
- [ ] Video link added to PR description
- [ ] Video link added to documentation
- [ ] Video set to "Anyone with link can view"

## 🎤 Recording Tips

1. **Audio:** Use a quality microphone, record in a quiet room
2. **Pacing:** Speak slowly and clearly, pause between segments
3. **Screen:** Use high contrast themes for code visibility
4. **Mouse:** Highlight important lines with mouse cursor
5. **Preparation:** Have all tabs/windows open before recording
6. **Rehearsal:** Practice once before final recording
7. **Editing:** Use Loom's built-in editor to trim mistakes

## 🔗 Resources to Have Ready

- GitHub repository with successful and failed workflow runs
- Railway dashboard logged in
- Vercel dashboard logged in
- Documentation files open in VS Code
- Browser tabs for deployed services
- Terminal ready for script demonstrations

---

**Estimated Total Recording Time:** 45-60 minutes (including retakes)  
**Estimated Editing Time:** 15-30 minutes  
**Final Video Length:** 10-12 minutes
