# Loom Recording Guide — Session Security Upgrade (Task 2)

**Purpose:** Record a 10-12 minute walkthrough demonstrating all three session security features

**Target Audience:** Security reviewers, backend developers, stakeholders  
**Recording Tool:** Loom, QuickTime, or OBS Studio  
**Estimated Duration:** 10-12 minutes  

---

## Pre-Recording Checklist

✅ **Environment Setup**
- [ ] Backend server running (`npm run dev`)
- [ ] MongoDB running with test database
- [ ] Postman or Insomnia ready with collection
- [ ] Terminal windows prepared for logs
- [ ] Browser DevTools open (Network + Application tabs)
- [ ] Admin account created for admin endpoints

✅ **Demo Data**
- [ ] Test user accounts created (test@example.com, admin@example.com)
- [ ] No active sessions (clean slate)
- [ ] Server logs cleared
- [ ] Brute-force limits reset

✅ **Recording Settings**
- [ ] Screen resolution: 1920x1080 (or 1280x720 minimum)
- [ ] Audio: Clear microphone, no background noise
- [ ] Cursor highlight enabled
- [ ] Zoom level: 125% for readability

---

## Recording Script

### **Segment 1: Introduction** (1 minute)

**[00:00 - 00:60]**

**Screen:** Show this document or slide with title "Session Security Upgrade — Task 2"

**Narration:**
> "Hi everyone, I'm going to walk you through the Session Security Upgrade we just completed for Task 2. This implementation adds three critical security layers to our authentication system:
> 
> 1. **Refresh Token Rotation** — Short-lived access tokens with automatic rotation
> 2. **CSRF Protection** — Double Submit Cookie pattern for all state-changing requests
> 3. **Brute-Force Protection** — IP rate limiting and account locking
> 
> Let's dive in and see each feature in action."

**Visual:** Show checklist on screen:
- ✅ Refresh Token Rotation
- ✅ CSRF Protection
- ✅ Brute-Force Protection

---

### **Segment 2: Feature 1 — Refresh Token Rotation** (3-4 minutes)

#### **Demo 2.1: Login Flow** (1 minute)

**[01:00 - 02:00]**

**Screen:** Postman with `/api/auth/login` request

**Actions:**
1. Show request body:
   ```json
   {
     "email": "test@example.com",
     "password": "Password123!"
   }
   ```

2. Point to X-CSRF-Token header (we'll explain this next)

3. **Send request**

4. **Show response:**
   ```json
   {
     "accessToken": "eyJhbGci...",
     "user": {
       "id": "...",
       "email": "test@example.com",
       "role": "user"
     }
   }
   ```

5. **Show cookies tab:**
   ```
   refreshToken=<opaque-token>; HttpOnly; Secure; SameSite=Strict
   ```

**Narration:**
> "When a user logs in, we now return two tokens:
> 
> **First, the access token** — This is a JWT that expires in 15 minutes. It's sent in the response body and stored by the client. This is what you send in the Authorization header for authenticated requests.
> 
> **Second, the refresh token** — This is an opaque token with an HMAC signature that expires in 30 days. Notice it's set as an httpOnly cookie, which means JavaScript cannot access it. This protects against XSS attacks.
> 
> The refresh token is stored in our MongoDB database with metadata: IP address, user agent, and expiration date."

#### **Demo 2.2: Access Token Expiry & Refresh** (2 minutes)

**[02:00 - 04:00]**

**Screen:** Split screen — Postman + MongoDB Compass

**Actions:**
1. **Show MongoDB User document:**
   ```json
   {
     "_id": "...",
     "email": "test@example.com",
     "refreshTokens": [
       {
         "token": "<opaque-token>",
         "expiresAt": "2024-02-01T10:00:00Z",
         "ipAddress": "127.0.0.1",
         "userAgent": "PostmanRuntime/7.32.0",
         "createdAt": "2024-01-01T10:00:00Z"
       }
     ]
   }
   ```

2. **Wait 15 minutes (or modify ACCESS_TOKEN_EXPIRY to 10s for demo)**
   > "For this demo, I've set the access token expiry to 10 seconds so we can see the rotation in action."

3. **Try to use expired access token:**
   - Send GET `/api/profile` with expired token
   - **Show 401 Unauthorized response**

4. **Refresh the token:**
   - Send POST `/api/auth/refresh` (no body needed, cookie auto-sent)
   - **Show response:**
     ```json
     {
       "accessToken": "eyJhbGci...",  // New token!
       "user": { "email": "test@example.com" }
     }
     ```

5. **Show cookies tab:**
   - Notice `refreshToken` value changed (rotated)

6. **Show MongoDB again:**
   - Old token has `revokedAt` timestamp
   - New token added to array

**Narration:**
> "After 15 minutes—or 10 seconds in this demo—the access token expires. When the client tries to make an authenticated request, it gets a 401 Unauthorized.
> 
> The client then calls the /refresh endpoint, which automatically sends the refresh token cookie. Our server:
> 
> 1. Validates the refresh token's HMAC signature
> 2. Checks it hasn't been revoked
> 3. Revokes the old token
> 4. Generates a NEW access token and refresh token
> 5. Returns the new access token and sets the new refresh token cookie
> 
> This is called token rotation. Notice in MongoDB, the old token now has a 'revokedAt' timestamp, and a new token was added. This is critical for security."

#### **Demo 2.3: Reuse Detection (Security Feature)** (1 minute)

**[04:00 - 05:00]**

**Screen:** Postman + Terminal with server logs

**Actions:**
1. **Copy the OLD refresh token value** (from cookies before rotation)

2. **Manually set cookie to old token:**
   - Edit cookie in Postman: `refreshToken=<old-revoked-token>`

3. **Try to refresh again with old token:**
   - Send POST `/api/auth/refresh`
   - **Show 401 response:**
     ```json
     {
       "error": "Token reuse detected - all sessions revoked"
     }
     ```

4. **Show server logs:**
   ```
   WARN: Refresh token reuse detected
   {
     userId: "...",
     ipAddress: "127.0.0.1",
     revokedAt: "2024-01-01T10:05:00Z"
   }
   ```

5. **Show MongoDB:**
   - ALL refresh tokens for this user now have `revokedAt`

**Narration:**
> "Here's the critical security feature: **Reuse detection**.
> 
> If an attacker steals a refresh token and tries to use it AFTER the legitimate user has already rotated it, we detect this immediately.
> 
> When we see a revoked token being used, we know something suspicious is happening—either an attacker has the token, or there's a replay attack. Our system responds by revoking ALL refresh tokens for this user, logging them out of every device.
> 
> This limits the blast radius of a token theft. The attacker's window is only until the next rotation, which happens automatically when the access token expires."

---

### **Segment 3: Feature 2 — CSRF Protection** (2-3 minutes)

#### **Demo 3.1: Getting CSRF Token** (1 minute)

**[05:00 - 06:00]**

**Screen:** Postman + Browser DevTools (Application > Cookies)

**Actions:**
1. **Send GET request to any endpoint:**
   - GET `/api/auth/csrf-token`

2. **Show response:**
   ```json
   {
     "csrfToken": "abc123def456..."
   }
   ```

3. **Show cookies tab:**
   ```
   _csrf=abc123def456...; SameSite=Strict; Max-Age=3600
   ```

4. **Show in browser DevTools:**
   - Application > Cookies > localhost
   - Notice `_csrf` cookie (not httpOnly — client can read it)

**Narration:**
> "CSRF—Cross-Site Request Forgery—is an attack where a malicious website tricks your browser into making unauthorized requests to our API using your cookies.
> 
> To prevent this, we use the Double Submit Cookie pattern:
> 
> 1. On any GET request, we set a CSRF token as a cookie
> 2. The client reads this cookie and sends it back in a header
> 3. On POST, PUT, PATCH, or DELETE requests, we compare the cookie value to the header value
> 4. If they don't match, we reject the request
> 
> This works because a malicious site can't read our cookies due to same-origin policy. They can trigger a request, but they can't set the correct header."

#### **Demo 3.2: CSRF Validation** (1-2 minutes)

**[06:00 - 07:30]**

**Screen:** Postman

**Actions:**
1. **Test 1: POST without CSRF token (should fail)**
   - Remove X-CSRF-Token header
   - Send POST `/api/auth/login`
   - **Show 403 response:**
     ```json
     {
       "error": "CSRF token missing"
     }
     ```

2. **Test 2: POST with WRONG CSRF token (should fail)**
   - Set X-CSRF-Token: "wrong-token-12345"
   - Send POST `/api/auth/login`
   - **Show 403 response:**
     ```json
     {
       "error": "Invalid CSRF token"
     }
     ```

3. **Test 3: POST with CORRECT CSRF token (should succeed)**
   - Set X-CSRF-Token: "<actual-token-from-cookie>"
   - Send POST `/api/auth/login`
   - **Show 200 response with tokens**

4. **Show server logs:**
   ```
   WARN: CSRF validation failed: missing token
   WARN: CSRF validation failed: token mismatch
   INFO: User logged in successfully
   ```

**Narration:**
> "Let's test the CSRF protection:
> 
> **First attempt:** POST without the CSRF token header → 403 Forbidden
> 
> **Second attempt:** POST with a wrong token → 403 Forbidden
> 
> **Third attempt:** POST with the correct token from the cookie → Success!
> 
> All state-changing routes—POST, PUT, PATCH, DELETE—are protected. GET requests don't need CSRF tokens because they shouldn't change state.
> 
> We use constant-time comparison to prevent timing attacks. This means our comparison function takes the same amount of time whether the tokens match or not, preventing attackers from using timing differences to guess the token."

---

### **Segment 4: Feature 3 — Brute-Force Protection** (3-4 minutes)

#### **Demo 4.1: Account Locking** (2 minutes)

**[07:30 - 09:30]**

**Screen:** Postman + MongoDB Compass (User document)

**Actions:**
1. **Make 5 failed login attempts:**
   - Loop 5 times: POST `/api/auth/login` with wrong password
   - Show attempt 1, 2, 3, 4, 5 (can speed up recording here)

2. **After 5th attempt, show MongoDB:**
   ```json
   {
     "email": "test@example.com",
     "loginAttempts": [
       { "timestamp": "...", "ipAddress": "127.0.0.1", "successful": false },
       { "timestamp": "...", "ipAddress": "127.0.0.1", "successful": false },
       { "timestamp": "...", "ipAddress": "127.0.0.1", "successful": false },
       { "timestamp": "...", "ipAddress": "127.0.0.1", "successful": false },
       { "timestamp": "...", "ipAddress": "127.0.0.1", "successful": false }
     ],
     "lockUntil": "2024-01-01T10:15:00Z"  // 15 minutes from now
   }
   ```

3. **Attempt 6th login with CORRECT password:**
   - Send POST `/api/auth/login` with correct credentials
   - **Show 423 Locked response:**
     ```json
     {
       "error": "Account is locked. Please try again in 15 minutes.",
       "lockedUntil": "2024-01-01T10:15:00Z"
     }
     ```

4. **Show server logs:**
   ```
   WARN: Failed login attempt (user: test@example.com, ip: 127.0.0.1)
   WARN: Account locked due to failed attempts (userId: ..., email: test@example.com)
   WARN: Login attempt on locked account (email: test@example.com)
   ```

**Narration:**
> "Brute-force protection defends against automated password guessing and credential stuffing attacks.
> 
> We have two layers:
> 
> **Layer 1: Account-level locking**
> - After 5 failed login attempts within 10 minutes, the account is locked for 15 minutes
> - Even if an attacker guesses the correct password, they can't log in
> - All attempts are tracked in MongoDB with timestamps and IP addresses
> 
> Notice here: I made 5 failed attempts, and now the account is locked. Even with the correct password, I get a 423 Locked response.
> 
> The 'lockUntil' timestamp tells when the lock expires. After 15 minutes, the lock automatically clears and the user can try again."

#### **Demo 4.2: IP Rate Limiting** (1 minute)

**[09:30 - 10:30]**

**Screen:** Terminal running a bash loop + Server logs

**Actions:**
1. **Run bash loop to make 10 login attempts:**
   ```bash
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/auth/login \
       -H "Content-Type: application/json" \
       -d "{\"email\":\"user$i@example.com\",\"password\":\"wrong\"}"
   done
   ```

2. **Show server logs during loop:**
   ```
   WARN: Failed login attempt (ip: 127.0.0.1, attempt: 1)
   WARN: Failed login attempt (ip: 127.0.0.1, attempt: 2)
   ...
   WARN: Failed login attempt (ip: 127.0.0.1, attempt: 10)
   WARN: IP blocked due to excessive attempts (ip: 127.0.0.1)
   ```

3. **Attempt 11th login:**
   - Send POST `/api/auth/login`
   - **Show 429 response:**
     ```json
     {
       "error": "Too many login attempts. Please try again later.",
       "retryAfter": 1800  // 30 minutes in seconds
     }
     ```

**Narration:**
> "**Layer 2: IP rate limiting**
> - After 10 failed attempts from the same IP within 15 minutes, that IP is blocked for 30 minutes
> - This prevents distributed attacks using multiple accounts from the same source
> 
> I'm now making 10 rapid-fire login attempts to different email addresses from the same IP. Watch the server logs...
> 
> After the 10th attempt, the IP is blocked. Now ANY request from this IP—even to valid accounts—gets a 429 Too Many Requests response.
> 
> The 'retryAfter' field tells the client how long to wait in seconds."

#### **Demo 4.3: Admin Controls** (1 minute)

**[10:30 - 11:30]**

**Screen:** Postman with admin token

**Actions:**
1. **Check security stats:**
   - GET `/api/admin/security/stats` with admin token
   - **Show response:**
     ```json
     {
       "bruteForce": {
         "blockedIPs": 1,
         "totalAttempts": 10,
         "recentBlocks": [
           { "ip": "127.0.0.1", "blockedUntil": 1704110100000 }
         ]
       },
       "accounts": {
         "locked": 1,
         "withActiveSessions": 0
       }
     }
     ```

2. **Unlock the account:**
   - POST `/api/admin/security/unlock-account`
   - Body: `{ "email": "test@example.com" }`
   - **Show response:**
     ```json
     {
       "message": "Account unlocked successfully",
       "userId": "..."
     }
     ```

3. **Clear IP block:**
   - POST `/api/admin/security/clear-ip-block`
   - Body: `{ "ip": "127.0.0.1" }`
   - **Show response:**
     ```json
     {
       "message": "IP block cleared successfully",
       "ip": "127.0.0.1"
     }
     ```

4. **Try login again (should succeed now):**
   - POST `/api/auth/login` with correct credentials
   - **Show 200 response with tokens**

**Narration:**
> "Admins have full control over security features:
> 
> **Security Stats Endpoint** — Shows how many IPs are blocked, how many accounts are locked, and recent block events. This is useful for monitoring attacks in real-time.
> 
> **Unlock Account** — If a legitimate user gets locked out, admins can manually unlock their account. This is logged for audit purposes.
> 
> **Clear IP Block** — If a block was triggered incorrectly (e.g., shared office IP), admins can clear it.
> 
> After unlocking the account and clearing the IP block, the user can log in successfully again."

---

### **Segment 5: Security Analysis** (1 minute)

**[11:30 - 12:30]**

**Screen:** Show SESSION_SECURITY_UPGRADE.md "Security Analysis" section

**Narration:**
> "Let's quickly review the security properties:
> 
> **Refresh Token Rotation protects against:**
> - Token theft from XSS (httpOnly cookies)
> - Token replay attacks (reuse detection)
> - Long-term token theft (15-minute expiry)
> 
> **CSRF Protection protects against:**
> - Cross-site request forgery
> - Timing attacks (constant-time comparison)
> - Cookie manipulation
> 
> **Brute-Force Protection protects against:**
> - Password guessing
> - Credential stuffing
> - Distributed attacks
> 
> All three layers work together to create defense in depth. An attacker would need to bypass multiple security controls to compromise an account.
> 
> We're also fully OWASP compliant, following the ASVS 2.x guidelines for authentication and session management."

**Visual:** Show checklist again:
- ✅ Refresh Token Rotation — OWASP ASVS 2.2.3, 2.7.1
- ✅ CSRF Protection — OWASP ASVS 3.5.1, 3.5.3
- ✅ Brute-Force Protection — OWASP ASVS 2.5.1

---

### **Segment 6: Wrap-Up** (30 seconds)

**[12:30 - 13:00]**

**Screen:** Show file tree of created files

**Narration:**
> "To summarize, we've implemented:
> 
> - **Refresh Token Service** with HMAC signatures and rotation
> - **CSRF Middleware** using the Double Submit Cookie pattern
> - **Brute-Force Middleware** with IP and account-level protection
> - **Security Admin Routes** for operational control
> - **Comprehensive documentation** including API reference, testing guide, and migration guide
> 
> All code is production-ready with logging, metrics, and error handling. The system is backward compatible with existing JWT clients.
> 
> For full documentation, see SESSION_SECURITY_UPGRADE.md. Thanks for watching!"

**Visual:** Show final slide:
```
Task 2: Session Security Upgrade
✅ Complete

Files Created:
- refreshTokenService.ts
- csrfProtection.ts
- bruteForceProtection.ts
- securityAdminRoutes.ts
- SESSION_SECURITY_UPGRADE.md
- This Loom guide

Next Steps:
1. Review PR: PR_SESSION_SECURITY_TASK_2.md
2. Run tests: npm test
3. Deploy to staging
```

---

## Post-Recording Checklist

✅ **Video Quality**
- [ ] Audio is clear and audible
- [ ] Screen recording is high resolution
- [ ] Cursor movements are smooth
- [ ] Text is readable at normal zoom

✅ **Content Verification**
- [ ] All three features demonstrated
- [ ] Security properties explained
- [ ] Admin controls shown
- [ ] OWASP compliance mentioned
- [ ] Duration: 10-12 minutes

✅ **Publishing**
- [ ] Video uploaded to Loom/YouTube
- [ ] Link added to documentation
- [ ] Link added to PR description
- [ ] Shared with team on Slack

---

## Troubleshooting Demo Issues

### Issue: Access token not expiring fast enough
**Solution:** Modify in `refreshTokenService.ts`:
```typescript
const ACCESS_TOKEN_EXPIRY = "10s";  // For demo only!
```

### Issue: Account not locking after 5 attempts
**Solution:** Check `bruteForceProtection.ts`:
```typescript
export const MAX_LOGIN_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
```

### Issue: CSRF token not being set
**Solution:** Ensure middleware order in `server.ts`:
```typescript
app.use(provideCSRFToken);  // Must be before routes
app.use('/api/auth', authRoutes);
```

### Issue: Refresh token rotation not working
**Solution:** Check `authRoutes.ts` has `RefreshTokenService` imported

### Issue: MongoDB not showing new fields
**Solution:** Run migration:
```bash
mongosh
db.users.updateMany({}, {
  $set: {
    refreshTokens: [],
    loginAttempts: [],
    accountLocked: false
  }
})
```

---

## Alternative Demo Scenarios

### Scenario A: Mobile App Context
Show how mobile apps handle token rotation:
1. App starts → Check if access token expired
2. If expired, auto-refresh using refresh token
3. If refresh fails, redirect to login
4. Show code snippet for automatic retry logic

### Scenario B: Multi-Device Session Management
Show how a user can:
1. Log in from desktop → 1 refresh token
2. Log in from mobile → 2 refresh tokens
3. View active sessions in admin panel
4. Logout from one device (revoke single token)
5. Logout from all devices (revoke all tokens)

### Scenario C: Attack Simulation
Simulate a real attack:
1. Attacker steals refresh token from network
2. Legitimate user rotates token
3. Attacker tries to use old token
4. System detects reuse, revokes all tokens
5. Both users logged out
6. Admin investigates suspicious activity logs

---

## Recording Tips

**Pacing:**
- Speak slowly and clearly
- Pause 2-3 seconds between sections
- Use phrases like "Notice here..." and "Let's see what happens..."

**Emphasis:**
- Slow down for key security concepts (reuse detection, constant-time comparison)
- Speed up for repetitive actions (5 failed login attempts)

**Visual Aids:**
- Highlight important JSON fields with cursor
- Use arrows or annotations if your recording tool supports it
- Keep Postman and terminal side-by-side when possible

**Professionalism:**
- Rehearse once before recording
- Close unnecessary tabs and applications
- Use "we" (team) instead of "I" (individual)
- End with confidence: "All features are production-ready"

---

**✅ Loom Recording Guide Complete**

This guide provides a complete script for recording a professional demo of all Task 2 features. Follow the segments in order for a clear, comprehensive walkthrough.

Estimated recording time: 12-13 minutes (including intro/outro)

