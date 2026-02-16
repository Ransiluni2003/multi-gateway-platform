# Structured Logging + Request Correlation

## Overview

This implementation provides comprehensive structured logging with request correlation across both the Express backend and Next.js commerce-web application.

## Features

✅ **Request ID (Correlation ID)** - Unique identifier injected per request
✅ **Structured JSON Logs** - Consistent format with level, message, requestId, userId, route, latency
✅ **Error Logging** - Complete stack traces with request context
✅ **Webhook Logging** - Event type, idempotency key, and event ID tracking
✅ **Cross-Service Correlation** - Same requestId across backend and Next.js APIs

## Architecture

### Backend (Express)

```
Request Flow:
1. requestIdMiddleware - Generates/extracts correlation ID
2. requestLogger - Logs request start and completion
3. Route handlers - Use structuredLogger for business logic
4. Error handler - Logs errors with full context
```

### Commerce-Web (Next.js)

```
Request Flow:
1. API route receives request
2. getRequestId() - Extracts/generates correlation ID
3. logRequest() - Logs request start
4. Business logic executes
5. logResponse() - Logs completion with latency
6. withRequestId() - Adds correlation headers to response
```

## Files Created/Modified

### Backend

**New Files:**
- `backend/src/utils/structuredLogger.ts` - Structured logger utility
- `backend/src/middleware/requestLogger.ts` - Request logging middleware

**Modified Files:**
- `backend/src/middleware/requestId.js` - Enhanced correlation ID support
- `backend/src/server.ts` - Integrated logging middleware

### Commerce-Web

**New Files:**
- `commerce-web/src/lib/logger.ts` - Next.js structured logger
- `commerce-web/src/lib/request-logger.ts` - Request logging utilities

**Modified Files:**
- `commerce-web/src/app/api/webhooks/stripe/route.ts` - Added webhook logging
- `commerce-web/src/app/api/payment-intent/route.ts` - Added request logging
- `commerce-web/src/app/api/orders/route.ts` - Added comprehensive logging

### Scripts

**New Files:**
- `scripts/demo-logs.js` - Interactive demo script

## Usage

### Running the Demo

```bash
# Make sure both backend and commerce-web are running
npm run demo:logs
```

The demo will:
1. Generate unique correlation IDs
2. Make requests to multiple endpoints
3. Show where logs are stored
4. Display example log structures
5. Provide grep commands to search logs

### Manual Testing

#### Backend Request with Correlation ID

```bash
curl -H "x-request-id: my-test-id-123" http://localhost:5000/api/health
```

#### Next.js API Request with Correlation ID

```bash
curl -H "x-request-id: my-test-id-456" http://localhost:3001/api/orders
```

### Viewing Logs

#### Backend Logs

```bash
# Real-time logs
tail -f backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log

# Search by correlation ID
grep "my-test-id-123" backend/logs/combined.log

# Pretty print JSON logs
tail -f backend/logs/combined.log | jq .
```

#### Next.js Logs

```bash
# Console output (structured JSON)
cd commerce-web && npm run dev

# Logs will appear in the terminal as structured JSON
```

## Log Structure

### Standard Request Log

```json
{
  "level": "info",
  "message": "GET /api/orders - 200",
  "timestamp": "2026-02-14T10:30:15.123Z",
  "service": "commerce-web",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-123",
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
  "service": "commerce-web",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "route": "/api/orders",
  "method": "POST",
  "errorMessage": "Product not found",
  "errorName": "NotFoundError",
  "stack": "Error: Product not found\n    at handler..."
}
```

### Webhook Log

```json
{
  "level": "info",
  "message": "Webhook received: payment_intent.succeeded",
  "timestamp": "2026-02-14T10:30:15.123Z",
  "service": "commerce-web",
  "requestId": "webhook-abc123",
  "eventType": "payment_intent.succeeded",
  "eventId": "evt_1234567890",
  "idempotencyKey": "idempotency-key-xyz",
  "route": "/api/webhooks/stripe"
}
```

## API Reference

### Backend (structuredLogger)

```typescript
import { structuredLogger } from './utils/structuredLogger';

// Info log
structuredLogger.info('User logged in', {
  requestId: req.requestId,
  userId: user.id,
  route: req.path,
});

// Error log
structuredLogger.logErrorWithRequest(req, error, 'Custom error message');

// Webhook log
structuredLogger.logWebhook('payment_intent.succeeded', {
  requestId: req.requestId,
  eventId: event.id,
  idempotencyKey: event.request?.idempotency_key,
});
```

### Next.js (logger & request-logger)

```typescript
import { logger } from '@/lib/logger';
import { withLogging } from '@/lib/request-logger';

// Manual logging
const requestId = getRequestId(request);
logger.info('Order created', { requestId, orderId: order.id });

// Automatic logging with HOC
async function handler(request: NextRequest) {
  // Your logic here
  return NextResponse.json({ success: true });
}

export const POST = withLogging(handler, { routeName: 'create-order' });
```

## Acceptance Criteria

✅ **Request ID Correlation**
- Request ID is generated or extracted from headers
- Same ID flows through middleware and handlers
- Response headers include x-request-id and x-correlation-id

✅ **Structured Logs**
- JSON format with consistent fields
- Includes: level, message, requestId, userId, route, latency
- Timestamps in ISO 8601 format

✅ **Error Logging**
- Complete stack traces captured
- Request context included (route, method, requestId)
- Logged to error-specific transport

✅ **Webhook Logging**
- Event type logged
- Idempotency key captured
- Event ID included for reference

## Demo Instructions for Loom

### Preparation

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start commerce-web
cd commerce-web
npm run dev

# Terminal 3: Watch logs
cd backend
tail -f logs/combined.log | jq .
```

### Recording Steps

1. **Show the demo script**
   ```bash
   npm run demo:logs
   ```

2. **Make a manual request with curl**
   ```bash
   curl -H "x-request-id: demo-loom-123" http://localhost:5000/api/health
   ```

3. **Search for the correlation ID in logs**
   ```bash
   grep "demo-loom-123" backend/logs/combined.log | jq .
   ```

4. **Show cross-service correlation**
   - Make request to backend with ID
   - Show the same ID in logs
   - Make request to Next.js API with same ID
   - Show the ID appears in both services

5. **Demonstrate error logging**
   ```bash
   curl -H "x-request-id: error-demo-456" http://localhost:3001/api/orders?id=nonexistent
   ```
   - Show error log with stack trace

## Production Considerations

### Log Shipping

For production, integrate with a log aggregation service:

- **Logtail** - Already configured (set LOGTAIL_SOURCE_TOKEN)
- **Datadog** - Add winston-datadog transport
- **CloudWatch** - Add winston-cloudwatch transport
- **ELK Stack** - Use filebeat to ship logs

### Log Rotation

Configure log rotation to prevent disk space issues:

```javascript
// In structuredLogger.ts
new winston.transports.File({
  filename: 'combined.log',
  maxsize: 10485760, // 10MB
  maxFiles: 5,
  tailable: true,
})
```

### Performance

Structured logging adds minimal overhead:
- ~1-2ms per request for JSON serialization
- Async file writes don't block request handling
- Consider sampling for very high-traffic endpoints

## Troubleshooting

### Logs Not Appearing

1. Check log directory exists: `mkdir -p backend/logs`
2. Verify LOG_LEVEL env var: `echo $LOG_LEVEL`
3. Check file permissions: `ls -la backend/logs/`

### Request ID Not Correlating

1. Ensure middleware order is correct (requestId → requestLogger)
2. Check headers are being passed: `curl -v -H "x-request-id: test"`
3. Verify response headers include x-request-id

### JSON Logs Hard to Read

Use `jq` for pretty printing:
```bash
tail -f backend/logs/combined.log | jq .
```

## Next Steps

- [ ] Set up log aggregation service (Logtail/Datadog)
- [ ] Configure log rotation policies
- [ ] Add user context to logs (after auth)
- [ ] Implement log sampling for high-traffic routes
- [ ] Create dashboards in log aggregation tool
- [ ] Set up alerts for error rate thresholds

## References

- [Winston Logger](https://github.com/winstonjs/winston)
- [Request Correlation Best Practices](https://www.w3.org/TR/trace-context/)
- [Structured Logging Guide](https://stackify.com/what-is-structured-logging/)
