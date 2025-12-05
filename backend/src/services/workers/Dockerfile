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

# Copy built output
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Run compiled worker
CMD ["node", "dist/services/workers/worker.js"]
