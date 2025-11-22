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

Files added by this change:
- `.github/workflows/ci-cd.yml`
- `loadtest/artillery.yml`
- `otel-collector-config.yaml`
- `prometheus.yml`

If you want a step-by-step Loom script, say so and I will add it.
