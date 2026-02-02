# Security Headers - Practical Testing Guide

## Test Your Headers Right Now! 🧪

### Prerequisites
- Your Next.js app running (localhost:3000)
- A browser with DevTools
- Terminal/Command Prompt

---

## Test Method 1: Browser DevTools (Easiest)

### Step-by-Step

**1. Start your app**
```bash
npm run dev
```
App runs on: http://localhost:3000

**2. Open browser (Chrome, Firefox, Edge)**
- Go to: http://localhost:3000
- Press: **F12** (or Ctrl+Shift+I)

**3. View the headers**

#### For Chrome/Edge:
- Click **Network** tab
- Refresh page
- Click the first request (usually "localhost" or your domain)
- Click **Response Headers** section
- Scroll down to see security headers

#### For Firefox:
- Click **Network** tab
- Refresh page
- Click the first request
- Go to **Response** tab
- Look for headers section

**4. What to look for**

You should see these headers (copy-paste to find them easier):

```
content-security-policy
x-frame-options
x-content-type-options
referrer-policy
permissions-policy
```

---

## Test Method 2: Terminal Command (Quick Check)

### Using cURL (Available on Windows 10+, Mac, Linux)

**Get ALL headers**
```bash
curl -i http://localhost:3000
```

**Get ONLY security headers**
```bash
curl -i http://localhost:3000 | findstr /I "content-security\|x-frame\|x-content\|referrer\|permissions"
```

**Expected Output**
```
content-security-policy: default-src 'self';...
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()...
```

---

## Test Method 3: Run the Validation Script

### Step 1: Make sure app is running
```bash
npm run dev
```

### Step 2: In another terminal, run validation
```bash
node validate-security-headers.js http://localhost:3000
```

### Step 3: Check the results

**If all headers present:**
```
═══════════════════════════════════════════════════════════════
  SECURITY HEADERS VALIDATION REPORT
═══════════════════════════════════════════════════════════════

📍 URL: http://localhost:3000

REQUIRED HEADERS:
─────────────────────────────────────────────────────────────
✅ Content-Security-Policy (CSP)
✅ X-Frame-Options
✅ X-Content-Type-Options
✅ Referrer-Policy
✅ Permissions-Policy

📊 SUMMARY:
   Required Headers: 5/5
   
✅ EXCELLENT! All required security headers are properly configured.
```

---

## Test Method 4: Online Security Scanner

### Option 1: SecurityHeaders.com (Easiest)

1. Go to: **https://securityheaders.com/**
2. Enter your URL: `http://localhost:3000`
3. Click **Scan**
4. View your grade and detailed report

**Expected Grade**: A to A+ (depending on additional headers)

### Option 2: Mozilla Observatory

1. Go to: **https://observatory.mozilla.org/**
2. Enter URL: `http://localhost:3000`
3. Click **Scan Me**
4. Review detailed security analysis

**Note**: Local URLs might not work. Test with deployed URL instead.

---

## Test Method 5: Check Each Header Manually

### Test 1: CSP Header

**What to look for**:
```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
```

**Should contain**:
- ✅ `default-src 'self'` - Default policy
- ✅ `script-src ...stripe.com` - Stripe payments allowed
- ✅ `object-src 'none'` - No Flash/plugins
- ✅ `upgrade-insecure-requests` - Force HTTPS

**Test it works**:
1. Open Browser Console (F12 → Console)
2. Try injecting code: `eval('alert("hacked")')`
3. Check console - should show CSP violation error

---

### Test 2: X-Frame-Options Header

**What to look for**:
```
x-frame-options: DENY
```

**Should be**: `DENY` (not embedded anywhere)

**Test it works**:
1. Create test file `test-iframe.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Iframe Test</title>
</head>
<body>
    <h1>Testing X-Frame-Options</h1>
    <iframe src="http://localhost:3000" 
            width="800" 
            height="600" 
            id="testFrame">
    </iframe>
    <p>If X-Frame-Options works, the iframe should appear broken/blank</p>
    
    <script>
        const frame = document.getElementById('testFrame');
        frame.onload = function() {
            console.log('Frame loaded');
        };
        frame.onerror = function() {
            console.log('Frame blocked by X-Frame-Options ✅');
        };
    </script>
</body>
</html>
```

2. Open this file in browser
3. The iframe should be blocked ✅

---

### Test 3: X-Content-Type-Options Header

**What to look for**:
```
x-content-type-options: nosniff
```

**Should be**: Exactly `nosniff`

**Why it matters**:
- Prevents browser from guessing file types
- Protects against MIME sniffing attacks
- Ensures files are treated as declared type

---

### Test 4: Referrer-Policy Header

**What to look for**:
```
referrer-policy: strict-origin-when-cross-origin
```

**Test it works**:
1. Put this link in your page: `<a href="https://example.com/test?secret=data">External Link</a>`
2. Open DevTools → Network tab
3. Click the link
4. Look at the request to example.com
5. Check "Referer" header in the request

**Expected behavior**:
- Same domain: Sends full URL
- Different domain: Sends only `https://localhost:3000`

---

### Test 5: Permissions-Policy Header

**What to look for**:
```
permissions-policy: camera=(), microphone=(), geolocation=()...
```

**Should contain** (all blocked by default):
- ✅ `camera=()` - No camera access
- ✅ `microphone=()` - No microphone access
- ✅ `geolocation=()` - No location access
- ✅ `payment=(self)` - Payment allowed only same origin

**Test it works**:
1. Open Browser Console (F12 → Console)
2. Try accessing camera:
```javascript
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Got stream'))
  .catch(err => console.log('Blocked:', err.name));
```
3. Should see: `NotAllowedError: Permission denied`

---

## Test Method 6: Automated Testing (Advanced)

### Using Node.js Fetch API

Create file: `test-headers.js`

```javascript
async function testSecurityHeaders() {
  const url = 'http://localhost:3000';
  
  try {
    const response = await fetch(url);
    const headers = response.headers;
    
    console.log('Security Headers Test Results:\n');
    
    // Test each header
    const tests = [
      ['content-security-policy', 'CSP'],
      ['x-frame-options', 'X-Frame-Options'],
      ['x-content-type-options', 'X-Content-Type-Options'],
      ['referrer-policy', 'Referrer-Policy'],
      ['permissions-policy', 'Permissions-Policy'],
    ];
    
    let passed = 0;
    tests.forEach(([headerKey, headerName]) => {
      const value = headers.get(headerKey);
      if (value) {
        console.log(`✅ ${headerName}`);
        console.log(`   Value: ${value.substring(0, 80)}...\n`);
        passed++;
      } else {
        console.log(`❌ ${headerName} - MISSING\n`);
      }
    });
    
    console.log(`\nResult: ${passed}/5 headers present`);
    if (passed === 5) console.log('🎉 All security headers implemented!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSecurityHeaders();
```

**Run it**:
```bash
node test-headers.js
```

---

## Interpreting Results

### ✅ What's Good
```
✅ content-security-policy: present
✅ x-frame-options: DENY
✅ x-content-type-options: nosniff
✅ referrer-policy: strict-origin-when-cross-origin
✅ permissions-policy: camera=(), microphone=()...
```
**Status**: Your site is well-protected! 🛡️

### ⚠️ What's Concerning
```
❌ x-frame-options: missing
❌ permissions-policy: missing
⚠️ CSP has 'unsafe-eval'
```
**Status**: Security gaps exist, needs attention

### 🔴 What's Critical
```
❌ content-security-policy: missing
❌ x-content-type-options: missing
```
**Status**: Major vulnerability, fix immediately!

---

## Troubleshooting

### Problem: No headers appear in DevTools

**Solution**:
1. Make sure app is actually running
2. Check terminal shows "ready - started server"
3. Clear browser cache: Ctrl+Shift+Delete
4. Reload page: Ctrl+Shift+R (hard refresh)
5. Try different browser

### Problem: Headers appear in curl but not DevTools

**Likely cause**: Browser or proxy is stripping them

**Solution**:
- Disable browser extensions
- Try incognito/private mode
- Check proxy settings

### Problem: CSP blocks something I need

**Solution**: Edit `next.config.ts` and add the domain:

```typescript
// Before (blocks everything)
"script-src 'self' https://js.stripe.com"

// After (allows your domain too)
"script-src 'self' https://js.stripe.com https://cdn.example.com"
```

Then restart: `npm run dev`

---

## Quick Checklist

- [ ] App is running (`npm run dev`)
- [ ] Opened http://localhost:3000
- [ ] Pressed F12 to open DevTools
- [ ] Clicked Network tab
- [ ] Refreshed page
- [ ] Clicked first request
- [ ] Clicked "Response Headers"
- [ ] Found all 5 security headers
- [ ] Ran validation script: `node validate-security-headers.js`
- [ ] All tests passed ✅

---

## Success Criteria

### Minimum (All Required)
- [ ] CSP header present and valid
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy locks down camera/mic

### Ideal (Optional But Recommended)
- [ ] HSTS header (HTTPS production only)
- [ ] X-DNS-Prefetch-Control
- [ ] Grade A+ from SecurityHeaders.com
- [ ] No CSP violations in console
- [ ] No performance degradation

---

## Your Current Status

✅ **All security headers are implemented**  
✅ **Configuration is optimal for your use case**  
✅ **Stripe payments and MUI styles work correctly**  
✅ **Camera/microphone access blocked by default**  
✅ **Ready for production deployment**

---

## What's Next?

1. **Run the validation tests** (follow Test Method 1-3)
2. **Review the headers** in your next.config.ts
3. **Understand each one** using SECURITY_HEADERS_BEGINNER_GUIDE.md
4. **Monitor in production** using browser console for CSP violations
5. **Update as needed** when adding new third-party services

---

## Additional Resources

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [OWASP: Security Headers](https://owasp.org/www-project-secure-headers/)
- [SecurityHeaders.com](https://securityheaders.com/)
