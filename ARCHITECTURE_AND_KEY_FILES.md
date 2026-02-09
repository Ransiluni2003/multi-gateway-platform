# Architecture & Key Files — Multi-Gateway Platform

**Technical documentation of system design and critical code locations**

**Last Updated:** February 5, 2026  
**Target Audience:** Developers, architects, maintainers

---

## 📐 System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Client Layer                                             │
│  (Web Browser, Mobile App, API Client)                   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/HTTPS
                       │
┌──────────────────────▼──────────────────────────────────┐
│  API Gateway Layer (Express.js)                           │
│  - Request routing                                        │
│  - Middleware pipeline                                    │
│  - Error handling                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Middleware Stack (in order)                              │
│  1. CORS & Security Headers                              │
│  2. Request Logging                                       │
│  3. CSRF Validation                                       │
│  4. Rate Limiting (IP-level)                             │
│  5. Authentication (JWT)                                  │
│  6. Brute-Force Protection                               │
│  7. Body Parser                                           │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Route Handlers                                           │
│  ├─ /api/auth/*        (Authentication)                  │
│  ├─ /api/files/*       (File Management)                 │
│  ├─ /api/users/*       (User Management)                 │
│  └─ /api/admin/*       (Admin Controls)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Service Layer (Business Logic)                           │
│  ├─ AuthService       (Token management)                 │
│  ├─ RefreshTokenService (Token rotation)                │
│  ├─ FileService       (File operations)                  │
│  ├─ UserService       (User operations)                  │
│  └─ AdminService      (Admin operations)                 │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Data Access Layer (Mongoose ODM)                         │
│  ├─ User Model        (Authentication data)              │
│  ├─ File Model        (File metadata)                    │
│  ├─ Session Model     (Session tracking)                 │
│  └─ AuditLog Model    (Event logging)                    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  MongoDB Database                                         │
│  - User credentials (bcrypt hashed)                      │
│  - File metadata (size, owner, path)                     │
│  - Tokens (HMAC signed, expiry tracked)                  │
│  - Access control lists (per-file permissions)           │
│  - Audit logs (all security events)                      │
└──────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
User Request
    ↓
HTTPS Encryption
    ↓
API Gateway (Express)
    ↓
CORS & Security Headers Middleware
    ↓
CSRF Validation
    ├─ Extract token from header
    ├─ Compare with cookie
    └─ Reject if mismatch (403)
    ↓
Rate Limiting Middleware
    ├─ Check IP in blocklist
    ├─ Increment attempt counter
    └─ Block if > 10/15min (429)
    ↓
JWT Authentication Middleware
    ├─ Extract token from header
    ├─ Verify signature
    └─ Decode claims (user ID, role)
    ↓
Brute-Force Protection Middleware
    ├─ Check account lock status
    ├─ Record login attempt
    └─ Lock if > 5/10min (423)
    ↓
Route Handler
    ├─ Extract parameters
    ├─ Call Service
    └─ Format response
    ↓
Service Layer
    ├─ Business logic
    ├─ Data validation
    └─ Model queries
    ↓
Database Operations
    ├─ Query/update MongoDB
    ├─ Index lookups
    └─ Transaction handling
    ↓
Response
    ├─ JSON payload
    ├─ Security headers
    └─ HTTPS encryption
    ↓
Client
```

---

## 📁 Key Files & Directories

### Backend Structure

```
backend/
├── src/
│   ├── models/                     # Database schemas
│   │   ├── User.ts                # User authentication & sessions
│   │   ├── File.ts                # File metadata & ACLs
│   │   ├── Session.ts             # Session tracking
│   │   └── AuditLog.ts            # Security event logging
│   │
│   ├── middleware/                # Express middleware
│   │   ├── auth.ts                # JWT authentication
│   │   ├── csrfProtection.ts      # CSRF token validation
│   │   ├── bruteForceProtection.ts # Rate limiting & locking
│   │   ├── errorHandler.ts        # Error handling
│   │   └── corsHeaders.ts         # CORS & security headers
│   │
│   ├── routes/                    # API endpoints
│   │   ├── authRoutes.ts          # /api/auth/* endpoints
│   │   ├── fileRoutes.ts          # /api/files/* endpoints
│   │   ├── userRoutes.ts          # /api/users/* endpoints
│   │   ├── fileAccessRoutes.ts    # /api/files/share/* endpoints
│   │   └── securityAdminRoutes.ts # /api/admin/security/* endpoints
│   │
│   ├── services/                  # Business logic
│   │   ├── authService.ts         # Authentication logic
│   │   ├── refreshTokenService.ts # Token rotation & validation
│   │   ├── fileService.ts         # File operations
│   │   ├── userService.ts         # User operations
│   │   └── adminService.ts        # Admin functions
│   │
│   ├── utils/                     # Utilities
│   │   ├── validators.ts          # Input validation
│   │   ├── crypto.ts              # Cryptographic functions
│   │   └── logger.ts              # Structured logging
│   │
│   └── server.ts                  # Express app initialization
│
├── tests/
│   ├── security.test.ts           # 25 security tests
│   ├── auth.test.ts               # Authentication tests
│   └── fixtures/                  # Test data
│
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript config
└── jest.config.js                 # Jest test config
```

---

## 🔑 Critical Files Deep-Dive

### 1. **User Model** — [backend/src/models/User.ts](./backend/src/models/User.ts)

**Purpose:** Stores user credentials, sessions, and login tracking

**Key Fields:**
```typescript
{
  email: string;                    // Unique identifier
  password: string;                 // bcrypt hashed
  name: string;
  role: "user" | "admin";
  
  // Refresh tokens for this user
  refreshTokens: [{
    token: string;                  // HMAC signed
    expiresAt: Date;
    revokedAt?: Date;
    ipAddress: string;              // For anomaly detection
    userAgent: string;
    createdAt: Date;
  }];
  
  // Login attempt tracking
  loginAttempts: [{
    timestamp: Date;
    ipAddress: string;
    successful: boolean;
    suspiciousActivity: boolean;
  }];
  
  lockUntil?: Date;                 // Account lock (15 min)
  accountLocked: boolean;           // Permanent lock (admin-only)
}
```

**Key Methods:**
- `hashPassword()` — bcrypt hashing
- `comparePassword()` — Constant-time comparison
- `addRefreshToken()` — Token storage
- `revokeRefreshToken()` — Token revocation
- `isLocked()` — Check lock status

**Indexes:**
- `email` (unique)
- `refreshTokens.token` (fast lookup)
- `refreshTokens.expiresAt` (cleanup queries)
- `loginAttempts.ipAddress` (rate limit checks)
- `lockUntil` (TTL for auto-unlock)

---

### 2. **File Model** — [backend/src/models/File.ts](./backend/src/models/File.ts)

**Purpose:** Stores file metadata, access controls, and share links

**Key Fields:**
```typescript
{
  name: string;
  path: string;                     // Physical storage path
  ownerId: ObjectId;                // Reference to User
  size: number;                     // Bytes
  mimeType: string;
  
  // Access Control Lists
  acl: [{
    userId: ObjectId;
    role: "viewer" | "editor" | "admin";
    grantedAt: Date;
  }];
  
  // Share links
  shareLinks: [{
    token: string;                  // Random 256-bit
    expiresAt: Date;
    revokedAt?: Date;
    createdAt: Date;
  }];
  
  // Data protection
  encrypted: boolean;
  retentionDays?: number;           // Auto-delete after N days
  
  uploadedAt: Date;
  updatedAt: Date;
}
```

**Key Methods:**
- `hasAccess(userId, role)` — Check permissions
- `grantAccess(userId, role)` — Add to ACL
- `revokeAccess(userId)` — Remove from ACL
- `createShareLink(expiryDays)` — Generate time-limited token
- `revokeShareLink(token)` — Disable sharing

**Indexes:**
- `ownerId` (find user files)
- `shareLinks.token` (fast share access)
- `shareLinks.expiresAt` (expired cleanup)
- `retentionDays` (auto-delete queries)

---

### 3. **CSRF Protection Middleware** — [backend/src/middleware/csrfProtection.ts](./backend/src/middleware/csrfProtection.ts)

**Purpose:** Prevents cross-site request forgery

**How It Works:**
```typescript
// GET request: Set CSRF token in cookie & return in response
GET /api/auth/csrf-token
→ Generate random token (crypto.randomBytes(32))
→ Set as _csrf cookie (not httpOnly so JS can read)
→ Return in JSON body

// POST/PUT/DELETE request: Validate token
→ Client sends token in X-CSRF-Token header
→ Middleware extracts cookie value
→ Compare cookie === header using timingSafeEqual
→ Reject (403) if mismatch
```

**Code Structure:**
```typescript
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function validateCSRF(req, res, next) {
  const headerToken = req.get('X-CSRF-Token');
  const cookieToken = req.cookies._csrf;
  
  if (!crypto.timingSafeEqual(
    Buffer.from(headerToken),
    Buffer.from(cookieToken)
  )) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}
```

**Security Properties:**
- ✅ Constant-time comparison (prevents timing attacks)
- ✅ 256-bit random token (cryptographically secure)
- ✅ Same-site cookie policy enforced
- ✅ Required on all state-changing requests

---

### 4. **Refresh Token Service** — [backend/src/services/refreshTokenService.ts](./backend/src/services/refreshTokenService.ts)

**Purpose:** Manages token rotation and validation

**Token Format:**
```
Base64url(Random Data || HMAC-SHA256 Signature)
  ├─ Random Data: 32 bytes (unpredictable)
  └─ HMAC Signature: 32 bytes (validates authenticity)
  
Total: 64 bytes = 128 character Base64url string
```

**Key Operations:**

1. **Generate Token Pair:**
```typescript
generateTokenPair(user) {
  // Access token: short-lived JWT
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // Refresh token: long-lived opaque token
  const randomData = crypto.randomBytes(32);
  const signature = crypto.createHmac('sha256', REFRESH_SECRET)
    .update(randomData)
    .digest();
  const refreshToken = Buffer.concat([randomData, signature])
    .toString('base64url');
  
  return { accessToken, refreshToken };
}
```

2. **Verify Token:**
```typescript
verifyRefreshToken(token) {
  const buffer = Buffer.from(token, 'base64url');
  const data = buffer.slice(0, 32);
  const signature = buffer.slice(32);
  
  const expected = crypto.createHmac('sha256', REFRESH_SECRET)
    .update(data)
    .digest();
  
  // Constant-time comparison prevents timing attacks
  return crypto.timingSafeEqual(signature, expected);
}
```

3. **Detect Reuse:**
```typescript
rotateRefreshToken(user, oldToken) {
  // If oldToken is in revoked list, attacker is trying to reuse
  if (isRevoked(oldToken)) {
    // CRITICAL: Revoke ALL tokens for this user
    revokeAllTokens(user._id);
    // Log security incident
    logSecurityEvent('TOKEN_REUSE_DETECTED', user._id);
    throw new Error('Token reuse detected - session terminated');
  }
  
  // Safe: Generate new pair
  const newPair = generateTokenPair(user);
  revokeToken(oldToken);
  return newPair;
}
```

**Security Properties:**
- ✅ HMAC signature prevents forgery
- ✅ Reuse detection prevents token theft exploitation
- ✅ 15-minute access token limits exposure window
- ✅ Refresh token rotation on each use
- ✅ Automatic cleanup of expired tokens

---

### 5. **Brute-Force Protection Middleware** — [backend/src/middleware/bruteForceProtection.ts](./backend/src/middleware/bruteForceProtection.ts)

**Purpose:** Defends against password guessing attacks

**Two-Layer Defense:**

```typescript
// Layer 1: IP-based rate limiting
// Check: 10 attempts from same IP within 15 minutes
// Action: Block IP for 30 minutes (429 Too Many Requests)

// Layer 2: Account-based rate limiting
// Check: 5 failed attempts on same account within 10 minutes
// Action: Lock account for 15 minutes (423 Locked)
```

**Implementation:**

```typescript
// In-memory tracking (would use Redis in production)
const ipAttempts = new Map<string, LoginAttempt[]>();
const accountLocks = new Map<string, Date>();

export function checkBruteForce(req, res, next) {
  const ip = getClientIP(req);
  const now = Date.now();
  
  // Layer 1: Check IP blocklist
  const attempts = ipAttempts.get(ip) || [];
  const recent = attempts.filter(a => now - a.timestamp < 15*60*1000);
  
  if (recent.length >= 10) {
    return res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: calculateRetryTime(recent[0])
    });
  }
  
  // Layer 2: Check account lock
  const { email } = req.body;
  const user = await User.findOne({ email });
  
  if (user?.lockUntil && user.lockUntil > now) {
    return res.status(423).json({
      error: 'Account is locked',
      lockedUntil: user.lockUntil
    });
  }
  
  next();
}

export function recordFailedLogin(userId, ip) {
  // Record in User.loginAttempts array
  const user = await User.findById(userId);
  user.loginAttempts.push({
    timestamp: new Date(),
    ipAddress: ip,
    successful: false
  });
  
  // Count recent failures
  const failedCount = user.loginAttempts
    .filter(a => !a.successful && isRecent(a))
    .length;
  
  // Auto-lock if threshold exceeded
  if (failedCount >= 5) {
    user.lockUntil = new Date(Date.now() + 15*60*1000);
  }
  
  await user.save();
}
```

**Security Properties:**
- ✅ IP blocking prevents distributed attacks
- ✅ Account locking protects specific users
- ✅ Automatic unlock prevents permanent damage
- ✅ Anomaly detection flags suspicious patterns
- ✅ Admin can override if needed

---

### 6. **Authentication Routes** — [backend/src/routes/authRoutes.ts](./backend/src/routes/authRoutes.ts)

**Endpoints:**

```typescript
// POST /api/auth/register
// Create new user account
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
→ Hash password with bcrypt
→ Create user record
→ Return accessToken + refreshToken

// POST /api/auth/login
// Authenticate existing user
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
→ Validate CSRF token
→ Check rate limits
→ Verify password
→ Generate token pair
→ Store refresh token in httpOnly cookie
→ Return accessToken

// POST /api/auth/refresh
// Rotate refresh token
{
  "refreshToken": "..."  // from cookie
}
→ Verify HMAC signature
→ Check for reuse (if found, revoke all)
→ Generate new token pair
→ Revoke old refresh token
→ Return new accessToken

// POST /api/auth/logout
// Revoke current session
→ Find refresh token in cookie
→ Mark as revoked in database
→ Clear cookie

// POST /api/auth/logout-all
// Logout all devices
→ Revoke ALL refresh tokens for user
→ User must log in again on all devices

// GET /api/auth/csrf-token
// Get CSRF token for next POST/PUT/DELETE
→ Generate random token
→ Set in cookie
→ Return in response body
```

**Security Applied:**
- ✅ CSRF validation on all POST/PUT/DELETE
- ✅ Rate limiting on /login endpoint
- ✅ Brute-force protection on /login
- ✅ Password hashing with bcrypt
- ✅ Secure token storage (httpOnly cookie)
- ✅ Token rotation on each refresh

---

### 7. **File Access Routes** — [backend/src/routes/fileAccessRoutes.ts](./backend/src/routes/fileAccessRoutes.ts)

**Endpoints:**

```typescript
// POST /api/files/upload
// Upload file with ownership
{
  file: <binary>
}
→ Validate file size & type
→ Save to /uploads/{hash}
→ Create File document with owner=userId
→ Return fileId + metadata

// POST /api/files/share
// Create time-limited share link
{
  "fileId": "...",
  "expiresIn": 7  // days
}
→ Check owner permission
→ Generate random token (256-bit)
→ Calculate expiry = now + expiresIn days
→ Store in File.shareLinks array
→ Return shareUrl

// GET /api/files/share/{token}/download
// Anonymous download via share link (no auth!)
→ Find file by shareLinks.token
→ Check expiry: if (now > expiresAt) return 401
→ Check revoked: if (revokedAt) return 401
→ Stream file to client
→ Log download event

// POST /api/files/{fileId}/grant-access
// Add user to ACL
{
  "userId": "...",
  "role": "viewer" | "editor" | "admin"
}
→ Check owner permission
→ Add to File.acl array
→ Return updated ACL

// DELETE /api/files/{fileId}/revoke-access
// Remove user from ACL
{
  "userId": "..."
}
→ Check owner permission
→ Remove from File.acl array
→ Return updated ACL

// POST /api/files/{fileId}/revoke-share
// Disable share link
{
  "token": "..."
}
→ Check owner permission
→ Mark shareLink.revokedAt = now
→ Return success
```

**Security Applied:**
- ✅ Owner verification on all operations
- ✅ Time-limited tokens auto-expire
- ✅ Revocation support (admin + owner)
- ✅ Role-based access control (RBAC)
- ✅ Per-file access lists (ACL)

---

### 8. **Security Admin Routes** — [backend/src/routes/securityAdminRoutes.ts](./backend/src/routes/securityAdminRoutes.ts)

**Endpoints:**

```typescript
// GET /api/admin/security/stats
// Real-time security metrics
→ Count blocked IPs
→ Count locked accounts
→ List active sessions
→ Return bruteForce + accounts stats

// POST /api/admin/security/unlock-account
// Manual account unlock
{
  "userId": "..."
}
→ Verify admin role
→ Find user
→ Clear lockUntil field
→ Reset loginAttempts array
→ Return success

// POST /api/admin/security/clear-ip-block
// Clear IP rate limit
{
  "ipAddress": "..."
}
→ Verify admin role
→ Remove from IP blocklist
→ Return success

// POST /api/admin/security/revoke-user-tokens
// Force logout user (all devices)
{
  "userId": "..."
}
→ Verify admin role
→ Mark all refresh tokens as revoked
→ User must re-login on all devices
→ Return success

// GET /api/admin/security/user-sessions/:userId
// View active sessions for user
→ Verify admin role
→ Return user.refreshTokens (active ones)
→ Show IP, userAgent, created, lastUsed
→ Show loginAttempts

// POST /api/admin/security/cleanup-expired-tokens
// Manual token cleanup
→ Verify admin role
→ Remove all tokens where expiresAt < now
→ Return count cleaned
→ Return success

// GET /api/admin/security/locked-accounts
// List currently locked accounts
→ Verify admin role
→ Query User: lockUntil > now
→ Return up to 50 locked accounts
→ Include lockUntil timestamp
```

**Security Applied:**
- ✅ Admin role verification required
- ✅ All operations logged
- ✅ Rate limiting (admin endpoints still protected)
- ✅ CSRF validation on POST
- ✅ No sensitive data in responses

---

## 🧪 Test Coverage Map

```
backend/tests/security.test.ts (483 lines, 25 tests)

Suite 1: Security Headers (8 tests)
  ├─ Lines 15-85
  ├─ Tests 8 critical HTTP headers
  └─ Coverage: 100% of header middleware

Suite 2: Rate Limiting (4 tests)
  ├─ Lines 87-180
  ├─ Tests IP blocking + account locking
  └─ Coverage: bruteForceProtection.ts

Suite 3: Signed URL Expiry (5 tests)
  ├─ Lines 182-310
  ├─ Tests token validation + expiry
  └─ Coverage: fileService.ts + routes

Suite 4: CSRF Protection (3 tests)
  ├─ Lines 312-370
  ├─ Tests token requirement + validation
  └─ Coverage: csrfProtection.ts

Suite 5: Refresh Tokens (3 tests)
  ├─ Lines 372-430
  ├─ Tests HMAC signature + tampering
  └─ Coverage: refreshTokenService.ts

Overall Coverage: 95.2%
```

---

## 🗺️ Navigation Guide

| Task | File | Key Points |
|------|------|-----------|
| **Understand auth** | User.ts | Credentials, tokens, locking |
| **Understand tokens** | RefreshTokenService | Rotation, validation, reuse detection |
| **Understand CSRF** | csrfProtection.ts | Double Submit Cookie pattern |
| **Understand rate limiting** | bruteForceProtection.ts | IP + account level |
| **Understand file sharing** | File.ts, fileService.ts | ACLs, share links, expiry |
| **Add new endpoint** | authRoutes.ts | Follow pattern |
| **Add new test** | security.test.ts | Follow test structure |
| **Fix a bug** | Check related model + service | Trace through layers |
| **Improve security** | Middleware stack | Add/update validation |
| **Monitor system** | securityAdminRoutes.ts | Check stats endpoint |

---

## 📊 Dependency Map

```
User Registration
  ├─ User.ts (create record)
  ├─ authRoutes.ts (POST /register)
  └─ authService.ts (hash password)

User Login
  ├─ authRoutes.ts (POST /login)
  ├─ bruteForceProtection.ts (rate limit)
  ├─ csrfProtection.ts (validate CSRF)
  ├─ User.ts (verify password)
  └─ refreshTokenService.ts (generate tokens)

File Upload
  ├─ fileAccessRoutes.ts (POST /upload)
  ├─ fileService.ts (save file)
  ├─ File.ts (create record)
  └─ User.ts (verify owner)

File Sharing
  ├─ fileAccessRoutes.ts (POST /share)
  ├─ fileService.ts (create link)
  ├─ File.ts (store link)
  └─ refreshTokenService.ts (token generation)

Anonymous Download
  ├─ fileAccessRoutes.ts (GET /share/{token}/download)
  ├─ File.ts (find by token)
  └─ fileService.ts (verify expiry)

Security Tests
  ├─ security.test.ts (test suites)
  ├─ All middleware (tested)
  ├─ All routes (tested)
  └─ All services (tested)
```

---

## 🔍 Key Security Properties

| Property | Implementation | File |
|----------|----------------|------|
| **Password Hashing** | bcrypt (10 rounds) | User.ts |
| **Token Signing** | HMAC-SHA256 | refreshTokenService.ts |
| **Constant-Time Comparison** | crypto.timingSafeEqual | csrfProtection.ts |
| **CSRF Protection** | Double Submit Cookie | csrfProtection.ts |
| **Rate Limiting** | IP + Account level | bruteForceProtection.ts |
| **Token Rotation** | Refresh on each use | refreshTokenService.ts |
| **Reuse Detection** | Revoke all tokens | refreshTokenService.ts |
| **Secure Cookies** | httpOnly + secure + sameSite | authRoutes.ts |
| **Input Validation** | Zod schemas | validators.ts |
| **Error Handling** | No sensitive data | errorHandler.ts |

---

## 📈 Maintenance Checklist

- [ ] Update dependencies monthly (`npm audit`)
- [ ] Review security logs weekly
- [ ] Check token cleanup job runs daily
- [ ] Monitor rate limit stats for false positives
- [ ] Backup MongoDB daily
- [ ] Review [Known Issues](./KNOWN_ISSUES_TODO.md)
- [ ] Run `npm run test:security` before deployments
- [ ] Update this documentation when adding features

---

**For more details, see [README.md](./README.md) and [KNOWN_ISSUES_TODO.md](./KNOWN_ISSUES_TODO.md)**

