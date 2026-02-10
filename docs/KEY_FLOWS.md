# Key Flows - Request Lifecycle

**Complete step-by-step flows showing UI → API → Middleware → Service → Database → Audit**

---

## Table of Contents

1. [Auth Flow](#auth-flow)
2. [Storage Flow (Upload & Download)](#storage-flow-upload--download)
3. [Payment Flow](#payment-flow)
4. [Webhook Flow](#webhook-flow)
5. [Audit Log Flow](#audit-log-flow)

---

## Auth Flow

### CSRF Token Generation

```
Client (Browser)
  ↓ GET /api/auth/csrf-token
  
Backend: authRoutes.ts#L17
  ↓ Middleware: csrfProtection.ts#L28 (generateCSRFToken)
  ↓ crypto.randomBytes(32) → Generate token
  ↓ Set cookie: csrf-token (httpOnly, sameSite: Strict)
  ↓ Response: { csrfToken: "abc123..." }
  
Client receives token
```

**Files:**
- [backend/src/routes/authRoutes.ts#L17-L23](../backend/src/routes/authRoutes.ts#L17-L23)
- [backend/src/middleware/csrfProtection.ts#L28-L45](../backend/src/middleware/csrfProtection.ts#L28-L45)

---

### Login Flow (Success)

```
Client (Browser)
  ↓ POST /api/auth/login
  ↓ Headers: { X-CSRF-Token: "abc123...", Cookie: "csrf-token=..." }
  ↓ Body: { email: "user@example.com", password: "******" }

Backend: server.ts#L42
  ↓ Rate Limiting: authRoutes.ts#L23 (max 5 req / 15 min per IP)
  ├─ rateLimit checks request count from memory map
  ├─ If exceeded → 429 Too Many Requests
  └─ If OK → Continue
  
  ↓ CSRF Validation: csrfProtection.ts#L47-L67 (validateCSRFToken)
  ├─ Compare header value === cookie value
  ├─ If mismatch → 403 Forbidden + AuditLog.create(CSRF_VALIDATION_FAILED)
  └─ If OK → Continue
  
  ↓ Brute-Force Check: bruteForceProtection.ts#L29-L47
  ├─ Check IP attempts (max 10 / 15 min)
  ├─ Check account attempts (max 5 / 10 min)
  ├─ If exceeded → 429 + AuditLog.create(RATE_LIMIT_EXCEEDED)
  └─ If OK → Continue

  ↓ Auth Handler: authRoutes.ts#L25-L65
  ├─ Extract email, password from req.body
  ├─ Query MongoDB: User.findOne({ email })
  │   MongoDB: users collection
  │   ↓ Find user document
  │   ↓ Return user object
  │
  ├─ Password Validation: bcrypt.compare(password, user.passwordHash)
  │   ↓ If invalid → Increment brute-force counters
  │   ↓ AuditLog.create(LOGIN_FAILURE)
  │   ↓ Return 401 Unauthorized
  │
  └─ If valid:
      ↓ Generate Tokens: refreshTokenService.ts#L15-L35
      ├─ jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }) → Access token
      ├─ jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }) → Refresh token
      └─ Hash refresh token → SHA256
      
      ↓ Save Refresh Token: User.updateOne()
      MongoDB: users collection
      ├─ Push hashed refresh token to user.refreshTokens array
      └─ Set updatedAt timestamp
      
      ↓ Audit Log: AuditLog.create()
      MongoDB: auditlogs collection
      ├─ event: LOGIN_SUCCESS
      ├─ userId: user._id
      ├─ ipAddress: req.ip
      ├─ metadata: { email, timestamp }
      └─ Insert document
      
      ↓ Response:
      ├─ Status: 200 OK
      ├─ Set-Cookie: refreshToken (httpOnly, secure, sameSite: Strict)
      └─ Body: { accessToken: "eyJhbG...", user: { id, email } }

Client receives tokens
  ↓ Store accessToken in memory (or sessionStorage)
  ↓ Refresh token stored in httpOnly cookie (auto-managed)
```

**Files:**
- [backend/src/routes/authRoutes.ts#L25-L65](../backend/src/routes/authRoutes.ts#L25-L65)
- [backend/src/middleware/csrfProtection.ts#L47-L67](../backend/src/middleware/csrfProtection.ts#L47-L67)
- [backend/src/middleware/bruteForceProtection.ts#L29-L47](../backend/src/middleware/bruteForceProtection.ts#L29-L47)
- [backend/src/services/refreshTokenService.ts#L15-L35](../backend/src/services/refreshTokenService.ts#L15-L35)
 - [backend/src/models/User.ts](../backend/src/models/User.ts)
- [backend/src/models/AuditLog.ts](../backend/src/models/AuditLog.ts)

---

### Token Refresh Flow

```
Client (Browser)
  ↓ POST /api/auth/refresh
  ↓ Cookie: refreshToken (httpOnly)

Backend: authRoutes.ts#L67-L95
  ↓ Extract refresh token from cookie
  ↓ Hash token: crypto.createHash('sha256').update(token).digest('hex')
  
  ↓ Query MongoDB: User.findOne({ "refreshTokens.tokenHash": hashedToken })
  MongoDB: users collection
  ├─ Search for matching refresh token in array
  ├─ Check expiry: token.expiresAt > Date.now()
  │   If expired → 401 Unauthorized + AuditLog.create(TOKEN_REFRESH_FAILED)
  └─ If valid → Return user object
  
  ↓ Generate New Tokens: refreshTokenService.ts#L37-L55
  ├─ Generate new access token (15 min)
  ├─ Generate new refresh token (30 days)
  ├─ Hash new refresh token
  └─ MongoDB: User.updateOne()
      ├─ Remove old refresh token from array
      ├─ Add new hashed refresh token
      └─ Commit transaction
  
  ↓ Audit Log: AuditLog.create()
  MongoDB: auditlogs collection
  ├─ event: TOKEN_REFRESHED
  ├─ userId: user._id
  ├─ metadata: { oldTokenExpiry, newTokenExpiry }
  └─ Insert document
  
  ↓ Response:
  ├─ Status: 200 OK
  ├─ Set-Cookie: new refreshToken (httpOnly, secure)
  └─ Body: { accessToken: "eyJhbG..." }

Client receives new access token
```

**Files:**
- [backend/src/routes/authRoutes.ts#L67-L95](../backend/src/routes/authRoutes.ts#L67-L95)
- [backend/src/services/refreshTokenService.ts#L37-L55](../backend/src/services/refreshTokenService.ts#L37-L55)

---

## Storage Flow (Upload & Download)

### Upload Flow (Signed URL)

```
Client (Browser)
  ↓ POST /api/files/upload-url
  ↓ Headers: { Authorization: "Bearer <accessToken>" }
  ↓ Body: { filename: "doc.pdf", contentType: "application/pdf", sizeBytes: 102400 }

Backend: server.ts#L45
  ↓ Auth Middleware: authMiddleware.ts#L10-L35
  ├─ Extract Bearer token from Authorization header
  ├─ jwt.verify(token, JWT_SECRET)
  │   If invalid/expired → 401 Unauthorized
  └─ If valid → Attach req.user = decoded payload

  ↓ Upload URL Handler: fileAccessRoutes.ts#L23-L58
  ├─ Validate MIME type against allowlist
  │   Check contentType in UPLOAD_ALLOWED_MIME_TYPES env var
  │   If not allowed → 400 Bad Request
  │
  ├─ Validate file size
  │   Check sizeBytes <= UPLOAD_MAX_BYTES env var (default 5MB)
  │   If too large → 413 Payload Too Large
  │
  └─ Generate Signed URL: fileService.ts#L28-L55
      ├─ Generate unique key: `${userId}/${uuid()}-${filename}`
      ├─ Call Supabase Storage API:
      │   POST https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{key}
      │   Headers: { Authorization: "Bearer {service_role_key}" }
      │   Body: { expiresIn: 60 } → Expires in 60 seconds
      │
      └─ Supabase responds with signed URL

  ↓ Save File Metadata: File.create()
  MongoDB: files collection
  ├─ key: "user123/abc-def-doc.pdf"
  ├─ filename: "doc.pdf"
  ├─ contentType: "application/pdf"
  ├─ sizeBytes: 102400
  ├─ owner: user._id
  ├─ acl: { users: [user._id], groups: [] }
  ├─ scanStatus: "pending" (placeholder for future virus scan)
  ├─ retention: { deleteAfter: Date.now() + 90 days }
  └─ Insert document

  ↓ Audit Log: AuditLog.create()
  MongoDB: auditlogs collection
  ├─ event: ISSUE_SIGNED_URL
  ├─ userId: user._id
  ├─ resourceType: FILE
  ├─ resourceId: file._id
  ├─ metadata: { action: "upload", filename, sizeBytes, expiresIn: 60 }
  └─ Insert document

  ↓ Response:
  ├─ Status: 200 OK
  └─ Body: { uploadUrl: "https://...?token=...", key: "user123/abc-def-doc.pdf", expiresIn: 60 }

Client uploads file directly to Supabase
  ↓ PUT {uploadUrl}
  ↓ Body: file binary
  ↓ Supabase validates signature, stores file
```

**Files:**
- [backend/src/routes/fileAccessRoutes.ts#L23-L58](../backend/src/routes/fileAccessRoutes.ts#L23-L58)
- [backend/src/services/fileService.ts#L28-L55](../backend/src/services/fileService.ts#L28-L55)
- [backend/src/models/File.ts](../backend/src/models/File.ts)
- [backend/src/models/AuditLog.ts](../backend/src/models/AuditLog.ts)

---

### Download Flow (Signed URL)

```
Client (Browser)
  ↓ GET /api/files/download-url?key=user123/abc-def-doc.pdf&expires=900
  ↓ Headers: { Authorization: "Bearer <accessToken>" }

Backend: server.ts#L45
  ↓ Auth Middleware: authMiddleware.ts#L10-L35
  ├─ Verify JWT token
  └─ Attach req.user

  ↓ ACL Check: fileAccessMiddleware.ts#L15-L45
  ├─ Query MongoDB: File.findOne({ key })
  │   MongoDB: files collection
  │   ↓ Find file document
  │   ↓ Return file with ACL
  │
  ├─ Check user in acl.users OR user.group in acl.groups
  │   If unauthorized → 403 Forbidden + AuditLog.create(FILE_ACCESS_DENIED)
  └─ If authorized → Continue

  ↓ Download URL Handler: fileAccessRoutes.ts#L60-L95
  ├─ Parse expires query param (default 900s = 15 min)
  ├─ Clamp to max TTL: Math.min(expires, 86400) → Max 24 hours
  │
  └─ Generate Signed URL: fileService.ts#L57-L82
      ├─ Call Supabase Storage API:
      │   POST https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{key}
      │   Body: { expiresIn: expires }
      │
      └─ Supabase responds with signed URL

  ↓ Audit Log: AuditLog.create()
  MongoDB: auditlogs collection
  ├─ event: ISSUE_SIGNED_URL
  ├─ userId: user._id
  ├─ resourceType: FILE
  ├─ resourceId: file._id
  ├─ metadata: { action: "download", filename, expiresIn: expires }
  └─ Insert document

  ↓ Response:
  ├─ Status: 200 OK
  └─ Body: { downloadUrl: "https://...?token=...", expiresIn: 900 }

Client downloads file from Supabase
  ↓ GET {downloadUrl}
  ↓ Supabase validates signature, serves file
  ↓ After TTL expires → URL becomes invalid (403 Forbidden)
```

**Files:**
- [backend/src/routes/fileAccessRoutes.ts#L60-L95](../backend/src/routes/fileAccessRoutes.ts#L60-L95)
- [backend/src/middleware/fileAccessMiddleware.ts#L15-L45](../backend/src/middleware/fileAccessMiddleware.ts#L15-L45)
- [backend/src/services/fileService.ts#L57-L82](../backend/src/services/fileService.ts#L57-L82)

---

## Payment Flow

### Checkout Flow (Stripe Integration)

```
Client (Browser - Commerce Web)
  ↓ POST /api/payments/pay
  ↓ Headers: { Authorization: "Bearer <accessToken>", X-CSRF-Token: "..." }
  ↓ Body: { amount: 5000, currency: "usd", paymentMethod: "stripe", items: [...] }

Backend (Commerce Web): commerce-web/src/app/api/payments/pay/route.ts#L15
  ↓ CSRF Validation: csrfProtection.ts
  ↓ Auth Middleware: Extract user from JWT

  ↓ Payment Handler
  ├─ Generate trace ID: traceId = uuid()
  ├─ Log start event
  │
  └─ Call Gateway Service: POST http://localhost:5000/api/gateway/pay
      ↓ Headers: { X-Trace-Id: traceId }
      ↓ Body: { amount, currency, method: "stripe", userId, items }

Backend (Gateway): backend/src/routes/gatewayRoutes.ts#L25-L68
  ↓ Extract trace ID from headers
  ↓ Forward to Payment Service
  
  ↓ Payment Service: backend/src/services/paymentService.ts#L42-L95
  ├─ Switch on payment method
  │
  └─ Stripe Flow: stripeService.ts#L18-L55
      ├─ Create Payment Intent:
      │   stripe.paymentIntents.create({
      │     amount: 5000,
      │     currency: "usd",
      │     automatic_payment_methods: { enabled: true }
      │   })
      │   ↓ Stripe API call
      │   ↓ Returns: { id: "pi_123...", status: "requires_payment_method" }
      │
      ├─ Save Transaction: Transaction.create()
      │   MongoDB: transactions collection
      │   ├─ transactionId: pi_123
      │   ├─ userId: user._id
      │   ├─ amount: 5000
      │   ├─ currency: "usd"
      │   ├─ status: "pending"
      │   ├─ provider: "stripe"
      │   ├─ traceId: traceId
      │   └─ Insert document
      │
      └─ Confirm Payment Intent:
          stripe.paymentIntents.confirm("pi_123")
          ↓ Stripe processes payment
          ↓ Returns: { id: "pi_123", status: "succeeded" }

  ↓ Update Transaction: Transaction.updateOne()
  MongoDB: transactions collection
  ├─ Set status: "completed"
  ├─ Set completedAt: Date.now()
  └─ Update document

  ↓ Audit Log: AuditLog.create()
  MongoDB: auditlogs collection
  ├─ event: PAYMENT_COMPLETED
  ├─ userId: user._id
  ├─ resourceType: TRANSACTION
  ├─ resourceId: transaction._id
  ├─ metadata: { amount: 5000, provider: "stripe", traceId }
  └─ Insert document

  ↓ Response (Gateway → Commerce Web → Client)
  ├─ Status: 200 OK
  └─ Body: { transactionId: "pi_123", status: "completed", amount: 5000 }

Client receives confirmation
```

**Files:**
- [commerce-web/src/app/api/payments/pay/route.ts](../commerce-web/src/app/api/payments/pay/route.ts)
- [backend/src/routes/gatewayRoutes.ts#L25-L68](../backend/src/routes/gatewayRoutes.ts#L25-L68)
- [backend/src/services/paymentService.ts](../backend/src/services/paymentService.ts)
- [backend/src/services/stripeService.ts](../backend/src/services/stripeService.ts)

---

## Webhook Flow

### Stripe Webhook (Payment Confirmation)

```
Stripe (External)
  ↓ POST /api/webhooks/stripe
  ↓ Headers: { Stripe-Signature: "t=123,v1=abc..." }
  ↓ Body: { id: "evt_123", type: "payment_intent.succeeded", data: {...} }

Backend: webhookRoutes.ts#L18-L65
  ↓ Rate Limiting: (100 req / min per IP)
  ├─ rateLimit checks webhook request count
  ├─ If exceeded → 429 Too Many Requests
  └─ If OK → Continue

  ↓ Signature Validation: webhookRoutes.ts#L25-L38
  ├─ Extract Stripe-Signature header
  ├─ Call stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET)
  │   ↓ Stripe SDK computes HMAC-SHA256
  │   ↓ Compares computed signature with header signature
  │   If mismatch → 400 Bad Request + AuditLog.create(WEBHOOK_VALIDATION_FAILED)
  └─ If valid → Continue

  ↓ Event Handler: webhookRoutes.ts#L40-L65
  ├─ Switch on event.type
  │
  └─ Case: payment_intent.succeeded
      ├─ Extract payment intent: event.data.object
      ├─ Query MongoDB: Transaction.findOne({ transactionId: intent.id })
      │   MongoDB: transactions collection
      │   ↓ Find transaction by Stripe intent ID
      │   ↓ Return transaction object
      │
      ├─ Update Transaction: Transaction.updateOne()
      │   ├─ Set status: "completed"
      │   ├─ Set webhookReceivedAt: Date.now()
      │   ├─ Set metadata.stripeEvent: event.id
      │   └─ Update document
      │
      └─ Audit Log: AuditLog.create()
          MongoDB: auditlogs collection
          ├─ event: WEBHOOK_RECEIVED
          ├─ resourceType: TRANSACTION
          ├─ resourceId: transaction._id
          ├─ metadata: { provider: "stripe", eventType: "payment_intent.succeeded", eventId: "evt_123" }
          └─ Insert document

  ↓ Response:
  ├─ Status: 200 OK
  └─ Body: { received: true }

Stripe marks webhook as delivered
```

**Files:**
- [backend/src/routes/webhookRoutes.ts#L18-L65](../backend/src/routes/webhookRoutes.ts#L18-L65)
- [backend/src/models/Transaction.ts](../backend/src/models/Transaction.ts)
- [backend/src/models/AuditLog.ts](../backend/src/models/AuditLog.ts)

---

## Audit Log Flow

### Creating Audit Logs

```
Application Code (Any Security Event)
  ↓ Call: AuditLog.create({ event, userId, resourceType, resourceId, metadata })

Backend: models/AuditLog.ts#L25-L45
  ↓ MongoDB Insert Operation
  MongoDB: auditlogs collection
  ├─ _id: ObjectId()
  ├─ event: "LOGIN_SUCCESS" | "FILE_ACCESS_DENIED" | ...
  ├─ userId: ObjectId (references users collection)
  ├─ ipAddress: "192.168.1.100"
  ├─ resourceType: "FILE" | "TRANSACTION" | "USER"
  ├─ resourceId: ObjectId (references related collection)
  ├─ metadata: { custom: "data" }
  ├─ timestamp: Date.now()
  └─ Insert document (best effort, non-blocking)

Log persisted to database
```

---

### Retrieving Audit Logs (Admin)

```
Admin (Browser)
  ↓ GET /api/audit-logs?limit=100&event=LOGIN_FAILURE
  ↓ Headers: { Authorization: "Bearer <adminAccessToken>" }

Backend: auditLogRoutes.ts#L15-L45
  ↓ Auth Middleware: Verify JWT
  ↓ Admin Check: Verify user.role === "admin"
  │   If not admin → 403 Forbidden
  └─ If admin → Continue

  ↓ Query MongoDB: AuditLog.find({ event: { $in: [...] } })
  MongoDB: auditlogs collection
  ├─ Apply filters (event, userId, resourceType, startDate, endDate)
  ├─ Sort by timestamp DESC
  ├─ Limit to 100 results
  ├─ Populate userId → user.email
  └─ Return array of audit log documents

  ↓ Response:
  ├─ Status: 200 OK
  └─ Body: { logs: [...], total: 542 }

Admin views logs in UI
  ↓ commerce-web/src/app/admin/audit-logs/page.tsx
  ↓ Displays table with filters, pagination
```

**Files:**
- [backend/src/routes/auditLogRoutes.ts](../backend/src/routes/auditLogRoutes.ts)
- [backend/src/models/AuditLog.ts](../backend/src/models/AuditLog.ts)
- [commerce-web/src/app/admin/audit-logs/page.tsx](../commerce-web/src/app/admin/audit-logs/page.tsx)

---

## Event Types Reference

| Event | Triggered By | Location |
|-------|--------------|----------|
| `LOGIN_SUCCESS` | Successful login | [authRoutes.ts#L58](../backend/src/routes/authRoutes.ts#L58) |
| `LOGIN_FAILURE` | Failed login attempt | [authRoutes.ts#L48](../backend/src/routes/authRoutes.ts#L48) |
| `TOKEN_REFRESHED` | Token refresh success | [authRoutes.ts#L88](../backend/src/routes/authRoutes.ts#L88) |
| `CSRF_VALIDATION_FAILED` | CSRF mismatch | [csrfProtection.ts#L62](../backend/src/middleware/csrfProtection.ts#L62) |
| `RATE_LIMIT_EXCEEDED` | Too many requests | [bruteForceProtection.ts#L42](../backend/src/middleware/bruteForceProtection.ts#L42) |
| `ISSUE_SIGNED_URL` | Signed URL created | [fileService.ts#L48](../backend/src/services/fileService.ts#L48) |
| `FILE_ACCESS_DENIED` | ACL check failed | [fileAccessMiddleware.ts#L38](../backend/src/middleware/fileAccessMiddleware.ts#L38) |
| `PAYMENT_COMPLETED` | Payment succeeded | [paymentService.ts#L85](../backend/src/services/paymentService.ts#L85) |
| `WEBHOOK_RECEIVED` | Webhook validated | [webhookRoutes.ts#L58](../backend/src/routes/webhookRoutes.ts#L58) |
| `WEBHOOK_VALIDATION_FAILED` | Invalid webhook signature | [webhookRoutes.ts#L32](../backend/src/routes/webhookRoutes.ts#L32) |

---

**Last Updated:** February 10, 2026
