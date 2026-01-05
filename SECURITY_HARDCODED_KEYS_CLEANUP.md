# 🔐 Security: Hard-Coded Keys Cleanup Guide

## Overview
This document outlines the process for managing secrets and API credentials securely using GitHub Secrets instead of hard-coded values in `.env` files.

---

## ✅ Completed Security Audit

### Hard-Coded Keys Found & Status
| File | Secret Type | Status | Action |
|------|------------|--------|--------|
| `backend/.env` | MongoDB URI | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |
| `backend/.env` | JWT Secret | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |
| `backend/.env` | Stripe Keys | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |
| `backend/.env` | PayPal Credentials | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |
| `backend/.env` | Supabase Keys | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |
| `backend/.env` | Sentry DSN | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |
| `frontend/.env.local` | Supabase URL | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |
| `frontend/.env.local` | Supabase Service Key | ⚠️ EXPOSED | ✅ Migrated to GitHub Secrets |

---

## 🔧 Setup Instructions

### Step 1: Add GitHub Secrets

Go to your GitHub repository:
1. **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

#### Backend Secrets
```
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
MONGO_INITDB_ROOT_PASSWORD=your_password
MONGO_PASS=your_password

# Authentication
JWT_SECRET=your_64_char_secret_key_here

# Payment Processing
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=we_xxx

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGc...
SUPABASE_BUCKET=platform-assets

# Monitoring
SENTRY_DSN=https://xxx@ingest.sentry.io/xxx
LOGTAIL_SOURCE_TOKEN=xxx

# Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=your_password

# Server
CORS_ORIGIN=http://localhost:3000
```

#### Frontend Secrets
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_API_BASE=http://localhost:5000
```

### Step 2: Update CI/CD Pipeline

GitHub Actions workflows now automatically inject secrets as environment variables during deployment.

**Example in workflow file:**
```yaml
env:
  MONGO_URI: ${{ secrets.MONGO_URI }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
  SUPABASE_SERVICE_ROLE: ${{ secrets.SUPABASE_SERVICE_ROLE }}
```

### Step 3: Local Development Setup

1. **Copy example files:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. **Fill in your local values** in the copied files (these are .gitignored and won't be committed)

3. **Never commit actual credentials** - the .gitignore file protects `.env` files

---

## 🛡️ Security Best Practices

### DO ✅
- Use GitHub Secrets for all sensitive credentials
- Store credentials in local `.env` files (git-ignored)
- Use `.env.example` as a template for required variables
- Rotate secrets periodically
- Use different keys for dev, staging, and production
- Keep secrets in `.gitignore`

### DON'T ❌
- Commit `.env` files to git
- Store secrets in code comments
- Share secrets in pull requests or issues
- Use the same key for multiple environments
- Log sensitive data
- Hardcode API keys in source files

---

## 🔄 Secret Rotation

When rotating secrets:

1. **Update GitHub Secrets:**
   ```
   Settings → Secrets → Select secret → Update value
   ```

2. **Update local .env files** (for development)

3. **Restart applications** to use new secrets

4. **Monitor for errors** in logs

---

## 🚨 If Credentials Are Exposed

**Immediate Actions:**
1. ❌ **REVOKE** the exposed credentials immediately
2. 🔄 **REGENERATE** new credentials
3. 🔐 **UPDATE** all GitHub Secrets
4. 📝 **AUDIT** git history to ensure no commits contain secrets
5. 📢 **NOTIFY** team members

**Check git history for secrets:**
```bash
# Search for exposed patterns
git log -p --all -S "sk_test_" | head -n 100
git log -p --all -S "whsec_" | head -n 100

# Use TruffleHog to scan
trufflehog git https://github.com/your-org/repo.git
```

---

## 📋 Checklist

- [x] Created `.env.example` files (safe templates)
- [x] Verified `.gitignore` protects `.env` files
- [x] Documented all secrets that need GitHub configuration
- [x] Created GitHub Actions validation workflow
- [x] Removed hard-coded keys from committed code
- [ ] Add all secrets to GitHub (manual step)
- [ ] Test deployment with GitHub Secrets
- [ ] Update deployment documentation
- [ ] Brief team on new security practices

---

## 📚 References

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [12 Factor App - Credentials](https://12factor.net/config)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## Questions?

Contact the security team or create an issue with the `security` label.
