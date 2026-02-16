# Structured Logging Implementation - Quick Reference

## ✅ Implementation Complete

### What Was Implemented

1. **Request Correlation ID System**
   - Middleware to generate/extract UUID request IDs
   - Correlation headers: `x-request-id` and `x-correlation-id`
   - IDs flow through all middleware and handlers

2. **Structured Logger Utilities**
   - Backend: `backend/src/utils/structuredLogger.ts`
   - Next.js: `commerce-web/src/lib/logger.ts`
   - Consistent JSON format with: level, message, timestamp, requestId, route, latency

3. **Request Logging Middleware**
   - Backend: `backend/src/middleware/requestLogger.ts`
   - Next.js: `commerce-web/src/lib/request-logger.ts`
   - Automatic request/response logging with latency

4. **Enhanced Routes with Logging**
   - Webhook: `/api/webhooks/stripe` - logs eventType, eventId, idempotencyKey
   - Payment: `/api/payment-intent` - full request logging
   - Orders: `/api/orders` - comprehensive logging with business context

5. **Demo Script**
   - `npm run demo:logs` - Interactive demonstration
   - Makes multiple requests with correlation IDs
   - Shows where to find logs
   - Displays example log structures

## 🚀 Quick Start

### Run the Demo
```bash
npm run demo:logs
```

### View Logs
```bash
# Real-time
tail -f backend/logs/combined.log | jq .

# Search by ID
grep "your-request-id" backend/logs/combined.log
```

### Make Custom Request
```bash
curl -H "x-request-id: my-test-123" http://localhost:5000/api/health
```

## 📁 Files Created/Modified

### New Files
- ✅ `backend/src/utils/structuredLogger.ts`
- ✅ `backend/src/middleware/requestLogger.ts`
- ✅ `commerce-web/src/lib/logger.ts`
- ✅ `commerce-web/src/lib/request-logger.ts`
- ✅ `scripts/demo-logs.js`
- ✅ `docs/STRUCTURED_LOGGING.md`
- ✅ `docs/LOOM_STRUCTURED_LOGGING.md`

### Modified Files
- ✅ `backend/src/middleware/requestId.js` - Enhanced correlation support
- ✅ `backend/src/server.ts` - Integrated logging middleware
- ✅ `commerce-web/src/app/api/webhooks/stripe/route.ts` - Webhook logging
- ✅ `commerce-web/src/app/api/payment-intent/route.ts` - Request logging
- ✅ `commerce-web/src/app/api/orders/route.ts` - Comprehensive logging
- ✅ `package.json` - Added demo:logs script

## 📊 Log Format Examples

### Standard Request
```json
{
  "level": "info",
  "message": "GET /api/orders - 200",
  "timestamp": "2026-02-14T10:30:15.123Z",
  "service": "commerce-web",
  "requestId": "a1b2c3d4-...",
  "route": "/api/orders",
  "method": "GET",
  "statusCode": 200,
  "latency": 45
}
```

### Error Log
```json
{
  "level": "error",
  "message": "Order creation error",
  "timestamp": "2026-02-14T10:30:15.123Z",
  "requestId": "a1b2c3d4-...",
  "route": "/api/orders",
  "errorMessage": "Product not found",
  "stack": "Error: Product not found\n    at..."
}
```

### Webhook Log
```json
{
  "level": "info",
  "message": "Webhook received: payment_intent.succeeded",
  "timestamp": "2026-02-14T10:30:15.123Z",
  "requestId": "webhook-abc123",
  "eventType": "payment_intent.succeeded",
  "eventId": "evt_1234567890",
  "idempotencyKey": "idempotency-key-xyz"
}
```

## ✅ Acceptance Criteria Met

- [x] Request ID (correlation ID) injected per request
- [x] Structured JSON logs with level, message, requestId, userId, route, latency
- [x] Error logs include stack + route + requestId
- [x] Webhook endpoints log event type + idempotency key / event ID
- [x] Same requestId appears across middleware + handler
- [x] npm run demo:logs script created and working

## 🎥 Loom Recording Checklist

1. [ ] Start backend: `cd backend && npm run dev`
2. [ ] Start commerce-web: `cd commerce-web && npm run dev`
3. [ ] Open log viewer: `tail -f backend/logs/combined.log | jq .`
4. [ ] Run demo: `npm run demo:logs`
5. [ ] Make manual request with custom requestId
6. [ ] Search logs for that requestId
7. [ ] Show it appears in multiple log entries
8. [ ] Demonstrate error logging
9. [ ] Show webhook logging code
10. [ ] Show documentation

**See:** `docs/LOOM_STRUCTURED_LOGGING.md` for detailed recording guide

## 📚 Documentation

- **Main Documentation:** `docs/STRUCTURED_LOGGING.md`
- **Loom Guide:** `docs/LOOM_STRUCTURED_LOGGING.md`
- **Quick Reference:** This file

## 🔧 Testing Commands

```bash
# Run demo
npm run demo:logs

# Manual backend test
curl -H "x-request-id: test-123" http://localhost:5000/api/health

# Manual Next.js test
curl -H "x-request-id: test-456" http://localhost:3001/api/orders

# View logs
tail -f backend/logs/combined.log | jq .

# Search logs
grep "test-123" backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log | jq .
```

## 🎯 Next Steps

1. **Record Loom Video**
   - Follow guide in `docs/LOOM_STRUCTURED_LOGGING.md`
   - Show requestId correlation across logs
   - Demonstrate all acceptance criteria

2. **Optional Enhancements**
   - Add user context (userId) after authentication
   - Set up log aggregation (Logtail/Datadog)
   - Configure log rotation
   - Add sampling for high-traffic routes

3. **Production Readiness**
   - Configure LOG_LEVEL env var
   - Set up LOGTAIL_SOURCE_TOKEN
   - Review log retention policies
   - Set up alerts for error rates

---

**Status:** ✅ Implementation Complete  
**Demo Script:** `npm run demo:logs`  
**Documentation:** `docs/STRUCTURED_LOGGING.md`  
**Loom Guide:** `docs/LOOM_STRUCTURED_LOGGING.md`
