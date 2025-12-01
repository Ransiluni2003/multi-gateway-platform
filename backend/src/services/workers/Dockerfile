FROM node:18-alpine AS builder
WORKDIR /app

# Install full deps and build
FROM node:20.10.0-alpine
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --production

# Copy built output
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Run compiled worker
CMD ["node", "dist/services/workers/worker.js"]
