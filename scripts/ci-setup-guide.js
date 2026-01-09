#!/usr/bin/env node

/**
 * CI/CD Setup Helper Script
 * Assists with configuring Railway, Vercel, and GitHub Secrets for CI/CD pipeline
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    if (!silent) console.log(output);
    return { success: true, output };
  } catch (error) {
    if (!silent) console.error(error.message);
    return { success: false, error: error.message };
  }
}

function showSetupGuide() {
  log('bright', '\n╔═══════════════════════════════════════════════════════════════╗');
  log('bright', '║     CI/CD Pipeline Setup - Interactive Configuration Guide       ║');
  log('bright', '╚═══════════════════════════════════════════════════════════════╝\n');

  log('blue', '📋 STEP 1: Configure Railway\n');
  console.log(`Follow these steps to link your Railway project:

  1. Visit https://railway.app/dashboard
  2. Create or select your project
  3. Run: ${colors.yellow}railway login${colors.reset}
  4. Run: ${colors.yellow}railway link${colors.reset}
  5. Run: ${colors.yellow}railway whoami --token${colors.reset}
  6. Copy the token (starts with "ry_")
  7. Add to GitHub Secrets as ${colors.yellow}RAILWAY_TOKEN${colors.reset}

${colors.yellow}Why:${colors.reset} Allows GitHub Actions to deploy backend to Railway

`);

  log('blue', '📋 STEP 2: Configure Vercel\n');
  console.log(`Follow these steps to link your Vercel project:

  1. Visit https://vercel.com/dashboard
  2. Create or select your project
  3. Run: ${colors.yellow}vercel login${colors.reset}
  4. Run: ${colors.yellow}cd frontend && vercel link${colors.reset}
  5. Go to https://vercel.com/account/tokens
  6. Create token with name "GitHub Actions"
  7. Copy the token (starts with "vercel_")
  8. Add to GitHub Secrets as ${colors.yellow}VERCEL_TOKEN${colors.reset}

  For VERCEL_ORG_ID and VERCEL_PROJECT_ID:
  - Run: ${colors.yellow}cat frontend/.vercel/project.json${colors.reset}
  - Copy "orgId" and "projectId" values
  - Add to GitHub Secrets

${colors.yellow}Why:${colors.reset} Allows GitHub Actions to deploy frontend to Vercel

`);

  log('blue', '📋 STEP 3: Check Existing Secrets\n');
  console.log(`Required secrets in GitHub repository settings:

  ${colors.green}✅ Already exist (check if values are current):${colors.reset}
    - MONGO_URL
    - REDIS_URL
    - SUPABASE_URL
    - SUPABASE_KEY

  ${colors.yellow}⏳ Need to add from Railway/Vercel linking:${colors.reset}
    - RAILWAY_TOKEN
    - VERCEL_TOKEN
    - VERCEL_ORG_ID
    - VERCEL_PROJECT_ID

  To add secrets:
  1. Go to: https://github.com/Ransiluni2003/multi-gateway-platform/settings/secrets/actions
  2. Click "New repository secret"
  3. Enter name and value
  4. Click "Add secret"

`);

  log('blue', '📋 STEP 4: Test Your Setup\n');
  console.log(`After configuring secrets, test the pipeline:

  1. Make a test commit:
     ${colors.yellow}git checkout -b test/cicd${colors.reset}
     ${colors.yellow}git add .${colors.reset}
     ${colors.yellow}git commit -m "test: CI/CD pipeline"${colors.reset}

  2. Push to trigger workflow:
     ${colors.yellow}git push origin test/cicd${colors.reset}

  3. Create a Pull Request on GitHub

  4. Monitor the workflow:
     ${colors.yellow}npm run ci:logs${colors.reset}
     Or visit: https://github.com/Ransiluni2003/multi-gateway-platform/actions

  5. After 8-15 minutes, check results:
     - All jobs passed? 🎉
     - Deployment logs available in artifacts
     - Services healthy (Railway /health, Vercel homepage)

`);

  log('green', '✅ Setup Checklist\n');
  const railwayVer = runCommand('railway --version', true);
  const vercelVer = runCommand('vercel --version', true);
  console.log(`Complete these items in order:

  [ ] Install CLIs: railway v${railwayVer.output?.trim() || '?'}, vercel v${vercelVer.output?.trim().split('\n')[0] || '?'}
  [ ] railway login && railway link
  [ ] railway whoami --token (copy token)
  [ ] vercel login && cd frontend && vercel link
  [ ] cat frontend/.vercel/project.json (copy IDs)
  [ ] Create Vercel token at https://vercel.com/account/tokens
  [ ] Add RAILWAY_TOKEN to GitHub Secrets
  [ ] Add VERCEL_TOKEN to GitHub Secrets
  [ ] Add VERCEL_ORG_ID to GitHub Secrets
  [ ] Add VERCEL_PROJECT_ID to GitHub Secrets
  [ ] Verify all other secrets exist (MONGO_URL, REDIS_URL, etc.)
  [ ] Push test commit to trigger workflow
  [ ] Monitor workflow run in GitHub Actions
  [ ] Verify deployment succeeded
  [ ] Check services are healthy

`);

  log('yellow', '⚠️  Important Notes\n');
  console.log(`- Keep tokens ${colors.red}PRIVATE${colors.reset} - never commit them
- Store tokens in GitHub Secrets, not in code
- Rotate tokens every 90 days
- Each token should have minimal required permissions
- Test locally first: ${colors.yellow}npm run health-check${colors.reset}

`);
}

function checkCurrentStatus() {
  log('bright', '\n📊 Current System Status\n');

  // Check CLIs
  const railwayCheck = runCommand('railway --version', true);
  const vercelCheck = runCommand('vercel --version', true);

  log('green', '✅ CLI Tools:');
  console.log(`   Railway: ${railwayCheck.success ? railwayCheck.output.trim() : 'Not installed'}`);
  console.log(`   Vercel: ${vercelCheck.success ? vercelCheck.output.trim() : 'Not installed'}\n`);

  // Check project structure
  log('green', '✅ Project Structure:');
  const files = [
    'railway.json',
    'railway.toml',
    'vercel.json',
    '.github/workflows/ci-cd.yml',
    'scripts/pre-deploy-health-check.js',
    'scripts/post-deploy-validation.js',
    'scripts/rollback-deployment.js'
  ];

  files.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`   ${exists ? '✓' : '✗'} ${file}`);
  });

  console.log();

  // Check for Vercel project.json
  const vercelProjectPath = 'frontend/.vercel/project.json';
  if (fs.existsSync(vercelProjectPath)) {
    log('green', '✅ Vercel Project Linked:');
    try {
      const projectData = JSON.parse(fs.readFileSync(vercelProjectPath, 'utf-8'));
      console.log(`   orgId: ${projectData.orgId}`);
      console.log(`   projectId: ${projectData.projectId}\n`);
    } catch (e) {
      console.log(`   (Unable to read project.json)\n`);
    }
  } else {
    log('yellow', '⏳ Vercel Project Not Linked Yet:');
    console.log(`   Run: vercel login && cd frontend && vercel link\n`);
  }

  // Check Railway project
  const railwayProject = runCommand('railway status 2>/dev/null', true);
  if (railwayProject.success) {
    log('green', '✅ Railway Project Linked\n');
  } else {
    log('yellow', '⏳ Railway Project Not Linked Yet:');
    console.log(`   Run: railway login && railway link\n`);
  }
}

function main() {
  checkCurrentStatus();
  showSetupGuide();

  log('blue', '═══════════════════════════════════════════════════════════════');
  log('blue', 'Next Action: Follow the setup steps above, then push to GitHub');
  log('blue', '═══════════════════════════════════════════════════════════════\n');
}

main();
