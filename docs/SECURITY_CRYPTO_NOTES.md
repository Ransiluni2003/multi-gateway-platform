# Security & Cryptography Fundamentals

## 🎯 Purpose
Understanding **when to use what**: hashing vs signing vs encryption in real-world applications.

---

## 1. Hashing (Passwords) 🔐

### What It Does
**One-way transformation** — input → fixed-size output that **cannot be reversed**.

### When To Use
- **Password storage** (never store plaintext passwords)
- Integrity verification (checksums)
- Data fingerprinting

### How It Works
```
Password: "mySecret123"
↓ (Argon2/bcrypt + random salt)
Hash: "$2b$12$KIXxPq7..."  ← stored in database
```

**Key Concepts:**
- **Salt**: Random data added to password before hashing (prevents rainbow table attacks)
- **Work Factor**: Computational cost to slow down brute-force attacks
- **Algorithms**: Argon2id (best), bcrypt (good), PBKDF2 (acceptable)

### Why Not MD5/SHA256?
❌ **Too fast** — attackers can try billions of passwords/second  
✅ **Argon2/bcrypt** — designed to be intentionally slow

---

## 2. Signing (Webhooks & JWT Integrity) ✍️

### What It Does
**Proves authenticity** — message hasn't been tampered with and came from the right sender.

### When To Use
- **Webhook verification** (Stripe, PayPal signatures)
- **JWT tokens** (ensure token wasn't modified)
- API request authentication
- Data integrity checks

### How It Works
```
Message: {"orderId": "123", "amount": 100}
Secret Key: "myHmacSecret"
↓ (HMAC-SHA256)
Signature: "a3f2b8c..."  ← sent with message

Receiver: Recompute signature with same secret
         If matches → message is authentic ✅
```

**Key Concepts:**
- **HMAC**: Hash-based Message Authentication Code
- **Symmetric**: Same secret on both sides
- **No confidentiality**: Message is readable, just verifiable

### Example: Stripe Webhook
```javascript
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  webhookSecret  // validates signature
);
```

---

## 3. Encryption (Data Confidentiality) 🔒

### What It Does
**Two-way transformation** — data can be encrypted AND decrypted (with the right key).

### When To Use
- **Sensitive data at rest** (credit cards, SSNs, medical records)
- **Data in transit** (HTTPS/TLS)
- Secure communication channels
- Encrypted backups

### Envelope Encryption Pattern
```
1. Data Encryption Key (DEK)
   Your data → AES-256-GCM → Encrypted Data
                ↑
   Random key generated per encryption

2. Key Encryption Key (KEK)
   DEK → RSA/KMS → Encrypted DEK (stored with data)
        ↑
   Master key in secure vault (AWS KMS, Azure Key Vault)
```

**Why Envelope Encryption?**
- ✅ Rotate master keys without re-encrypting all data
- ✅ Fast symmetric encryption for data (AES)
- ✅ Strong asymmetric encryption for keys (RSA/KMS)

### Key Rotation Strategy
```
1. Generate new KEK
2. Re-encrypt DEKs with new KEK (lightweight)
3. Mark old KEK for deprecation
4. Gradual migration (not all at once)
```

**Key Concepts:**
- **Symmetric**: Same key encrypts/decrypts (AES-256-GCM)
- **Asymmetric**: Public key encrypts, private key decrypts (RSA)
- **Key Storage**: Never hardcode — use environment variables or secret managers

---

## 4. Secure Session Strategy 🍪

### Session Management Best Practices

#### HTTP Cookies Configuration
```javascript
res.cookie('sessionId', token, {
  httpOnly: true,     // JavaScript cannot access (XSS protection)
  secure: true,       // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 3600000,    // 1 hour
  path: '/',
  domain: '.yourdomain.com'
});
```

### Security Attributes Explained

| Attribute | Purpose | Protection Against |
|-----------|---------|---------------------|
| **httpOnly** | Prevents JavaScript access | XSS (Cross-Site Scripting) |
| **secure** | HTTPS transmission only | Man-in-the-middle attacks |
| **sameSite** | Restricts cross-site sending | CSRF (Cross-Site Request Forgery) |

### SameSite Values
- **`strict`**: Cookie never sent cross-site (most secure, may break OAuth)
- **`lax`**: Sent on top-level navigation (GET, not POST)
- **`none`**: Sent everywhere (requires `secure=true`)

### CSRF Protection Strategy
```
1. Token-Based
   ├─ Generate random token per session
   ├─ Embed in forms: <input name="csrf" value="abc123">
   └─ Validate on server before processing

2. Double Submit Cookie
   ├─ Set CSRF token in cookie
   ├─ Require same token in request header
   └─ Attacker can't read cookie from different origin

3. SameSite Cookies (Modern)
   └─ Browser blocks cross-site POST by default
```

### Token Storage: Cookie vs localStorage

| Storage | XSS Vulnerable? | CSRF Vulnerable? | Best For |
|---------|-----------------|------------------|----------|
| **httpOnly Cookie** | ❌ No | ⚠️ Yes (use CSRF token) | Session tokens |
| **localStorage** | ✅ Yes | ❌ No | Non-sensitive data |
| **sessionStorage** | ✅ Yes | ❌ No | Temporary data |

---

## 5. What We Apply in Our App Today 🚀

### Current Implementation

#### Password Handling
```javascript
// User Registration/Login
- ✅ bcrypt (work factor: 12) for password hashing
- ✅ Automatic salt generation per user
- ✅ Never log passwords (even in errors)
```

#### API Authentication
```javascript
// JWT Tokens
- ✅ HMAC-SHA256 signing with RS256 for asymmetric
- ✅ Short expiry (15 min access, 7 day refresh)
- ✅ Token rotation on refresh
```

#### Webhook Security
```javascript
// Stripe/PayPal Webhooks
- ✅ HMAC signature verification
- ✅ Timestamp validation (reject old requests)
- ✅ Event ID deduplication (prevent replay attacks)
```

#### Session Management
```javascript
// Express Sessions
- ✅ httpOnly cookies for session ID
- ✅ secure flag in production
- ✅ sameSite: 'lax' for OAuth compatibility
- ✅ Redis-backed sessions (not in-memory)
```

#### Sensitive Data Encryption
```javascript
// Payment Tokenization
- ✅ PCI compliance via Stripe Elements (no direct card storage)
- ✅ Encrypted database fields (payment_method_id only)
- ⚠️ TODO: Implement envelope encryption for PII (email, phone)
```

---

## 🛡️ Security Rules We Follow

### 10 Golden Rules

1. **Never Store Plaintext Passwords**
   - Always use bcrypt/Argon2 with proper work factor
   - Minimum cost: 10 for bcrypt, 2 iterations for Argon2id

2. **Never Trust Client Input**
   - Validate and sanitize all user data
   - Use parameterized queries (prevent SQL injection)

3. **Secrets Never in Code**
   - Environment variables for API keys
   - Use secret managers (AWS Secrets Manager, Doppler)
   - `.env` files NEVER committed to git

4. **HTTPS Everywhere**
   - Force TLS 1.2+ in production
   - `secure: true` for all cookies
   - HSTS headers enabled

5. **Principle of Least Privilege**
   - Database users have minimal permissions
   - Service accounts limited to necessary scopes
   - API keys rotated every 90 days

6. **Defense in Depth**
   - Multiple layers: WAF + rate limiting + input validation
   - Assume any single layer can fail

7. **Verify All Signatures**
   - Webhook signatures checked before processing
   - JWT signatures validated on every request
   - Never skip verification "just to test"

8. **Session Timeouts**
   - Idle timeout: 30 minutes
   - Absolute timeout: 24 hours
   - Re-authenticate for sensitive operations

9. **Audit & Monitor**
   - Log authentication attempts (success + failure)
   - Alert on unusual patterns
   - Review logs weekly

10. **Encrypt Sensitive Data at Rest**
    - Payment tokens encrypted
    - PII encrypted in database
    - Backups encrypted with separate keys

---

## 📚 Quick Decision Guide

**Need to:**
- **Store passwords?** → Hash with bcrypt/Argon2
- **Verify webhook authenticity?** → HMAC signature
- **Protect JWT from tampering?** → Sign with HMAC/RSA
- **Hide data from database admin?** → Encrypt with AES-256-GCM
- **Prevent XSS cookie theft?** → httpOnly + secure flags
- **Prevent CSRF?** → sameSite cookies + CSRF tokens
- **Share secret data?** → Encrypt with recipient's public key
- **Check file integrity?** → SHA-256 checksum (no secret needed)

---

## 🔗 References

### Standards & Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

### Algorithms
- **Hashing**: Argon2id > bcrypt > PBKDF2
- **Signing**: HMAC-SHA256, RSA-SHA256, EdDSA
- **Encryption**: AES-256-GCM, ChaCha20-Poly1305

### Tools
- [CyberChef](https://gchq.github.io/CyberChef/) — Crypto operations playground
- [JWT.io](https://jwt.io/) — Decode/verify JWT tokens
- [Have I Been Pwned](https://haveibeenpwned.com/) — Check password breaches

---

## ✅ Checklist for PR Review

Before merging security-related code:

- [ ] Passwords hashed with bcrypt (min cost 12) or Argon2id
- [ ] No secrets in code (check with `git diff | grep -i "password\|secret\|key"`)
- [ ] Webhook signatures verified
- [ ] JWT tokens signed and verified
- [ ] Session cookies have httpOnly + secure + sameSite
- [ ] HTTPS enforced in production
- [ ] Input validation on all user data
- [ ] Sensitive data encrypted at rest
- [ ] Security logging implemented
- [ ] Dependency vulnerabilities checked (`npm audit`)

---

**Last Updated**: January 28, 2026  
**Maintained By**: Platform Security Team
