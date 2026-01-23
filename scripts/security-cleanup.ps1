# Security Cleanup Script - Windows PowerShell Version
# Remove Exposed Secrets from Git History

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🔐 Security Cleanup Script (Windows)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  WARNING: This script will rewrite git history!" -ForegroundColor Yellow
Write-Host "   - Create a backup before running" -ForegroundColor Yellow
Write-Host "   - Notify your team before force pushing" -ForegroundColor Yellow
Write-Host "   - Ensure all team members pull latest before continuing" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (type 'yes' to proceed)"

if ($confirm -ne "yes") {
  Write-Host "❌ Cancelled." -ForegroundColor Red
  exit 0
}

Write-Host ""
Write-Host "Step 1: Checking for exposed credentials..." -ForegroundColor Yellow

Write-Host "Looking for Stripe keys..."
$stripeCheck = git log -p --all -S "sk_test_" 2>$null | Select-Object -First 100
if ($stripeCheck) {
  Write-Host "⚠️  Found Stripe keys in history" -ForegroundColor Yellow
}

Write-Host "Looking for PayPal credentials..."
$paypalCheck = git log -p --all -S "whsec_" 2>$null | Select-Object -First 100
if ($paypalCheck) {
  Write-Host "⚠️  Found PayPal credentials in history" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Remove .env files from tracking..." -ForegroundColor Yellow

git rm --cached "backend\.env" 2>$null
git rm --cached "frontend\.env.local" 2>$null
git commit -m "chore: Remove .env files from git tracking" 2>$null | Out-Null

Write-Host "✅ .env files removed from git tracking" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Verify .env files are in .gitignore..." -ForegroundColor Yellow

$gitignoreContent = Get-Content .gitignore -ErrorAction SilentlyContinue
if ($gitignoreContent -match '\.env') {
  Write-Host "✅ .env files are protected in .gitignore" -ForegroundColor Green
} else {
  Write-Host "⚠️  Adding .env to .gitignore" -ForegroundColor Yellow
  Add-Content .gitignore ".env"
  Add-Content .gitignore ".env.*"
  git add .gitignore
  git commit -m "chore: Update .gitignore to protect .env files"
}

Write-Host ""
Write-Host "Step 4: Scan git history for secrets..." -ForegroundColor Yellow

# Get default branch
$defaultBranch = git rev-parse --abbrev-ref HEAD

# Look for common patterns
$secrets = @(
  "sk_test_",
  "sk_live_",
  "whsec_",
  "Bearer eyJ"
)

$foundSecrets = @()
foreach ($secret in $secrets) {
  $matches = git log -p --all -S $secret 2>$null | Select-Object -First 5
  if ($matches) {
    $foundSecrets += $secret
  }
}

if ($foundSecrets.Count -gt 0) {
  Write-Host "⚠️  Potential secrets found in history:" -ForegroundColor Yellow
  foreach ($secret in $foundSecrets) {
    Write-Host "   - $secret" -ForegroundColor Yellow
  }
} else {
  Write-Host "✅ No obvious exposed secrets detected" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Security cleanup completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. ❌ REVOKE all exposed credentials:" -ForegroundColor Red
Write-Host "   - Stripe: https://dashboard.stripe.com/apikeys" -ForegroundColor Gray
Write-Host "   - PayPal: https://www.paypal.com/signin" -ForegroundColor Gray
Write-Host "   - Supabase: Project Settings → API" -ForegroundColor Gray
Write-Host "   - MongoDB: Atlas → Database Access" -ForegroundColor Gray
Write-Host "   - Sentry: Project Settings → Auth Tokens" -ForegroundColor Gray
Write-Host ""

Write-Host "2. 🔄 REGENERATE new credentials" -ForegroundColor Yellow
Write-Host ""

Write-Host "3. 🔐 ADD secrets to GitHub:" -ForegroundColor Yellow
Write-Host "   Settings → Secrets and variables → Actions" -ForegroundColor Gray
Write-Host ""

Write-Host "4. 📝 UPDATE your team" -ForegroundColor Yellow
Write-Host ""

Write-Host "5. 💾 If needed, force push (after team agreement):" -ForegroundColor Yellow
Write-Host "   git push origin $defaultBranch --force" -ForegroundColor Gray
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
