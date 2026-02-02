# Docker & Docker Compose Notes

**Date:** 2026-01-26  
**Purpose:** Learning documentation for Docker/Compose essentials applied in multi-gateway-platform

---

## 1. Core Concepts

### Containers vs Images

- **Image**: Read-only template/blueprint containing app code, runtime, libraries, and dependencies. Built from a Dockerfile.
- **Container**: Running instance of an image. Isolated process with its own filesystem, networking, and resources.
- **Analogy**: Image = Class, Container = Object instance

```bash
# List images
docker images

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a
```

---

## 2. Dockerfile Structure

A Dockerfile defines how to build an image. Our project uses multi-stage builds for optimization.

### Example: API Service Dockerfile

**Location**: [`backend/src/services/api/Dockerfile`](../backend/src/services/api/Dockerfile)

```dockerfile
# Stage 1: Builder - Compiles TypeScript to JavaScript
FROM node:20.19.0-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runner - Production environment (smaller image)
FROM node:20.19.0-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm ci --production

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/gateway/server.js"]
```

### Key Dockerfile Instructions

| Instruction | Purpose | Example |
|------------|---------|---------|
| `FROM` | Base image to start from | `FROM node:20.19.0-alpine` |
| `WORKDIR` | Sets working directory inside container | `WORKDIR /app` |
| `COPY` | Copies files from host to container | `COPY package*.json ./` |
| `RUN` | Executes commands during build | `RUN npm install` |
| `EXPOSE` | Documents which port the app listens on | `EXPOSE 5000` |
| `CMD` | Default command when container starts | `CMD ["node", "server.js"]` |
| `ENV` | Sets environment variables | `ENV NODE_ENV=production` |

### Multi-Stage Build Benefits

✅ **Smaller final image** - Only production deps in final stage  
✅ **Security** - Build tools not in production image  
✅ **Faster deployments** - Reduced image size  

**Example**: Worker Dockerfile ([`backend/worker/Dockerfile`](../backend/worker/Dockerfile))
- Builder stage: Installs all deps + compiles TypeScript
- Runner stage: Only production deps + compiled code (node_modules/typescript not included)

---

## 3. Docker Compose for Multi-Service Architecture

Docker Compose orchestrates multiple containers as a single application.

### Our Service Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (commerce-web)                        │
│  ↓                                              │
│  API Service (port 5002)                        │
│  ↓                                              │
│  ├─→ Payments Service (port 5003)               │
│  │   └─→ Mock Payment Gateway (port 5000)       │
│  ├─→ Redis (cache/queue - port 6379)            │
│  ├─→ MongoDB (database - port 27017)            │
│  └─→ Worker (5 replicas, background jobs)       │
│                                                 │
│  Monitoring:                                    │
│  ├─→ Prometheus (metrics - port 9090)           │
│  └─→ Grafana (dashboards - port 3300)           │
└─────────────────────────────────────────────────┘
```

### Compose Configuration Files

#### 1. `docker-compose.yml` (Base)
Defines core service structure without environment-specific details.

#### 2. `docker-compose.override.yml` (Development)
Automatically merged with base config. Adds:
- Environment variables
- Health checks
- Logging configuration
- Resource limits
- Dependency management

**Docker Compose automatically merges `docker-compose.yml` + `docker-compose.override.yml`**

---

## 4. Volumes for Data Persistence

**Problem**: Container data is ephemeral (lost when container stops)  
**Solution**: Named volumes persist data on host machine

### Our Persistent Volumes

```yaml
volumes:
  mongo-data:        # MongoDB database files
    driver: local
  mongo-config:      # MongoDB configuration
    driver: local
  redis-data:        # Redis cache/queue data
    driver: local
  prometheus-data:   # Prometheus metrics history
    driver: local
```

### How Volumes Work

```yaml
services:
  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db      # Named volume (persists)
      - mongo-config:/data/configdb
```

**Without volume**: Data deleted when container removed  
**With volume**: Data survives container recreation, updates, restarts

```bash
# List volumes
docker volume ls

# Inspect volume (see actual host path)
docker volume inspect multi-gateway-platform_mongo-data

# Remove unused volumes
docker volume prune
```

---

## 5. Environment Variables & .env Pattern

### ❌ NEVER Hardcode Secrets

**Bad Practice:**
```yaml
environment:
  MONGO_PASS: "Company123"  # ❌ Exposed in repo
  JWT_SECRET: "secret123"   # ❌ Security risk
```

### ✅ Use .env Files

We use **3 environment files**:

| File | Purpose | Committed? |
|------|---------|-----------|
| `.env.example` | Template with dummy values | ✅ Yes (safe) |
| `.env` | Local development secrets | ❌ No (in .gitignore) |
| `.env.docker` | Docker Compose secrets | ❌ No (in .gitignore) |

### How It Works

**Step 1:** Copy example template
```bash
cp .env.example .env.docker
```

**Step 2:** Fill in real secrets in `.env.docker`
```dotenv
# .env.docker
MONGO_USER=admin
MONGO_PASS=secure-password-here
REDIS_PASSWORD=redis-secure-password-dev
JWT_SECRET=your-256-bit-secret
```

**Step 3:** Reference in compose
```yaml
services:
  api:
    env_file:
      - ./.env.docker  # Loads all variables from file
    environment:
      # Can override or add specific variables
      NODE_ENV: ${NODE_ENV:-development}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
```

### Variable Substitution Syntax

```yaml
${VAR_NAME}              # Use variable (fails if not set)
${VAR_NAME:-default}     # Use variable or default value
${VAR_NAME-default}      # Use variable or default (empty string is valid)
```

**Example from our config:**
```yaml
REDIS_PASSWORD: ${REDIS_PASSWORD:-redis-secure-password-dev}
# If REDIS_PASSWORD not set in .env.docker, uses "redis-secure-password-dev"
```

---

## 6. Service Dependencies & Health Checks

### Dependency Management

```yaml
services:
  api:
    depends_on:
      redis:
        condition: service_healthy  # Wait for health check
      mongo:
        condition: service_healthy
      payments:
        condition: service_started  # Wait for start only
```

### Health Check Example

```yaml
services:
  mongo:
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s    # Check every 10 seconds
      timeout: 5s      # Wait max 5 seconds for response
      retries: 5       # Try 5 times before marking unhealthy
```

**Benefits:**
- Services wait for dependencies to be ready (not just started)
- Prevents connection errors during startup
- Automatic restarts on failure

---

## 7. Networking

### Bridge Network

All services in same network can communicate by service name.

```yaml
networks:
  backend-network:
    driver: bridge

services:
  api:
    networks:
      - backend-network
  mongo:
    networks:
      - backend-network
```

**Service Discovery:**
- API can reach MongoDB at `mongodb://mongo:27017` (service name = hostname)
- Payments can reach mock gateway at `http://mock-payment-gateway:5000`

---

## 8. Exact Run Commands

### Basic Operations

```bash
# Start all services (detached mode)
docker-compose up -d

# Start specific services
docker-compose up -d api redis mongo

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api

# Stop all services (keeps containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (DELETES DATA!)
docker-compose down -v

# Rebuild images (after Dockerfile changes)
docker-compose build

# Rebuild and restart
docker-compose up -d --build

# Scale a service (e.g., 10 workers)
docker-compose up -d --scale worker=10
```

### Check Service Health

```bash
# View container status + health
docker-compose ps

# Inspect specific service health
docker inspect --format='{{.State.Health.Status}}' api

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' mongo
```

### Debugging

```bash
# Execute command in running container
docker-compose exec api sh

# View environment variables
docker-compose exec api env

# Check MongoDB connection
docker-compose exec mongo mongosh -u admin -p mongo-secure-password-dev

# Check Redis connection
docker-compose exec redis redis-cli -a redis-secure-password-dev ping

# View container resource usage
docker stats

# Inspect service configuration
docker-compose config
```

### Clean Up

```bash
# Remove stopped containers
docker-compose rm

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Nuclear option - remove everything
docker system prune -a --volumes
```

---

## 9. Project-Specific Setup

### Initial Setup (First Time)

```bash
# 1. Clone repository
git clone <repo-url>
cd multi-gateway-platform

# 2. Create environment file
cp .env.example .env.docker

# 3. Edit .env.docker with real secrets
notepad .env.docker  # or vim, nano, etc.

# 4. Start infrastructure services
docker-compose up -d redis mongo

# 5. Wait for health checks (check with docker-compose ps)

# 6. Start application services
docker-compose up -d api payments mock-payment-gateway

# 7. Start worker pool (5 replicas)
docker-compose up -d --scale worker=5 worker

# 8. Start monitoring (optional)
docker-compose up -d prometheus grafana
```

### Daily Development Workflow

```bash
# Start everything
docker-compose up -d

# Watch logs during development
docker-compose logs -f api payments

# Code changes → rebuild specific service
docker-compose up -d --build api

# End of day - stop but keep data
docker-compose stop

# Clean restart (keeps volumes)
docker-compose down && docker-compose up -d
```

### Production Deployment Considerations

```bash
# Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Always specify image tags (not "latest")
# In Dockerfile: FROM node:20.19.0-alpine (pinned version)

# Set restart policy
services:
  api:
    restart: unless-stopped  # Auto-restart on crash
```

---

## 10. Troubleshooting

### Common Issues & Solutions

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Port already in use | `Error: bind: address already in use` | Change port in compose or stop conflicting service |
| Service won't start | Check logs: `docker-compose logs <service>` | Fix configuration errors, check dependencies |
| Can't connect to DB | Network issue or DB not ready | Use `depends_on` with health checks |
| Volume permission issues | User ID mismatch in container | Add `user: "${UID}:${GID}"` in compose |
| Image build fails | Dependency errors, network issues | Check Dockerfile RUN commands, try `--no-cache` |
| Container keeps restarting | Health check failing | Check health check command, fix application |

### Useful Diagnostic Commands

```bash
# Check why container stopped
docker-compose logs --tail=50 api

# See full container configuration
docker inspect api

# Network connectivity test between services
docker-compose exec api ping mongo

# Check disk usage
docker system df

# See what's using space
docker system df -v
```

---

## 11. Key Learnings Applied

✅ **Multi-stage builds** reduce final image size by ~60% (api service: builder vs runner)  
✅ **Named volumes** ensure MongoDB/Redis data persists across container restarts  
✅ **Health checks** prevent cascade failures during startup (API waits for healthy DB)  
✅ **env_file pattern** keeps secrets out of version control  
✅ **Service scaling** enables horizontal scaling (5 worker replicas for queue processing)  
✅ **Networking** by service name simplifies inter-service communication  
✅ **Logging configuration** prevents disk space issues (max-size: 10m, max-file: 5)  

---

## 12. Quick Reference Card

```bash
# MOST COMMON COMMANDS
docker-compose up -d                    # Start all services
docker-compose logs -f api              # Watch API logs
docker-compose ps                       # Service status
docker-compose down                     # Stop and remove
docker-compose up -d --build api        # Rebuild & restart API
docker-compose exec api sh              # Shell into API container

# CLEAN UP
docker-compose down -v                  # Remove everything + data
docker system prune -a                  # Clean all Docker resources

# SCALING
docker-compose up -d --scale worker=10  # Run 10 workers
```

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds Guide](https://docs.docker.com/build/building/multi-stage/)

## Project-Specific Guides

- 🚀 [Quick Start Guide](../QUICK_START.md) - Get running in 5 minutes
- 🐳 [Docker Setup Guide](./DOCKER_SETUP.md) - Complete Docker instructions
- 📖 [Main README](../README.md) - Full project documentation

---

**Last Updated:** 2026-01-28  
**Author:** Multi-Gateway Platform Team  
**Status:** ✅ Applied in Production
