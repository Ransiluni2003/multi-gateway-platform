# Multi-Gateway Platform

A comprehensive full-stack platform demonstrating multi-service architecture with payment processing, fraud detection, analytics, worker queues, OpenTelemetry tracing, and responsive frontend. This repository documents containerization, CI/CD, load-testing, observability, and Supabase integration.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Setup Instructions](#setup-instructions)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)
- [Loom Videos Guide](#loom-videos-guide)
- [Architecture](#architecture)
- [Features](#features)

---

## ⚡ Quick Start (5 minutes)

### Prerequisites
- **Docker & Docker Compose** installed
- **Node.js 18+** installed
- **Git** configured
- Supabase account (for file storage)

### Steps

1. **Clone and navigate:**
   ```powershell
   git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
   cd multi-gateway-platform
   ```

2. **Create `.env` file** with required secrets:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials (MongoDB, Stripe, PayPal, Supabase, etc.)
   ```

3. **Start the entire stack:**
   ```powershell
   docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
   ```

4. **Verify services are running:**
   - **Gateway**: `http://localhost:5000/health`
   - **Payments Service**: `http://localhost:4001/health`
   - **Analytics Service**: `http://localhost:4002/health`
   - **Notifications Service**: `http://localhost:4003/health`
   - **Frontend**: `http://localhost:3000`
   - **Prometheus Metrics**: `http://localhost:9090`
   - **API Gateway Proxy**: `http://localhost:5002`

---

## 🛠 Setup Instructions

### 1. Environment Configuration

**Root `.env` file** (required variables):
```env
# Node Environment
NODE_ENV=development
PORT=5000

# Database (MongoDB)
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=Cluster

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Payment Processors
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_BUCKET=uploads

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**Frontend `.env.local` file:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_BUCKET=uploads
USE_DEMO_URLS=false
```

### 2. Backend Setup

```powershell
cd backend
npm install
npm run build
npm start
```

### 3. Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

### 4. Docker Compose (All Services)

```powershell
# Build and start all services
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build

# Or run in background
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## 📖 Usage Guide

### Dashboard
- **URL**: `http://localhost:3000/dashboard`
- **Features**:
  - Real-time fraud trend chart (7/30 days/all time)
  - Refund ratio visualization
  - "Simulate Transaction" button to generate test data
  - Interactive filtering and zoom

#### 📊 Understanding the Fraud Trend & Refund Ratio Chart

The dashboard displays two critical metrics in a dual-axis chart:

**1. Fraud Events (Red Line - Left Axis)**
- **What it shows**: The count of transactions flagged as fraudulent per day
- **Range**: Absolute number (0-100+)
- **Interpretation**:
  - Baseline helps identify normal fraud activity
  - Spikes indicate potential fraud attacks or system issues
  - Downward trends show improved fraud detection or prevention
- **Example**: "We had 8 fraud incidents on Jan 1, rising to 15 on Jan 2"

**2. Refund Ratio (Blue Line - Right Axis)**
- **What it shows**: The percentage of transactions that were refunded
- **Formula**: `(Refunds / Total Payments) × 100 = %`
- **Range**: 0-100%
- **Interpretation**:
  - 2-5%: Healthy range (normal customer satisfaction)
  - 5-10%: Elevated (investigate issues, product quality)
  - 10%+: Critical (chargeback risk, payment gateway issues)
  - Correlates with fraud: High fraud often triggers refunds
- **Example**: "If 100 payments were processed and 3 were refunded, refund ratio = 3%"

**Why Together?**
These metrics reveal critical relationships:
- **High Fraud + High Refunds**: Fraudulent transactions may be auto-refunded
- **Low Fraud + High Refunds**: Customer satisfaction issue (product/shipping)
- **High Fraud + Low Refunds**: Detection working but refund process slow
- **Low Fraud + Low Refunds**: Healthy system state ✅

**How to Use:**
1. Click "Simulate Transaction" to add test data for the current day
2. Select time range: Last 7 days, 30 days, or all-time
3. Hover over data points to see exact values
4. Monitor for unusual patterns or spikes

### Files Page
- **URL**: `http://localhost:3000/files`
- **Features**:
  - Upload files to Supabase bucket
  - Download files with signed URLs (2-minute expiry)
  - Automatic URL refresh on expiry
  - Error handling and retry logic

### Traces Page
- **URL**: `http://localhost:3000/traces`
- **Features**:
  - View recent OpenTelemetry traces
  - Filter by service and status
  - Inspect trace details and timing

### API Endpoints

#### Payments API
```bash
# Create payment
POST /api/payments/create
Body: { amount, currency, paymentMethod }

# List payments
GET /api/payments/list

# Get payment details
GET /api/payments/:id
```

#### Fraud Detection API
```bash
# Get fraud trend data
GET /api/fraud/trend
Query: ?days=7 (optional)

# Simulate fraud alert
POST /api/fraud/simulate
Body: { score, reason }
```

#### Files API
```bash
# List files in bucket
GET /api/files/list

# Get signed download URL
GET /api/files/download-url?key=filename&expires=120

# Upload file
POST /api/files/upload
Body: FormData with file
```

---

## 🔧 Troubleshooting

### Issue: "Port 3000 already in use"
**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID 11476 /F

# Restart
npm run dev
```

### Issue: "Undefined download URL in files page"
**Solution:**
- Check `USE_DEMO_URLS` environment variable
- If `true`, demo data is used (no Supabase needed)
- If `false`, verify Supabase credentials in `.env`
- Check file exists in `SUPABASE_BUCKET`

### Issue: "Download link expired"
**Solution:**
- The component automatically retries up to 2 times
- Each signed URL expires after 2 minutes
- Frontend implements auto-refresh on expiry
- Check backend API: `GET /api/files/download-url`

### Issue: Docker container won't start
**Solution:**
```powershell
# Check logs
docker-compose logs service-name

# Rebuild
docker-compose up --build

# Clean rebuild
docker-compose down -v
docker-compose up --build
```

### Issue: MongoDB connection failed
**Solution:**
- Verify `MONGO_URI` in `.env`
- Ensure MongoDB instance is running
- Check MongoDB is accessible: `mongosh "<MONGO_URI>"`
- For Atlas, whitelist your IP in cluster security settings

### Issue: Redis connection failed
**Solution:**
- Ensure Redis is running locally or in Docker
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Test connection: `redis-cli ping` (should return "PONG")
- In Docker, verify Redis container: `docker-compose ps`

### Issue: Supabase file not found (404)
**Solution:**
- Verify file exists in Supabase Storage bucket
- Check bucket name matches `SUPABASE_BUCKET` in `.env`
- Ensure `SUPABASE_SERVICE_ROLE_KEY` has storage permissions
- Test via Supabase console: Storage → select bucket → verify files

### Issue: Workers not processing jobs
**Solution:**
- Check Redis connection: `redis-cli ping`
- View Redis memory: `redis-cli info memory`
- Check worker logs: `docker-compose logs worker`
- Verify BullMQ queue: Use Redis commander to inspect job queue
- Increase worker replicas if jobs are queuing

### Issue: High memory usage / crashes
**Solution:**
- Set Redis `maxmemory-policy`: `allkeys-lru` (evict oldest keys)
- Reduce worker replicas from 5 to 2-3
- Check for memory leaks: `docker stats`
- Clear old traces: `db.traces.deleteMany({ createdAt: { $lt: new Date(Date.now() - 7*24*60*60*1000) } })`

### Issue: Traces not appearing
**Solution:**
- Verify OpenTelemetry Collector is running: `docker-compose ps`
- Check OTLP endpoint: `http://localhost:4317`
- Ensure backend services send traces (check `otel-setup.js`)
- View Prometheus metrics: `http://localhost:9090`
- Check network connectivity: `mongosh "your_connection_string"`

### Issue: Redis connection failed
**Solution:**
```powershell
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server

# Verify Redis status
redis-cli INFO
```

### Issue: Sentry errors not capturing
**Solution:**
- Verify `SENTRY_DSN` is set in `.env`
- Check Sentry project exists and is active
- Ensure `NODE_ENV` is not 'test'

---

## 🎥 Loom Videos Guide

Record **4 key Loom videos** (3–5 minutes each) to demonstrate the platform:

### 1. **Setup & Architecture Overview** (3 min)
**What to show:**
- Clone the repo and explain folder structure
- Show `.env` configuration with sensitive data masked
- Run `docker-compose up --build`
- Show all services starting (logs)
- Open health endpoints in browser
- Explain microservice architecture diagram

**Script:**
```
"Welcome to the Multi-Gateway Platform. Today I'll walk you through 
the setup and architecture. First, let me clone the repository and 
explain the project structure. We have a backend with multiple 
microservices: payments, analytics, notifications, and workers. 
We also have a React frontend and Supabase integration for file storage.

Next, I'll configure the environment variables. Notice I'm masking 
sensitive keys for security. Now let's start the entire stack using 
Docker Compose. You can see multiple containers starting: MongoDB, 
Redis, the API gateway, and all microservices.

Once they're ready, let's verify each service is healthy by checking 
the health endpoints. Great! All services are running and communicating 
properly through Docker Compose networking."
```

### 2. **Main Flows Demo** (4 min)
**What to show:**
- Dashboard with fraud trend chart
- Simulate a transaction and see chart update
- Files page: upload a file (if applicable)
- Download file with signed URL
- Show the Traces page with live traces
- Create a test payment via API

**Script:**
```
"Now let me show you the main user flows. First, the dashboard 
displays fraud trends and refund ratios in real-time. I can filter 
by 7 days, 30 days, or all time.

Let me simulate a transaction and watch the chart update instantly. 
See how it adds a new data point? The analytics are computed in real-time.

Next, the Files page allows users to upload and download files securely 
using Supabase signed URLs. Each URL expires after 2 minutes for security. 
Let me download a file - notice the button shows 'Preparing...' while 
the backend generates a signed URL.

Finally, the Traces page shows all OpenTelemetry traces. You can see 
which services handled each request and how long it took. This is 
crucial for debugging and performance optimization."
```

### 3. **Error Handling & Recovery** (3 min)
**What to show:**
- Try downloading an expired file
- Show automatic URL refresh
- Demonstrate retry logic (2 attempts)
- Show error messages for missing files
- Stop MongoDB, try an API call, show error handling
- Restart MongoDB and show recovery

**Script:**
```
"Let me demonstrate robust error handling. First, I'll try to download 
a file that's past its expiry time. Notice the component automatically 
refreshes the URL and retries up to 2 times. If it still fails, we show 
a user-friendly error message.

Next, let me stop the MongoDB container to simulate a database failure. 
When I try to list files, the frontend shows a clear error instead of 
crashing. Now let me restart MongoDB and try again - everything recovers 
automatically.

This is critical for production reliability. Our error boundaries, retry 
logic, and graceful degradation ensure users always see helpful feedback 
instead of blank screens or cryptic errors."
```

### 4. **Load Testing & Performance** (4 min)
**What to show:**
- Run Artillery load test (1000 VUs)
- Show test results in real-time
- Display generated JSON report
- Show Prometheus metrics during load
- Explain latency, throughput, and error rates
- Show worker queue handling
- Demonstrate recovery after load

**Script:**
```
"Now let me demonstrate the load testing setup. We use Artillery to 
simulate 1000 concurrent virtual users hitting our API. Let me start 
the test.

While the test runs, notice the latency and throughput metrics. The 
platform maintains a 95th percentile latency under 500ms even under 
heavy load thanks to our worker queue for async tasks.

Here's the generated JSON report showing detailed metrics for each 
endpoint. We also have Prometheus scraping metrics from all services 
during the test. You can see CPU, memory, and request rates in real-time.

After the test completes, all services recover gracefully. The load 
test demonstrates that our microservice architecture with Docker 
Compose, Redis queues, and proper error handling can handle real-world 
traffic spikes."
```

### Recording Tips
- **Audio**: Use a quiet environment, speak clearly
- **Resolution**: Record at 1080p or higher
- **Speed**: Slow down terminal output (adjust terminal font size)
- **Pauses**: Add 1-2 second pauses between major steps
- **Tool**: Use Loom.com (free, easy screen sharing + webcam)
- **Length**: Keep each video 3–5 minutes (concise and focused)

---

## 🏗 Architecture

---

## 🚀 Deployment & Production Readiness

### Local Deployment (Development)
```powershell
# Clone and setup
git clone https://github.com/Ransiluni2003/multi-gateway-platform.git
cd multi-gateway-platform

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start all services
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build

# Verify:
# - Frontend: http://localhost:3000
# - Gateway: http://localhost:5000/health
# - Prometheus: http://localhost:9090
```

### Production Deployment (Railway + Vercel)

**Backend (Railway):**
1. Push code to GitHub
2. Connect Railway to your GitHub repository
3. Set environment variables in Railway dashboard
4. Railway auto-deploys on push to main

**Frontend (Vercel):**
1. Connect Vercel to your GitHub repository
2. Set `NEXT_PUBLIC_SUPABASE_URL` in Vercel environment
3. Auto-deploys on push to main

**CI/CD Pipeline:**
- GitHub Actions runs tests and builds
- Docker images pushed to Docker Hub
- Railway pulls and deploys backend
- Vercel deploys Next.js frontend

**Production Environment Variables:**
```env
# Backend (Railway)
NODE_ENV=production
MONGO_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net
JWT_SECRET=your_production_jwt_secret
STRIPE_SECRET_KEY=sk_live_xxx (live key)
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_prod_key
SENTRY_DSN=your_production_sentry_dsn
REDIS_URL=redis://prod-redis-host:6379

# Frontend (Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
USE_DEMO_URLS=false
```

### Health Checks & Monitoring
```bash
# Backend health
curl http://localhost:5000/health

# Individual services
curl http://localhost:4001/health  # Payments
curl http://localhost:4002/health  # Analytics
curl http://localhost:4003/health  # Notifications

# Prometheus metrics
curl http://localhost:9090/api/v1/query?query=up
```

---

## 🏗 Architecture

### Microservices Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│              http://localhost:3000                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│              http://localhost:5002                           │
└──┬──┬──┬──┬────────────────────────────────────────────────┘
   │  │  │  │
   ▼  ▼  ▼  ▼
┌──────────┬──────────┬──────────┬──────────┐
│ Payments │Analytics │Notif.    │ Gateway  │
│  :4001   │  :4002   │  :4003   │  :5000   │
└────┬─────┴────┬─────┴────┬─────┴────┬────┘
     │          │          │          │
     └──────────┼──────────┼──────────┘
                │          │
                ▼          ▼
           ┌────────────────────┐
           │ MongoDB (Database) │
           │    :27017          │
           └────────────────────┘
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
   Redis     Workers    Supabase
   :6379    (BullMQ)   (Storage)
```

### Components

- **Frontend**: Next.js React app with real-time dashboard, file management, and traces viewer
- **API Gateway**: Routes requests to microservices
- **Payments Service**: Handles Stripe/PayPal integration
- **Analytics Service**: Computes fraud trends and refund ratios
- **Notifications Service**: Sends alerts and emails
- **Worker Service**: Async job processing via BullMQ + Redis
- **MongoDB**: Document database for persistent data
- **Redis**: Queue and cache layer for workers
- **Supabase**: Secure file storage with signed URLs

---

## 📊 Analytics & Fraud Detection Guide

### Fraud Trendline & Refund Ratio - Complete Explanation

#### **What Data Is Displayed?**

The dashboard displays a **dual-axis time-series chart** tracking two key metrics over 14 days:

| Metric | Line Color | Axis | Data Type | Purpose |
|--------|-----------|------|-----------|---------|
| **Fraud Events** | Red 🔴 | Left (Count) | Integer (0-100+) | Tracks daily fraud incident count |
| **Refund Ratio** | Blue 🔵 | Right (%) | Percentage (0-100%) | Shows refund rate as % of transactions |

#### **Fraud Events (Red Line)**

**Definition**: The absolute number of transactions flagged as potentially fraudulent on a given day.

**Data Source**: `TransactionLog` collection filtered by `eventType: "fraud"`

**Calculation**:
```
Fraud Count = COUNT(transactions WHERE eventType LIKE "fraud" FOR EACH DAY)
```

**Interpretation Guide**:
- **0-3 events/day**: ✅ Excellent (very low fraud baseline)
- **3-8 events/day**: 🟡 Normal (acceptable fraud rate for processing volume)
- **8-15 events/day**: 🟠 Elevated (investigate patterns, check for attacks)
- **15+ events/day**: 🔴 Critical (immediate investigation required)

**Real-World Examples**:
- Day 1: 5 fraud events = 5 transactions detected as fraudulent out of (typically) 100-200 total
- Day 2: 12 fraud events = System flagged 12 suspicious transactions

**Actions to Take**:
- **Spike Detection**: If fraud jumps from 5 to 20 overnight, investigate:
  - New fraud attack (test with honeypot email)
  - System misconfiguration (check fraud detection thresholds)
  - Volume surge (legitimate business spike)
- **Trend Analysis**: Multi-day uptrend indicates systematic issue
- **Correlation**: Compare with refund ratio to find root cause

#### **Refund Ratio (Blue Line)**

**Definition**: The percentage of transactions that were refunded, calculated as `(Refunds / Total Payments) × 100`

**Data Source**: `TransactionLog` collection
- Numerator: COUNT of `eventType: "refund"` per day
- Denominator: COUNT of `eventType: "payment"` per day

**Calculation**:
```
Refund Ratio (%) = (Count of Refunds / Count of Payments) × 100

Example:
- 100 payments processed on Jan 1
- 3 refunds issued on Jan 1
- Refund Ratio = (3 / 100) × 100 = 3%
```

**Interpretation Guide**:
- **0-2%**: ✅ Excellent (world-class customer satisfaction)
- **2-5%**: ✅ Good (healthy baseline for most businesses)
- **5-10%**: 🟡 Elevated (investigate, customer issues or fraud)
- **10-15%**: 🟠 Concerning (potential chargeback liability)
- **15%+**: 🔴 Critical (business-threatening, must investigate)

**Real-World Examples**:
- E-commerce platform: 3-5% typical (shipping issues, wrong items)
- SaaS platform: 1-2% typical (service quality is high)
- High-risk: 8-12% (indicates serious system issues)

**Root Causes**:
| Refund Reason | Signal | Solution |
|---------------|--------|----------|
| **Product Quality** | Correlated with low fraud | Improve QA, better product info |
| **Shipping Issues** | High in logistics heavy business | Improve fulfillment process |
| **Payment Failures** | No fraud, just processing errors | Check payment gateway config |
| **Fraud** | High fraud + high refunds | Strengthen fraud detection |
| **Customer Service** | Voluntary refunds | Improve support, onboarding |

#### **Correlation Analysis: When Lines Move Together**

**Scenario 1: Both Rise 📈📈**
```
Fraud ↑ + Refund Ratio ↑
Likely Cause: Coordinated fraud attack auto-triggering refunds
Action: Block suspicious customers, investigate fraud detection thresholds
```

**Scenario 2: Fraud High, Refunds Low 📈📉**
```
Fraud ↑ + Refund Ratio ↓
Likely Cause: Detection working but refund process is slow
Action: Expedite refund processing, check payment processor queue
```

**Scenario 3: Fraud Low, Refunds High 📉📈**
```
Fraud ↓ + Refund Ratio ↑
Likely Cause: Legitimate customers requesting refunds (satisfaction issue)
Action: Investigate product quality, shipping, customer support
```

**Scenario 4: Both Stable ➡️➡️**
```
Fraud ➡️ + Refund Ratio ➡️
Ideal State: System operating normally ✅
Action: Maintain current configuration, monitor for anomalies
```

#### **How the Data is Generated**

**Backend Aggregation** (`/api/fraud/trend` endpoint):

```javascript
// Aggregates last 14 days of data per day
Pipeline:
1. Match transactions from start date to today
2. Group by date
3. Count fraud, refund, and payment events
4. Calculate ratios
5. Return sorted by date
```

**Response Format**:
```json
[
  {
    "date": "2026-01-03",
    "fraudCount": 6,
    "fraudRate": 4.2,           // (fraud / total) × 100
    "refundCount": 2,
    "paymentCount": 143,
    "refundRatio": 0.014,        // 1.4% as decimal
    "refundPercentage": 1.4,     // 1.4% as percentage
    "totalAmount": 14300
  },
  ...
]
```

**Chart Rendering** (FraudTrend.jsx):
- Red line: plots `fraudCount` on left Y-axis
- Blue line: plots `refundPercentage` on right Y-axis
- X-axis: formatted dates (Jan 03, Jan 04, etc.)
- Hover: shows exact values for each data point

#### **Testing & Simulation**

To see the charts in action:

1. **Click "Simulate Transaction"** button on dashboard
   - Adds a fake transaction for today
   - Updates chart with new data point
   - Useful for testing without real transactions

2. **Generate Real Data**:
   ```bash
   # Via API or admin panel, create transactions:
   # - POST /api/transactions/create
   # - Include eventType: "payment", "fraud", or "refund"
   ```

3. **Filter by Time Range**:
   - **Last 7 days**: Recent trends only
   - **Last 30 days**: Monthly patterns
   - **All**: Historical data

#### **Key Metrics & Benchmarks**

```
Industry Benchmarks (healthy state):
┌─────────────────┬──────────────┬──────────────┐
│ Industry        │ Fraud Rate   │ Refund Ratio │
├─────────────────┼──────────────┼──────────────┤
│ E-Commerce      │ 1-3%         │ 3-5%         │
│ SaaS            │ 0.5-1%       │ 1-2%         │
│ Digital Goods   │ 0.1-0.5%     │ 0.5-1%       │
│ High-Risk       │ 5-10%        │ 8-12%        │
└─────────────────┴──────────────┴──────────────┘
```

#### **Troubleshooting**

| Problem | Cause | Solution |
|---------|-------|----------|
| Chart shows no data | No transactions | Click "Simulate Transaction" |
| Both metrics are 0 | MongoDB not connected | Check DB connection |
| Unusual spikes | Legitimate business event | Check transaction logs |
| Ratio > 100% | Duplicate refunds | Investigate duplicate logic |
| Chart won't load | API endpoint down | Check `/api/fraud/trend` |

---

## ✨ Features

### 1. **Payment Processing**
- Multi-gateway support: Stripe & PayPal
- Webhook handling for payment confirmations
- Transaction logging and reconciliation
- Error recovery and retry logic

### 2. **Fraud Detection & Analytics**
- Real-time fraud trend calculations
- Refund ratio visualization
- Simulated transactions for testing
- Time-series data filtering (7/30 days/all)

### 3. **Secure File Management**
- Supabase signed URLs with expiry (2 minutes)
- Automatic URL refresh on expiry
- Retry logic for download failures
- User-friendly error messages

### 4. **Distributed Tracing**
- OpenTelemetry integration across all services
- Prometheus metrics collection
- Trace filtering by service and status
- Performance insights

### 5. **Worker Queues**
- BullMQ for reliable async job processing
- 5 worker replicas for scalability
- Dead-letter queue for failed jobs
- Redis persistence

### 6. **Containerization & Orchestration**
- Multi-stage Dockerfiles for optimization
- Docker Compose for local development
- Service discovery via Docker networking
- Volume mounts for persistence

### 7. **Load Testing**
- Artillery scenarios (500/1000 VU)
- Real-time metric collection
- JSON and HTML reports
- Performance benchmarking

---

## 📊 Monitoring & Observability

### Prometheus
- **URL**: `http://localhost:9090`
- Scrapes metrics from all services
- Visualize CPU, memory, request rates

### OpenTelemetry Collector
- **Port**: `4317` (OTLP gRPC)
- Receives traces from backend services
- Exports to Prometheus

### Sentry (Error Tracking)
- Configure via `SENTRY_DSN` in `.env`
- Captures errors across backend and frontend
- Real-time error alerts

---

## 🧪 Testing

### Load Testing with Artillery

```powershell
# Install Artillery
npm install -g artillery

# Navigate to loadtest folder
cd loadtest

# Run 1000 VU test (5 minutes)
npx artillery run artillery-1k.yml -o report-1k.json

# Generate HTML report
artillery report --output report-1k.html report-1k.json
```

**Output files:**
- `report-1k.json` - Raw test data
- `report-1k.html` - Visual report
- Summary metrics: latency, throughput, error rates

### Unit Tests

```powershell
# Backend tests
cd backend
npm test

# Frontend tests
cd ../frontend
npm test
```

---

## 🔐 Security & Best Practices

### Secrets Management
- Use `.env.local` for sensitive data (not committed to git)
- Service keys separated by environment
- Supabase signed URLs have 2-minute expiry

### Error Handling
- Graceful degradation on service failures
- User-friendly error messages
- Detailed server logs for debugging

### Rate Limiting
- API gateway enforces rate limits
- Worker queue prevents job overload
- Redis max memory policies prevent crashes

---

## � CI/CD Pipeline

The GitHub Actions workflow automatically:
1. Builds Docker images for all services
2. Runs tests and linting
3. Deploys to Railway (backend)
4. Deploys to Vercel (frontend)

**Required GitHub Secrets:**
- `RAILWAY_TOKEN` - Railway deployment token
- `VERCEL_TOKEN` - Vercel deployment token
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password

Add these in GitHub repository **Settings** → **Secrets and variables**.

---

## 📋 Acceptance Checklist

- ✅ **Setup**: Clone repo, configure `.env`, run `docker-compose up`
- ✅ **Services**: All health endpoints return 200 OK
- ✅ **Frontend**: Dashboard, Files, and Traces pages load
- ✅ **API**: Payments, Fraud, and Files endpoints functional
- ✅ **Database**: MongoDB connected, data persists
- ✅ **Queue**: Workers process async jobs via Redis
- ✅ **Monitoring**: Prometheus scrapes metrics, OpenTelemetry traces visible
- ✅ **Load Testing**: Artillery test completes, report generated
- ✅ **Error Handling**: Download retry, service recovery working
- ✅ **Loom Videos**: 4 videos recorded (Setup, Flows, Errors, Load test)

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `EADDRINUSE: address already in use :3000` | `taskkill /PID <PID> /F` or change PORT in `.env` |
| `MongooseError: Cannot connect to MongoDB` | Verify `MONGO_URI` and MongoDB is running |
| `Redis connection failed` | Start Redis: `redis-server` |
| `Supabase signed URL not found` | Check bucket name and file exists in Supabase |
| `Docker container exits with code 1` | Check logs: `docker-compose logs <service>` |
| `Rate limit errors` | Increase API gateway rate limits or use API key |

---

## 📊 Key APIs

### Fraud Trend API
**GET** `/api/fraud/trend?days=7`
```json
[
  { "date": "2025-12-10", "fraud": 2, "refund": 1 },
  { "date": "2025-12-11", "fraud": 3, "refund": 2 },
  { "date": "2025-12-12", "fraud": 1, "refund": 0 }
]
```

### Files List API
**GET** `/api/files/list`
```json
{
  "files": [
    { "key": "document.pdf", "name": "document.pdf", "size": 25000 }
  ]
}
```

### Signed Download URL API
**GET** `/api/files/download-url?key=filename&expires=120`
```json
{
  "downloadUrl": "https://supabase.co/...",
  "expiresAt": 1702857600000
}
```

---

## 🆘 Getting Help

### Debug Checklist
- [ ] Check `.env` file has all required variables
- [ ] Verify all services are running: `docker-compose ps`
- [ ] Check service logs: `docker-compose logs <service>`
- [ ] Verify no port conflicts: `netstat -ano | findstr :PORT`
- [ ] Test API directly: `curl http://localhost:5000/health`
- [ ] Check browser console for frontend errors
- [ ] Review Sentry dashboard for error tracking
- [ ] Check Prometheus metrics: `http://localhost:9090`

### Useful Commands
```powershell
# View all running containers
docker-compose ps

# View logs for specific service
docker-compose logs -f payments

# Enter container shell
docker-compose exec payments sh

# Rebuild specific service
docker-compose up --build payments

# Reset all data (WARNING: deletes databases)
docker-compose down -v
docker-compose up --build

# Check port usage
netstat -ano | findstr :5000

# Redis CLI
docker-compose exec redis redis-cli

# MongoDB CLI
docker-compose exec mongodb mongosh
```

---

## 📞 Support & Contact

- **GitHub Issues**: Report bugs via GitHub Issues
- **Email**: pransiluni@gmail.com
- **Documentation**: See [docs/](docs/) folder for detailed guides

---

## 📄 License

This project is part of an internship program. See LICENSE file for details.

---

**Last Updated**: December 17, 2025  
**Status**: Production Ready ✅  
**Version**: 1.0.0
