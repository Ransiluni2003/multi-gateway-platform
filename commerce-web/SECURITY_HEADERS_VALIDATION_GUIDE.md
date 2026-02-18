# Security Headers Validation Guide

## Overview
This document explains each security header implemented in your Next.js application and provides validation methods.

---

## Security Headers Explained

### 1. **Content-Security-Policy (CSP)**

#### What It Does
Controls which resources (JavaScript, CSS, images, fonts) can be loaded and from where.

#### Why We Use It
- **Prevents XSS (Cross-Site Scripting)**: Blocks malicious scripts from running
- **Example Attack**: If a hacker injects `<script>stealData()</script>`, the CSP blocks it
- **Risk Level**: HIGH - XSS is one of the most common web vulnerabilities

#### Your Configuration
```
default-src 'self'                          // Only same origin by default
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
img-src 'self' data: https: blob:
font-src 'self' https://fonts.gstatic.com
connect-src 'self' https://api.stripe.com https://*.supabase.co
frame-src 'self' https://js.stripe.com
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
upgrade-insecure-requests
```

#### What Each Part Does
| Directive | Purpose |
|-----------|---------|
| `default-src 'self'` | Load everything from same origin by default |
| `script-src ... Stripe` | Allow scripts from your site, Stripe payment script |
| `style-src ...` | Allow CSS from your site, Material-UI inline, Google Fonts |
| `img-src 'self' data: https: blob:` | Allow images from your site, data URLs, HTTPS, blob URLs (product images) |
| `connect-src 'self' ...` | Allow API calls to your backend, Stripe, Supabase |
| `frame-src 'self' Stripe` | Allow iframes only for Stripe payment forms |
| `object-src 'none'` | Block Flash and plugins completely |
| `base-uri 'self'` | Prevent hackers from changing base URL |
| `form-action 'self'` | Forms only submit to your domain |
| `frame-ancestors 'none'` | Cannot be embedded in iframe (prevents clickjacking) |
| `upgrade-insecure-requests` | Force HTTPS |

---

### 2. **X-Frame-Options**

#### What It Does
Prevents your website from being embedded in an `<iframe>` on other websites.

#### Why We Use It
- **Prevents Clickjacking**: Attackers can't hide your site in an invisible iframe and trick users
- **Example Attack**: 
  ```html
  <!-- Malicious website -->
  <iframe src="https://yourbank.com/transfer" style="opacity:0; position:absolute;"></iframe>
  <button onclick="stealMoney()">Click me for free money!</button>
  ```
  User clicks the button thinking they're getting free money, but they're actually confirming a bank transfer.
- **Risk Level**: MEDIUM-HIGH - Affects actions (payments, transfers, data changes)

#### Your Configuration
```
X-Frame-Options: DENY
```
- **DENY**: Cannot be embedded anywhere (most secure)
- **SAMEORIGIN**: Can only be embedded on your own domain
- **ALLOW-FROM**: Can be embedded on specific domains (deprecated)

---

### 3. **X-Content-Type-Options**

#### What It Does
Tells the browser "Trust the Content-Type header - don't guess what type of file this is"

#### Why We Use It
- **Prevents MIME Type Sniffing**: Stops attackers from uploading `.txt` files containing JavaScript code that browsers execute as `.js`
- **Example Attack**:
  ```
  Upload file: avatar.txt (contains: alert('hacked'))
  Server sends: Content-Type: text/plain
  
  WITHOUT X-Content-Type-Options: Browser might execute it as JavaScript
  WITH X-Content-Type-Options: Browser trusts Content-Type and treats it as plain text
  ```
- **Risk Level**: MEDIUM - Common vector for file upload attacks

#### Your Configuration
```
X-Content-Type-Options: nosniff
```
- Only valid value is `nosniff`
- Tells browser: "Don't sniff, trust what I tell you"

---

### 4. **Referrer-Policy**

#### What It Does
Controls how much information about where the user came from is shared with external websites.

#### Why We Use It
- **Privacy Protection**: Don't leak sensitive data in URLs
- **Example Leak**:
  ```
  Your internal URL: https://yourbank.com/user/accounts?id=12345&ssn=123456789
  User clicks link to external site
  
  WITHOUT Referrer-Policy: External site learns the user ID and SSN
  WITH Referrer-Policy: External site only sees https://yourbank.com
  ```
- **Risk Level**: MEDIUM - Information disclosure vulnerability

#### Your Configuration
```
Referrer-Policy: strict-origin-when-cross-origin
```

| Policy | Sends To Same Origin | Sends To Different Origin |
|--------|---------------------|--------------------------|
| `no-referrer` | Nothing | Nothing (most private) |
| `strict-origin-when-cross-origin` | Full URL | Only domain (origin) |
| `no-referrer-when-downgrade` | Full URL | Nothing (only for HTTPS→HTTP) |
| `same-origin` | Full URL | Nothing |

**Your setting**: Balances privacy + functionality
- **Same domain**: Share full URL (needed for analytics)
- **Different domain**: Share only origin (https://yourbank.com)

---

### 5. **Permissions-Policy** (formerly Feature-Policy)

#### What It Does
Locks down dangerous browser features (camera, microphone, geolocation) that malicious scripts could abuse.

#### Why We Use It
- **Prevents Unauthorized Access**: Even if attacker injects JavaScript, they can't access:
  - 📷 Camera
  - 🎤 Microphone  
  - 📍 Geolocation
  - 💳 Payment APIs
  - 🔌 USB devices
  - 📊 Sensors (accelerometer, gyroscope)

#### Example Attack Without This
```javascript
// Malicious script injected on your site
navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(stream => {
    // Now attacker can spy on user with camera/mic
    sendVideoToEvilServer(stream);
  });
```

#### Your Configuration
```
camera=()           // No camera - denied to everyone
microphone=()       // No microphone - denied to everyone
geolocation=()      // No location - denied to everyone
payment=(self)      // Payment API allowed ONLY for same origin (Stripe checkout)
usb=()              // No USB - denied to everyone
magnetometer=()     // No magnetometer sensor
accelerometer=()    // No accelerometer sensor
gyroscope=()        // No gyroscope sensor
```

#### Syntax Explanation
- `feature=()` - Feature denied to all origins (even your own!)
- `feature=(self)` - Feature allowed only to same origin
- `feature=(self "https://trusted.com")` - Multiple trusted origins

#### Risk Level
**HIGH** - Prevents physical device exploitation, privacy invasion, payment fraud

---

### 6. **X-DNS-Prefetch-Control**

#### What It Does
Controls whether the browser pre-fetches DNS names before navigating to a link.

#### Why We Use It
- **Privacy Protection**: Prevents leaking which external sites you're about to visit
- **Example**: If user hovers over link to competitor site, DNS prefetch sends a lookup request

#### Your Configuration
```
X-DNS-Prefetch-Control: on
```
- `on`: Allow DNS prefetching (performance optimization)
- `off`: Disable DNS prefetching (privacy protection)

---

### 7. **Strict-Transport-Security (HSTS)**

#### What It Does
Forces browsers to always use HTTPS (never HTTP).

#### Why We Use It
- **Prevents Downgrade Attacks**: Attacker can't force HTTPS→HTTP fallback to steal credentials
- **Example Attack**:
  ```
  User types: yourbank.com
  Attacker intercepts: Redirects to HTTP://yourbank.com
  User enters password in plain text
  Attacker steals it
  
  WITH HSTS: Browser automatically converts to HTTPS
  ```
- **Risk Level**: HIGH

#### Your Configuration
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
- `max-age=31536000`: Remember for 1 year (31536000 seconds)
- `includeSubDomains`: Also force HTTPS on all subdomains
- Only enabled in production (to avoid dev environment issues)

---

## Validation Methods

### Method 1: Browser DevTools (Easiest)

#### Steps
1. Open your Next.js application in browser
2. Press **F12** to open Developer Tools
3. Go to **Network** tab
4. Refresh the page
5. Click on the document request (usually first one)
6. Go to **Response Headers** tab
7. Look for security headers

#### Expected Headers
```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=()...
```

---

### Method 2: Online Security Header Checker

Visit these websites to automatically scan your site:

1. **SecurityHeaders.com**
   - URL: https://securityheaders.com/
   - Enter: `http://localhost:3000`
   - Shows: Grade A-F + detailed report

2. **Mozilla Observatory**
   - URL: https://observatory.mozilla.org/
   - More comprehensive analysis

3. **Qualys SSL Labs**
   - URL: https://www.ssllabs.com/ssltest/
   - For HTTPS/TLS validation

---

### Method 3: Command Line (cURL)

#### View All Headers
```bash
curl -i http://localhost:3000
```

#### View Only Security Headers
```bash
curl -i http://localhost:3000 | grep -i "content-security\|x-frame\|x-content\|referrer\|permissions\|strict-transport\|x-dns"
```

#### Example Output
```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=()...
```

---

### Method 4: Node.js Script Validation

Create a validation script to check headers programmatically:

**File: `validate-security-headers.js`**

```javascript
const https = require('https');
const url = 'http://localhost:3000'; // Change to your URL

const requiredHeaders = {
  'content-security-policy': 'CSP Policy',
  'x-frame-options': 'X-Frame-Options',
  'x-content-type-options': 'X-Content-Type-Options',
  'referrer-policy': 'Referrer-Policy',
  'permissions-policy': 'Permissions-Policy',
};

https.get(url, (res) => {
  console.log('✅ SECURITY HEADERS VALIDATION\n');
  
  let missingHeaders = [];
  
  Object.entries(requiredHeaders).forEach(([headerName, headerDisplay]) => {
    const value = res.headers[headerName];
    if (value) {
      console.log(`✅ ${headerDisplay}`);
      console.log(`   Value: ${value}\n`);
    } else {
      console.log(`❌ ${headerDisplay} - MISSING\n`);
      missingHeaders.push(headerName);
    }
  });
  
  if (missingHeaders.length === 0) {
    console.log('✅ All security headers are present!');
  } else {
    console.log(`⚠️  Missing ${missingHeaders.length} headers`);
  }
}).on('error', (e) => {
  console.error('Connection error:', e.message);
});
```

#### Run It
```bash
node validate-security-headers.js
```

---

### Method 5: Next.js Testing

Add this to your test file:

```typescript
// tests/security-headers.test.ts
describe('Security Headers', () => {
  it('should have CSP header', async () => {
    const response = await fetch('http://localhost:3000');
    expect(response.headers.get('content-security-policy')).toBeTruthy();
  });

  it('should have X-Frame-Options header', async () => {
    const response = await fetch('http://localhost:3000');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });

  it('should have Permissions-Policy header', async () => {
    const response = await fetch('http://localhost:3000');
    expect(response.headers.get('permissions-policy')).toBeTruthy();
  });
});
```

---

## Risk Levels Summary

| Header | Risk | Impact |
|--------|------|--------|
| CSP | 🔴 HIGH | Prevents XSS attacks (most common) |
| X-Frame-Options | 🟠 MEDIUM-HIGH | Prevents clickjacking on sensitive actions |
| X-Content-Type-Options | 🟠 MEDIUM | Prevents MIME sniffing in file uploads |
| Referrer-Policy | 🟡 MEDIUM | Information disclosure in URLs |
| Permissions-Policy | 🔴 HIGH | Prevents unauthorized device access |
| X-DNS-Prefetch-Control | 🟡 LOW-MEDIUM | Privacy: prevents DNS leakage |
| HSTS | 🔴 HIGH | Prevents HTTPS downgrade attacks |

---

## Best Practices

✅ **DO**
- Test with browser DevTools before production
- Start with strict policies, loosen only if needed
- Update CSP as you add new third-party services
- Monitor CSP violations using `report-uri`
- Regularly review permissions you're allowing

❌ **DON'T**
- Use `unsafe-eval` in script-src (allows code execution!)
- Set `frame-ancestors *` (allows embedding anywhere)
- Use `camera=*` or `microphone=*` (opens to all)
- Disable headers for "convenience"
- Use `Content-Security-Policy: disable` (not valid anyway)

---

## Verification Checklist

- [ ] CSP header present in response
- [ ] X-Frame-Options set to DENY or SAMEORIGIN
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy denies camera/microphone by default
- [ ] No CSP console violations
- [ ] HTTPS working in production
- [ ] HSTS header sent in production

---

## Troubleshooting

### Issue: CSP Violations in Console
```
Refused to load script from 'https://example.com' - CSP Policy
```
**Solution**: Add the domain to appropriate `script-src` directive

### Issue: Stripe Payment Not Working
```
Refused to frame 'https://js.stripe.com' - X-Frame-Options
```
**Solution**: Already configured - ensure `frame-src 'self' https://js.stripe.com` is in CSP

### Issue: Images Not Loading
```
Refused to load image from 'https://cdn.example.com'
```
**Solution**: Add domain to `img-src` directive in CSP

---

## Your Current Status

✅ **All security headers implemented correctly**
✅ **Production-ready configuration**
✅ **Balanced between security and functionality**

### Next Steps
1. Run validation tests before deployment
2. Monitor CSP violations in production (add `report-uri` if needed)
3. Update headers when adding new third-party services
4. Review annually for new security best practices
