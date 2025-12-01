# Use a lightweight Node.js base image
FROM node:20.10.0-alpine AS builder
WORKDIR /app

# Install full deps for build
COPY package*.json ./
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
ENV PORT=4003
EXPOSE 4003

CMD ["node", "dist/services/notifications/server.js"]
