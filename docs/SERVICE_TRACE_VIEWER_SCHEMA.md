# Service Trace Viewer - Schema Documentation

## Overview
The Service Trace Viewer is a distributed tracing system integrated into the Multi-Gateway Platform admin dashboard. It captures, stores, and visualizes request flows across microservices with detailed span-level timing information.

## Date Completed
**Implementation Date**: January 8, 2026  
**Requirements**: 2025-12-22 to 2026-01-05

---

## Trace Data Schema

### MongoDB Collection: `traces`

The system stores traces in a MongoDB collection named `traces` with the following schema:

```typescript
interface Trace {
  // Identifiers
  id: string;                    // Unique identifier for the trace
  traceID: string;               // OpenTelemetry trace ID (may match id)
  
  // Request Information
  path: string;                  // HTTP request path (e.g., "/api/payments")
  method: string;                // HTTP method (GET, POST, PUT, DELETE, etc.)
  status: number;                // HTTP response status code
  
  // Timing
  durationMs: number;            // Total request duration in milliseconds
  ts: string;                    // Timestamp (ISO 8601 format)
  
  // Service Context
  serviceName: string;           // Name of the service (e.g., "api", "payments")
  
  // Distributed Tracing
  parentTraceID?: string;        // Parent trace ID (for nested calls)
  spans: Span[];                 // Array of span objects
  
  // Metadata
  attributes: {                  // Additional custom attributes
    'service.name': string;
    'service.version': string;
    [key: string]: any;
  };
  
  // Mongoose timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}
```

### Span Schema

Each trace contains multiple spans representing individual operations:

```typescript
interface Span {
  // Identifiers
  spanID: string;                // Unique span identifier
  
  // Operation Details
  operation: string;             // Description of operation (e.g., "HTTP POST /api/payments")
  service: string;               // Service that executed this span
  status: number;                // Operation status code
  
  // Timing
  startOffsetMs: number;         // Start time offset from trace start (milliseconds)
  durationMs: number;            // Span duration in milliseconds
  
  // Metadata
  attributes?: {                 // Optional span-specific attributes
    'http.method'?: string;
    'http.url'?: string;
    'http.status_code'?: number;
    'http.host'?: string;
    'http.user_agent'?: string;
    [key: string]: any;
  };
}
```

---

## Database Indexes

The schema includes the following indexes for performance:

```typescript
{
  id: 1,              // Index on trace ID
  traceID: 1,         // Index on OpenTelemetry trace ID
  ts: 1,              // Index on timestamp (for sorting)
  serviceName: 1      // Index on service name (for filtering)
}
```

---

## Example Trace Document

```json
{
  "_id": "676321ab12345678abcd1234",
  "id": "a7b3c9d2-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "traceID": "a7b3c9d24e5f6a7b8c9d0e1f2a3b4c5d",
  "path": "/api/payments",
  "method": "POST",
  "status": 200,
  "durationMs": 145.32,
  "ts": "2026-01-08T10:30:45.123Z",
  "serviceName": "api",
  "spans": [
    {
      "spanID": "abc123def",
      "operation": "HTTP POST /api/payments",
      "service": "api",
      "status": 200,
      "startOffsetMs": 0,
      "durationMs": 145.32,
      "attributes": {
        "http.method": "POST",
        "http.url": "/api/payments",
        "http.status_code": 200,
        "http.host": "localhost:5000",
        "http.user_agent": "Mozilla/5.0"
      }
    },
    {
      "spanID": "def456ghi",
      "operation": "Validate payment request",
      "service": "payments",
      "status": 200,
      "startOffsetMs": 5.21,
      "durationMs": 12.43
    },
    {
      "spanID": "ghi789jkl",
      "operation": "Publish payment.received event",
      "service": "payments",
      "status": 200,
      "startOffsetMs": 25.67,
      "durationMs": 45.89
    },
    {
      "spanID": "jkl012mno",
      "operation": "Format and send response",
      "service": "payments",
      "status": 200,
      "startOffsetMs": 135.12,
      "durationMs": 10.20
    }
  ],
  "attributes": {
    "service.name": "api",
    "service.version": "1.0.0"
  },
  "createdAt": "2026-01-08T10:30:45.268Z",
  "updatedAt": "2026-01-08T10:30:45.268Z"
}
```

---

## API Endpoints

### 1. Get Recent Traces
**Endpoint**: `GET /api/traces/recent`

**Query Parameters**:
- `limit` (number): Maximum number of traces to return (default: 50, max: 100)
- `q` (string): Search query (searches path, method, traceID)
- `service` (string): Filter by service name
- `method` (string): Filter by HTTP method
- `status` (number): Filter by status code

**Response**:
```json
{
  "traces": [
    {
      "traceID": "a7b3c9d24e5f6a7b8c9d0e1f2a3b4c5d",
      "serviceName": "api",
      "duration": 145320,
      "status": 200,
      "path": "/api/payments",
      "method": "POST",
      "ts": "2026-01-08T10:30:45.123Z",
      "spans": [...]
    }
  ]
}
```

### 2. Get Trace by ID
**Endpoint**: `GET /api/traces/:id`

**Path Parameters**:
- `id` (string): Trace ID or traceID

**Response**:
```json
{
  "trace": {
    "traceID": "a7b3c9d24e5f6a7b8c9d0e1f2a3b4c5d",
    "serviceName": "api",
    "duration": 145320,
    "status": 200,
    "path": "/api/payments",
    "method": "POST",
    "ts": "2026-01-08T10:30:45.123Z",
    "spans": [
      {
        "spanID": "abc123def",
        "operation": "HTTP POST /api/payments",
        "service": "api",
        "status": 200,
        "startOffsetMs": 0,
        "durationMs": 145.32,
        "attributes": {...}
      }
    ]
  }
}
```

---

## Trace Capture Mechanism

### Middleware: `traceCapture`
Location: `backend/src/middleware/traceCapture.ts`

**How it works**:
1. Intercepts every HTTP request
2. Generates a unique `spanId` and retrieves/generates `traceId`
3. Records the start time
4. Attaches trace context to the request object
5. Listens for the response `finish` event
6. Calculates duration and collects all spans
7. Saves the complete trace to MongoDB asynchronously

**Key Features**:
- Non-blocking: Trace saving doesn't delay response
- Error handling: Failed trace saves are logged but don't affect requests
- OpenTelemetry integration: Extracts trace context from active spans
- Service identification: Uses `X-Service-Name` header or `SERVICE_NAME` env var

---

## Span Recording Utilities

### `spanTracker.ts`
Location: `backend/src/utils/spanTracker.ts`

Provides two main functions:

1. **`recordSpan(req, operation, service, durationMs, status)`**
   - Records a single span during request processing
   - Attaches span to request object for later collection

2. **`withSpanTracking(operation, service, fn)`**
   - Wrapper function that automatically tracks timing
   - Records start/end and captures errors

**Example Usage**:
```typescript
import { recordSpan, withSpanTracking } from './utils/spanTracker';

// Manual recording
recordSpan(req, "Validate payment request", "payments", 12.43, 200);

// Automatic tracking
await withSpanTracking(
  "Publish payment.received event",
  "payments",
  async () => {
    await eventBus.publish("payment.received", payload);
  }
);
```

---

## UI Components

### 1. Traces List Page
**Location**: `frontend/app/dashboard/traces/page.tsx`

**Features**:
- Shows last 10 traces
- Real-time search filters for:
  - Service name
  - Request ID (traceID)
- Displays: Request ID, Service, Method, Path, Status, Duration, Timestamp
- "View Spans" link navigates to detail page

**Technologies**:
- Next.js 14 App Router
- React Server Components
- Client-side filtering

### 2. Trace Detail Page
**Location**: `frontend/app/dashboard/traces/[id]/page.tsx`

**Features**:
- **Overview Section**: Complete trace metadata
- **Waterfall Chart**: Visual timeline of spans showing:
  - Relative timing and duration
  - Color-coded by status (green=success, red=error, yellow=warning)
  - Parallel and sequential operations
- **Spans Table**: Detailed table with:
  - Span ID, Service, Operation
  - Status code
  - Start offset and duration

**Waterfall Algorithm**:
```typescript
// Calculates positioning for visual representation
const minStart = Math.min(...spans.map(s => s.startOffsetMs));
const maxEnd = Math.max(...spans.map(s => s.startOffsetMs + s.durationMs));
const totalDuration = maxEnd - minStart;

spans.forEach(span => {
  const start = span.startOffsetMs - minStart;
  const leftPercent = (start / totalDuration) * 100;
  const widthPercent = (span.durationMs / totalDuration) * 100;
});
```

---

## Integration Points

### 1. Server Setup
**Location**: `backend/src/server.ts`

```typescript
import { traceCapture } from "./middleware/traceCapture";

// Apply trace capture middleware early in the chain
app.use(traceCapture);
```

### 2. Payment Service
**Location**: `backend/src/services/payments/server.ts`

Integrated with span tracking:
```typescript
app.post("/api/payments", async (req, res) => {
  recordSpan(req, "Validate payment request", "payments", 1, 200);
  
  await withSpanTracking(
    "Publish payment.received event",
    "payments",
    async () => {
      await eventBus.publish("payment.received", payload);
    }
  );
  
  recordSpan(req, "Format and send response", "payments", 1, 200);
});
```

### 3. Event Bus
**Location**: `backend/src/core/eventbus/redisEventBus.ts`

Propagates trace context across service boundaries:
```typescript
import { injectTraceContext, extractTraceContext } from "../../utils/traceContext";

// Inject trace context when publishing
const wrapper = {
  ...message,
  _traceContext: injectTraceContext()
};

// Extract trace context when subscribing
const traceContext = parsedMsg._traceContext;
const extractedCtx = extractTraceContext(traceContext);
```

---

## Performance Considerations

### 1. Indexing Strategy
- Indexed fields: `id`, `traceID`, `ts`, `serviceName`
- Compound index on `ts` + `serviceName` for filtered queries
- Regular index cleanup for old traces (30-day retention recommended)

### 2. Query Optimization
- Default limit of 50 traces (max 100)
- Uses `.lean()` for read-only queries (faster)
- Sorts by `createdAt` DESC for recent traces

### 3. Async Trace Saving
- Non-blocking: Uses `res.on("finish")` event
- Doesn't impact request latency
- Failed saves are logged but don't throw errors

---

## Testing Traces

### Manual Testing
1. Start the backend: `npm start`
2. Make API requests: `POST http://localhost:5000/api/payments`
3. Navigate to: `http://localhost:3000/dashboard/traces`
4. View traces and click "View Spans" for details

### Sample API Call
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "merchantId": "merch_123",
    "amount": 100.00,
    "currency": "USD",
    "gateway": "stripe"
  }'
```

---

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live trace streaming
2. **Trace Search**: Full-text search across all trace fields
3. **Performance Analytics**: Aggregate stats (avg duration, p95, p99)
4. **Error Tracking**: Dedicated view for failed traces
5. **Export**: Download traces as JSON for external analysis
6. **Trace Retention**: Automated cleanup of old traces
7. **Sampling**: Configurable trace sampling rate for high-traffic services

---

## Compliance & Security

- **Data Privacy**: Traces contain request metadata but not sensitive payloads
- **Access Control**: Admin-only access via role-based authentication
- **Retention**: Configure based on compliance requirements (GDPR, etc.)
- **PII Handling**: Avoid logging sensitive user data in attributes

---

## Related Files

### Backend
- `backend/src/middleware/traceCapture.ts` - Trace capture middleware
- `backend/src/models/Trace.ts` - MongoDB schema
- `backend/src/routes/tracesRoutes.ts` - API routes
- `backend/src/controllers/tracesController.ts` - Controllers
- `backend/src/utils/spanTracker.ts` - Span utilities
- `backend/src/utils/traceContext.ts` - Context propagation

### Frontend
- `frontend/app/dashboard/traces/page.tsx` - Traces list
- `frontend/app/dashboard/traces/[id]/page.tsx` - Trace detail

---

## Summary

The Service Trace Viewer provides comprehensive distributed tracing capabilities with:
✅ **10-trace display** with filters for requestId and service  
✅ **Detailed spans view** with waterfall chart visualization  
✅ **MongoDB schema** optimized for performance with proper indexes  
✅ **Non-blocking capture** that doesn't impact request latency  
✅ **OpenTelemetry integration** for cross-service context propagation  

**Status**: ✅ Fully Implemented and Operational
