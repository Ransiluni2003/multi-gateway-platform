# Loom Recording Guide - Structured Logging Demo

## Preparation (Before Recording)

### 1. Start All Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Commerce-Web
cd commerce-web
npm run dev

# Terminal 3: Log Viewer (keep this visible during recording)
cd backend
tail -f logs/combined.log | jq .
```

### 2. Clear Logs (Optional)

```bash
# Start with fresh logs for cleaner demo
rm backend/logs/combined.log
rm backend/logs/error.log
```

### 3. Test Everything Works

```bash
# From project root
npm run demo:logs
```

---

## Recording Script (5-7 minutes)

### Part 1: Introduction (30 seconds)

**Show on screen:**
- VS Code with project open
- Terminal windows visible

**Say:**
> "Hi! Today I'm demonstrating structured logging with request correlation. This shows how a single request ID flows through our entire system, making it easy to track requests across middleware, handlers, and even different services."

---

### Part 2: Run the Demo Script (1 minute)

**Do:**
```bash
npm run demo:logs
```

**Say:**
> "Let me run our demo script which makes several requests with unique correlation IDs."

**Point out:**
- The colored output showing different scenarios
- The correlation IDs being generated
- The where-to-find-logs section at the end

---

### Part 3: Manual Request with Correlation ID (2 minutes)

**Terminal 1 (visible):** Log viewer running
**Terminal 2:** Make requests

**Do:**
```bash
# Show the curl command BEFORE running it
curl -H "x-request-id: loom-demo-12345" http://localhost:5000/api/health
```

**Say:**
> "I'm sending a request to our backend health endpoint with a custom correlation ID: loom-demo-12345. Watch what happens in the logs..."

**Switch to log viewer terminal**

**Do:**
```bash
# Stop the tail and search for the ID
grep "loom-demo-12345" backend/logs/combined.log | jq .
```

**Point out:**
- The requestId field in the logs
- The route, method, statusCode fields
- The latency measurement
- The timestamp

**Say:**
> "Notice how the same request ID appears in multiple log entries - one for the request start, one for the response. This is the correlation in action."

---

### Part 4: Cross-Service Correlation (2 minutes)

**Say:**
> "Now let's see the same correlation ID flow through multiple services."

**Do:**
```bash
# Make request to commerce-web API
curl -H "x-request-id: cross-service-999" http://localhost:3001/api/orders

# Show it in backend logs
grep "cross-service-999" backend/logs/combined.log | jq .
```

**Say:**
> "The request ID travels from the Next.js API through to our backend, maintaining the same correlation ID throughout."

---

### Part 5: Middleware and Handler Flow (2 minutes)

**Show code:**
1. Open `backend/src/middleware/requestId.js`
   - Show how requestId is extracted or generated
   
2. Open `backend/src/middleware/requestLogger.ts`
   - Show how it logs the request start and end

3. Open `commerce-web/src/app/api/orders/route.ts`
   - Show the logging calls in the handler
   - Point out requestId in getRequestId()

**Say:**
> "Here's the flow: The requestId middleware runs first, generating or extracting the ID. Then the request logger captures the start. Our handler uses the same ID for business logic logging. Finally, the logger captures the response with latency."

---

### Part 6: Error Logging (1 minute)

**Do:**
```bash
# Trigger an error
curl -H "x-request-id: error-test-555" http://localhost:3001/api/orders?id=nonexistent-order-999

# Find the error in logs
grep "error-test-555" backend/logs/combined.log | jq .
```

**Point out:**
- The error level
- The stack trace
- The request context (route, method, requestId)

**Say:**
> "When errors occur, we get the full stack trace with complete request context, making debugging much easier."

---

### Part 7: Webhook Logging (1 minute)

**Show code:**
Open `commerce-web/src/app/api/webhooks/stripe/route.ts`

**Point out:**
- The `logger.logWebhook()` call
- Event type, event ID, and idempotency key capture

**Say:**
> "For webhooks, we capture the event type, event ID, and idempotency key, along with the correlation ID for complete traceability."

---

### Part 8: Conclusion (30 seconds)

**Show documentation:**
Open `docs/STRUCTURED_LOGGING.md`

**Say:**
> "All the code, documentation, and the demo script are included. You can run 'npm run demo:logs' anytime to see this in action. The logs are structured JSON, making them perfect for log aggregation services like Datadog or CloudWatch."

**Final screen:**
Show the acceptance criteria checklist:
```
✅ Request ID correlation across services
✅ Structured JSON logs with full context
✅ Error logs with stack traces
✅ Webhook event logging
✅ demo:logs script for easy demonstration
```

---

## Tips for Recording

1. **Screen Resolution:** Use 1920x1080 for clarity
2. **Font Size:** Increase terminal font to 14-16pt
3. **Terminal Theme:** Use a high-contrast theme (dark background)
4. **Pause Between Sections:** Give viewers time to read logs
5. **Zoom In:** On important parts of code or logs
6. **Practice:** Do a dry run before recording

## Common Issues During Recording

### Logs Don't Appear
```bash
# Ensure logs directory exists
mkdir -p backend/logs

# Check LOG_LEVEL
echo $LOG_LEVEL
```

### Services Not Running
```bash
# Check if ports are in use
netstat -an | findstr "5000 3001"

# Restart services if needed
```

### jq Not Installed
```bash
# Windows with Chocolatey
choco install jq

# Or just use grep without jq
grep "request-id" backend/logs/combined.log
```

---

## After Recording

1. **Upload to Loom** with title: "B1: Structured Logging + Request Correlation Demo"
2. **Add Description:**
   ```
   Demonstration of structured logging implementation with request correlation across backend Express server and Next.js API routes.
   
   Features shown:
   - Request ID correlation across multiple endpoints
   - Structured JSON logs with requestId, route, latency
   - Error logging with stack traces
   - Webhook event logging
   - demo:logs script
   
   GitHub: [link to PR/branch]
   Documentation: docs/STRUCTURED_LOGGING.md
   ```

3. **Share Link** in project deliverables
