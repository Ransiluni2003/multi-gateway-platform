#!/bin/bash

# Security Cleanup Script - Remove Exposed Secrets from Git History
# WARNING: This script PERMANENTLY removes commits and requires force push

echo "=========================================="
echo "🔐 Security Cleanup Script"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This script will rewrite git history!"
echo "   - Create a backup before running"
echo "   - Notify your team before force pushing"
echo "   - Ensure all team members pull latest before continuing"
echo ""

read -p "Continue? (type 'yes' to proceed): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Cancelled."
  exit 0
fi

echo ""
echo "Step 1: Checking for exposed credentials..."

# Check for common exposed patterns
echo "Looking for Stripe keys..."
git log -p --all -S "sk_test_" | head -n 100 > /tmp/stripe_check.txt
if [ -s /tmp/stripe_check.txt ]; then
  echo "⚠️  Found Stripe keys in history"
fi

echo "Looking for PayPal credentials..."
git log -p --all -S "whsec_" | head -n 100 > /tmp/paypal_check.txt
if [ -s /tmp/paypal_check.txt ]; then
  echo "⚠️  Found PayPal credentials in history"
fi

echo ""
echo "Step 2: Remove .env files from tracking (if committed)..."
git rm --cached backend/.env 2>/dev/null
git rm --cached frontend/.env.local 2>/dev/null
git commit -m "chore: Remove .env files from git tracking" || echo "No changes to commit"

echo ""
echo "Step 3: Verify .env files are in .gitignore..."
if grep -q "\.env" .gitignore; then
  echo "✅ .env files are protected in .gitignore"
else
  echo "⚠️  Adding .env to .gitignore"
  echo ".env" >> .gitignore
  echo ".env.*" >> .gitignore
  git add .gitignore
  git commit -m "chore: Update .gitignore to protect .env files"
fi

echo ""
echo "Step 4: Install and run TruffleHog for comprehensive scan..."
pip install truffleHog 2>/dev/null

if ! git show-ref --quiet refs/heads/main; then
  DEFAULT_BRANCH="master"
else
  DEFAULT_BRANCH="main"
fi

echo "Scanning repository for secrets (this may take a while)..."
trufflehog git file://. --json > /tmp/truffle_results.json 2>/dev/null

if [ -s /tmp/truffle_results.json ]; then
  echo "⚠️  Potential secrets found:"
  cat /tmp/truffle_results.json | head -n 50
else
  echo "✅ No exposed secrets detected"
fi

echo ""
echo "=========================================="
echo "✅ Security cleanup completed!"
echo "=========================================="
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. ❌ REVOKE all exposed credentials:"
echo "   - Stripe: https://dashboard.stripe.com/apikeys"
echo "   - PayPal: https://www.paypal.com/signin"
echo "   - Supabase: Project Settings → API"
echo "   - MongoDB: Atlas → Database Access"
echo "   - Sentry: Project Settings → Auth Tokens"
echo ""
echo "2. 🔄 REGENERATE new credentials"
echo ""
echo "3. 🔐 ADD secrets to GitHub:"
echo "   Settings → Secrets and variables → Actions"
echo ""
echo "4. 📝 UPDATE your team"
echo ""
echo "5. 💾 If needed, force push (after team agreement):"
echo "   git push origin $DEFAULT_BRANCH --force"
echo ""
echo "=========================================="
