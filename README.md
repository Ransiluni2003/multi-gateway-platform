Multi-Gateway Platform

This repository contains a multi-service backend (gateway, payments, analytics, notifications, workers) and a frontend. This README documents containerization, CI/CD, load-testing, and observability so you can reproduce the Loom demos and verification steps.

Quick Start (local)

- Create an `.env` file in the repo root with required secrets (see `.env.example`).
- Build and start the stack:

```powershell
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

- Health endpoints (after startup):
  - Gateway: `http://localhost:5000/health`
  - Payments: `http://localhost:4001/health`
  - Analytics: `http://localhost:4002/health`
  - Notifications: `http://localhost:4003/health`

Containerization Overview

- Each service uses a multi-stage Dockerfile (build -> runner) and `docker-compose` orchestrates the services.

OpenTelemetry & Metrics

- The OpenTelemetry Collector receives OTLP traces and exposes a Prometheus endpoint. Prometheus scrapes the collector and selected services.

Load Testing (Artillery)

Run the provided Artillery scenario at `loadtest/artillery.yml` to simulate load and generate a report:

```powershell
npm install -g artillery
artillery run loadtest/artillery.yml --output loadtest/results.json
artillery report --output loadtest/report.html loadtest/results.json
```

CI/CD (GitHub Actions)

- The workflow in `.github/workflows/ci-cd.yml` builds images, runs tests (placeholders), and deploys to Railway and Vercel. You must add secrets to GitHub repository settings.

Loom Recording Scripts

- The README contains suggested terminal commands and narration checklists for three Loom recordings: Compose demo, CI/CD pipeline run, and load test walkthrough.

Acceptance Checklist

- Containerization: services run and communicate via Compose.
- CI/CD: workflow builds and deploys artifacts.
- Load testing: scenario completes and produces a report.
- Observability: OTEL + Prometheus are configured and scrape metrics.
 
**Fraud Trendline & Refund Ratio (Status)**


Sample response from `GET /api/fraud/trend` (7-day excerpt):

```json
[
  { "date": "2025-11-19", "fraud": 2, "refund": 1 },
  { "date": "2025-11-20", "fraud": 1, "refund": 0 },
  { "date": "2025-11-21", "fraud": 3, "refund": 2 },
  { "date": "2025-11-22", "fraud": 4, "refund": 1 },
  { "date": "2025-11-23", "fraud": 2, "refund": 0 },
  { "date": "2025-11-24", "fraud": 5, "refund": 3 },
  { "date": "2025-11-25", "fraud": 6, "refund": 2 }
]
```

The frontend normalizes this shape and computes the refund ratio (refund / (fraud + refund)) for plotting.

How to reproduce the visual proof (generate a screenshot):

1. Start the stack (make sure MongoDB/Redis are reachable and `backend` is running):

```powershell
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
# then in backend folder:
cd backend; npm run build; npm start
```

2. Open the dashboard in your browser at `http://localhost:3000/dashboard` and verify the Fraud Trend chart renders data.

3. To capture a programmatic screenshot (headless Chromium):

```powershell
npm install -g puppeteer-cli
npx puppeteer-cli screenshot http://localhost:3000/dashboard --output fraud-trend.png --viewport-width=1200 --viewport-height=800
```

4. Commit the generated `fraud-trend.png` to the `docs/` folder and reference it in this README for visual proof.

If you want, I can: add a small CI job that renders the chart to an artifact automatically (useful for PR visual regressions), or generate and commit a sample screenshot now if you allow me to run the app locally in this environment.

Files added by this change:

If you want a step-by-step Loom script, say so and I will add it.

---

### 📊 Fraud Trend & Refund Ratio Chart (Visual Proof)

![Fraud Trend & Refund Ratio](docs/fraud-trend.png)

---

### 🛡️ Supabase Signed-URL Download Error Handling

The frontend and backend implement robust expiry and error handling for Supabase signed URLs:

- If a download link is expired or invalid, the user sees a clear error message (e.g., "Link expired. Please refresh.").
- The backend verifies signed URLs and returns appropriate error codes/messages for expired or invalid links.
- See `frontend/components/SupabaseDownloadButton.jsx` and backend `/api/files/download-url` for details.

**Example user feedback:**

```text
Download failed: Link expired. Please refresh.
```

---

### 🔎 OpenTelemetry Tracing & Validation

- OpenTelemetry is integrated in the backend (`backend/src/otel-setup.js`, `backend/tracing.js`).
- Traces are exported to the OTEL Collector and visualized via Prometheus/Grafana.
- The frontend includes a Trace Viewer to inspect recent traces (`frontend/components/TraceViewer.jsx`).
- To validate traces:
  1. Trigger API requests (e.g., via dashboard or load test).
  2. Open Grafana or the Trace Viewer to confirm traces are captured and labeled by service.
- For more, see the [OpenTelemetry documentation](https://opentelemetry.io/docs/).

## Dashboard Analytics

![Dashboard Chart](docs/fraud-trend.png)

**Features:**
- Interactive chart showing fraud events and refund ratio over time
- Time range dropdown to filter data (7 days, 30 days, all)
- "Simulate Transaction" button to add new data and see real-time chart updates
- Chart automatically displays the latest 14 days

> The chart updates instantly when you add a new transaction or change the time range. This demonstrates real-time analytics and interactivity for demo and production use.

---

*Replace `docs/fraud-trend.png` with your actual screenshot file if needed.*
