# Release Checklist & Tagging Guide

**Version:** 1.0.0  
**Last Updated:** February 16, 2026  
**Owners:** DevOps, Security, Engineering Teams

---

## 📋 Overview

This checklist provides a comprehensive guide for preparing, validating, and deploying releases of the Multi-Gateway Platform. Follow these steps to ensure production-ready deployments with minimal risk.

---

## 🎯 Pre-Release Checks

### 1. Code Quality & Testing

- [ ] **Run all tests**
  ```bash
  npm run test
  npm run test:security
  cd backend && npm test
  cd frontend && npm test
  ```

- [ ] **Run security test suite**
  ```bash
  npm run verify:security-headers
  npm run verify:rate-limiting
  npm run verify:admin-protection
  npm run verify:secrets-hygiene
  ```

- [ ] **Verify audit logging**
  ```bash
  npm run proof:audit-logs
  npm run verify:audit-logs
  ```

- [ ] **Check Docker health**
  ```bash
  npm run verify:docker
  npm run verify:health
  ```

- [ ] **Run load tests** (optional but recommended)
  ```bash
  npm run loadtest:ci
  ```

### 2. Security Hardening

- [ ] **Secrets audit**
  - Ensure no hardcoded keys in code
  - Verify all secrets are in `.env.example` (without values)
  - Check that `.env` is in `.gitignore`
  
  ```bash
  npm run verify:secrets-hygiene
  ```

- [ ] **Security headers validation**
  ```bash
  npm run verify:security-headers
  ```

- [ ] **Rate limiting verification**
  ```bash
  npm run verify:rate-limiter
  npm run verify:rate-limiting
  ```

- [ ] **Admin endpoint protection**
  ```bash
  npm run verify:admin-protection
  ```

- [ ] **Session security**
  - Verify refresh token rotation is enabled
  - Check JWT expiration times are appropriate
  - Confirm session invalidation works

### 3. Demo Scripts Validation

Run all demo scripts to ensure they work correctly:

```bash
npm run demo:security
npm run demo:storage
npm run demo:security-center
npm run demo:preview
npm run demo:logs
```

### 4. Database & Storage

- [ ] **MongoDB connection verified**
  - Test connection string
  - Verify indices are created
  - Check database backup is working

- [ ] **Supabase storage configured**
  - Bucket exists and is accessible
  - Signed URL expiry is working
  - File upload/download tested
  
  ```bash
  npm run setup:supabase
  npm run demo:storage
  ```

- [ ] **Run database migrations** (if applicable)
  ```bash
  npm run db:migrate:deploy
  ```

### 5. Build Verification

- [ ] **Frontend builds successfully**
  ```bash
  cd frontend && npm run build
  ```

- [ ] **Backend compiles without errors**
  ```bash
  cd backend && npm run build
  ```

- [ ] **Full platform build passes**
  ```bash
  npm run build
  ```

---

## 🌍 Required Environment Variables

### Staging Environment

Create a `.env` file with the following variables:

#### Core Services
```bash
# MongoDB
MONGO_URI=mongodb://[host]:[port]/[database]

# Redis (for distributed rate limiting & queues)
REDIS_URL=redis://:[password]@[host]:[port]
RATE_LIMIT_STORE=redis  # or 'upstash' or 'memory'

# Upstash (optional, for serverless rate limiting)
UPSTASH_REDIS_REST_URL=https://[region].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]
```

#### Authentication & Security
```bash
# JWT Configuration
JWT_SECRET=[strong-random-secret-256-bits]
JWT_SECRET_ROTATION_ENABLED=false  # Set true when implementing rotation
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Session Security
SESSION_SECRET=[strong-random-secret]
COOKIE_SECRET=[strong-random-secret]

# CSRF Protection
CSRF_SECRET=[strong-random-secret]
```

#### Storage & CDN
```bash
# Supabase
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE=[service-role-key]
SUPABASE_BUCKET=uploads
SUPABASE_MAX_FILE_SIZE=10485760  # 10MB

# Expiry Configuration
SIGNED_URL_EXPIRY_SECONDS=3600  # 1 hour
```

#### Observability
```bash
# Logging
LOGTAIL_SOURCE_TOKEN=[logtail-token]

# Sentry (Error Tracking)
SENTRY_DSN=[sentry-dsn]

# OpenTelemetry (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

#### External Services
```bash
# Payment Gateways (if applicable)
STRIPE_SECRET_KEY=[stripe-secret]
PAYPAL_CLIENT_ID=[paypal-client-id]
PAYPAL_CLIENT_SECRET=[paypal-secret]
```

#### Application Config
```bash
# Server Config
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://localhost:3001

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Admin Configuration
ADMIN_EMAIL=[admin-email]
```

### Production Environment

**Additional requirements for production:**

- [ ] Use managed MongoDB service (MongoDB Atlas, AWS DocumentDB)
- [ ] Use managed Redis (Redis Labs, AWS ElastiCache, Upstash)
- [ ] Enable SSL/TLS for all connections
- [ ] Use secrets management service (AWS Secrets Manager, HashiCorp Vault)
- [ ] Configure CDN for frontend assets
- [ ] Set up automated backups
- [ ] Enable monitoring and alerting

---

## 🔐 Secret Rotation Guide

### Regular Secret Rotation Schedule

**Recommended rotation cadence:**
- JWT secrets: Every 90 days (or immediately if compromised)
- API keys: Every 180 days
- Database credentials: Every 180 days
- Storage credentials: Every 180 days

### How to Rotate Secrets Safely

#### 1. JWT Secret Rotation

See detailed guide: [docs/JWT_ROTATION_RUNBOOK.md](./JWT_ROTATION_RUNBOOK.md)

**Quick steps:**
1. Generate new secret: `openssl rand -base64 32`
2. Add as `JWT_SECRET_NEW` in environment
3. Deploy with dual-secret support
4. Wait for all old tokens to expire (7 days for refresh tokens)
5. Promote new secret to primary
6. Remove old secret

#### 2. Database Credentials

1. Create new database user with same permissions
2. Update `MONGO_URI` in environment
3. Deploy and verify connectivity
4. Revoke old database user
5. Update backup scripts

#### 3. API Keys (Supabase, Stripe, etc.)

1. Generate new API key in service dashboard
2. Update environment variable
3. Deploy and test
4. Revoke old API key
5. Update documentation

#### 4. Redis Credentials

1. Create new Redis user/password (if supported)
2. Update `REDIS_URL` in environment
3. Deploy and verify connection
4. Remove old credentials

### Emergency Secret Rotation

If a secret is compromised:

1. **Immediate actions:**
   - Revoke compromised secret immediately
   - Generate and deploy new secret ASAP
   - Force logout all users (if auth secret compromised)
   - Review audit logs for unauthorized access

2. **Post-incident:**
   - Document incident
   - Review access controls
   - Update runbooks
   - Schedule security review

---

## 📦 Release Process

### 1. Version Tagging

Follow semantic versioning: `MAJOR.MINOR.PATCH`

```bash
# Example: Version 1.2.3
git tag -a v1.2.3 -m "Release v1.2.3: Security Center feature"
git push origin v1.2.3
```

**Version increment rules:**
- **MAJOR:** Breaking changes, major architecture updates
- **MINOR:** New features, backward-compatible changes
- **PATCH:** Bug fixes, security patches

### 2. Create Release Notes

Document in `CHANGELOG.md`:

```markdown
## [1.2.3] - 2026-02-16

### Added
- Security Center admin UI with audit explorer, rate limit monitor, and session tools
- CSV export functionality for audit logs
- Real-time rate limiting statistics dashboard

### Fixed
- [Bug ID] Description of fix

### Security
- Updated dependency X to version Y
```

### 3. Build & Package

```bash
# Clean build
npm run build

# Docker image (if using containers)
docker build -t multi-gateway-platform:v1.2.3 .
docker tag multi-gateway-platform:v1.2.3 multi-gateway-platform:latest
```

### 4. Deploy to Staging

```bash
# Health check before deploy
npm run health-check

# Deploy to staging
# (Deployment method varies by infrastructure)

# Post-deploy validation
npm run validate-deploy
```

### 5. Smoke Tests

```bash
# Run quick verification
npm run verify:health
npm run demo:preview

# Manual checks
- Navigate to Security Center
- Test audit log filtering
- Verify CSV export
- Check rate limit monitor
- Test session management
```

### 6. Deploy to Production

```bash
# Final health check
npm run health-check

# Deploy to production
# (Deployment method varies by infrastructure)

# Post-deploy validation
npm run validate-deploy

# Monitor logs for 15 minutes
npm run docker:logs  # or kubectl logs, etc.
```

---

## 🔄 Rollback Plan

### When to Rollback

- Critical bugs discovered in production
- Performance degradation (P95 latency > 2x baseline)
- Security vulnerability introduced
- Database migration failure
- High error rate (> 5% of requests)

### Rollback Procedure

#### 1. Quick Rollback (Application Level)

```bash
# Use automated rollback script
npm run rollback

# Or manually revert to previous version
git checkout v1.2.2
npm run build
# Redeploy
```

#### 2. Database Rollback (if migrations were applied)

```bash
# Rollback last migration
npm run db:migrate:rollback

# Or restore from backup
# (Follow your database backup restoration process)
```

#### 3. Post-Rollback Verification

```bash
npm run verify:health
npm run demo:preview
```

#### 4. Incident Documentation

- Document what triggered rollback
- Timeline of events
- Root cause analysis
- Prevention measures

---

## 📊 Health Monitoring

### Key Metrics to Monitor

**After deployment, monitor for at least 15 minutes:**

1. **Application Health**
   - Response times (P50, P95, P99)
   - Error rates
   - CPU & memory usage

2. **Database Performance**
   - Query response times
   - Connection pool utilization
   - Slow query log

3. **External Services**
   - Redis connection status
   - Supabase storage availability
   - Payment gateway response times

4. **Security Metrics**
   - Rate limit violations
   - Failed authentication attempts
   - Suspicious activity patterns

### Monitoring Commands

```bash
# Health endpoint
curl http://localhost:5000/api/health

# Services health check
curl http://localhost:5000/api/health/services

# Redis metrics
redis-cli INFO stats

# MongoDB metrics
mongo --eval "db.serverStatus()"
```

---

## ✅ Post-Release Checklist

- [ ] **Release tagged in Git**
- [ ] **Changelog updated**
- [ ] **Documentation updated** (if API changes)
- [ ] **Team notified** of deployment
- [ ] **Monitoring dashboards checked**
- [ ] **No critical errors in logs**
- [ ] **Performance within acceptable range**
- [ ] **Backup verified after deployment**
- [ ] **Security Center accessible** (for this release)
- [ ] **Post-deployment retrospective scheduled**

---

## 🆘 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Database Connection Issues

```bash
# Test MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Connected')).catch(e => console.error('❌', e))"

# Check Redis connection
redis-cli -u $REDIS_URL ping
```

#### Environment Variable Issues

```bash
# Verify all required vars are set
node -e "const required = ['MONGO_URI', 'JWT_SECRET', 'SUPABASE_URL']; required.forEach(v => console.log(v + ':', process.env[v] ? '✅' : '❌'))"
```

---

## 📚 Reference Documentation

- [Architecture Guide](./ARCHITECTURE_AND_KEY_FILES.md)
- [Security Implementation](./SECURITY_IMPLEMENTATION_CHECKLIST.md)
- [JWT Rotation Runbook](./docs/JWT_ROTATION_RUNBOOK.md)
- [Docker Setup](./docs/DOCKER_SETUP.md)
- [CI/CD Guide](./CI_CD_SETUP_GUIDE.md)
- [Known Issues](./KNOWN_ISSUES_BACKLOG.md)

---

## 📞 Support & Escalation

### Severity Levels

- **P0 (Critical):** Production down, security breach
- **P1 (High):** Major functionality broken, performance degraded
- **P2 (Medium):** Minor functionality issues
- **P3 (Low):** Cosmetic issues, documentation updates

### Escalation Path

1. Check [Known Issues](./KNOWN_ISSUES_BACKLOG.md)
2. Review application logs
3. Consult this checklist
4. Contact DevOps team
5. Initiate rollback if necessary

---

**Last Reviewed:** February 16, 2026  
**Next Review:** May 16, 2026 (Quarterly)
