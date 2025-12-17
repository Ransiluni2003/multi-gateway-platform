FROM node:20.19.0-alpine AS builder
WORKDIR /app

# Install full deps and build
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm install
COPY . .
RUN npm run build

FROM node:20.19.0-alpine AS runner
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm install --production

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Copy worker entry point
COPY --from=builder /app/worker.js ./worker.js

ENV NODE_ENV=production

# Expose Prometheus metrics port (default 9100)
ENV WORKER_METRICS_PORT=9100
EXPOSE 9100

# Start the worker from the entry point
CMD ["node", "worker.js"]
