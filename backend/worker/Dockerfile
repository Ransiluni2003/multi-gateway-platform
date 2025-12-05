FROM node:20.19.0-alpine AS builder
WORKDIR /app

# Install full deps and build
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.19.0-alpine AS runner
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm ci --production

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Also copy any fallback worker file if present
COPY --from=builder /app/worker/worker.js ./worker/worker.js

# Ensure a predictable entry file exists at dist/worker.js
RUN if [ -f ./dist/services/workers/worker.js ]; then cp ./dist/services/workers/worker.js ./dist/worker.js; fi || true

ENV NODE_ENV=production

# Expose Prometheus metrics port (default 9100)
ENV WORKER_METRICS_PORT=9100
EXPOSE 9100

# Start the worker from the compiled dist
CMD ["node", "dist/worker.js"]
