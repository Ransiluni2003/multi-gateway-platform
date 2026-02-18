# GitHub Secrets Configuration

## Required Secrets for CI/CD & Deployment

Add these secrets to your GitHub repository:
- Go to: **Settings → Secrets and variables → Actions → New repository secret**

### Backend Secrets

| Secret Name | Value | Example |
|-------------|-------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET` | JWT signing secret (64+ chars) | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `PAYPAL_CLIENT_ID` | PayPal client ID | `A...` |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret | `E...` |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID | `we_...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE` | Supabase service role key | `eyJhbGc...` |
| `SUPABASE_BUCKET` | Supabase storage bucket | `platform-assets` |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://xxx@ingest.sentry.io/xxx` |
| `LOGTAIL_SOURCE_TOKEN` | Logtail logging token | `nqtg...` |
| `SEED_ADMIN_EMAIL` | Initial admin email | `admin@company.com` |
| `SEED_ADMIN_PASSWORD` | Initial admin password | `SecurePassword123!` |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password | `your_secure_password` |
| `MONGO_PASS` | MongoDB user password | `your_secure_password` |
| `CORS_ORIGIN` | CORS origin URL | `http://localhost:3000` |

### Frontend Secrets

| Secret Name | Value | Example |
|-------------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` |
| `NEXT_PUBLIC_API_BASE` | Backend API URL | `http://localhost:5000` |

---

## How to Add Secrets

### Method 1: GitHub Web UI
1. Go to your repository
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the secret name (from table above)
6. Paste the secret value
7. Click **Add secret**

### Method 2: GitHub CLI
```bash
# Install GitHub CLI: https://cli.github.com

# Login
gh auth login

# Add a secret
gh secret set MONGO_URI --body "mongodb+srv://user:pass@cluster.mongodb.net/db"
gh secret set JWT_SECRET --body "your_64_char_secret"
gh secret set STRIPE_SECRET_KEY --body "sk_test_..."

# List all secrets
gh secret list

# Delete a secret
gh secret delete MONGO_URI
```

---

## Environment-Specific Secrets (Advanced)

For different environments, use environments feature:

1. Go to **Settings → Environments**
2. Create new environment: `production`, `staging`, `development`
3. Add environment-specific secrets to each
4. Reference in workflows: `${{ secrets.STRIPE_SECRET_KEY }}`

**Workflow example:**
```yaml
env:
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
  ENVIRONMENT: production
```

---

## Verification

After adding secrets, verify they're working:

1. Create a test workflow that echoes secret names (not values)
2. Run the workflow
3. Check that it completes without errors
4. Verify secrets are being injected correctly

**Test workflow:**
```yaml
name: Verify Secrets

on: [push]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Check secrets exist
        run: |
          echo "MONGO_URI: ${MONGO_URI:+set}"
          echo "JWT_SECRET: ${JWT_SECRET:+set}"
          echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:+set}"
        env:
          MONGO_URI: ${{ secrets.MONGO_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

---

## Security Notes

⚠️ **Important:**
- Secrets are **NEVER** logged or printed
- Secrets are **masked** in logs (shown as `***`)
- Secrets are **NOT** available to pull requests from forks
- Each secret is **encrypted** at rest
- Secrets are **case-sensitive**
- Keep secret values secure - don't share or expose

---

## Next Steps

1. ✅ Add all secrets to GitHub
2. ✅ Test deployment pipeline
3. ✅ Remove `.env` files from git history (if needed)
4. ✅ Brief team on new process
5. ✅ Update deployment documentation
